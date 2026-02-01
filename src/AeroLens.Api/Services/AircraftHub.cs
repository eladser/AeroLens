using Microsoft.AspNetCore.SignalR;

namespace AeroLens.Api.Services;

public class AircraftHub : Hub
{
    private readonly ILogger<AircraftHub> _logger;

    public AircraftHub(ILogger<AircraftHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
        await Groups.AddToGroupAsync(Context.ConnectionId, "all");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    public async Task SubscribeToFlight(string icao24)
    {
        if (string.IsNullOrWhiteSpace(icao24))
        {
            _logger.LogWarning("Invalid icao24 provided for subscription");
            return;
        }

        var groupName = $"flight:{icao24.ToUpperInvariant()}";
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        _logger.LogDebug("Client {ConnectionId} subscribed to flight {Icao24}",
            Context.ConnectionId, icao24);
    }

    public async Task UnsubscribeFromFlight(string icao24)
    {
        if (string.IsNullOrWhiteSpace(icao24))
            return;

        var groupName = $"flight:{icao24.ToUpperInvariant()}";
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        _logger.LogDebug("Client {ConnectionId} unsubscribed from flight {Icao24}",
            Context.ConnectionId, icao24);
    }

    public async Task SubscribeToArea(double minLat, double maxLat, double minLon, double maxLon)
    {
        var latCell = (int)(minLat / 10) * 10;
        var lonCell = (int)(minLon / 10) * 10;
        var groupName = $"area:{latCell}:{lonCell}";

        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        _logger.LogDebug("Client {ConnectionId} subscribed to area {GroupName}",
            Context.ConnectionId, groupName);
    }

    public async Task UnsubscribeFromArea(double minLat, double minLon)
    {
        var latCell = (int)(minLat / 10) * 10;
        var lonCell = (int)(minLon / 10) * 10;
        var groupName = $"area:{latCell}:{lonCell}";

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        _logger.LogDebug("Client {ConnectionId} unsubscribed from area {GroupName}",
            Context.ConnectionId, groupName);
    }
}
