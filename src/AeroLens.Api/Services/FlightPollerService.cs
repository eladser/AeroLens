using System.Diagnostics;
using Microsoft.AspNetCore.SignalR;

namespace AeroLens.Api.Services;

public class FlightPollerService(
    OpenSkyClient openSky,
    AdsbLolClient adsbLol,
    FlightCache cache,
    IHubContext<AircraftHub> hub,
    ILogger<FlightPollerService> log) : BackgroundService
{
    // OpenSky with OAuth2: 4,000 requests/day
    // Using 30s interval = ~2,880/day, safely under limit
    // adsb.lol fallback: unlimited, no auth
    private const int PollIntervalMs = 30_000;
    private int _openSkyFailures = 0;
    private const int MaxOpenSkyFailures = 3; // Switch to fallback after 3 consecutive failures

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await Task.Delay(2000, ct); // let app start

        while (!ct.IsCancellationRequested)
        {
            var sw = Stopwatch.StartNew();
            IReadOnlyList<AircraftState> states;
            string source;

            // Try OpenSky first if not in failure mode
            if (_openSkyFailures < MaxOpenSkyFailures)
            {
                try
                {
                    states = await openSky.GetAllStatesAsync(ct);
                    if (states.Count > 0)
                    {
                        _openSkyFailures = 0; // Reset on success
                        source = "OpenSky";
                    }
                    else
                    {
                        // Empty response, try fallback
                        states = await adsbLol.GetGlobalAircraftAsync(ct);
                        source = "adsb.lol";
                    }
                }
                catch (HttpRequestException ex) when (ex.Message.Contains("429"))
                {
                    // Rate limited - use fallback
                    _openSkyFailures++;
                    log.LogWarning("OpenSky rate limited ({Failures}/{Max}), using adsb.lol fallback",
                        _openSkyFailures, MaxOpenSkyFailures);
                    states = await adsbLol.GetGlobalAircraftAsync(ct);
                    source = "adsb.lol (OpenSky rate limited)";
                }
                catch (HttpRequestException ex)
                {
                    _openSkyFailures++;
                    log.LogWarning(ex, "OpenSky failed ({Failures}/{Max}), using adsb.lol fallback",
                        _openSkyFailures, MaxOpenSkyFailures);
                    states = await adsbLol.GetGlobalAircraftAsync(ct);
                    source = "adsb.lol (OpenSky error)";
                }
            }
            else
            {
                // In failure mode, use adsb.lol but periodically retry OpenSky
                states = await adsbLol.GetGlobalAircraftAsync(ct);
                source = "adsb.lol (OpenSky disabled)";

                // Try OpenSky again every 5 minutes
                if (sw.ElapsedMilliseconds % 300_000 < PollIntervalMs)
                {
                    _openSkyFailures = 0;
                    log.LogInformation("Retrying OpenSky after cooldown period");
                }
            }

            if (states.Count > 0)
            {
                cache.Update(states);

                var payload = new
                {
                    timestamp = DateTime.UtcNow,
                    count = states.Count,
                    source,
                    aircraft = states.Select(a => new
                    {
                        icao24 = a.Icao24,
                        callsign = a.CallSign,
                        lat = a.Latitude,
                        lon = a.Longitude,
                        altitude = a.Altitude,
                        velocity = a.Velocity,
                        heading = a.Heading,
                        onGround = a.OnGround
                    })
                };
                await hub.Clients.All.SendAsync("AircraftUpdate", payload, ct);

                log.LogInformation("[{Source}] Fetched {Count} aircraft in {Ms}ms",
                    source, states.Count, sw.ElapsedMilliseconds);
            }
            else
            {
                log.LogWarning("No aircraft data from any source");
            }

            var delay = Math.Max(0, PollIntervalMs - (int)sw.ElapsedMilliseconds);
            await Task.Delay(delay, ct);
        }
    }
}
