# AeroLens

> Real-Time Flight Intelligence Platform — Track flights, predict delays, and travel smarter.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![.NET](https://img.shields.io/badge/.NET-8.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Me-FF5E5B?logo=ko-fi&logoColor=white)](https://ko-fi.com/eladser)

**[Live Demo](https://aerolens.eladser.dev)** | **[Report Bug](https://github.com/eladser/AeroLens/issues/new?template=bug_report.md)** | **[Request Feature](https://github.com/eladser/AeroLens/issues/new?template=feature_request.md)**

---

## Overview

AeroLens is a free, open-source flight tracking platform that combines real-time aircraft data with AI-powered delay predictions. Track thousands of flights worldwide, get weather-based disruption alerts, and manage your trips — all in one place.

### Why AeroLens?

- **Free forever** — No subscriptions, no premium tiers
- **Real-time tracking** — Live aircraft positions updated every 5 seconds
- **AI predictions** — Know about delays before airlines announce them
- **Privacy-first** — Your data stays with you (Supabase with Row Level Security)
- **Installable PWA** — Works offline, push notifications, add to home screen

---

## Features

| Feature | Description |
|---------|-------------|
| **Live Map** | Interactive map with real-time aircraft positions, flight paths, and airport markers |
| **Flight Search** | Search by flight number, callsign, or click any aircraft on the map |
| **Delay Predictions** | AI analyzes weather, congestion, and history to predict delays 30-60 min early |
| **Weather Integration** | Current conditions and 5-day forecast for any location |
| **Trip Dashboard** | Save and track multiple flights with automatic status updates |
| **Disruption Alerts** | Smart suggestions when things go wrong — alternatives, rebooking, ground transport |
| **Push Notifications** | Browser notifications for delay alerts and status changes |
| **Dark Mode** | Easy on the eyes, beautiful CARTO dark map tiles |

---

## Tech Stack

### Frontend
- **React 19** + TypeScript + Vite
- **Leaflet** for maps with CARTO dark tiles
- **SignalR** client for real-time updates
- **PWA** with service worker and push notifications

### Backend
- **ASP.NET Core 8** with minimal APIs
- **SignalR** hub for WebSocket connections
- **In-memory caching** with configurable TTL
- **Multi-provider AI** (Groq → Mistral → Gemini fallback)

### Infrastructure
- **Vercel** — Frontend hosting (free tier)
- **Northflank** — Backend hosting (free tier, no cold starts)
- **Supabase** — PostgreSQL + Auth (free tier)
- **Upstash** — Redis for SignalR scaling (free tier)

**Total monthly cost: $0**

---

## Quick Start

### Prerequisites
- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)

### Development

```bash
# Clone
git clone https://github.com/eladser/AeroLens.git
cd AeroLens

# Backend
cd src/AeroLens.Api
cp appsettings.Local.json.example appsettings.Local.json  # Add your API keys
dotnet run

# Frontend (new terminal)
cd src/aerolens-web
cp .env.example .env  # Configure environment
npm install
npm run dev
```

Open http://localhost:5173

### Environment Variables

**Backend** (`appsettings.Local.json`):
```json
{
  "Supabase": { "Url": "...", "JwtSecret": "..." },
  "OpenSky": { "ClientId": "...", "ClientSecret": "..." },
  "OpenWeatherMap": { "ApiKey": "..." },
  "Groq": { "ApiKey": "..." }
}
```

**Frontend** (`.env`):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## Project Structure

```
aerolens/
├── .github/
│   ├── ISSUE_TEMPLATE/      # Bug report & feature request templates
│   ├── workflows/           # CI/CD pipelines
│   └── PULL_REQUEST_TEMPLATE.md
├── src/
│   ├── AeroLens.Api/        # ASP.NET Core backend
│   │   ├── Services/        # API clients, caching, AI
│   │   ├── Hubs/            # SignalR hubs
│   │   └── Dockerfile       # Container build
│   └── aerolens-web/        # React frontend (PWA)
│       ├── src/components/  # UI components
│       ├── src/hooks/       # Custom React hooks
│       ├── src/lib/         # API client, utilities
│       └── public/          # Static assets, manifest
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

---

## API Sources

All APIs used have generous free tiers:

| API | Purpose | Free Limit |
|-----|---------|------------|
| [OpenSky Network](https://opensky-network.org/) | Aircraft positions (primary) | 4,000 req/day |
| [AdsB.lol](https://www.adsb.lol/) | Aircraft positions (fallback) | Unlimited |
| [Open-Meteo](https://open-meteo.com/) | Weather (primary) | Unlimited |
| [OpenWeatherMap](https://openweathermap.org/) | Weather (fallback) | 1,000 req/day |
| [Groq](https://groq.com/) | AI predictions | 30 req/min |

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Support

If you find AeroLens useful, consider:

- Giving it a star on GitHub
- [Supporting on Ko-fi](https://ko-fi.com/eladser)
- Reporting bugs or suggesting features

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

**Built by [Elad Sertshuk](https://github.com/eladser)**
