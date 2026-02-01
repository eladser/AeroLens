namespace AeroLens.Api.Services;

public class FlightCache
{
    private IReadOnlyList<AircraftState> _states = [];
    private DateTime _lastUpdate = DateTime.MinValue;
    private readonly object _lock = new();

    public (IReadOnlyList<AircraftState> States, DateTime LastUpdate) Get()
    {
        lock (_lock)
        {
            return (_states, _lastUpdate);
        }
    }

    public void Update(IReadOnlyList<AircraftState> states)
    {
        lock (_lock)
        {
            _states = states;
            _lastUpdate = DateTime.UtcNow;
        }
    }
}
