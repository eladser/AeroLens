using System.Text.Json;

namespace AeroLens.Api.Services;

// Open-Meteo: Free weather API - 10,000 requests/day, no API key required!
// https://open-meteo.com/
// Rate limits: 10,000/day, 5,000/hour, 600/minute
public class OpenMeteoClient(HttpClient http, ILogger<OpenMeteoClient> log)
{
    public async Task<WeatherData?> GetWeatherAsync(double lat, double lon, CancellationToken ct = default)
    {
        try
        {
            // Open-Meteo API - no key needed, generous limits
            var url = $"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m";
            var response = await http.GetAsync(url, ct);
            response.EnsureSuccessStatusCode();

            using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

            var current = doc.RootElement.GetProperty("current");
            var weatherCode = current.GetProperty("weather_code").GetInt32();

            return new WeatherData(
                Description: GetWeatherDescription(weatherCode),
                Icon: GetWeatherIcon(weatherCode),
                Temp: current.GetProperty("temperature_2m").GetDouble(),
                FeelsLike: current.GetProperty("apparent_temperature").GetDouble(),
                Humidity: current.GetProperty("relative_humidity_2m").GetInt32(),
                WindSpeed: current.GetProperty("wind_speed_10m").GetDouble() / 3.6 // km/h to m/s
            );
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Failed to fetch weather from Open-Meteo for {Lat},{Lon}", lat, lon);
            return null;
        }
    }

    // 5-day forecast data
    public record DailyForecast(
        DateTime Date,
        string Description,
        string Icon,
        double TempMax,
        double TempMin,
        int PrecipitationProbability,
        double WindSpeedMax
    );

    public async Task<List<DailyForecast>?> GetForecastAsync(double lat, double lon, int days = 5, CancellationToken ct = default)
    {
        try
        {
            // Open-Meteo API - 5 day forecast
            var url = $"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}" +
                      $"&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max" +
                      $"&timezone=auto&forecast_days={days}";

            var response = await http.GetAsync(url, ct);
            response.EnsureSuccessStatusCode();

            using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

            if (!doc.RootElement.TryGetProperty("daily", out var daily))
            {
                log.LogWarning("Open-Meteo returned no daily forecast data");
                return null;
            }

            var dates = daily.GetProperty("time").EnumerateArray().ToList();
            var weatherCodes = daily.GetProperty("weather_code").EnumerateArray().ToList();
            var tempMaxes = daily.GetProperty("temperature_2m_max").EnumerateArray().ToList();
            var tempMins = daily.GetProperty("temperature_2m_min").EnumerateArray().ToList();
            var precipProbs = daily.GetProperty("precipitation_probability_max").EnumerateArray().ToList();
            var windSpeeds = daily.GetProperty("wind_speed_10m_max").EnumerateArray().ToList();

            // Ensure all arrays have consistent lengths to prevent index out of range
            var minCount = new[] { dates.Count, weatherCodes.Count, tempMaxes.Count, tempMins.Count, precipProbs.Count, windSpeeds.Count }.Min();
            var maxDays = Math.Min(minCount, days);

            var forecast = new List<DailyForecast>();
            for (int i = 0; i < maxDays; i++)
            {
                var dateString = dates[i].GetString();
                if (string.IsNullOrEmpty(dateString))
                {
                    log.LogWarning("Open-Meteo returned null date at index {Index}", i);
                    continue;
                }

                var weatherCode = weatherCodes[i].GetInt32();
                forecast.Add(new DailyForecast(
                    Date: DateTime.Parse(dateString),
                    Description: GetWeatherDescription(weatherCode),
                    Icon: GetWeatherIcon(weatherCode),
                    TempMax: tempMaxes[i].GetDouble(),
                    TempMin: tempMins[i].GetDouble(),
                    PrecipitationProbability: precipProbs[i].ValueKind == JsonValueKind.Number ? precipProbs[i].GetInt32() : 0,
                    WindSpeedMax: windSpeeds[i].GetDouble() / 3.6 // km/h to m/s
                ));
            }

            return forecast;
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Failed to fetch forecast from Open-Meteo for {Lat},{Lon}", lat, lon);
            return null;
        }
    }

    public async Task<(bool ok, string message)> TestAsync(CancellationToken ct = default)
    {
        try
        {
            // Test with London coordinates
            var url = "https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=-0.1&current=temperature_2m";
            var response = await http.GetAsync(url, ct);
            return response.IsSuccessStatusCode ? (true, "OK (10,000/day, no key)") : (false, $"HTTP {(int)response.StatusCode}");
        }
        catch (Exception ex) { return (false, ex.Message); }
    }

    // WMO Weather interpretation codes to descriptions
    // https://open-meteo.com/en/docs
    private static string GetWeatherDescription(int code) => code switch
    {
        0 => "clear sky",
        1 => "mainly clear",
        2 => "partly cloudy",
        3 => "overcast",
        45 or 48 => "fog",
        51 or 53 or 55 => "drizzle",
        56 or 57 => "freezing drizzle",
        61 or 63 or 65 => "rain",
        66 or 67 => "freezing rain",
        71 or 73 or 75 => "snow",
        77 => "snow grains",
        80 or 81 or 82 => "rain showers",
        85 or 86 => "snow showers",
        95 => "thunderstorm",
        96 or 99 => "thunderstorm with hail",
        _ => "unknown"
    };

    // Map WMO codes to OpenWeatherMap-compatible icons for frontend compatibility
    private static string GetWeatherIcon(int code) => code switch
    {
        0 => "01d",           // clear
        1 => "01d",           // mainly clear
        2 => "02d",           // partly cloudy
        3 => "04d",           // overcast
        45 or 48 => "50d",    // fog
        51 or 53 or 55 => "09d", // drizzle
        56 or 57 => "09d",    // freezing drizzle
        61 or 63 or 65 => "10d", // rain
        66 or 67 => "13d",    // freezing rain
        71 or 73 or 75 => "13d", // snow
        77 => "13d",          // snow grains
        80 or 81 or 82 => "09d", // rain showers
        85 or 86 => "13d",    // snow showers
        95 => "11d",          // thunderstorm
        96 or 99 => "11d",    // thunderstorm with hail
        _ => "01d"
    };
}
