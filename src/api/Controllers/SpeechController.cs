using System.Text;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/speech")]
public class SpeechController(IConfiguration config, IHttpClientFactory httpClientFactory) : ControllerBase
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
        var key = config["AzureSpeech:Key"] ?? "";
        var region = config["AzureSpeech:Region"] ?? "eastus";

        if (string.IsNullOrEmpty(key))
            return BadRequest(new { error = "Azure Speech is not configured. Set AzureSpeech:Key in appsettings." });

        var requestedVoice = request.Voice ?? "en-US-JennyNeural";
        var voice = AllowedVoices.Contains(requestedVoice) ? requestedVoice : "en-US-JennyNeural";
        var text = System.Security.SecurityElement.Escape(request.Text ?? "") ?? "";

        using var http = httpClientFactory.CreateClient();

        // Obtain access token
        var tokenReq = new HttpRequestMessage(HttpMethod.Post,
            $"https://{region}.api.cognitive.microsoft.com/sts/v1.0/issueToken");
        tokenReq.Headers.Add("Ocp-Apim-Subscription-Key", key);
        var tokenResp = await http.SendAsync(tokenReq, cancellationToken);
        if (!tokenResp.IsSuccessStatusCode)
            return StatusCode((int)tokenResp.StatusCode, new { error = "Failed to obtain Speech token" });
        var token = await tokenResp.Content.ReadAsStringAsync(cancellationToken);

        var ssml = $"""
            <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
              <voice name='{voice}'>{text}</voice>
            </speak>
            """;

        var ttsReq = new HttpRequestMessage(HttpMethod.Post,
            $"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1");
        ttsReq.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        ttsReq.Headers.Add("X-Microsoft-OutputFormat", "audio-24khz-48kbitrate-mono-mp3");
        ttsReq.Content = new StringContent(ssml, Encoding.UTF8, "application/ssml+xml");

        var ttsResp = await http.SendAsync(ttsReq, cancellationToken);
        if (!ttsResp.IsSuccessStatusCode)
        {
            var err = await ttsResp.Content.ReadAsStringAsync(cancellationToken);
            return StatusCode((int)ttsResp.StatusCode, new { error = err });
        }

        var audioBytes = await ttsResp.Content.ReadAsByteArrayAsync(cancellationToken);
        return File(audioBytes, "audio/mpeg");
    }
}

public record SynthesizeRequest(string? Text, string? Voice);
