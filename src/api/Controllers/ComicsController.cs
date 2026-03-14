using Microsoft.AspNetCore.Mvc;
using api.Services;

namespace api.Controllers;

[ApiController]
[Route("api/comics")]
public class ComicsController(UserStore store) : ControllerBase
{
    [HttpGet]
    public IActionResult GetAllComics() => Ok(store.GetAllComics());
}
