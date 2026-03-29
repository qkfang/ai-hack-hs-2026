namespace api.Services;

public abstract class PoolEntry
{
    private long _rateLimitedUntilTicks;

    public bool IsAvailable => DateTime.UtcNow.Ticks >= Interlocked.Read(ref _rateLimitedUntilTicks);

    public void MarkRateLimited(int retryAfterSeconds = 60)
        => Interlocked.Exchange(ref _rateLimitedUntilTicks,
            DateTime.UtcNow.AddSeconds(retryAfterSeconds).Ticks);

    public int GetRetryAfterSeconds()
    {
        var until = new DateTime(Interlocked.Read(ref _rateLimitedUntilTicks), DateTimeKind.Utc);
        var s = (until - DateTime.UtcNow).TotalSeconds;
        return s > 0 ? (int)Math.Ceiling(s) : 0;
    }
}

public class FoundryEntry : PoolEntry
{
    public string Url { get; init; } = "";
    public string Key { get; init; } = "";
    public string TenantId { get; init; } = "";
}

public class TranslatorEntry : PoolEntry
{
    public string Url { get; init; } = "https://api.cognitive.microsofttranslator.com";
    public string Key { get; init; } = "";
    public string Region { get; init; } = "";
}

public class SpeechEntry : PoolEntry
{
    public string Key { get; init; } = "";
    public string Region { get; init; } = "eastus";
}

public class KeyPool<T>(IReadOnlyList<T> entries) where T : PoolEntry
{
    private int _cursor = -1;

    public int Count => entries.Count;

    public T? GetNext()
    {
        var count = entries.Count;
        if (count == 0) return null;
        for (int i = 0; i < count; i++)
        {
            var idx = (int)((uint)Interlocked.Increment(ref _cursor) % (uint)count);
            if (entries[idx].IsAvailable) return entries[idx];
        }
        return null;
    }

    public int GetMinRetryAfterSeconds()
        => entries.Count == 0 ? 15
            : entries.Select(e => e.GetRetryAfterSeconds()).Where(s => s > 0).DefaultIfEmpty(15).Min();
}

public class AzureKeyPoolService
{
    public KeyPool<FoundryEntry> FoundryPool { get; }
    public KeyPool<TranslatorEntry> TranslatorPool { get; }
    public KeyPool<SpeechEntry> SpeechPool { get; }

    public AzureKeyPoolService(IConfiguration config)
    {
        FoundryPool = BuildFoundryPool(config);
        TranslatorPool = BuildTranslatorPool(config);
        SpeechPool = BuildSpeechPool(config);
    }

    private static KeyPool<FoundryEntry> BuildFoundryPool(IConfiguration config)
    {
        var entries = config.GetSection("AzureAIFoundry:Endpoints").GetChildren()
            .Select(s => new FoundryEntry
            {
                Url = s["Url"] ?? "",
                Key = s["Key"] ?? "",
                TenantId = s["TenantId"] ?? ""
            })
            .Where(e => !string.IsNullOrEmpty(e.Url))
            .ToList();

        if (entries.Count == 0)
        {
            var url = config["AzureAIFoundry:Endpoint"] ?? "";
            if (!string.IsNullOrEmpty(url))
                entries.Add(new FoundryEntry
                {
                    Url = url,
                    Key = config["AzureAIFoundry:Key"] ?? "",
                    TenantId = config["AzureAIFoundry:TenantId"] ?? ""
                });
        }
        return new KeyPool<FoundryEntry>(entries);
    }

    private static KeyPool<TranslatorEntry> BuildTranslatorPool(IConfiguration config)
    {
        var entries = config.GetSection("AzureTranslator:Keys").GetChildren()
            .Select(s => new TranslatorEntry
            {
                Url = s["Url"] ?? "https://api.cognitive.microsofttranslator.com",
                Key = s["Key"] ?? "",
                Region = s["Region"] ?? ""
            })
            .Where(e => !string.IsNullOrEmpty(e.Key))
            .ToList();

        if (entries.Count == 0)
        {
            var key = config["AzureTranslator:Key"] ?? "";
            if (!string.IsNullOrEmpty(key))
                entries.Add(new TranslatorEntry
                {
                    Url = config["AzureTranslator:Endpoint"] ?? "https://api.cognitive.microsofttranslator.com",
                    Key = key,
                    Region = config["AzureTranslator:Region"] ?? ""
                });
        }
        return new KeyPool<TranslatorEntry>(entries);
    }

    private static KeyPool<SpeechEntry> BuildSpeechPool(IConfiguration config)
    {
        var entries = config.GetSection("AzureSpeech:Keys").GetChildren()
            .Select(s => new SpeechEntry
            {
                Key = s["Key"] ?? "",
                Region = s["Region"] ?? "eastus"
            })
            .Where(e => !string.IsNullOrEmpty(e.Key))
            .ToList();

        if (entries.Count == 0)
        {
            var key = config["AzureSpeech:Key"] ?? "";
            if (!string.IsNullOrEmpty(key))
                entries.Add(new SpeechEntry
                {
                    Key = key,
                    Region = config["AzureSpeech:Region"] ?? "eastus"
                });
        }
        return new KeyPool<SpeechEntry>(entries);
    }
}
