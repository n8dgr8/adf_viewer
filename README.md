# ADF Object Track Explorer

ADF Object Track Explorer is a lightweight, client-side web tool built to inspect, visualize, and analyze [Analytics Data Format (ADF)](https://developer.axis.com/analytics/axis-scene-metadata/reference/data-formats/analytics-data-format/) `com.axis.analytics_scene_description.v0.beta` Object Track messages. Its goal is to give developers and integrators working with scene metadata an immediate way to explore track payloads, understand spatial trajectories, and evaluate payload composition without standing up backend infrastructure.

The app provides three complementary views—an interactive **Track Workbench** with a normalized coordinate trajectory canvas, Base64 snapshot decoder, payload bandwidth breakdown, and raw JSON tree; a **Forensic Search Gallery** for filtering tracks by class, attributes (hat, clothing colors, license plates), and dwell time; and **Spatial & Flow Analytics** for occupancy heatmaps, directional flow vectors, and virtual tripwire/zone counting. Tracks can be streamed live over WebSocket MQTT (`ws://` / `wss://`), imported via JSON/JSONL files or clipboard paste, or generated on demand with the built-in simulator.

> **Disclaimer:** This is an independent community/personal project and is **not** an official Axis Communications product, nor is it affiliated with, endorsed by, or supported by Axis Communications AB.

## Building & Local Development

Requires **Node.js 18+** and **npm**.

```bash
# Install dependencies
npm install

# Start the local Vite dev server
npm run dev

# Type-check and build static production assets into dist/
npm run build

# Preview the production build locally
npm run preview
```

## Hosting

The build outputs a purely static Single-Page Application (SPA) in `dist/` that can be served by any static host. The repository includes a `firebase.json` configured for **Firebase Hosting**:

```bash
# Authenticate and select your Firebase project (first time only)
npx firebase-tools login
npx firebase-tools use --add

# Build and deploy to Firebase Hosting
npm run deploy
```
