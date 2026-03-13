using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using api.Data;
using api.Models;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class WeatherController : ControllerBase
{
    private readonly WeatherDbContext _db;

    public WeatherController(WeatherDbContext db)
    {
        _db = db;
    }

    /// <summary>Get all weather records</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<WeatherRecord>>> GetAll()
    {
        return await _db.WeatherRecords.OrderBy(w => w.City).ToListAsync();
    }

    /// <summary>Get weather record by ID</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<WeatherRecord>> GetById(int id)
    {
        var record = await _db.WeatherRecords.FindAsync(id);
        return record is null ? NotFound() : Ok(record);
    }

    /// <summary>Get weather for a specific city</summary>
    [HttpGet("city/{city}")]
    public async Task<ActionResult<WeatherRecord>> GetByCity(string city)
    {
        var record = await _db.WeatherRecords
            .FirstOrDefaultAsync(w => w.City.ToLower() == city.ToLower());
        return record is null ? NotFound() : Ok(record);
    }

    /// <summary>Create a new weather record</summary>
    [HttpPost]
    public async Task<ActionResult<WeatherRecord>> Create(WeatherRecord record)
    {
        record.Id = 0;
        record.RecordedAt = DateTime.UtcNow;
        _db.WeatherRecords.Add(record);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = record.Id }, record);
    }

    /// <summary>Update an existing weather record</summary>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, WeatherRecord record)
    {
        if (id != record.Id) return BadRequest();
        _db.Entry(record).State = EntityState.Modified;
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _db.WeatherRecords.AnyAsync(w => w.Id == id)) return NotFound();
            throw;
        }
        return NoContent();
    }

    /// <summary>Delete a weather record</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var record = await _db.WeatherRecords.FindAsync(id);
        if (record is null) return NotFound();
        _db.WeatherRecords.Remove(record);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Get a summary of weather conditions</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<object>> GetSummary()
    {
        var records = await _db.WeatherRecords.ToListAsync();
        return Ok(new
        {
            TotalCities = records.Count,
            AverageTemperatureCelsius = records.Count > 0 ? Math.Round(records.Average(r => r.TemperatureCelsius), 1) : 0,
            HottestCity = records.OrderByDescending(r => r.TemperatureCelsius).FirstOrDefault()?.City,
            ColdestCity = records.OrderBy(r => r.TemperatureCelsius).FirstOrDefault()?.City,
            Conditions = records.GroupBy(r => r.Condition).ToDictionary(g => g.Key, g => g.Count())
        });
    }
}
