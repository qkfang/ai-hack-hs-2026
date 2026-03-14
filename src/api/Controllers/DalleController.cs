using Azure.AI.OpenAI;
using Azure.Identity;
using Microsoft.AspNetCore.Mvc;
using OpenAI.Images;
using api.Services;

namespace api.Controllers;

[ApiController]
[Route("api/dalle")]
public class DalleController(UserStore store, IConfiguration config) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> GenerateImage([FromBody] DalleRequest request)
    {
        var description = request.Description?.Trim() ?? "";
        if (string.IsNullOrEmpty(description))
            return BadRequest(new { error = "description is required" });

        var endpoint = config["AzureAIFoundry:Endpoint"] ?? "";
        var dalleDeployment = config["AzureAIFoundry:DalleDeployment"] ?? "dall-e-3";
        var openAiKey = config["OpenAI:ApiKey"] ?? "";

        ImageClient imageClient;
        if (!string.IsNullOrEmpty(endpoint))
        {
            var tenantId = config["AzureAIFoundry:TenantId"] ?? "";
            var credential = string.IsNullOrEmpty(tenantId)
                ? new DefaultAzureCredential()
                : new DefaultAzureCredential(new DefaultAzureCredentialOptions { TenantId = tenantId });
            var azureClient = new AzureOpenAIClient(new Uri(endpoint), credential);
            imageClient = azureClient.GetImageClient(dalleDeployment);
        }
        else if (!string.IsNullOrEmpty(openAiKey))
        {
            var openAiClient = new OpenAI.OpenAIClient(openAiKey);
            imageClient = openAiClient.GetImageClient("dall-e-3");
        }
        else
        {
            return StatusCode(400, new { error = "AzureAIFoundry or OpenAI credentials must be configured in appsettings" });
        }

        try
        {
            var result = await imageClient.GenerateImageAsync(description, new ImageGenerationOptions
            {
                Size = GeneratedImageSize.W1024xH1024,
                ResponseFormat = GeneratedImageFormat.Bytes,
            });

            string imageUrl;
            if (result.Value.ImageBytes != null)
            {
                var base64 = Convert.ToBase64String(result.Value.ImageBytes.ToArray());
                imageUrl = $"data:image/png;base64,{base64}";
            }
            else
            {
                imageUrl = result.Value.ImageUri?.ToString() ?? "";
            }

            if (string.IsNullOrEmpty(imageUrl))
                return StatusCode(500, new { error = "DALL-E did not return an image. Please check your API configuration or try again later." });

            if (request.UserId.HasValue)
                store.AddComic(request.UserId.Value, description, imageUrl);

            return Ok(new { imageUrl });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

public record DalleRequest(string? Description, int? UserId);
