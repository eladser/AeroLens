using System.Text.Json;

namespace AeroLens.Api.Services;

public record WeatherData(
    string Description,
    string Icon,
    double Temp,
    double FeelsLike,
    int Humidity,
    double WindSpeed
);

public class WeatherClient(HttpClient http, IConfiguration config, ILogger<WeatherClient> log)
{
    private readonly string _apiKey = config["OpenWeatherMap:ApiKey"] ?? "";

    public async Task<WeatherData?> GetWeatherAsync(double lat, double lon, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            log.LogWarning("OpenWeatherMap API key not configured");
            return null;
        }

        try
        {
            var url = $"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units=metric&appid={_apiKey}";
            var response = await http.GetAsync(url, ct);
            response.EnsureSuccessStatusCode();

            using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

            var weather = doc.RootElement.GetProperty("weather")[0];
            var main = doc.RootElement.GetProperty("main");
            var wind = doc.RootElement.GetProperty("wind");

            return new WeatherData(
                Description: weather.GetProperty("description").GetString() ?? "",
                Icon: weather.GetProperty("icon").GetString() ?? "",
                Temp: main.GetProperty("temp").GetDouble(),
                FeelsLike: main.GetProperty("feels_like").GetDouble(),
                Humidity: main.GetProperty("humidity").GetInt32(),
                WindSpeed: wind.GetProperty("speed").GetDouble()
            );
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Failed to fetch weather for {Lat},{Lon}", lat, lon);
            return null;
        }
    }

    public async Task<(bool ok, string message)> TestAsync(CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_apiKey)) return (false, "API key not configured");
        try
        {
            // Test with London coordinates
            var url = $"https://api.openweathermap.org/data/2.5/weather?lat=51.5&lon=-0.1&units=metric&appid={_apiKey}";
            var response = await http.GetAsync(url, ct);
            return response.IsSuccessStatusCode ? (true, "OK") : (false, $"HTTP {(int)response.StatusCode}");
        }
        catch (Exception ex) { return (false, ex.Message); }
    }
}
