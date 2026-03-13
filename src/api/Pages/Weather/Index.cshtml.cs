using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using api.Data;
using api.Models;

namespace api.Pages.Weather;

public class IndexModel : PageModel
{
    private readonly WeatherDbContext _db;

    public IndexModel(WeatherDbContext db) => _db = db;

    public List<WeatherRecord> Records { get; private set; } = [];
    public string? SearchCity { get; private set; }

    public async Task OnGetAsync(string? city)
    {
        SearchCity = city;
        var query = _db.WeatherRecords.AsQueryable();
        if (!string.IsNullOrWhiteSpace(city))
            query = query.Where(r => r.City.ToLower().Contains(city.ToLower()));
        Records = await query.OrderBy(r => r.City).ToListAsync();
    }
}
