using System.Net;
using System.Text;
using AeroLens.Api.Services;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;

namespace AeroLens.Api.Tests.Services;

public class OpenMeteoClientTests
{
    private readonly Mock<ILogger<OpenMeteoClient>> _loggerMock;
    private readonly Mock<HttpMessageHandler> _handlerMock;
    private readonly HttpClient _httpClient;

    public OpenMeteoClientTests()
    {
        _loggerMock = new Mock<ILogger<OpenMeteoClient>>();
        _handlerMock = new Mock<HttpMessageHandler>();
        _httpClient = new HttpClient(_handlerMock.Object)
        {
            BaseAddress = new Uri("https://api.open-meteo.com/")
        };
    }

    private void SetupHttpResponse(string content, HttpStatusCode statusCode = HttpStatusCode.OK)
    {
        _handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = statusCode,
                Content = new StringContent(content, Encoding.UTF8, "application/json")
            });
    }

    #region GetWeatherAsync Tests

    [Fact]
    public async Task GetWeatherAsync_ReturnsWeatherData_WhenApiSucceeds()
    {
        // Arrange
        var responseJson = @"{
            ""current"": {
                ""temperature_2m"": 20.5,
                ""relative_humidity_2m"": 65,
                ""apparent_temperature"": 19.8,
                ""weather_code"": 0,
                ""wind_speed_10m"": 18.0
            }
        }";
        SetupHttpResponse(responseJson);

        var client = new OpenMeteoClient(_httpClient, _loggerMock.Object);

        // Act
        var result = await client.GetWeatherAsync(51.5, -0.1);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("clear sky", result.Description);
        Assert.Equal("01d", result.Icon);
        Assert.Equal(20.5, result.Temp);
        Assert.Equal(19.8, result.FeelsLike);
        Assert.Equal(65, result.Humidity);
        Assert.Equal(5.0, result.WindSpeed, 1); // 18.0 km/h / 3.6 = 5 m/s
    }

    [Fact]
    public async Task GetWeatherAsync_ParsesThunderstormCode_Correctly()
    {
        // Arrange
        var responseJson = @"{
            ""current"": {
                ""temperature_2m"": 25.0,
                ""relative_humidity_2m"": 80,
                ""apparent_temperature"": 28.0,
                ""weather_code"": 95,
                ""wind_speed_10m"": 36.0
            }
        }";
        SetupHttpResponse(responseJson);

        var client = new OpenMeteoClient(_httpClient, _loggerMock.Object);

        // Act
        var result = await client.GetWeatherAsync(51.5, -0.1);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("thunderstorm", result.Description);
        Assert.Equal("11d", result.Icon);
    }

    [Fact]
    public async Task GetWeatherAsync_ParsesSnowCode_Correctly()
    {
        // Arrange
        var responseJson = @"{
            ""current"": {
                ""temperature_2m"": -5.0,
                ""relative_humidity_2m"": 90,
                ""apparent_temperature"": -10.0,
                ""weather_code"": 73,
                ""wind_speed_10m"": 10.0
            }
        }";
        SetupHttpResponse(responseJson);

        var client = new OpenMeteoClient(_httpClient, _loggerMock.Object);

        // Act
        var result = await client.GetWeatherAsync(51.5, -0.1);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("snow", result.Description);
        Assert.Equal("13d", result.Icon);
    }

    [Fact]
    public async Task GetWeatherAsync_ReturnsNull_WhenApiReturnsError()
    {
        // Arrange
        SetupHttpResponse("", HttpStatusCode.InternalServerError);
        var client = new OpenMeteoClient(_httpClient, _loggerMock.Object);

        // Act
        var result = await client.GetWeatherAsync(51.5, -0.1);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetWeatherAsync_ReturnsNull_WhenApiThrows()
    {
        // Arrange
        _handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("Network error"));

        var client = new OpenMeteoClient(_httpClient, _loggerMock.Object);

        // Act
        var result = await client.GetWeatherAsync(51.5, -0.1);

        // Assert
        Assert.Null(result);
    }

    [Theory]
    [InlineData(0, "clear sky", "01d")]
    [InlineData(1, "mainly clear", "01d")]
    [InlineData(2, "partly cloudy", "02d")]
    [InlineData(3, "overcast", "04d")]
    [InlineData(45, "fog", "50d")]
    [InlineData(61, "rain", "10d")]
    [InlineData(65, "rain", "10d")]
    [InlineData(71, "snow", "13d")]
    [InlineData(75, "snow", "13d")]
    [InlineData(95, "thunderstorm", "11d")]
    [InlineData(99, "thunderstorm with hail", "11d")]
    public async Task GetWeatherAsync_MapsWeatherCodes_Correctly(int code, string expectedDesc, string expectedIcon)
    {
        // Arrange
        var responseJson = $@"{{
            ""current"": {{
                ""temperature_2m"": 20.0,
                ""relative_humidity_2m"": 50,
                ""apparent_temperature"": 20.0,
                ""weather_code"": {code},
                ""wind_speed_10m"": 10.0
            }}
        }}";
        SetupHttpResponse(responseJson);

        var client = new OpenMeteoClient(_httpClient, _loggerMock.Object);

        // Act
        var result = await client.GetWeatherAsync(51.5, -0.1);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(expectedDesc, result.Description);
        Assert.Equal(expectedIcon, result.Icon);
    }

    #endregion

    #region GetForecastAsync Tests

    [Fact]
    public async Task GetForecastAsync_ReturnsForecastData_WhenApiSucceeds()
    {
        // Arrange
        var responseJson = @"{
            ""daily"": {
                ""time"": [""2024-01-15"", ""2024-01-16"", ""2024-01-17""],
                ""weather_code"": [0, 61, 3],
                ""temperature_2m_max"": [15.0, 12.0, 10.0],
                ""temperature_2m_min"": [5.0, 3.0, 2.0],
                ""precipitation_probability_max"": [10, 80, 20],
                ""wind_speed_10m_max"": [18.0, 36.0, 25.0]
            }
        }";
        SetupHttpResponse(responseJson);

        var client = new OpenMeteoClient(_httpClient, _loggerMock.Object);

        // Act
        var result = await client.GetForecastAsync(51.5, -0.1, 3);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(3, result.Count);

        // Day 1
        Assert.Equal(new DateTime(2024, 1, 15), result[0].Date);
        Assert.Equal("clear sky", result[0].Description);
        Assert.Equal(15.0, result[0].TempMax);
        Assert.Equal(5.0, result[0].TempMin);
        Assert.Equal(10, result[0].PrecipitationProbability);
        Assert.Equal(5.0, result[0].WindSpeedMax, 1); // 18.0 km/h / 3.6 = 5 m/s

        // Day 2
        Assert.Equal("rain", result[1].Description);
        Assert.Equal(80, result[1].PrecipitationProbability);

        // Day 3
        Assert.Equal("overcast", result[2].Description);
    }

    [Fact]
    public async Task GetForecastAsync_ReturnsNull_WhenNoDailyData()
    {
        // Arrange
        var responseJson = @"{ ""hourly"": {} }";
        SetupHttpResponse(responseJson);

        var client = new OpenMeteoClient(_httpClient, _loggerMock.Object);

        // Act
        var result = await client.GetForecastAsync(51.5, -0.1, 3);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetForecastAsync_ReturnsNull_WhenApiReturnsError()
    {
        // Arrange
        SetupHttpResponse("", HttpStatusCode.InternalServerError);
        var client = new OpenMeteoClient(_httpClient, _loggerMock.Object);

        // Act
        var result = await client.GetForecastAsync(51.5, -0.1, 3);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetForecastAsync_LimitsToDaysParameter()
    {
        // Arrange - API returns 5 days but we request 3
        var responseJson = @"{
            ""daily"": {
                ""time"": [""2024-01-15"", ""2024-01-16"", ""2024-01-17"", ""2024-01-18"", ""2024-01-19""],
                ""weather_code"": [0, 1, 2, 3, 0],
                ""temperature_2m_max"": [15.0, 14.0, 13.0, 12.0, 11.0],
                ""temperature_2m_min"": [5.0, 4.0, 3.0, 2.0, 1.0],
                ""precipitation_probability_max"": [10, 20, 30, 40, 50],
                ""wind_speed_10m_max"": [18.0, 20.0, 22.0, 24.0, 26.0]
            }
        }";
        SetupHttpResponse(responseJson);

        var client = new OpenMeteoClient(_httpClient, _loggerMock.Object);

        // Act
        var result = await client.GetForecastAsync(51.5, -0.1, 3);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(3, result.Count);
    }

    [Fact]
    public async Task GetForecastAsync_HandlesNullPrecipitationProbability()
    {
        // Arrange - precipitation probability might be null
        var responseJson = @"{
            ""daily"": {
                ""time"": [""2024-01-15""],
                ""weather_code"": [0],
                ""temperature_2m_max"": [15.0],
                ""temperature_2m_min"": [5.0],
                ""precipitation_probability_max"": [null],
                ""wind_speed_10m_max"": [18.0]
            }
        }";
        SetupHttpResponse(responseJson);

        var client = new OpenMeteoClient(_httpClient, _loggerMock.Object);

        // Act
        var result = await client.GetForecastAsync(51.5, -0.1, 1);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal(0, result[0].PrecipitationProbability);
    }

    #endregion

    #region TestAsync Tests

    [Fact]
    public async Task TestAsync_ReturnsSuccess_WhenApiResponds()
    {
        // Arrange
        var responseJson = @"{ ""current"": { ""temperature_2m"": 10.0 } }";
        SetupHttpResponse(responseJson);

        var client = new OpenMeteoClient(_httpClient, _loggerMock.Object);

        // Act
        var (ok, message) = await client.TestAsync();

        // Assert
        Assert.True(ok);
        Assert.Equal("OK (10,000/day, no key)", message);
    }

    [Fact]
    public async Task TestAsync_ReturnsFailure_WhenApiReturnsError()
    {
        // Arrange
        SetupHttpResponse("", HttpStatusCode.TooManyRequests);

        var client = new OpenMeteoClient(_httpClient, _loggerMock.Object);

        // Act
        var (ok, message) = await client.TestAsync();

        // Assert
        Assert.False(ok);
        Assert.Contains("429", message);
    }

    [Fact]
    public async Task TestAsync_ReturnsFailure_WhenApiThrows()
    {
        // Arrange
        _handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("Connection failed"));

        var client = new OpenMeteoClient(_httpClient, _loggerMock.Object);

        // Act
        var (ok, message) = await client.TestAsync();

        // Assert
        Assert.False(ok);
        Assert.Contains("Connection failed", message);
    }

    #endregion

    #region Wind Speed Conversion Tests

    [Theory]
    [InlineData(0, 0)]
    [InlineData(36, 10)]    // 36 km/h = 10 m/s
    [InlineData(72, 20)]    // 72 km/h = 20 m/s
    [InlineData(108, 30)]   // 108 km/h = 30 m/s
    public async Task GetWeatherAsync_ConvertsWindSpeedToMetersPerSecond(double kmh, double expectedMs)
    {
        // Arrange
        var responseJson = $@"{{
            ""current"": {{
                ""temperature_2m"": 20.0,
                ""relative_humidity_2m"": 50,
                ""apparent_temperature"": 20.0,
                ""weather_code"": 0,
                ""wind_speed_10m"": {kmh.ToString(System.Globalization.CultureInfo.InvariantCulture)}
            }}
        }}";
        SetupHttpResponse(responseJson);

        var client = new OpenMeteoClient(_httpClient, _loggerMock.Object);

        // Act
        var result = await client.GetWeatherAsync(51.5, -0.1);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(expectedMs, result.WindSpeed, 1);
    }

    #endregion
}
