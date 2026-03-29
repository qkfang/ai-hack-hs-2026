using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WeatherRecords",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    City = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Condition = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TemperatureCelsius = table.Column<double>(type: "float", nullable: false),
                    Humidity = table.Column<double>(type: "float", nullable: false),
                    WindSpeedKmh = table.Column<double>(type: "float", nullable: false),
                    RecordedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeatherRecords", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "WeatherRecords",
                columns: new[] { "Id", "City", "Condition", "Humidity", "RecordedAt", "TemperatureCelsius", "WindSpeedKmh" },
                values: new object[,]
                {
                    { 1, "New York", "Sunny", 55.0, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 22.5, 15.0 },
                    { 2, "London", "Cloudy", 72.0, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 14.0, 20.0 },
                    { 3, "Tokyo", "Rainy", 85.0, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 18.0, 10.0 },
                    { 4, "Sydney", "Partly Cloudy", 60.0, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 26.0, 25.0 },
                    { 5, "Paris", "Clear", 50.0, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 19.5, 12.0 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WeatherRecords");
        }
    }
}
