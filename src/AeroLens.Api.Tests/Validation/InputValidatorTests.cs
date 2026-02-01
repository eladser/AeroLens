using AeroLens.Api.Validation;

namespace AeroLens.Api.Tests.Validation;

public class InputValidatorTests
{
    #region ValidateIcao24 Tests

    [Theory]
    [InlineData("a1b2c3")]
    [InlineData("A1B2C3")]
    [InlineData("123456")]
    [InlineData("abcdef")]
    [InlineData("ABCDEF")]
    [InlineData("00ff00")]
    public void ValidateIcao24_AcceptsValidHexAddresses(string icao24)
    {
        var result = InputValidator.ValidateIcao24(icao24);

        Assert.True(result.IsValid);
        Assert.Equal(icao24.ToLowerInvariant(), result.GetValue<string>());
    }

    [Fact]
    public void ValidateIcao24_TrimsWhitespace()
    {
        var result = InputValidator.ValidateIcao24("  a1b2c3  ");

        Assert.True(result.IsValid);
        Assert.Equal("a1b2c3", result.GetValue<string>());
    }

    [Fact]
    public void ValidateIcao24_ReturnsLowerCase()
    {
        var result = InputValidator.ValidateIcao24("A1B2C3");

        Assert.True(result.IsValid);
        Assert.Equal("a1b2c3", result.GetValue<string>());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ValidateIcao24_RejectsNullOrEmpty(string? icao24)
    {
        var result = InputValidator.ValidateIcao24(icao24);

        Assert.False(result.IsValid);
        Assert.Contains("required", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("a1b2c")]      // 5 chars
    [InlineData("a1b2c3d")]    // 7 chars
    [InlineData("abc")]        // 3 chars
    public void ValidateIcao24_RejectsWrongLength(string icao24)
    {
        var result = InputValidator.ValidateIcao24(icao24);

        Assert.False(result.IsValid);
        Assert.Contains("6 characters", result.ErrorMessage);
    }

    [Theory]
    [InlineData("g1b2c3")]    // g is not hex
    [InlineData("a1b2c!")]    // special char
    [InlineData("a1 2c3")]    // space inside
    [InlineData("123-56")]    // dash
    public void ValidateIcao24_RejectsNonHexCharacters(string icao24)
    {
        var result = InputValidator.ValidateIcao24(icao24);

        Assert.False(result.IsValid);
        Assert.Contains("hexadecimal", result.ErrorMessage);
    }

    #endregion

    #region ValidateLatitude Tests

    [Theory]
    [InlineData(0)]
    [InlineData(45.5)]
    [InlineData(-45.5)]
    [InlineData(90)]
    [InlineData(-90)]
    [InlineData(89.999)]
    [InlineData(-89.999)]
    public void ValidateLatitude_AcceptsValidValues(double lat)
    {
        var result = InputValidator.ValidateLatitude(lat);

        Assert.True(result.IsValid);
        Assert.Equal(lat, result.GetValue<double>());
    }

    [Theory]
    [InlineData(90.001)]
    [InlineData(-90.001)]
    [InlineData(180)]
    [InlineData(-180)]
    [InlineData(1000)]
    public void ValidateLatitude_RejectsOutOfRange(double lat)
    {
        var result = InputValidator.ValidateLatitude(lat);

        Assert.False(result.IsValid);
        Assert.Contains("-90", result.ErrorMessage);
        Assert.Contains("90", result.ErrorMessage);
    }

    [Fact]
    public void ValidateLatitude_RejectsNaN()
    {
        var result = InputValidator.ValidateLatitude(double.NaN);

        Assert.False(result.IsValid);
        Assert.Contains("valid number", result.ErrorMessage);
    }

    [Fact]
    public void ValidateLatitude_RejectsInfinity()
    {
        var result1 = InputValidator.ValidateLatitude(double.PositiveInfinity);
        var result2 = InputValidator.ValidateLatitude(double.NegativeInfinity);

        Assert.False(result1.IsValid);
        Assert.False(result2.IsValid);
    }

    #endregion

    #region ValidateLongitude Tests

    [Theory]
    [InlineData(0)]
    [InlineData(90)]
    [InlineData(-90)]
    [InlineData(180)]
    [InlineData(-180)]
    [InlineData(179.999)]
    [InlineData(-179.999)]
    public void ValidateLongitude_AcceptsValidValues(double lon)
    {
        var result = InputValidator.ValidateLongitude(lon);

        Assert.True(result.IsValid);
        Assert.Equal(lon, result.GetValue<double>());
    }

    [Theory]
    [InlineData(180.001)]
    [InlineData(-180.001)]
    [InlineData(360)]
    [InlineData(-360)]
    public void ValidateLongitude_RejectsOutOfRange(double lon)
    {
        var result = InputValidator.ValidateLongitude(lon);

        Assert.False(result.IsValid);
        Assert.Contains("-180", result.ErrorMessage);
        Assert.Contains("180", result.ErrorMessage);
    }

    #endregion

    #region ValidateCoordinates Tests

    [Theory]
    [InlineData(51.5, -0.1)]       // London
    [InlineData(40.7, -74.0)]      // New York
    [InlineData(-33.9, 151.2)]     // Sydney
    [InlineData(0, 0)]             // Null Island
    [InlineData(90, 180)]          // Edge values
    [InlineData(-90, -180)]        // Edge values
    public void ValidateCoordinates_AcceptsValidPairs(double lat, double lon)
    {
        var result = InputValidator.ValidateCoordinates(lat, lon);

        Assert.True(result.IsValid);
    }

    [Fact]
    public void ValidateCoordinates_RejectsInvalidLatitude()
    {
        var result = InputValidator.ValidateCoordinates(91, 0);

        Assert.False(result.IsValid);
        Assert.Contains("Latitude", result.ErrorMessage);
    }

    [Fact]
    public void ValidateCoordinates_RejectsInvalidLongitude()
    {
        var result = InputValidator.ValidateCoordinates(0, 181);

        Assert.False(result.IsValid);
        Assert.Contains("Longitude", result.ErrorMessage);
    }

    #endregion

    #region ValidateAltitude Tests

    [Fact]
    public void ValidateAltitude_AcceptsNull()
    {
        var result = InputValidator.ValidateAltitude(null);

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(35000)]
    [InlineData(40000)]
    [InlineData(60000)]
    [InlineData(-500)]     // Below sea level valid
    [InlineData(-1000)]    // Minimum allowed
    public void ValidateAltitude_AcceptsValidValues(double altitude)
    {
        var result = InputValidator.ValidateAltitude(altitude);

        Assert.True(result.IsValid);
        Assert.Equal(altitude, result.GetValue<double?>());
    }

    [Theory]
    [InlineData(60001)]
    [InlineData(100000)]
    [InlineData(-1001)]
    [InlineData(-5000)]
    public void ValidateAltitude_RejectsOutOfRange(double altitude)
    {
        var result = InputValidator.ValidateAltitude(altitude);

        Assert.False(result.IsValid);
        Assert.Contains("60000", result.ErrorMessage);
    }

    [Fact]
    public void ValidateAltitude_RejectsNaN()
    {
        var result = InputValidator.ValidateAltitude(double.NaN);

        Assert.False(result.IsValid);
    }

    #endregion

    #region ValidateVelocity Tests

    [Fact]
    public void ValidateVelocity_AcceptsNull()
    {
        var result = InputValidator.ValidateVelocity(null);

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(100)]
    [InlineData(250)]    // Typical cruise speed ~250 m/s
    [InlineData(300)]
    [InlineData(400)]    // Maximum allowed
    public void ValidateVelocity_AcceptsValidValues(double velocity)
    {
        var result = InputValidator.ValidateVelocity(velocity);

        Assert.True(result.IsValid);
        Assert.Equal(velocity, result.GetValue<double?>());
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(-100)]
    [InlineData(401)]
    [InlineData(1000)]
    public void ValidateVelocity_RejectsOutOfRange(double velocity)
    {
        var result = InputValidator.ValidateVelocity(velocity);

        Assert.False(result.IsValid);
        Assert.Contains("400", result.ErrorMessage);
    }

    #endregion

    #region ValidateSearchQuery Tests

    [Theory]
    [InlineData("UA123")]
    [InlineData("Delta")]
    [InlineData("JFK")]
    [InlineData("A320")]
    [InlineData("12")]
    [InlineData("United Airlines")]
    [InlineData("B6-200")]
    public void ValidateSearchQuery_AcceptsValidQueries(string query)
    {
        var result = InputValidator.ValidateSearchQuery(query);

        Assert.True(result.IsValid);
    }

    [Fact]
    public void ValidateSearchQuery_TrimsWhitespace()
    {
        var result = InputValidator.ValidateSearchQuery("  UA123  ");

        Assert.True(result.IsValid);
        Assert.Equal("UA123", result.GetValue<string>());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ValidateSearchQuery_RejectsNullOrEmpty(string? query)
    {
        var result = InputValidator.ValidateSearchQuery(query);

        Assert.False(result.IsValid);
        Assert.Contains("required", result.ErrorMessage);
    }

    [Fact]
    public void ValidateSearchQuery_RejectsTooShort()
    {
        var result = InputValidator.ValidateSearchQuery("A");

        Assert.False(result.IsValid);
        Assert.Contains("2 characters", result.ErrorMessage);
    }

    [Fact]
    public void ValidateSearchQuery_RejectsTooLong()
    {
        var result = InputValidator.ValidateSearchQuery("This is way too long for a search query");

        Assert.False(result.IsValid);
        Assert.Contains("20 characters", result.ErrorMessage);
    }

    [Theory]
    [InlineData("UA@123")]      // @ symbol
    [InlineData("UA#123")]      // # symbol
    [InlineData("UA$123")]      // $ symbol
    [InlineData("UA<script>")]  // XSS attempt
    [InlineData("UA'123")]      // SQL injection attempt
    public void ValidateSearchQuery_RejectsInvalidCharacters(string query)
    {
        var result = InputValidator.ValidateSearchQuery(query);

        Assert.False(result.IsValid);
        Assert.Contains("invalid characters", result.ErrorMessage);
    }

    #endregion

    #region Sanitize Tests

    [Fact]
    public void Sanitize_ReturnsEmptyForNull()
    {
        var result = InputValidator.Sanitize(null);

        Assert.Equal(string.Empty, result);
    }

    [Fact]
    public void Sanitize_ReturnsEmptyForEmpty()
    {
        var result = InputValidator.Sanitize("");

        Assert.Equal(string.Empty, result);
    }

    [Fact]
    public void Sanitize_PassesThroughSafeStrings()
    {
        var result = InputValidator.Sanitize("Hello World 123");

        Assert.Equal("Hello World 123", result);
    }

    [Fact]
    public void Sanitize_EncodesHtmlTags()
    {
        var result = InputValidator.Sanitize("<script>alert('xss')</script>");

        Assert.DoesNotContain("<script>", result);
        Assert.Contains("&lt;", result);
        Assert.Contains("&gt;", result);
    }

    [Fact]
    public void Sanitize_EncodesQuotes()
    {
        var result = InputValidator.Sanitize("\"Hello\" & 'World'");

        Assert.Contains("&quot;", result);
        Assert.Contains("&#39;", result);
        Assert.Contains("&amp;", result);
    }

    #endregion
}
