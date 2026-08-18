# Urchin — Session Replay for Cloudflare

> High-performance **session replay & debugger** for the **Cloudflare stack** (Workers, D1, R2, Pages): capture with `rrweb`, ingest at the edge, store metadata in D1, snapshots in R2, and replay in a Vite/React dashboard.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com)
[![GitHub License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Urchin is an independent open-source project.** It is **not affiliated with, endorsed by, or sponsored by PostHog Inc.** Architecture notes that mention PostHog (or similar tools) are for technical comparison only.

---

## Stack mapping

| Concern | Cloudflare building block | Role in Urchin |
| :--- | :--- | :--- |
| **Ingestion** | **Workers** (Hono) | Edge HTTP ingest (`/api/v1/projects/:projectId/snapshots`) |
| **Session metadata & search** | **D1** (SQLite) | Distinct IDs, URLs, duration, errors, rage clicks |
| **Raw snapshots** | **R2** | `rrweb` DOM mutation chunks for playback |
| **Dashboard** | **Pages / Vite static** | React UI + `rrweb-player` |

Capture library: [`rrweb`](https://github.com/rrweb-io/rrweb) (MIT). Client SDK: custom **`UrchinReplaySDK`** in `src/sdk/` — not `posthog-js`.

---

## Features

- Full DOM replay powered by `rrweb`
- Cloudflare-native Workers + D1 + R2 path
- Rage-click detection (<800ms burst clicks)
- Console + network interceptors on the client SDK
- Privacy masking: `maskAllInputs`, plus `urchin-mask` / `urchin-no-capture` (also accepts `ph-mask` / `ph-no-capture` for interop)
- Session search & filters in the dashboard
- Standalone demo store at `/demo.html` for end-to-end checks

---

## Quick start

### 1. Install

```bash
git clone https://github.com/toanalien/posthog-session-replay.git
cd posthog-session-replay
npm install
```

### 2. Local development

```bash
# Terminal 1 — Worker + local D1/R2 (http://localhost:8787)
npm run d1:init   # first time / after schema changes
npm run worker:dev

# Terminal 2 — Dashboard + demo (http://localhost:3000)
npm run dev

# Optional: open the demo store with Urchin SDK attached
npm run demo      # http://localhost:3000/demo.html
```

**Verify recording quickly**

1. Keep `npm run worker:dev` on `:8787`.
2. Open [http://localhost:3000/demo.html](http://localhost:3000/demo.html).
3. Interact (products / Pay / error) — wait for flush or press **Flush now**.
4. Confirm the session in the side panel, then open the [Dashboard](http://localhost:3000/) to replay.

---

## Deploy to Cloudflare

```bash
npx wrangler d1 create urchin-db
npx wrangler r2 bucket create urchin-snapshots
# Update wrangler.toml with the real D1 database_id, then:
npx wrangler d1 execute urchin-db --remote --file=schema.sql
npm run build
npm run worker:deploy
```

---

## Client SDK

```typescript
import { UrchinReplaySDK } from './src/sdk';

const sdk = new UrchinReplaySDK({
  endpoint: 'https://urchin-session-replay.your-subdomain.workers.dev',
  projectId: 'default',
  maskAllInputs: true,
  debug: false
});

sdk.start();
```

Mask sensitive nodes with `class="urchin-mask"` or skip capture with `class="urchin-no-capture"`. Legacy interop class names `ph-mask` / `ph-no-capture` are also recognized.

Optional Worker routes `/array/*` and `/decide/*` are **experimental compatibility stubs** — not a certified drop-in for official PostHog SDKs.

---

## License & third-party notices

- **Urchin**: [MIT](LICENSE) © 2026 Toan Vo
- **rrweb / rrweb-player**: MIT (see their upstream licenses)
- No PostHog source code is vendored in this repository. Any similarity is architectural (session replay pipelines are a well-known pattern).

### Trademark

“PostHog” and related marks are trademarks of their respective owners. Use of those names here is for descriptive / comparative reference only.
