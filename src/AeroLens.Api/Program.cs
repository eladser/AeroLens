using System.IO.Compression;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using AeroLens.Api.Services;
using AeroLens.Api.Validation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Serilog.Events;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.AspNetCore.SignalR", LogEventLevel.Information)
    .MinimumLevel.Override("Microsoft.AspNetCore.Http.Connections", LogEventLevel.Information)
    .Enrich.FromLogContext()
    .Enrich.WithEnvironmentName()
    .Enrich.WithThreadId()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .CreateLogger();

try
{
    Log.Information("Starting AeroLens API");

    var builder = WebApplication.CreateBuilder(args);

    // Configure request size limits for security
    builder.WebHost.ConfigureKestrel(options =>
    {
        options.Limits.MaxRequestBodySize = 1024 * 100; // 100KB max request body
        options.Limits.MaxRequestHeadersTotalSize = 32768; // 32KB max headers
    });

    // Load local secrets file (gitignored) for development
    builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

    builder.Host.UseSerilog();

    var supabaseUrl = builder.Configuration["Supabase:Url"] ?? "";
    var jwtSecret = builder.Configuration["Supabase:JwtSecret"] ?? "";

    // CORS configuration - allow localhost and production domains
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
        ?? new[] { "http://localhost:5173" };

    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
    });

    if (!string.IsNullOrEmpty(jwtSecret))
    {
        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = $"{supabaseUrl}/auth/v1",
                    ValidateAudience = true,
                    ValidAudience = "authenticated",
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                    ValidateLifetime = true
                };
            });
        builder.Services.AddAuthorization();
    }

    // SignalR configuration with optional Redis backplane for horizontal scaling
    var signalRBuilder = builder.Services.AddSignalR()
        .AddMessagePackProtocol(); // Smaller payloads, faster serialization

    // Add Redis backplane if connection string is configured
    var redisConnection = builder.Configuration.GetConnectionString("Redis");
    if (!string.IsNullOrEmpty(redisConnection))
    {
        try
        {
            signalRBuilder.AddStackExchangeRedis(redisConnection, options =>
            {
                options.Configuration.ChannelPrefix = StackExchange.Redis.RedisChannel.Literal("AeroLens");
                options.Configuration.AbortOnConnectFail = false; // Don't crash if Redis unavailable
                options.Configuration.ConnectRetry = 3;
                options.Configuration.ConnectTimeout = 5000;
            });
            Log.Information("SignalR Redis backplane enabled for horizontal scaling");
        }
        catch (Exception ex)
        {
            Log.Warning(ex, "Failed to configure Redis backplane, falling back to single-instance mode");
        }
    }
    else
    {
        Log.Information("SignalR running in single-instance mode (no Redis configured)");
    }

    // Configure HttpClient with optimized connection pooling
    void ConfigureHttpClient(IHttpClientBuilder clientBuilder) => clientBuilder
        .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
        {
            PooledConnectionLifetime = TimeSpan.FromMinutes(5),
            PooledConnectionIdleTimeout = TimeSpan.FromMinutes(2),
            MaxConnectionsPerServer = 10,
            EnableMultipleHttp2Connections = true
        })
        .SetHandlerLifetime(Timeout.InfiniteTimeSpan);

    ConfigureHttpClient(builder.Services.AddHttpClient<OpenSkyClient>());
    ConfigureHttpClient(builder.Services.AddHttpClient<AdsbLolClient>());
    ConfigureHttpClient(builder.Services.AddHttpClient<OpenMeteoClient>());
    ConfigureHttpClient(builder.Services.AddHttpClient<WeatherClient>());
    ConfigureHttpClient(builder.Services.AddHttpClient<GeminiClient>());
    builder.Services.AddSingleton<FlightCache>();
    builder.Services.AddSingleton<ResponseCache>();
    builder.Services.AddHostedService<FlightPollerService>();
    builder.Services.AddHostedService<CacheCleanupService>();

    // Output caching for HTTP cache headers
    builder.Services.AddOutputCache(options =>
    {
        // Short cache for real-time aircraft data (5 seconds - matches polling interval)
        options.AddPolicy("Aircraft", builder => builder.Expire(TimeSpan.FromSeconds(5)));

        // Medium cache for weather data (5 minutes)
        options.AddPolicy("Weather", builder => builder.Expire(TimeSpan.FromMinutes(5)));

        // Medium cache for predictions (3 minutes)
        options.AddPolicy("Predict", builder => builder.Expire(TimeSpan.FromMinutes(3)));

        // Short cache for health endpoints (30 seconds)
        options.AddPolicy("Health", builder => builder.Expire(TimeSpan.FromSeconds(30)));

        // Cache for flight tracks (1 minute - historical data updates slowly)
        options.AddPolicy("Track", builder => builder.Expire(TimeSpan.FromMinutes(1)));
    });

    // Response compression for smaller payloads
    builder.Services.AddResponseCompression(options =>
    {
        options.EnableForHttps = true;
        options.Providers.Add<BrotliCompressionProvider>();
        options.Providers.Add<GzipCompressionProvider>();
        options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(["application/json"]);
    });
    builder.Services.Configure<BrotliCompressionProviderOptions>(options => options.Level = CompressionLevel.Fastest);
    builder.Services.Configure<GzipCompressionProviderOptions>(options => options.Level = CompressionLevel.SmallestSize);

    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        options.OnRejected = async (context, token) =>
        {
            var response = context.HttpContext.Response;
            response.ContentType = "application/json";

            // Add rate limit headers for rejected requests
            if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            {
                response.Headers["Retry-After"] = ((int)retryAfter.TotalSeconds).ToString();
                response.Headers["RateLimit-Reset"] = ((int)retryAfter.TotalSeconds).ToString();
            }
            response.Headers["RateLimit-Remaining"] = "0";

            await response.WriteAsync(
                """{"error":"Too many requests. Please try again later."}""", token);
        };

        // Tiered rate limiting: authenticated users get higher limits
        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        {
            // Check if user is authenticated
            var userId = httpContext.User?.FindFirst("sub")?.Value
                      ?? httpContext.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (!string.IsNullOrEmpty(userId))
            {
                // Authenticated users: 200 requests per minute, keyed by user ID
                return RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: $"user:{userId}",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 200,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 10
                    });
            }

            // Anonymous users: 100 requests per minute, keyed by IP
            return RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: $"ip:{httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown"}",
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 100,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 5
                });
        });

        // Tiered AI predictions: authenticated users get 20/min, anonymous get 10/min
        options.AddPolicy("predict", httpContext =>
        {
            var userId = httpContext.User?.FindFirst("sub")?.Value
                      ?? httpContext.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (!string.IsNullOrEmpty(userId))
            {
                return RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: $"predict:user:{userId}",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 20,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 5
                    });
            }

            return RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: $"predict:ip:{httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown"}",
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 10,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 2
                });
        });

        // Tiered weather endpoint: authenticated users get 60/min, anonymous get 30/min
        options.AddPolicy("weather", httpContext =>
        {
            var userId = httpContext.User?.FindFirst("sub")?.Value
                      ?? httpContext.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (!string.IsNullOrEmpty(userId))
            {
                return RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: $"weather:user:{userId}",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 60,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 10
                    });
            }

            return RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: $"weather:ip:{httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown"}",
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 30,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 5
                });
        });
    });

    var app = builder.Build();

    // Response compression - must be early in pipeline
    app.UseResponseCompression();

    // Security headers middleware
    app.Use(async (context, next) =>
    {
        var headers = context.Response.Headers;

        // Prevent clickjacking attacks
        headers["X-Frame-Options"] = "DENY";

        // Prevent MIME type sniffing
        headers["X-Content-Type-Options"] = "nosniff";

        // Enable XSS filter (legacy browsers)
        headers["X-XSS-Protection"] = "1; mode=block";

        // Control referrer information
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

        // Prevent loading in other sites
        headers["Cross-Origin-Opener-Policy"] = "same-origin";

        // Content Security Policy
        headers["Content-Security-Policy"] = "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "font-src 'self' data:; " +
            "connect-src 'self' wss: https:; " +
            "frame-ancestors 'none';";

        // HSTS for production (1 year, include subdomains)
        if (!app.Environment.IsDevelopment())
        {
            headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";
        }

        // Permissions Policy (restrict browser features)
        headers["Permissions-Policy"] = "geolocation=(self), microphone=(), camera=()";

        await next();
    });

    app.UseSerilogRequestLogging(options =>
    {
        options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
        {
            diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value);
            diagnosticContext.Set("UserAgent", httpContext.Request.Headers.UserAgent.FirstOrDefault());
            diagnosticContext.Set("RequestPath", httpContext.Request.Path.Value);
            diagnosticContext.Set("RequestMethod", httpContext.Request.Method);
            diagnosticContext.Set("QueryString", httpContext.Request.QueryString.Value);
            diagnosticContext.Set("ClientIP", httpContext.Connection.RemoteIpAddress?.ToString());
        };
        options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000}ms";
    });

    app.UseCors();

    // CSRF protection for state-changing requests
    // Requires X-Requested-With header to prevent cross-origin attacks
    app.Use(async (context, next) =>
    {
        var method = context.Request.Method;
        var isStateChanging = method == "POST" || method == "PUT" || method == "DELETE" || method == "PATCH";

        // Skip CSRF check for safe methods, health endpoints, and SignalR
        if (!isStateChanging ||
            context.Request.Path.StartsWithSegments("/health") ||
            context.Request.Path.StartsWithSegments("/hubs"))
        {
            await next();
            return;
        }

        // Check for X-Requested-With header (standard AJAX indicator)
        var hasXRequestedWith = context.Request.Headers.ContainsKey("X-Requested-With");

        // Also accept requests with valid JWT (they already prove client legitimacy)
        var hasAuthHeader = context.Request.Headers.ContainsKey("Authorization");

        if (!hasXRequestedWith && !hasAuthHeader)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync("""{"error":"Missing required security header"}""");
            return;
        }

        await next();
    });

    app.UseRateLimiter();
    app.UseOutputCache();

    if (!string.IsNullOrEmpty(jwtSecret))
    {
        app.UseAuthentication();
        app.UseAuthorization();
    }

    app.MapGet("/health", () => new { status = "ok", timestamp = DateTime.UtcNow })
        .CacheOutput("Health");

    app.MapGet("/api/me", (ClaimsPrincipal user) =>
    {
        var id = user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? user.FindFirst("sub")?.Value;
        var email = user.FindFirst(ClaimTypes.Email)?.Value ?? user.FindFirst("email")?.Value;
        return new { id, email };
    }).RequireAuthorization();

    app.MapGet("/api/aircraft", (FlightCache cache) =>
    {
        var (states, lastUpdate) = cache.Get();
        return new
        {
            timestamp = lastUpdate,
            count = states.Count,
            aircraft = states.Select(a => new
            {
                icao24 = a.Icao24,
                callsign = a.CallSign,
                lat = a.Latitude,
                lon = a.Longitude,
                altitude = a.Altitude,
                velocity = a.Velocity,
                heading = a.Heading,
                onGround = a.OnGround,
                type = a.AircraftType
            })
        };
    }).CacheOutput("Aircraft");

    app.MapGet("/api/aircraft/search", (FlightCache cache, string q) =>
    {
        var validation = InputValidator.ValidateSearchQuery(q);
        if (!validation.IsValid)
            return Results.BadRequest(new { error = validation.ErrorMessage });

        var (states, _) = cache.Get();
        var query = validation.GetValue<string>();

        var matches = states
            .Where(a =>
                (!string.IsNullOrEmpty(a.CallSign) && a.CallSign.Contains(query, StringComparison.OrdinalIgnoreCase)) ||
                a.Icao24.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                (!string.IsNullOrEmpty(a.AircraftType) && a.AircraftType.Contains(query, StringComparison.OrdinalIgnoreCase)))
            .Take(15)
            .Select(a => new
            {
                icao24 = a.Icao24,
                callsign = a.CallSign,
                lat = a.Latitude,
                lon = a.Longitude,
                altitude = a.Altitude,
                velocity = a.Velocity,
                heading = a.Heading,
                onGround = a.OnGround,
                type = a.AircraftType
            });

        return Results.Ok(new { results = matches });
    });

    app.MapHub<AircraftHub>("/hubs/aircraft");

    app.MapGet("/api/aircraft/{icao24}/track", async (OpenSkyClient client, string icao24) =>
    {
        var validation = InputValidator.ValidateIcao24(icao24);
        if (!validation.IsValid)
            return Results.BadRequest(new { error = validation.ErrorMessage });

        var validIcao = validation.GetValue<string>();
        var track = await client.GetTrackAsync(validIcao);
        if (track == null)
            return Results.NotFound(new { error = "Track not available" });
        return Results.Ok(new { path = track });
    }).CacheOutput("Track");

    app.MapGet("/api/weather", async (ResponseCache cache, OpenMeteoClient openMeteo, WeatherClient owm, double lat, double lon) =>
    {
        var coordValidation = InputValidator.ValidateCoordinates(lat, lon);
        if (!coordValidation.IsValid)
            return Results.BadRequest(new { error = coordValidation.ErrorMessage });

        var key = $"weather:{Math.Round(lat, 1)}:{Math.Round(lon, 1)}";
        var cached = cache.Get<WeatherData>(key);
        if (cached != null)
        {
            return Results.Ok(new
            {
                description = cached.Description,
                icon = cached.Icon,
                temp = cached.Temp,
                feelsLike = cached.FeelsLike,
                humidity = cached.Humidity,
                windSpeed = cached.WindSpeed,
                cached = true
            });
        }

        var weather = await openMeteo.GetWeatherAsync(lat, lon);
        weather ??= await owm.GetWeatherAsync(lat, lon);

        if (weather == null)
            return Results.NotFound(new { error = "Weather data not available" });

        cache.Set(key, weather, TimeSpan.FromMinutes(10));

        return Results.Ok(new
        {
            description = weather.Description,
            icon = weather.Icon,
            temp = weather.Temp,
            feelsLike = weather.FeelsLike,
            humidity = weather.Humidity,
            windSpeed = weather.WindSpeed,
            cached = false
        });
    }).RequireRateLimiting("weather").CacheOutput("Weather");

    // 5-day weather forecast endpoint
    app.MapGet("/api/weather/forecast", async (ResponseCache cache, OpenMeteoClient openMeteo, double lat, double lon, int? days) =>
    {
        var coordValidation = InputValidator.ValidateCoordinates(lat, lon);
        if (!coordValidation.IsValid)
            return Results.BadRequest(new { error = coordValidation.ErrorMessage });

        var forecastDays = Math.Clamp(days ?? 5, 1, 7);
        var key = $"forecast:{Math.Round(lat, 1)}:{Math.Round(lon, 1)}:{forecastDays}";

        var cached = cache.Get<List<OpenMeteoClient.DailyForecast>>(key);
        if (cached != null)
        {
            return Results.Ok(new
            {
                days = cached.Select(d => new
                {
                    date = d.Date.ToString("yyyy-MM-dd"),
                    dayName = d.Date.DayOfWeek.ToString(),
                    description = d.Description,
                    icon = d.Icon,
                    tempMax = d.TempMax,
                    tempMin = d.TempMin,
                    precipitationProbability = d.PrecipitationProbability,
                    windSpeedMax = d.WindSpeedMax
                }),
                cached = true
            });
        }

        var forecast = await openMeteo.GetForecastAsync(lat, lon, forecastDays);
        if (forecast == null || forecast.Count == 0)
            return Results.NotFound(new { error = "Forecast data not available" });

        cache.Set(key, forecast, TimeSpan.FromMinutes(30)); // Cache for 30 minutes

        return Results.Ok(new
        {
            days = forecast.Select(d => new
            {
                date = d.Date.ToString("yyyy-MM-dd"),
                dayName = d.Date.DayOfWeek.ToString(),
                description = d.Description,
                icon = d.Icon,
                tempMax = d.TempMax,
                tempMin = d.TempMin,
                precipitationProbability = d.PrecipitationProbability,
                windSpeedMax = d.WindSpeedMax
            }),
            cached = false
        });
    }).RequireRateLimiting("weather").CacheOutput("Weather");

    app.MapGet("/api/predict", async (ResponseCache cache, GeminiClient gemini, OpenMeteoClient openMeteo, WeatherClient owm, double lat, double lon, double? altitude, double? velocity) =>
    {
        var coordValidation = InputValidator.ValidateCoordinates(lat, lon);
        if (!coordValidation.IsValid)
            return Results.BadRequest(new { error = coordValidation.ErrorMessage });

        var altValidation = InputValidator.ValidateAltitude(altitude);
        if (!altValidation.IsValid)
            return Results.BadRequest(new { error = altValidation.ErrorMessage });

        var velValidation = InputValidator.ValidateVelocity(velocity);
        if (!velValidation.IsValid)
            return Results.BadRequest(new { error = velValidation.ErrorMessage });

        var altRound = altitude.HasValue ? Math.Round(altitude.Value / 1000) * 1000 : 0;
        var velRound = velocity.HasValue ? Math.Round(velocity.Value / 50) * 50 : 0;
        var key = $"predict:{Math.Round(lat, 1)}:{Math.Round(lon, 1)}:{altRound}:{velRound}";

        var cached = cache.Get<PredictionResult>(key);
        if (cached != null)
        {
            return Results.Ok(new
            {
                risk = cached.Risk,
                confidence = cached.Confidence,
                reason = cached.Reason,
                cached = true
            });
        }

        var weatherData = await openMeteo.GetWeatherAsync(lat, lon);
        weatherData ??= await owm.GetWeatherAsync(lat, lon);

        var prediction = await gemini.PredictDelayAsync(altitude, velocity, weatherData);

        if (prediction == null)
            return Results.NotFound(new { error = "Prediction not available" });

        cache.Set(key, prediction, TimeSpan.FromMinutes(5));

        return Results.Ok(new
        {
            risk = prediction.Risk,
            confidence = prediction.Confidence,
            reason = prediction.Reason,
            cached = false
        });
    }).RequireRateLimiting("predict").CacheOutput("Predict");

    app.MapGet("/api/health/apis", async (OpenSkyClient openSky, AdsbLolClient adsbLol, OpenMeteoClient openMeteo, WeatherClient owm, GeminiClient gemini) =>
    {
        var openSkyTask = openSky.TestAsync();
        var adsbLolTask = adsbLol.TestAsync();
        var openMeteoTask = openMeteo.TestAsync();
        var owmTask = owm.TestAsync();
        var groqTask = gemini.TestGroqAsync();
        var mistralTask = gemini.TestMistralAsync();
        var geminiTask = gemini.TestGeminiAsync();

        await Task.WhenAll(openSkyTask, adsbLolTask, openMeteoTask, owmTask, groqTask, mistralTask, geminiTask);

        var openSkyResult = await openSkyTask;
        var adsbLolResult = await adsbLolTask;
        var openMeteoResult = await openMeteoTask;
        var owmResult = await owmTask;
        var groqResult = await groqTask;
        var mistralResult = await mistralTask;
        var geminiResult = await geminiTask;

        var flightOk = openSkyResult.ok || adsbLolResult.ok;
        var weatherOk = openMeteoResult.ok || owmResult.ok;
        var aiOk = groqResult.ok || mistralResult.ok || geminiResult.ok;

        return new
        {
            timestamp = DateTime.UtcNow,
            apis = new
            {
                openSky = new { ok = openSkyResult.ok, message = openSkyResult.message, primary = true },
                adsbLol = new { ok = adsbLolResult.ok, message = adsbLolResult.message, fallback = true },
                openMeteo = new { ok = openMeteoResult.ok, message = openMeteoResult.message, primary = true },
                openWeatherMap = new { ok = owmResult.ok, message = owmResult.message, fallback = true },
                groq = new { ok = groqResult.ok, message = groqResult.message, primary = true },
                mistral = new { ok = mistralResult.ok, message = mistralResult.message, fallback = true },
                gemini = new { ok = geminiResult.ok, message = geminiResult.message, fallback = true }
            },
            allOk = flightOk && weatherOk && aiOk
        };
    }).CacheOutput("Health");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
