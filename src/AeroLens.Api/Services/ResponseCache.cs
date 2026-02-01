using System.Collections.Concurrent;

namespace AeroLens.Api.Services;

public class ResponseCache
{
    private readonly ConcurrentDictionary<string, CacheEntry> _cache = new();
    private readonly ILogger<ResponseCache> _log;

    public ResponseCache(ILogger<ResponseCache> log) => _log = log;

    public T? Get<T>(string key) where T : class
    {
        if (_cache.TryGetValue(key, out var entry) && entry.ExpiresAt > DateTime.UtcNow)
        {
            _log.LogDebug("Cache hit: {Key}", key);
            return entry.Value as T;
        }
        return null;
    }

    public void Set<T>(string key, T value, TimeSpan ttl) where T : class
    {
        var entry = new CacheEntry(value, DateTime.UtcNow.Add(ttl));
        _cache[key] = entry;
        _log.LogDebug("Cache set: {Key}, TTL: {Ttl}s", key, ttl.TotalSeconds);
    }

    public void Remove(string key) => _cache.TryRemove(key, out _);

    public void Cleanup()
    {
        var now = DateTime.UtcNow;
        var expired = _cache.Where(x => x.Value.ExpiresAt <= now).Select(x => x.Key).ToList();
        foreach (var key in expired)
            _cache.TryRemove(key, out _);

        if (expired.Count > 0)
            _log.LogDebug("Cache cleanup: removed {Count} expired entries", expired.Count);
    }

    private record CacheEntry(object Value, DateTime ExpiresAt);
}

public class CacheCleanupService(ResponseCache cache) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromMinutes(5), ct);
            cache.Cleanup();
        }
    }
}
