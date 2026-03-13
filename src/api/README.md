# Weather Info API

A C# ASP.NET Core backend hosted on Azure Web App, featuring:

- **Web Frontend** (Razor Pages) — public pages + admin portal
- **REST API** — full CRUD weather endpoints
- **Swagger UI** — interactive API documentation
- **MCP Server** — Model Context Protocol endpoint for AI assistant integration
- **In-Memory Database** — EF Core in-memory DB (seeded on startup)
- **Admin Portal** — password-protected management interface

## Project Structure

```
src/api/
├── Controllers/
│   └── WeatherController.cs    # REST API endpoints
├── Data/
│   └── WeatherDbContext.cs     # EF Core in-memory DB context + seed data
├── Mcp/
│   └── WeatherTools.cs         # MCP server tools
├── Models/
│   └── WeatherRecord.cs        # Weather data model
├── Pages/
│   ├── Index.cshtml             # Public home page
│   ├── Weather/
│   │   └── Index.cshtml         # Public weather display page
│   └── Admin/
│       ├── Login.cshtml         # Admin login (hardcoded password)
│       ├── Index.cshtml         # Admin dashboard (CRUD)
│       └── Logout.cshtml        # Logout handler
├── Program.cs                   # App bootstrap & service registration
├── web.config                   # Azure App Service IIS config
└── api.csproj
```

## Endpoints

| URL | Description |
|-----|-------------|
| `/` | Public home page |
| `/weather` | Public weather display |
| `/swagger` | Swagger API documentation UI |
| `/api/weather` | REST API — all records |
| `/api/weather/{id}` | REST API — by ID |
| `/api/weather/city/{city}` | REST API — by city name |
| `/api/weather/summary` | REST API — aggregated summary |
| `/mcp` | MCP Server endpoint (SSE) |
| `/admin/login` | Admin portal login |
| `/admin` | Admin dashboard (requires login) |

## Admin Portal

Default password: `Admin@Weather2026!`

> ⚠️ Change this in `Pages/Admin/Login.cshtml.cs` before deploying to production.

## MCP Tools

The MCP server exposes these tools for AI assistants:

- `GetAllWeather` — list weather for all cities
- `GetWeatherForCity(city)` — get weather for a specific city
- `GetWeatherSummary` — aggregated stats
- `AddWeatherRecord(city, condition, tempC, humidity, windKmh)` — add new record

## Running Locally

```bash
cd src/api
dotnet run
```

Open: `https://localhost:5001`

## Deploy to Azure Web App

```bash
cd src/api
dotnet publish -c Release -o ./publish
# Then deploy ./publish to your Azure Web App via zip deploy or GitHub Actions
```

Recommended: .NET 10 runtime on Azure App Service (Linux or Windows).
