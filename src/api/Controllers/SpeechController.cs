using System.Text;
using Microsoft.AspNetCore.Mvc;
using api.Services;

namespace api.Controllers;

[ApiController]
[Route("api/speech")]
public class SpeechController(IHttpClientFactory httpClientFactory, AzureKeyPoolService keyPool) : ControllerBase
{
    private static readonly HashSet<string> AllowedVoices = new(StringComparer.OrdinalIgnoreCase)
    {
        "en-US-JennyNeural", "en-US-GuyNeural", "en-US-AriaNeural", "en-US-DavisNeural",
        "en-US-SaraNeural", "en-US-MichelleNeural", "en-GB-SoniaNeural", "en-GB-RyanNeural",
        "en-AU-NatashaNeural", "fr-FR-DeniseNeural", "de-DE-KatjaNeural", "es-ES-ElviraNeural",
        "it-IT-ElsaNeural", "ja-JP-NanamiNeural", "zh-CN-XiaoxiaoNeural", "ko-KR-SunHiNeural",
        "pt-BR-FranciscaNeural", "ar-EG-SalmaNeural",
    };

    [HttpPost("synthesize")]
    public async Task<IActionResult> Synthesize([FromBody] SynthesizeRequest request, CancellationToken cancellationToken)
    {
        var entry = keyPool.SpeechPool.GetNext();
        if (entry is null)
        {
            var wait = keyPool.SpeechPool.GetMinRetryAfterSeconds();
            return StatusCode(429, new { error = "Rate limit reached, please wait.", retryAfter = wait });
        }

        if (string.IsNullOrEmpty(entry.Key))
            return BadRequest(new { error = "Azure Speech is not configured. Set AzureSpeech:Keys in appsettings." });

        var requestedVoice = request.Voice ?? "en-US-JennyNeural";
        var voice = AllowedVoices.Contains(requestedVoice) ? requestedVoice : "en-US-JennyNeural";
        var text = System.Security.SecurityElement.Escape(request.Text ?? "") ?? "";

        using var http = httpClientFactory.CreateClient();

        // Obtain access token
        var tokenReq = new HttpRequestMessage(HttpMethod.Post,
            $"https://{entry.Region}.api.cognitive.microsoft.com/sts/v1.0/issueToken");
        tokenReq.Headers.Add("Ocp-Apim-Subscription-Key", entry.Key);
        var tokenResp = await http.SendAsync(tokenReq, cancellationToken);

        if (tokenResp.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
        {
            var retryAfterSecs = ParseRetryAfter(tokenResp);
            entry.MarkRateLimited(retryAfterSecs);
            var wait = keyPool.SpeechPool.GetMinRetryAfterSeconds();
            return StatusCode(429, new { error = "Rate limit reached, please wait.", retryAfter = wait });
        }

        if (!tokenResp.IsSuccessStatusCode)
            return StatusCode((int)tokenResp.StatusCode, new { error = "Failed to obtain Speech token" });
        var token = await tokenResp.Content.ReadAsStringAsync(cancellationToken);

        var ssml = $"""
            <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
              <voice name='{voice}'>{text}</voice>
            </speak>
            """;

        var ttsReq = new HttpRequestMessage(HttpMethod.Post,
            $"https://{entry.Region}.tts.speech.microsoft.com/cognitiveservices/v1");
        ttsReq.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        ttsReq.Headers.Add("X-Microsoft-OutputFormat", "audio-24khz-48kbitrate-mono-mp3");
        ttsReq.Content = new StringContent(ssml, Encoding.UTF8, "application/ssml+xml");

        var ttsResp = await http.SendAsync(ttsReq, cancellationToken);

        if (ttsResp.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
        {
            var retryAfterSecs = ParseRetryAfter(ttsResp);
            entry.MarkRateLimited(retryAfterSecs);
            var wait = keyPool.SpeechPool.GetMinRetryAfterSeconds();
            return StatusCode(429, new { error = "Rate limit reached, please wait.", retryAfter = wait });
        }

        if (!ttsResp.IsSuccessStatusCode)
        {
            var err = await ttsResp.Content.ReadAsStringAsync(cancellationToken);
            return StatusCode((int)ttsResp.StatusCode, new { error = err });
        }

        var audioBytes = await ttsResp.Content.ReadAsByteArrayAsync(cancellationToken);
        return File(audioBytes, "audio/mpeg");
    }

    private static int ParseRetryAfter(HttpResponseMessage response, int defaultSeconds = 60)
    {
        if (response.Headers.RetryAfter?.Delta is TimeSpan delta)
            return Math.Max(1, (int)Math.Ceiling(delta.TotalSeconds));
        return defaultSeconds;
    }
}

public record SynthesizeRequest(string? Text, string? Voice);

