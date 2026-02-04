using System.Text.Json;

namespace AeroLens.Api.Services;

// adsb.lol API - Unlimited, no auth required
// Docs: https://api.adsb.lol/docs
public class AdsbLolClient(HttpClient http, ILogger<AdsbLolClient> log)
{
    private const string ApiBaseUrl = "https://api.adsb.lol/v2";

    public async Task<IReadOnlyList<AircraftState>> GetAircraftInRadiusAsync(
        double lat, double lon, int radiusNm = 250, CancellationToken ct = default)
    {
        try
        {
            var url = $"{ApiBaseUrl}/point/{lat:F4}/{lon:F4}/{radiusNm}";
            var response = await http.GetAsync(url, ct);

            if (!response.IsSuccessStatusCode)
            {
                log.LogWarning("adsb.lol returned HTTP {StatusCode}", (int)response.StatusCode);
                return [];
            }

            using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

            if (!doc.RootElement.TryGetProperty("ac", out var aircraft) ||
                aircraft.ValueKind != JsonValueKind.Array)
            {
                return [];
            }

            var result = new List<AircraftState>();
            foreach (var ac in aircraft.EnumerateArray())
            {
                var state = ParseAircraft(ac);
                if (state.Latitude.HasValue && state.Longitude.HasValue)
                    result.Add(state);
            }

            return result;
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "adsb.lol request failed");
            return [];
        }
    }

    public async Task<IReadOnlyList<AircraftState>> GetGlobalAircraftAsync(CancellationToken ct = default)
    {
        // Single query with max radius covers the entire globe (~4,600 aircraft)
        // The API has no radius cap - 10,800nm = half Earth's circumference = full coverage
        var result = await GetAircraftInRadiusAsync(0, 0, 11000, ct);

        log.LogInformation("adsb.lol global query: {Count} aircraft", result.Count);

        return result;
    }

    private static AircraftState ParseAircraft(JsonElement ac)
    {
        return new AircraftState(
            Icao24: GetString(ac, "hex") ?? "",
            CallSign: GetString(ac, "flight")?.Trim(),
            Longitude: GetDouble(ac, "lon"),
            Latitude: GetDouble(ac, "lat"),
            Altitude: GetAltitude(ac),
            Velocity: GetDouble(ac, "gs") is double gs ? gs * 0.514444 : null,
            Heading: GetDouble(ac, "track"),
            OnGround: GetString(ac, "alt_baro") == "ground",
            AircraftType: GetString(ac, "t")
        );
    }

    private static string? GetString(JsonElement el, string prop) =>
        el.TryGetProperty(prop, out var p) && p.ValueKind == JsonValueKind.String
            ? p.GetString() : null;

    private static double? GetDouble(JsonElement el, string prop) =>
        el.TryGetProperty(prop, out var p) && p.ValueKind == JsonValueKind.Number
            ? p.GetDouble() : null;

    private static double? GetAltitude(JsonElement ac)
    {
        if (ac.TryGetProperty("alt_baro", out var alt))
        {
            if (alt.ValueKind == JsonValueKind.Number)
                return alt.GetDouble() * 0.3048;
            if (alt.ValueKind == JsonValueKind.String && alt.GetString() == "ground")
                return 0;
        }
        if (ac.TryGetProperty("alt_geom", out var altGeom) && altGeom.ValueKind == JsonValueKind.Number)
            return altGeom.GetDouble() * 0.3048;

        return null;
    }

    public async Task<(bool ok, string message)> TestAsync(CancellationToken ct = default)
    {
        try
        {
            var url = $"{ApiBaseUrl}/point/51.5/-0.1/50";
            var response = await http.GetAsync(url, ct);

            if (!response.IsSuccessStatusCode)
                return (false, $"HTTP {(int)response.StatusCode}");

            using var doc = await JsonDocument.ParseAsync(
                await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);

            var count = doc.RootElement.TryGetProperty("ac", out var ac)
                ? ac.GetArrayLength() : 0;

            return (true, $"OK - {count} aircraft (unlimited)");
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
    }
}
