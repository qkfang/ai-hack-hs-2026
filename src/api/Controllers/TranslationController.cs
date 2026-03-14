using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/translate")]
public class TranslationController(IConfiguration config, IHttpClientFactory httpClientFactory) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Translate([FromBody] TranslateRequest request, CancellationToken cancellationToken)
    {
        var endpoint = config["AzureTranslator:Endpoint"] ?? "https://api.cognitive.microsofttranslator.com";
        var key = config["AzureTranslator:Key"] ?? "";
        var region = config["AzureTranslator:Region"] ?? "";

        if (string.IsNullOrEmpty(key))
            return BadRequest(new { error = "Azure Translator is not configured. Set AzureTranslator:Key in appsettings." });

        var targetLang = request.TargetLanguage ?? "en";
        var url = $"{endpoint}/translate?api-version=3.0&to={targetLang}";
        if (!string.IsNullOrEmpty(request.SourceLanguage))
            url += $"&from={request.SourceLanguage}";

        using var http = httpClientFactory.CreateClient();
        http.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Key", key);
        if (!string.IsNullOrEmpty(region))
            http.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Region", region);

        var body = JsonSerializer.Serialize(new[] { new { Text = request.Text ?? "" } });
        var response = await http.PostAsync(url, new StringContent(body, Encoding.UTF8, "application/json"), cancellationToken);

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
}

public record TranslateRequest(string? Text, string? TargetLanguage, string? SourceLanguage);
