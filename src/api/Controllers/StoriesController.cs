using Microsoft.AspNetCore.Mvc;
using api.Services;

namespace api.Controllers;

[ApiController]
[Route("api/stories")]
public class StoriesController(UserStore store) : ControllerBase
{
    [HttpGet]
    public IActionResult GetAllStories() => Ok(store.GetAllStories());
}
