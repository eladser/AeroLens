# AeroLens

> Real-Time Flight Intelligence Platform — Track flights, predict delays, and travel smarter.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![.NET](https://img.shields.io/badge/.NET-8.0-purple.svg)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg)](https://www.typescriptlang.org/)
[![Frontend CI](https://github.com/eladser/AeroLens/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/eladser/AeroLens/actions/workflows/frontend-ci.yml)
[![Backend CI](https://github.com/eladser/AeroLens/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/eladser/AeroLens/actions/workflows/backend-ci.yml)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Me-FF5E5B?logo=ko-fi&logoColor=white)](https://ko-fi.com/eladser)

---

## The Problem

Travelers today face a fragmented experience:

- **Information scattered across apps**: Airline apps, Google Flights, FlightAware — each shows partial data
- **Reactive, not predictive**: You learn about delays *after* they happen, not before
- **No unified trip view**: Managing multiple flights across different airlines is chaos
- **Expensive alternatives**: Professional flight tracking tools cost $30-100+/month

**The result?** Missed connections, wasted hours at airports, and unnecessary stress.

---

## The Solution

**AeroLens** is a free, AI-powered flight intelligence platform that:

1. **Tracks flights in real-time** with live aircraft positions on an interactive map
2. **Predicts delays before airlines announce them** using weather, airport congestion, and historical patterns
3. **Provides proactive alerts** — know about problems before you leave for the airport
4. **Offers smart disruption assistance** — when things go wrong, get actionable alternatives

---

## Key Features

### Real-Time Flight Tracking
- Live aircraft positions updated every 5 seconds
- Interactive map with flight path visualization
- Aircraft details: altitude, speed, heading, aircraft type

### AI-Powered Delay Predictions
- Analyzes weather at origin, destination, and route
- Considers airport congestion patterns
- Uses historical delay data for route/time combinations
- Predicts delays 30-60 minutes before official announcements

### Smart Trip Dashboard
- Track all your flights in one place
- Timeline view of your travel day
- Automatic status updates via SignalR (no refresh needed)

### Disruption Intelligence
- When delays occur, AI suggests:
  - Alternative flights
  - Rebooking options
  - Nearby airport alternatives
  - Ground transportation options
- Historical insights: "Flights on this route are delayed 34% of Fridays"

### Push Notifications (PWA)
- Web Push API with service worker support
- Browser permission management
- Real-time notification delivery via SignalR
- Notification types:
  - Delay predictions with AI confidence
  - Status updates for tracked flights
  - Weather alerts affecting your route
- Notification settings panel with fine-grained controls

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | React 19 + TypeScript + Vite | Type safety, fast builds, latest React features |
| **Visualization** | Leaflet + react-leaflet | Lightweight, open-source, CARTO dark theme |
| **State Management** | React hooks + Context | Simple, built-in React patterns |
| **Backend** | ASP.NET Core 8 | High performance, SignalR native support |
| **Real-Time** | SignalR | WebSocket abstraction, automatic reconnection |
| **Database** | PostgreSQL (Supabase) | Free tier, real-time subscriptions, Row Level Security |
| **Caching** | In-memory cache | Flight and response caching with configurable TTL |
| **AI/ML** | Groq / Mistral / Gemini | Multi-provider with automatic fallback |
| **PWA** | Workbox + Service Worker | Offline support, push notifications, installable |
| **CI/CD** | GitHub Actions | Automated testing, building, and deployment |
| **Hosting** | Vercel (FE) + Northflank (BE) | Free tiers, no cold starts |

**Total Cost: $0/month** (within free tier limits)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           React 19 PWA (Vite + TypeScript)              │    │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────┐ │    │
│  │  │  Leaflet  │ │  SignalR  │ │  Service  │ │  Push   │ │    │
│  │  │    Map    │ │  Client   │ │  Worker   │ │ Notifs  │ │    │
│  │  └───────────┘ └───────────┘ └───────────┘ └─────────┘ │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ASP.NET Core 8 API                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  REST API   │  │  SignalR    │  │  Background │              │
│  │  Endpoints  │  │    Hub      │  │   Services  │              │
│  │  + Rate     │  │  (Aircraft) │  │  (Poller,   │              │
│  │  Limiting   │  │             │  │   Cleanup)  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CACHING & DATA LAYER                           │
│  ┌──────────────────┐  ┌──────────────────────────────────┐     │
│  │   Supabase       │  │         In-Memory Caches         │     │
│  │   (PostgreSQL    │  │  ┌──────────┐  ┌──────────────┐  │     │
│  │    + Auth)       │  │  │ Flight   │  │  Response    │  │     │
│  │                  │  │  │ Cache    │  │  Cache       │  │     │
│  └──────────────────┘  │  └──────────┘  └──────────────┘  │     │
│                        └──────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
          ▲                ▲                ▲
          │                │                │
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL DATA SOURCES                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  OpenSky    │  │ Open-Meteo  │  │    AI Providers         │  │
│  │  + AdsB.lol │  │ + OpenWeath │  │  (Groq/Mistral/Gemini)  │  │
│  │  (aircraft) │  │  (weather)  │  │  Multi-provider fallback│  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## External APIs (All Free Tier)

| API | Purpose | Free Tier Limits |
|-----|---------|------------------|
| [OpenSky Network](https://opensky-network.org/) | Live aircraft positions (primary) | 400 req/day (anonymous), 4000/day (registered) |
| [AdsB.lol](https://www.adsb.lol/) | Aircraft positions (fallback) | Unlimited |
| [Open-Meteo](https://open-meteo.com/) | Weather data (primary) | Unlimited, no API key |
| [OpenWeatherMap](https://openweathermap.org/) | Weather data (fallback) | 1,000 calls/day |
| [Groq](https://groq.com/) | AI predictions (primary) | 30 req/min |
| [Mistral](https://mistral.ai/) | AI predictions (fallback) | Free tier available |
| [Google Gemini](https://ai.google.dev/) | AI predictions (fallback) | 60 req/min |
| [CARTO](https://carto.com/) | Map tiles | Free for non-commercial use |

---

## Project Structure

```
aerolens/
├── .github/
│   └── workflows/           # CI/CD pipelines
│       ├── frontend-ci.yml  # Frontend lint, build, test
│       ├── backend-ci.yml   # Backend build, Docker
│       └── deploy.yml       # Deployment automation
├── src/
│   ├── AeroLens.Api/        # ASP.NET Core backend
│   │   ├── Services/        # API clients, caching
│   │   ├── Hubs/            # SignalR hubs
│   │   └── Program.cs       # App configuration
│   └── aerolens-web/        # React 19 frontend (PWA)
│       ├── src/
│       │   ├── components/  # UI components
│       │   ├── hooks/       # Custom React hooks
│       │   ├── lib/         # API client, utilities
│       │   └── services/    # Notification service
│       ├── public/          # Static assets, manifest
│       └── sw.ts            # Service worker
├── README.md
└── LICENSE
```

---

## Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- [Docker](https://www.docker.com/) (optional, for local services)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/eladser/AeroLens.git
cd AeroLens

# Backend
cd src/AeroLens.Api
dotnet restore
dotnet run

# Frontend (new terminal)
cd src/aerolens-web
npm install
npm run dev
```

### Environment Variables

Create `.env` files based on `.env.example`:

```env
# Backend (.env)
OPENSKY_USERNAME=your_username
OPENSKY_PASSWORD=your_password
AVIATIONSTACK_API_KEY=your_key
OPENWEATHER_API_KEY=your_key
GEMINI_API_KEY=your_key
SUPABASE_URL=your_url
SUPABASE_KEY=your_key
UPSTASH_REDIS_URL=your_url

# Frontend (.env.local)
VITE_API_URL=http://localhost:5000
VITE_MAPBOX_TOKEN=your_token
```

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Support

If you find AeroLens useful, consider supporting its development:

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Me-FF5E5B?logo=ko-fi&logoColor=white)](https://ko-fi.com/eladser)

---

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [OpenSky Network](https://opensky-network.org/) for free flight tracking data
- [OpenWeatherMap](https://openweathermap.org/) for weather data
- [Mapbox](https://www.mapbox.com/) for beautiful maps

---

**Built with passion for better travel experiences.**
