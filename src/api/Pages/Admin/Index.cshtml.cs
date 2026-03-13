using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using api.Data;
using api.Models;

namespace api.Pages.Admin;

[Authorize(AuthenticationSchemes = "AdminCookie")]
public class IndexModel : PageModel
{
    private readonly WeatherDbContext _db;

    public IndexModel(WeatherDbContext db) => _db = db;

    public List<WeatherRecord> Records { get; private set; } = [];
    public double AverageTemp { get; private set; }
    public string HottestCity { get; private set; } = "-";
    public string ColdestCity { get; private set; } = "-";

    public async Task OnGetAsync()
    {
        Records = await _db.WeatherRecords.OrderBy(r => r.City).ToListAsync();
        if (Records.Count > 0)
        {
            AverageTemp = Math.Round(Records.Average(r => r.TemperatureCelsius), 1);
            HottestCity = Records.OrderByDescending(r => r.TemperatureCelsius).First().City;
            ColdestCity = Records.OrderBy(r => r.TemperatureCelsius).First().City;
        }
    }

    public async Task<IActionResult> OnPostAddAsync(
        string city, string condition, double tempC, double humidity, double windKmh)
    {
        _db.WeatherRecords.Add(new WeatherRecord
        {
            City = city,
            Condition = condition,
            TemperatureCelsius = tempC,
            Humidity = humidity,
            WindSpeedKmh = windKmh,
            RecordedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostDeleteAsync(int id)
    {
        var record = await _db.WeatherRecords.FindAsync(id);
        if (record is not null)
        {
            _db.WeatherRecords.Remove(record);
            await _db.SaveChangesAsync();
        }
        return RedirectToPage();
    }
}
