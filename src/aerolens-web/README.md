# AeroLens Web

Real-time flight tracking interface built with React, TypeScript, and Leaflet.

## Quick Start

```bash
npm install
npm run dev
```

## Stack

- React 18 + TypeScript
- Vite
- Leaflet (react-leaflet)
- SignalR for real-time updates

## Key Features

- Live aircraft position interpolation (~15fps state updates)
- Position change thresholds to minimize DOM updates
- Tooltip content caching
- Rate limit handling with user-friendly messages
- Collapsible weather sections
- Debounced API calls for predictions

## Project Structure

```
src/
├── components/     # UI components
├── hooks/          # Custom React hooks
├── contexts/       # React context providers
├── lib/            # API client, utilities
├── data/           # Static data (airports)
├── types/          # TypeScript types
└── utils/          # Helper functions
```

## Environment

Copy `.env.example` to `.env` and configure:

```
VITE_API_URL=http://localhost:5000
```

## Scripts

- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
