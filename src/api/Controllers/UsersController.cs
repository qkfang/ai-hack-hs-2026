using Microsoft.AspNetCore.Mvc;
using api.Services;

namespace api.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController(UserStore store) : ControllerBase
{
    [HttpPost]
    public IActionResult CreateUser([FromBody] CreateUserRequest request)
    {
        var username = request.Username?.Trim() ?? "";
        if (string.IsNullOrEmpty(username))
            return BadRequest(new { error = "username is required" });

        var user = store.CreateUser(username);
        return StatusCode(201, new { id = user.Id, username = user.Username, createdAt = user.CreatedAt });
    }

    [HttpGet]
    public IActionResult GetUsers()
    {
        var users = store.GetUsers().Select(u => new
        {
            id = u.Id,
            username = u.Username,
            createdAt = u.CreatedAt,
            comicCount = u.Comics.Count,
        });
        return Ok(users);
    }

    [HttpGet("{id:int}")]
    public IActionResult GetUser(int id)
    {
        var user = store.GetUser(id);
        if (user == null) return NotFound(new { error = "User not found" });
        return Ok(new { id = user.Id, username = user.Username, createdAt = user.CreatedAt });
    }

    [HttpGet("{id:int}/comics")]
    public IActionResult GetUserComics(int id)
    {
        var user = store.GetUser(id);
        if (user == null) return NotFound(new { error = "User not found" });
        return Ok(user.Comics);
    }

    [HttpPost("{id:int}/comics")]
    public IActionResult AddUserComic(int id, [FromBody] AddComicRequest request)
    {
        var user = store.GetUser(id);
        if (user == null) return NotFound(new { error = "User not found" });

        var description = request.Description?.Trim() ?? "";
        var imageUrl = request.ImageUrl?.Trim() ?? "";
        if (string.IsNullOrEmpty(description) || string.IsNullOrEmpty(imageUrl))
            return BadRequest(new { error = "description and imageUrl are required" });

        var comic = store.AddComic(id, description, imageUrl);
        return StatusCode(201, comic);
    }
}

public record CreateUserRequest(string? Username);
public record AddComicRequest(string? Description, string? ImageUrl);
