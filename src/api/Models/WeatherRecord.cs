using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class WeatherRecord
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string City { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Condition { get; set; } = string.Empty;

    public double TemperatureCelsius { get; set; }

    public double Humidity { get; set; }

    public double WindSpeedKmh { get; set; }

    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

    public double TemperatureFahrenheit => Math.Round(TemperatureCelsius * 9 / 5 + 32, 1);
}
