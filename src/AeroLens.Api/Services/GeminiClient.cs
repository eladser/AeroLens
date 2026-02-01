using System.Text;
using System.Text.Json;

namespace AeroLens.Api.Services;

public record PredictionResult(
    string Risk,
    int Confidence,
    string Reason
);

// AI prediction with Groq (primary), Mistral (secondary), Gemini (tertiary)
// Rate limits:
// - Groq: 14,400 req/day free, fastest inference
// - Mistral: 1B tokens/month free, good quality
// - Gemini: 50 req/day (2.5 Pro), 1000 req/day (Flash)
public class GeminiClient(HttpClient http, IConfiguration config, ILogger<GeminiClient> log)
{
    private readonly string _groqKey = config["Groq:ApiKey"] ?? "";
    private readonly string _mistralKey = config["Mistral:ApiKey"] ?? "";
    private readonly string _geminiKey = config["Gemini:ApiKey"] ?? "";

    public async Task<PredictionResult?> PredictDelayAsync(
        double? altitude,
        double? velocity,
        WeatherData? weather,
        CancellationToken ct = default)
    {
        var altFt = altitude.HasValue ? Math.Round(altitude.Value * 3.281) : 0;
        var spdKts = velocity.HasValue ? Math.Round(velocity.Value * 1.944) : 0;
        var weatherInfo = weather != null
            ? $"{weather.Description}, {weather.Temp:F0}°C, wind {weather.WindSpeed:F0} m/s"
            : "unknown";

        // Try Groq first (fastest), then Mistral (high limit), then Gemini
        if (!string.IsNullOrEmpty(_groqKey))
        {
            var result = await TryGroqAsync(altFt, spdKts, weatherInfo, ct);
            if (result != null) return result;
        }

        if (!string.IsNullOrEmpty(_mistralKey))
        {
            var result = await TryMistralAsync(altFt, spdKts, weatherInfo, ct);
            if (result != null) return result;
        }

        if (!string.IsNullOrEmpty(_geminiKey))
        {
            var result = await TryGeminiAsync(altFt, spdKts, weatherInfo, ct);
            if (result != null) return result;
        }

        log.LogWarning("No AI API keys configured or all failed");
        return null;
    }

    private async Task<PredictionResult?> TryGroqAsync(double altFt, double spdKts, string weatherInfo, CancellationToken ct)
    {
        try
        {
            var prompt = $@"Flight: {altFt}ft altitude, {spdKts}kts speed, Weather: {weatherInfo}
Return ONLY JSON: {{""risk"":""low"" or ""medium"" or ""high"",""confidence"":0-100,""reason"":""brief""}}";

            var body = new
            {
                model = "llama-3.1-8b-instant",
                messages = new[] { new { role = "user", content = prompt } },
                temperature = 0.1,
                max_tokens = 100
            };

            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions");
            request.Headers.Add("Authorization", $"Bearer {_groqKey}");
            request.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

            var response = await http.SendAsync(request, ct);
            response.EnsureSuccessStatusCode();

            using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            var text = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "";

            return ParseResult(text);
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Groq prediction failed, trying Mistral");
            return null;
        }
    }

    private async Task<PredictionResult?> TryMistralAsync(double altFt, double spdKts, string weatherInfo, CancellationToken ct)
    {
        try
        {
            var prompt = $@"Flight: {altFt}ft altitude, {spdKts}kts speed, Weather: {weatherInfo}
Return ONLY JSON: {{""risk"":""low"" or ""medium"" or ""high"",""confidence"":0-100,""reason"":""brief""}}";

            var body = new
            {
                model = "mistral-small-latest",
                messages = new[] { new { role = "user", content = prompt } },
                temperature = 0.1,
                max_tokens = 100
            };

            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.mistral.ai/v1/chat/completions");
            request.Headers.Add("Authorization", $"Bearer {_mistralKey}");
            request.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

            var response = await http.SendAsync(request, ct);
            response.EnsureSuccessStatusCode();

            using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            var text = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "";

            return ParseResult(text);
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Mistral prediction failed, trying Gemini");
            return null;
        }
    }

    private async Task<PredictionResult?> TryGeminiAsync(double altFt, double spdKts, string weatherInfo, CancellationToken ct)
    {
        try
        {
            var prompt = $@"Flight: {altFt}ft altitude, {spdKts}kts speed, Weather: {weatherInfo}
Return ONLY JSON: {{""risk"":""low"" or ""medium"" or ""high"",""confidence"":0-100,""reason"":""brief""}}";

            var body = new
            {
                contents = new[] { new { parts = new[] { new { text = prompt } } } },
                generationConfig = new { temperature = 0.1, maxOutputTokens = 100 }
            };

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={_geminiKey}";
            var response = await http.PostAsync(url, new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"), ct);
            response.EnsureSuccessStatusCode();

            using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            var text = doc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString() ?? "";

            return ParseResult(text);
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Gemini prediction failed");
            return null;
        }
    }

    private PredictionResult? ParseResult(string text)
    {
        text = text.Trim();
        if (text.StartsWith("```json")) text = text[7..];
        if (text.StartsWith("```")) text = text[3..];
        if (text.EndsWith("```")) text = text[..^3];
        text = text.Trim();

        using var doc = JsonDocument.Parse(text);
        var root = doc.RootElement;

        return new PredictionResult(
            Risk: root.GetProperty("risk").GetString() ?? "unknown",
            Confidence: root.GetProperty("confidence").GetInt32(),
            Reason: root.GetProperty("reason").GetString() ?? ""
        );
    }

    // Health check methods for API testing
    public async Task<(bool ok, string message)> TestGroqAsync(CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_groqKey)) return (false, "API key not configured");
        try
        {
            var body = new { model = "llama-3.1-8b-instant", messages = new[] { new { role = "user", content = "hi" } }, max_tokens = 5 };
            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions");
            request.Headers.Add("Authorization", $"Bearer {_groqKey}");
            request.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
            var response = await http.SendAsync(request, ct);
            return response.IsSuccessStatusCode ? (true, "OK") : (false, $"HTTP {(int)response.StatusCode}");
        }
        catch (Exception ex) { return (false, ex.Message); }
    }

    public async Task<(bool ok, string message)> TestMistralAsync(CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_mistralKey)) return (false, "API key not configured");
        try
        {
            var body = new { model = "mistral-small-latest", messages = new[] { new { role = "user", content = "hi" } }, max_tokens = 5 };
            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.mistral.ai/v1/chat/completions");
            request.Headers.Add("Authorization", $"Bearer {_mistralKey}");
            request.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
            var response = await http.SendAsync(request, ct);
            return response.IsSuccessStatusCode ? (true, "OK (1B tokens/mo)") : (false, $"HTTP {(int)response.StatusCode}");
        }
        catch (Exception ex) { return (false, ex.Message); }
    }

    public async Task<(bool ok, string message)> TestGeminiAsync(CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_geminiKey)) return (false, "API key not configured");
        try
        {
            var body = new { contents = new[] { new { parts = new[] { new { text = "hi" } } } }, generationConfig = new { maxOutputTokens = 5 } };
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={_geminiKey}";
            var response = await http.PostAsync(url, new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"), ct);
            return response.IsSuccessStatusCode ? (true, "OK") : (false, $"HTTP {(int)response.StatusCode}");
        }
        catch (Exception ex) { return (false, ex.Message); }
    }
}
