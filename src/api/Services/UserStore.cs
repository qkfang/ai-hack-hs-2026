namespace api.Services;

public class ComicItem
{
    public int Id { get; set; }
    public string Description { get; set; } = "";
    public string ImageUrl { get; set; } = "";
    public string CreatedAt { get; set; } = "";
}

public class AppUser
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
    public string CreatedAt { get; set; } = "";
    public List<ComicItem> Comics { get; set; } = [];
}

public class ComicGalleryEntry
{
    public int Id { get; set; }
    public string Description { get; set; } = "";
    public string ImageUrl { get; set; } = "";
    public string CreatedAt { get; set; } = "";
    public int UserId { get; set; }
    public string Username { get; set; } = "";
}

public class UserStore
{
    private readonly Dictionary<int, AppUser> _users = [];
    private int _nextUserId = 1;
    private int _nextComicId = 1;
    private readonly object _lock = new();

    public AppUser CreateUser(string username)
    {
        lock (_lock)
        {
            var user = new AppUser
            {
                Id = _nextUserId++,
                Username = username,
                CreatedAt = DateTime.UtcNow.ToString("o"),
            };
            _users[user.Id] = user;
            return user;
        }
    }

    public IReadOnlyList<AppUser> GetUsers()
    {
        lock (_lock) return [.. _users.Values];
    }

    public AppUser? GetUser(int id)
    {
        lock (_lock) return _users.TryGetValue(id, out var user) ? user : null;
    }

    public ComicItem? AddComic(int userId, string description, string imageUrl)
    {
        lock (_lock)
        {
            if (!_users.TryGetValue(userId, out var user)) return null;
            var comic = new ComicItem
            {
                Id = _nextComicId++,
                Description = description,
                ImageUrl = imageUrl,
                CreatedAt = DateTime.UtcNow.ToString("o"),
            };
            user.Comics.Add(comic);
            return comic;
        }
    }

    public IReadOnlyList<ComicGalleryEntry> GetAllComics()
    {
        lock (_lock)
        {
            return [.. _users.Values
                .SelectMany(u => u.Comics.Select(c => new ComicGalleryEntry
                {
                    Id = c.Id,
                    Description = c.Description,
                    ImageUrl = c.ImageUrl,
                    CreatedAt = c.CreatedAt,
                    UserId = u.Id,
                    Username = u.Username,
                }))
                .OrderByDescending(c => c.CreatedAt)];
        }
    }
}
