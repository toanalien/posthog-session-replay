# Urchin - PostHog Session Replay for Cloudflare Stack

> A high-performance, cost-efficient **Session Replay & Debugger Engine** cloned from PostHog's architecture and optimized for **Cloudflare Stack** (Workers, D1 Database, R2 Object Storage, and Cloudflare Pages).

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com)
[![GitHub License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 🏛️ PostHog Architecture vs. Cloudflare Stack Mapping

| PostHog Component | Cloudflare Stack Equivalent | Function / Purpose |
| :--- | :--- | :--- |
| **Ingestion Pipeline** | **Cloudflare Workers** | Edge HTTP ingestion endpoint (`/api/v1/projects/:projectId/snapshots`). Zero cold starts, ultra low latency. |
| **Event Metadata & Search** | **Cloudflare D1 (SQLite)** | Stores session metadata, distinct user IDs, entry/exit URLs, rage clicks count, duration, and error frequencies. |
| **Raw Snapshot Storage** | **Cloudflare R2** | Stores compressed `rrweb` DOM mutation chunks. Zero egress fees for video playback. |
| **Replay UI & Dashboard** | **Cloudflare Pages** | Modern React + Vite dashboard featuring `rrweb-player` and multi-tab debugging tools. |

---

## ✨ Features

- 📹 **Full DOM Replay**: Pixel-perfect session replay powered by `rrweb`.
- ⚡ **Cloudflare Native**: Designed to scale effortlessly on Cloudflare Free & Paid Tiers.
- 🛑 **Automatic Rage Click Detection**: Identifies rapid user clicks (<800ms) and flags frustrated user moments.
- 🐛 **Console & Exception Interceptor**: Automatically captures `console.error`, `console.warn`, and uncaught stack traces.
- 🌐 **Network Waterfall Inspection**: Intercepts `fetch` & `XMLHttpRequest` to show HTTP status codes and response timings.
- 🔒 **Privacy & Masking Controls**: Password inputs and element classes (`ph-mask`, `ph-no-capture`) redacted at recording time.
- 📊 **Multi-Faceted Search & Filters**: Search by distinct user, entry page, minimum duration, errors, or rage clicks.

---

## 🛠️ Quick Start & Local Development

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/toanalien/posthog-session-replay.git
cd posthog-session-replay
npm install
```

### 2. Run Local Development Server

```bash
# Start Vite Frontend Dashboard (http://localhost:3000)
npm run dev

# In another terminal, start local Cloudflare Worker & D1 (http://localhost:8787)
npm run worker:dev
```

---

## 🚀 Deploying to Cloudflare

### 1. Create D1 Database & R2 Bucket

```bash
# Create D1 Database
npx wrangler d1 create urchin-db

# Create R2 Storage Bucket
npx wrangler r2 bucket create urchin-snapshots
```

### 2. Initialize Database Schema

```bash
# Run schema migration on Cloudflare D1 Remote
npx wrangler d1 execute urchin-db --remote --file=schema.sql
```

### 3. Deploy Worker & Static Frontend

```bash
# Build React app and deploy Cloudflare Worker + Pages
npm run build
npm run worker:deploy
```

---

## 📦 Client Recording SDK Setup

Add the lightweight SDK to your web app:

```typescript
import { UrchinReplaySDK } from './src/sdk';

const sdk = new UrchinReplaySDK({
  endpoint: 'https://urchin-session-replay.your-subdomain.workers.dev',
  projectId: 'default',
  maskAllInputs: true,
  debug: false
});

// Start recording session
sdk.start();
```

---

## 📄 License

MIT License © 2026 Toan Vo.
