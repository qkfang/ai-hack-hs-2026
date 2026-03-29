using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using api.Services;

namespace api.Controllers;

[ApiController]
[Route("api/translate")]
public class TranslationController(IHttpClientFactory httpClientFactory, AzureKeyPoolService keyPool) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Translate([FromBody] TranslateRequest request, CancellationToken cancellationToken)
    {
        var entry = keyPool.TranslatorPool.GetNext();
        if (entry is null)
        {
            var wait = keyPool.TranslatorPool.GetMinRetryAfterSeconds();
            return StatusCode(429, new { error = "Rate limit reached, please wait.", retryAfter = wait });
        }

        if (string.IsNullOrEmpty(entry.Key))
            return BadRequest(new { error = "Azure Translator is not configured. Set AzureTranslator:Keys in appsettings." });

        var targetLang = request.TargetLanguage ?? "en";
        var url = $"{entry.Url}/translate?api-version=3.0&to={targetLang}";
        if (!string.IsNullOrEmpty(request.SourceLanguage))
            url += $"&from={request.SourceLanguage}";

        using var http = httpClientFactory.CreateClient();
        http.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Key", entry.Key);
        if (!string.IsNullOrEmpty(entry.Region))
            http.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Region", entry.Region);

        var body = JsonSerializer.Serialize(new[] { new { Text = request.Text ?? "" } });
        var response = await http.PostAsync(url, new StringContent(body, Encoding.UTF8, "application/json"), cancellationToken);

        if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
        {
            var retryAfterSecs = ParseRetryAfter(response);
            entry.MarkRateLimited(retryAfterSecs);
            var wait = keyPool.TranslatorPool.GetMinRetryAfterSeconds();
            return StatusCode(429, new { error = "Rate limit reached, please wait.", retryAfter = wait });
        }

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(cancellationToken);
            return StatusCode((int)response.StatusCode, new { error = err });
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        var parsed = JsonSerializer.Deserialize<JsonElement>(json);
        var translated = parsed[0].GetProperty("translations")[0].GetProperty("text").GetString() ?? "";
        var detectedLanguage = "";

        if (parsed[0].TryGetProperty("detectedLanguage", out var detLang) &&
            detLang.TryGetProperty("language", out var langCode))
            detectedLanguage = langCode.GetString() ?? "";

        return Ok(new { translatedText = translated, detectedLanguage });
    }

    [HttpGet("languages")]
    public async Task<IActionResult> Languages(CancellationToken cancellationToken)
    {
        using var http = httpClientFactory.CreateClient();
        var response = await http.GetAsync(
            "https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation",
            cancellationToken);
        if (!response.IsSuccessStatusCode)
            return StatusCode((int)response.StatusCode, new { error = "Could not fetch language list" });
        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        return Content(json, "application/json");
    }

    private static int ParseRetryAfter(HttpResponseMessage response, int defaultSeconds = 60)
    {
        if (response.Headers.RetryAfter?.Delta is TimeSpan delta)
            return Math.Max(1, (int)Math.Ceiling(delta.TotalSeconds));
        return defaultSeconds;
    }
}

public record TranslateRequest(string? Text, string? TargetLanguage, string? SourceLanguage);

