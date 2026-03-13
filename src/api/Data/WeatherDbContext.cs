using Microsoft.EntityFrameworkCore;
using api.Models;

namespace api.Data;

public class WeatherDbContext : DbContext
{
    public WeatherDbContext(DbContextOptions<WeatherDbContext> options) : base(options) { }

    public DbSet<WeatherRecord> WeatherRecords => Set<WeatherRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<WeatherRecord>().HasData(
            new WeatherRecord { Id = 1, City = "New York", Condition = "Sunny", TemperatureCelsius = 22.5, Humidity = 55, WindSpeedKmh = 15, RecordedAt = DateTime.UtcNow },
            new WeatherRecord { Id = 2, City = "London", Condition = "Cloudy", TemperatureCelsius = 14.0, Humidity = 72, WindSpeedKmh = 20, RecordedAt = DateTime.UtcNow },
            new WeatherRecord { Id = 3, City = "Tokyo", Condition = "Rainy", TemperatureCelsius = 18.0, Humidity = 85, WindSpeedKmh = 10, RecordedAt = DateTime.UtcNow },
            new WeatherRecord { Id = 4, City = "Sydney", Condition = "Partly Cloudy", TemperatureCelsius = 26.0, Humidity = 60, WindSpeedKmh = 25, RecordedAt = DateTime.UtcNow },
            new WeatherRecord { Id = 5, City = "Paris", Condition = "Clear", TemperatureCelsius = 19.5, Humidity = 50, WindSpeedKmh = 12, RecordedAt = DateTime.UtcNow }
        );
    }
}
