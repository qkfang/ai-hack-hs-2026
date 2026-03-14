using System.Text;
using System.Text.Json;
using Azure;
using Azure.AI.OpenAI;
using Microsoft.AspNetCore.Mvc;
using OpenAI.Chat;

namespace api.Controllers;

[ApiController]
[Route("api/chat")]
public class ChatController(IConfiguration config, IHttpClientFactory httpClientFactory) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    [HttpPost]
    public async Task Chat([FromBody] ChatRequest request, CancellationToken cancellationToken)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";

        try
        {
            var chatClient = BuildChatClient(request.Model ?? "");
            if (chatClient is null)
            {
                await SendSseAsync(new { type = "error", message = "AzureAIFoundry or OpenAI credentials must be configured in appsettings" }, cancellationToken);
                return;
            }

            // Build message list
            var conversationMessages = new List<ChatMessage>();
            if (!string.IsNullOrEmpty(request.SystemPrompt))
                conversationMessages.Add(new SystemChatMessage(request.SystemPrompt));
            foreach (var m in request.Messages ?? [])
                conversationMessages.Add(m.Role == "user"
                    ? (ChatMessage)new UserChatMessage(m.Content ?? "")
                    : new AssistantChatMessage(m.Content ?? ""));

            // Build tool definitions
            var enabledTools = (request.McpTools ?? []).Where(t => t.Enabled && !string.IsNullOrWhiteSpace(t.Name)).ToList();
            var chatTools = enabledTools.Select(t =>
            {
                var safeName = t.Name.Trim().Replace(' ', '_');
                BinaryData paramSchema;
                try { paramSchema = BinaryData.FromString(t.Parameters ?? "{}"); }
                catch { paramSchema = BinaryData.FromString("""{"type":"object","properties":{}}"""); }
                return ChatTool.CreateFunctionTool(safeName, t.Description ?? "", paramSchema);
            }).ToList();

            var options = new ChatCompletionOptions
            {
                Temperature = (float)(request.Temperature ?? 0.7),
                MaxOutputTokenCount = request.MaxTokens ?? 2048,
                TopP = (float)(request.TopP ?? 1.0),
                PresencePenalty = (float)(request.PresencePenalty ?? 0.0),
                FrequencyPenalty = (float)(request.FrequencyPenalty ?? 0.0),
            };
            foreach (var tool in chatTools) options.Tools.Add(tool);

            const int MaxIterations = 10;
            for (int iteration = 0; iteration < MaxIterations; iteration++)
            {
                var toolCallAccumulator = new Dictionary<int, (string Id, string Name, string Arguments)>();
                var assistantContent = new StringBuilder();

                await foreach (var update in chatClient.CompleteChatStreamingAsync(conversationMessages, options, cancellationToken))
                {
                    foreach (var part in update.ContentUpdate)
                    {
                        if (!string.IsNullOrEmpty(part.Text))
                        {
                            assistantContent.Append(part.Text);
                            await SendSseAsync(new { type = "content", content = part.Text }, cancellationToken);
                        }
                    }

                    foreach (var tcUpdate in update.ToolCallUpdates)
                    {
                        if (!toolCallAccumulator.ContainsKey(tcUpdate.Index))
                            toolCallAccumulator[tcUpdate.Index] = ("", "", "");
                        var (existingId, existingName, existingArgs) = toolCallAccumulator[tcUpdate.Index];
                        toolCallAccumulator[tcUpdate.Index] = (
                            string.IsNullOrEmpty(tcUpdate.ToolCallId) ? existingId : tcUpdate.ToolCallId,
                            existingName + (tcUpdate.FunctionName ?? ""),
                            existingArgs + (tcUpdate.FunctionArgumentsUpdate?.ToString() ?? "")
                        );
                    }
                }

                var toolCalls = toolCallAccumulator.Values.ToList();
                if (toolCalls.Count == 0)
                {
                    conversationMessages.Add(new AssistantChatMessage(assistantContent.ToString()));
                    break;
                }

                // Build assistant message with tool calls
                var assistantMsg = new AssistantChatMessage(assistantContent.ToString());
                foreach (var tc in toolCalls)
                    assistantMsg.ToolCalls.Add(ChatToolCall.CreateFunctionToolCall(tc.Id, tc.Name, BinaryData.FromString(tc.Arguments)));
                conversationMessages.Add(assistantMsg);

                // Execute each tool call
                foreach (var tc in toolCalls)
                {
                    await SendSseAsync(new { type = "tool_call", name = tc.Name, arguments = tc.Arguments }, cancellationToken);

                    var toolResult = await ExecuteMcpToolAsync(tc.Name, tc.Arguments, enabledTools, httpClientFactory, cancellationToken);
                    await SendSseAsync(new { type = "tool_result", name = tc.Name, result = toolResult }, cancellationToken);
                    conversationMessages.Add(new ToolChatMessage(tc.Id, toolResult));
                }
            }

            await SendSseAsync(new { type = "done" }, cancellationToken);
        }
        catch (OperationCanceledException)
        {
            // Client disconnected — nothing to do
        }
        catch (Exception ex)
        {
            await SendSseAsync(new { type = "error", message = ex.Message }, cancellationToken);
        }
    }

    private ChatClient? BuildChatClient(string model)
    {
        var endpoint = config["AzureAIFoundry:Endpoint"] ?? "";
        var apiKey = config["AzureAIFoundry:ApiKey"] ?? "";
        var defaultDeployment = config["AzureAIFoundry:Deployment"] ?? "gpt-4o";
        var deployment = string.IsNullOrEmpty(model) ? defaultDeployment : model;
        var openAiKey = config["OpenAI:ApiKey"] ?? "";

        if (!string.IsNullOrEmpty(endpoint) && !string.IsNullOrEmpty(apiKey))
        {
            var azureClient = new AzureOpenAIClient(new Uri(endpoint), new AzureKeyCredential(apiKey));
            return azureClient.GetChatClient(deployment);
        }

        if (!string.IsNullOrEmpty(openAiKey))
        {
            var openAiClient = new OpenAI.OpenAIClient(openAiKey);
            return openAiClient.GetChatClient(deployment);
        }

        return null;
    }

    private static async Task<string> ExecuteMcpToolAsync(string toolName, string arguments, List<McpToolDef> enabledTools, IHttpClientFactory httpClientFactory, CancellationToken cancellationToken)
    {
        var toolDef = enabledTools.FirstOrDefault(t => t.Name.Trim().Replace(' ', '_') == toolName);
        if (toolDef is null || string.IsNullOrEmpty(toolDef.ServerUrl))
            return JsonSerializer.Serialize(new { error = "No MCP server URL configured for this tool" });

        try
        {
            using var httpClient = httpClientFactory.CreateClient();
            var mcpRequest = new McpToolCallRequest(
                Jsonrpc: "2.0",
                Method: "tools/call",
                Params: new { name = toolName, arguments = JsonSerializer.Deserialize<JsonElement>(arguments) },
                Id: DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
            var payload = JsonSerializer.Serialize(mcpRequest);
            var resp = await httpClient.PostAsync(toolDef.ServerUrl,
                new StringContent(payload, Encoding.UTF8, "application/json"), cancellationToken);
            var json = await resp.Content.ReadAsStringAsync(cancellationToken);
            if (!resp.IsSuccessStatusCode)
                return JsonSerializer.Serialize(new { error = $"MCP server responded with {(int)resp.StatusCode}: {resp.ReasonPhrase}" });

            var parsed = JsonSerializer.Deserialize<JsonElement>(json);
            if (parsed.TryGetProperty("error", out var err))
                return JsonSerializer.Serialize(new { error = err.TryGetProperty("message", out var msg) ? msg.GetString() : "MCP tool error" });

            if (parsed.TryGetProperty("result", out var result) &&
                result.TryGetProperty("content", out var content) &&
                content.ValueKind == JsonValueKind.Array)
            {
                var texts = new List<string>();
                foreach (var item in content.EnumerateArray())
                    if (item.TryGetProperty("text", out var text)) texts.Add(text.GetString() ?? "");
                return string.Join("\n", texts);
            }

            return parsed.TryGetProperty("result", out var r) ? r.ToString() : json;
        }
        catch (Exception ex)
        {
            return JsonSerializer.Serialize(new { error = ex.Message });
        }
    }

    private async Task SendSseAsync(object data, CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(data, JsonOptions);
        await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);
    }
}

public record ChatMessageParam(string Role, string? Content);
public record McpToolDef(string Name, string Description, string ServerUrl, bool Enabled, string? Parameters);
public record ChatRequest(
    ChatMessageParam[]? Messages,
    string? SystemPrompt,
    string? Model,
    double? Temperature,
    int? MaxTokens,
    double? TopP,
    double? PresencePenalty,
    double? FrequencyPenalty,
    McpToolDef[]? McpTools);

/// <summary>JSON-RPC 2.0 tool-call request. The <c>params</c> field is required by the spec.</summary>
internal record McpToolCallRequest(
    [property: System.Text.Json.Serialization.JsonPropertyName("jsonrpc")] string Jsonrpc,
    [property: System.Text.Json.Serialization.JsonPropertyName("method")] string Method,
    [property: System.Text.Json.Serialization.JsonPropertyName("params")] object Params,
    [property: System.Text.Json.Serialization.JsonPropertyName("id")] long Id);
