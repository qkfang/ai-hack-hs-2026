using ModelContextProtocol.Server;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel;
using api.Data;

namespace api.Mcp;

[McpServerToolType]
public class WeatherTools
{
    private readonly WeatherDbContext _db;

    public WeatherTools(WeatherDbContext db)
    {
        _db = db;
    }

    [McpServerTool, Description("Get weather information for all cities stored in the database.")]
    public async Task<string> GetAllWeather()
    {
        var records = await _db.WeatherRecords.OrderBy(w => w.City).ToListAsync();
        if (!records.Any()) return "No weather records found.";

        var lines = records.Select(r =>
            $"{r.City}: {r.Condition}, {r.TemperatureCelsius}°C ({r.TemperatureFahrenheit}°F), Humidity: {r.Humidity}%, Wind: {r.WindSpeedKmh} km/h");
        return string.Join("\n", lines);
    }

    [McpServerTool, Description("Get weather information for a specific city by name.")]
    public async Task<string> GetWeatherForCity([Description("The name of the city to look up.")] string city)
    {
        var record = await _db.WeatherRecords
            .FirstOrDefaultAsync(w => w.City.ToLower() == city.ToLower());

        if (record is null) return $"No weather data found for '{city}'.";

        return $"{record.City}: {record.Condition}, {record.TemperatureCelsius}°C ({record.TemperatureFahrenheit}°F), " +
               $"Humidity: {record.Humidity}%, Wind: {record.WindSpeedKmh} km/h, Recorded: {record.RecordedAt:yyyy-MM-dd HH:mm} UTC";
    }

    [McpServerTool, Description("Get a summary of all weather data including average temperature and hottest/coldest cities.")]
    public async Task<string> GetWeatherSummary()
    {
        var records = await _db.WeatherRecords.ToListAsync();
        if (!records.Any()) return "No weather data available.";

        var avg = Math.Round(records.Average(r => r.TemperatureCelsius), 1);
        var hottest = records.OrderByDescending(r => r.TemperatureCelsius).First();
        var coldest = records.OrderBy(r => r.TemperatureCelsius).First();
        var conditions = records.GroupBy(r => r.Condition)
            .Select(g => $"{g.Key}: {g.Count()} city/cities");

        return $"Weather Summary ({records.Count} cities):\n" +
               $"Average Temperature: {avg}°C\n" +
               $"Hottest: {hottest.City} at {hottest.TemperatureCelsius}°C\n" +
               $"Coldest: {coldest.City} at {coldest.TemperatureCelsius}°C\n" +
               $"Conditions: {string.Join(", ", conditions)}";
    }

    [McpServerTool, Description("Add a new weather record for a city.")]
    public async Task<string> AddWeatherRecord(
        [Description("City name")] string city,
        [Description("Weather condition (e.g. Sunny, Rainy, Cloudy)")] string condition,
        [Description("Temperature in Celsius")] double temperatureCelsius,
        [Description("Humidity percentage (0-100)")] double humidity,
        [Description("Wind speed in km/h")] double windSpeedKmh)
    {
        var record = new Models.WeatherRecord
        {
            City = city,
            Condition = condition,
            TemperatureCelsius = temperatureCelsius,
            Humidity = humidity,
            WindSpeedKmh = windSpeedKmh,
            RecordedAt = DateTime.UtcNow
        };
        _db.WeatherRecords.Add(record);
        await _db.SaveChangesAsync();
        return $"Weather record added for {city} (ID: {record.Id}).";
    }
}
