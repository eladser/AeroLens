using System.Net.Http.Headers;
using System.Text.Json;

namespace AeroLens.Api.Services;

public record AircraftState(
    string Icao24,
    string? CallSign,
    double? Longitude,
    double? Latitude,
    double? Altitude,
    double? Velocity,
    double? Heading,
    bool OnGround,
    string? AircraftType = null  // e.g., "B738", "A320", "E75L"
);

// OpenSky API - OAuth2 Client Credentials Flow
// Rate Limits:
// - Anonymous: 400 credits/day
// - Authenticated: 4,000 credits/day (10x improvement!)
// - Contributor: 8,000 credits/day
// Setup: https://opensky-network.org/ -> Account -> Create API Client
public class OpenSkyClient(HttpClient http, IConfiguration config, ILogger<OpenSkyClient> log)
{
    private const string TokenUrl = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
    private const string ApiBaseUrl = "https://opensky-network.org/api";

    private readonly string? _clientId = config["OpenSky:ClientId"];
    private readonly string? _clientSecret = config["OpenSky:ClientSecret"];

    private string? _accessToken;
    private DateTime _tokenExpiry = DateTime.MinValue;
    private readonly SemaphoreSlim _tokenLock = new(1, 1);

    private bool HasCredentials => !string.IsNullOrEmpty(_clientId) && !string.IsNullOrEmpty(_clientSecret);

    private async Task<string?> GetAccessTokenAsync(CancellationToken ct)
    {
        if (!HasCredentials) return null;

        // Return cached token if still valid (with 1 min buffer)
        if (_accessToken != null && DateTime.UtcNow < _tokenExpiry.AddMinutes(-1))
            return _accessToken;

        await _tokenLock.WaitAsync(ct);
        try
        {
            // Double-check after acquiring lock
            if (_accessToken != null && DateTime.UtcNow < _tokenExpiry.AddMinutes(-1))
                return _accessToken;

            var content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "client_credentials",
                ["client_id"] = _clientId!,
                ["client_secret"] = _clientSecret!
            });

            var response = await http.PostAsync(TokenUrl, content, ct);

            if (!response.IsSuccessStatusCode)
            {
                log.LogWarning("Failed to get OpenSky token: HTTP {StatusCode}", (int)response.StatusCode);
                return null;
            }

            using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            _accessToken = doc.RootElement.GetProperty("access_token").GetString();

            // Token expires in 30 minutes
            var expiresIn = doc.RootElement.TryGetProperty("expires_in", out var exp) ? exp.GetInt32() : 1800;
            _tokenExpiry = DateTime.UtcNow.AddSeconds(expiresIn);

            log.LogInformation("OpenSky OAuth2 token acquired, expires in {Minutes} minutes", expiresIn / 60);
            return _accessToken;
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Failed to acquire OpenSky OAuth2 token");
            return null;
        }
        finally
        {
            _tokenLock.Release();
        }
    }

    private async Task<HttpRequestMessage> CreateAuthenticatedRequest(HttpMethod method, string url, CancellationToken ct)
    {
        var request = new HttpRequestMessage(method, url);

        var token = await GetAccessTokenAsync(ct);
        if (token != null)
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        return request;
    }

    public async Task<IReadOnlyList<AircraftState>> GetAllStatesAsync(CancellationToken ct = default)
    {
        var request = await CreateAuthenticatedRequest(HttpMethod.Get, $"{ApiBaseUrl}/states/all", ct);
        var response = await http.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

        if (!doc.RootElement.TryGetProperty("states", out var states) || states.ValueKind != JsonValueKind.Array)
        {
            log.LogWarning("OpenSky returned no states array");
            return [];
        }

        var result = new List<AircraftState>();
        foreach (var state in states.EnumerateArray())
        {
            if (state.ValueKind != JsonValueKind.Array || state.GetArrayLength() < 12)
                continue;

            var aircraft = ParseState(state);
            if (aircraft.Latitude.HasValue && aircraft.Longitude.HasValue)
                result.Add(aircraft);
        }

        return result;
    }

    private static AircraftState ParseState(JsonElement arr)
    {
        return new AircraftState(
            Icao24: arr[0].GetString() ?? "",
            CallSign: arr[1].GetString()?.Trim(),
            Longitude: GetDouble(arr[5]),
            Latitude: GetDouble(arr[6]),
            Altitude: GetDouble(arr[7]) ?? GetDouble(arr[13]),
            Velocity: GetDouble(arr[9]),
            Heading: GetDouble(arr[10]),
            OnGround: arr[8].ValueKind == JsonValueKind.True
        );
    }

    private static double? GetDouble(JsonElement el) =>
        el.ValueKind == JsonValueKind.Number ? el.GetDouble() : null;

    public async Task<List<double[]>?> GetTrackAsync(string icao24, CancellationToken ct = default)
    {
        try
        {
            var request = await CreateAuthenticatedRequest(HttpMethod.Get, $"{ApiBaseUrl}/tracks/all?icao24={icao24}&time=0", ct);
            var response = await http.SendAsync(request, ct);

            if (!response.IsSuccessStatusCode)
                return null;

            using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

            if (!doc.RootElement.TryGetProperty("path", out var path) || path.ValueKind != JsonValueKind.Array)
                return null;

            var points = new List<double[]>();
            foreach (var point in path.EnumerateArray())
            {
                if (point.ValueKind != JsonValueKind.Array || point.GetArrayLength() < 3)
                    continue;

                var lat = GetDouble(point[1]);
                var lon = GetDouble(point[2]);
                if (lat.HasValue && lon.HasValue)
                    points.Add([lat.Value, lon.Value]);
            }

            return points.Count > 0 ? points : null;
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Failed to get track for {Icao24}", icao24);
            return null;
        }
    }

    public async Task<(bool ok, string message)> TestAsync(CancellationToken ct = default)
    {
        try
        {
            // Test with a small bounding box to minimize data
            var request = await CreateAuthenticatedRequest(HttpMethod.Get, $"{ApiBaseUrl}/states/all?lamin=51&lomin=-1&lamax=52&lomax=0", ct);
            var response = await http.SendAsync(request, ct);

            var authStatus = HasCredentials
                ? (_accessToken != null ? "OAuth2 authenticated (4,000/day)" : "OAuth2 token failed")
                : "anonymous (400/day)";

            return response.IsSuccessStatusCode
                ? (true, $"OK - {authStatus}")
                : (false, $"HTTP {(int)response.StatusCode} - {authStatus}");
        }
        catch (Exception ex) { return (false, ex.Message); }
    }
}
