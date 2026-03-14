using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Security.Claims;

namespace api.Pages.Admin;

public class LoginModel : PageModel
{
    // Default hardcoded password for demo; override via ADMIN_PASSWORD environment variable in production
    private const string DefaultAdminPassword = "9999";

    private readonly IConfiguration _config;

    public LoginModel(IConfiguration config) => _config = config;

    public string? ErrorMessage { get; private set; }

    private string AdminPassword =>
        _config["ADMIN_PASSWORD"] ?? DefaultAdminPassword;

    public IActionResult OnGet()
    {
        if (User.Identity?.IsAuthenticated == true)
            return RedirectToPage("/Admin/Index");
        return Page();
    }

    public async Task<IActionResult> OnPostAsync(string password)
    {
        if (password != AdminPassword)
        {
            ErrorMessage = "Invalid password. Please try again.";
            return Page();
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, "admin"),
            new(ClaimTypes.Role, "Admin")
        };
        var identity = new ClaimsIdentity(claims, "AdminCookie");
        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync("AdminCookie", principal,
            new AuthenticationProperties { IsPersistent = true });

        return RedirectToPage("/Admin/Index");
    }
}
