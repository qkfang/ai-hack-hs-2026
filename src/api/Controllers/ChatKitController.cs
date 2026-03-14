using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/chatkit")]
public class ChatKitController(IConfiguration config, IHttpClientFactory httpClientFactory) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    [HttpPost("session")]
    public async Task<IActionResult> CreateSession()
    {
        var apiKey = config["OpenAI:ApiKey"] ?? "";
        var workflowId = config["OpenAI:ChatKitWorkflowId"] ?? "";

        if (string.IsNullOrEmpty(apiKey) || string.IsNullOrEmpty(workflowId))
            return BadRequest(new { error = "OpenAI ApiKey and ChatKitWorkflowId must be configured in appsettings" });

        var client = httpClientFactory.CreateClient();
        var body = JsonSerializer.Serialize(new
        {
            user = Guid.NewGuid().ToString(),
            workflow = new { id = workflowId },
        }, JsonOptions);

        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/beta/chatkit/sessions")
        {
            Headers = { { "Authorization", $"Bearer {apiKey}" } },
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };

        try
        {
            var response = await client.SendAsync(req);
            var json = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, new { error = $"ChatKit API error: {json}" });

            var parsed = JsonSerializer.Deserialize<JsonElement>(json);
            var clientSecret = parsed.TryGetProperty("client_secret", out var cs) ? cs.GetString() : null;
            if (string.IsNullOrEmpty(clientSecret))
                return StatusCode(500, new { error = "ChatKit did not return a client_secret" });

            return Ok(new { client_secret = clientSecret });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
