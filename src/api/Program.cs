using Microsoft.EntityFrameworkCore;
using api.Data;
using api.Mcp;
using api.Services;

var builder = WebApplication.CreateBuilder(args);

// EF Core In-Memory database
builder.Services.AddDbContext<WeatherDbContext>(options =>
    options.UseInMemoryDatabase("WeatherDb"));

// In-memory user/comic store (singleton so state persists across requests)
builder.Services.AddSingleton<UserStore>();
builder.Services.AddSingleton<QuizStore>();
builder.Services.AddSingleton<AzureKeyPoolService>();

// HttpClient for ChatKit session creation
builder.Services.AddHttpClient();

// CORS – allow the Vite dev server to reach the API directly if needed
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// Razor Pages + MVC Controllers (camelCase JSON to match frontend expectations)
builder.Services.AddRazorPages();
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
        opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase);


// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Weather API", Version = "v1", Description = "Simple weather information REST API" });
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath)) c.IncludeXmlComments(xmlPath);
});

// MCP Server (SSE transport for ASP.NET Core)
builder.Services.AddMcpServer()
    .WithHttpTransport()
    .WithTools<WeatherTools>();

// Cookie authentication for admin portal
builder.Services.AddAuthentication("AdminCookie")
    .AddCookie("AdminCookie", options =>
    {
        options.LoginPath = "/Admin/Login";
        options.LogoutPath = "/Admin/Logout";
        options.Cookie.Name = "WeatherAdminAuth";
        options.ExpireTimeSpan = TimeSpan.FromHours(1);
    });

builder.Services.AddAuthorization();

var app = builder.Build();

// Seed in-memory database
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
    db.Database.EnsureCreated();
}

// Configure HTTP pipeline
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseRouting();
app.UseCors();

// Swagger UI
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Weather API v1");
    c.RoutePrefix = "swagger";
});

app.UseAuthentication();
app.UseAuthorization();

// MCP endpoint
app.MapMcp("/mcp");

app.MapStaticAssets();
app.MapControllers();
app.MapRazorPages().WithStaticAssets();

app.Run();
