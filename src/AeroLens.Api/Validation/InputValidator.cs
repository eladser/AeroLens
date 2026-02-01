namespace AeroLens.Api.Validation;

public static class InputValidator
{
    private static readonly System.Text.RegularExpressions.Regex Icao24Regex =
        new(@"^[0-9a-fA-F]{6}$", System.Text.RegularExpressions.RegexOptions.Compiled);

    private static readonly System.Text.RegularExpressions.Regex SearchQueryRegex =
        new(@"^[a-zA-Z0-9\-\s]{1,20}$", System.Text.RegularExpressions.RegexOptions.Compiled);

    public static ValidationResult ValidateIcao24(string? icao24)
    {
        if (string.IsNullOrWhiteSpace(icao24))
            return ValidationResult.Fail("ICAO24 address is required");

        var trimmed = icao24.Trim();

        if (trimmed.Length != 6)
            return ValidationResult.Fail("ICAO24 address must be exactly 6 characters");

        if (!Icao24Regex.IsMatch(trimmed))
            return ValidationResult.Fail("ICAO24 address must contain only hexadecimal characters (0-9, a-f)");

        return ValidationResult.Ok(trimmed.ToLowerInvariant());
    }

    public static ValidationResult ValidateLatitude(double lat)
    {
        if (double.IsNaN(lat) || double.IsInfinity(lat))
            return ValidationResult.Fail("Latitude must be a valid number");

        if (lat < -90 || lat > 90)
            return ValidationResult.Fail("Latitude must be between -90 and 90 degrees");

        return ValidationResult.Ok(lat);
    }

    public static ValidationResult ValidateLongitude(double lon)
    {
        if (double.IsNaN(lon) || double.IsInfinity(lon))
            return ValidationResult.Fail("Longitude must be a valid number");

        if (lon < -180 || lon > 180)
            return ValidationResult.Fail("Longitude must be between -180 and 180 degrees");

        return ValidationResult.Ok(lon);
    }

    public static ValidationResult ValidateCoordinates(double lat, double lon)
    {
        var latResult = ValidateLatitude(lat);
        if (!latResult.IsValid)
            return latResult;

        var lonResult = ValidateLongitude(lon);
        if (!lonResult.IsValid)
            return lonResult;

        return ValidationResult.Ok((lat, lon));
    }

    public static ValidationResult ValidateAltitude(double? altitude)
    {
        if (!altitude.HasValue)
            return ValidationResult.Ok(altitude);

        if (double.IsNaN(altitude.Value) || double.IsInfinity(altitude.Value))
            return ValidationResult.Fail("Altitude must be a valid number");

        if (altitude.Value < -1000 || altitude.Value > 60000)
            return ValidationResult.Fail("Altitude must be between -1000 and 60000 feet");

        return ValidationResult.Ok(altitude);
    }

    public static ValidationResult ValidateVelocity(double? velocity)
    {
        if (!velocity.HasValue)
            return ValidationResult.Ok(velocity);

        if (double.IsNaN(velocity.Value) || double.IsInfinity(velocity.Value))
            return ValidationResult.Fail("Velocity must be a valid number");

        if (velocity.Value < 0 || velocity.Value > 400)
            return ValidationResult.Fail("Velocity must be between 0 and 400 m/s");

        return ValidationResult.Ok(velocity);
    }

    public static ValidationResult ValidateSearchQuery(string? query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return ValidationResult.Fail("Search query is required");

        var trimmed = query.Trim();

        if (trimmed.Length < 2)
            return ValidationResult.Fail("Search query must be at least 2 characters");

        if (trimmed.Length > 20)
            return ValidationResult.Fail("Search query must be at most 20 characters");

        if (!SearchQueryRegex.IsMatch(trimmed))
            return ValidationResult.Fail("Search query contains invalid characters");

        return ValidationResult.Ok(trimmed);
    }

    public static string Sanitize(string? input)
    {
        if (string.IsNullOrEmpty(input))
            return string.Empty;

        return System.Web.HttpUtility.HtmlEncode(input);
    }
}

public class ValidationResult
{
    public bool IsValid { get; private set; }
    public string? ErrorMessage { get; private set; }
    public object? Value { get; private set; }

    private ValidationResult() { }

    public static ValidationResult Ok(object? value = null) => new()
    {
        IsValid = true,
        Value = value
    };

    public static ValidationResult Fail(string message) => new()
    {
        IsValid = false,
        ErrorMessage = message
    };

    public T GetValue<T>() => (T)Value!;
}
