# Rideshare Web App

A modern, high-performance ride-sharing web application built with a focus on immersive map visualizations and real-time interactions.

## Features

- **Immersive Mapbox Integration:**
  - Upgraded to the **Mapbox Standard** style with deeply integrated 3D buildings, dynamic lighting (Dawn, Day, Dusk, Night), and atmospheric fog natively.
  - Realistic 3D terrain (Digital Elevation Model) with elevated mountains, hills, and valleys.
  - Custom, glowing high-contrast route pathing for clear visibility against dark or complex backgrounds.
- **Rider Experience:**
  - Location selection for pickup and dropoff points via an intuitive interface.
  - Real-time GPS and location tracking.
  - Live ride status and driver vehicle information display.
- **Driver Experience:**
  - Dedicated driver dashboard with live WebSocket connectivity for instant trip assignments.
  - Persistent online/offline availability states.
  - Driver trip history displaying comprehensive logs of previous rides.
  - Clean profile management displaying performance statistics and dynamically synced metrics.
- **Modern User Interface:**
  - Clean, immersive layout inspired by cosmic, sleek aesthetics.
  - Uses `lucide-react` for smooth vector iconography.
  - Mobile-responsive spatial layouts.
- **Robust State Management:**
  - Powered by `@tanstack/react-query` for high-performance server-state synchronization and caching.
  - Employs WebSockets for low-latency dispatching and location tracking.

## Technology Stack

- **Framework**: React 19 (via Vite)
- **Language**: TypeScript
- **Styling**: Standard CSS with dynamic aesthetic elements
- **Routing**: React Router v7
- **State & Data Fetching**: Tanstack React Query & Axios
- **Maps API**: Mapbox GL JS (v3)

## Prerequisites

- Node.js (v18 or higher recommended)
- A Mapbox API Token (to render the maps and routing services)

## Environment Variables

Create a `.env` file in the root directory of your project and configure the required keys:

```ini
# Core Backend API Address
VITE_API_BASE_URL=http://localhost:8080

# WebSocket Gateway or Services URLs
VITE_WS_RIDER_URL=ws://localhost:8090/ws/rider
VITE_WS_DRIVER_URL=ws://localhost:8090/ws/driver

# Mapbox Access Token
VITE_MAPBOX_ACCESS_TOKEN=pk.YOUR_MAPBOX_ACCESS_TOKEN_HERE
```

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Run the development server:**
   ```bash
   npm run dev
   ```
3. **Build for production:**
   ```bash
   npm run build
   ```

## Development & Testing

- **Mock Geolocation:** The app includes a `mockGeolocation.ts` utility designed to spoof browser GPS signals when testing Rider/Driver interactions locally without needing physical device movement.
- **Mock Test Harness:** Start flows locally bypassing standard flows using `/mock-test-harness`.

