# AGENTS.md — Urchin Session Replay (Cloudflare Workers)

Tài liệu này mô tả quy tắc và quy trình làm việc cho agent khi xử lý **Urchin**: session replay engine độc lập trên Cloudflare Workers + D1 + R2, với dashboard Vite/React và client SDK dựa trên `rrweb`.

**Branding:** Urchin **không affiliated** với PostHog Inc. Không dùng logo/tên PostHog như thể sản phẩm của họ. So sánh kiến trúc thì được; tránh wording “PostHog clone” trên README/UI/package description.

## Project snapshot

| Layer | Stack | Path / notes |
| :--- | :--- | :--- |
| **Ingest API** | Cloudflare Worker + Hono | `src/worker/` — entry `src/worker/index.ts` |
| **Session metadata** | Cloudflare D1 (SQLite) | Binding `DB`, schema `schema.sql` |
| **Raw rrweb chunks** | Cloudflare R2 | Binding `REPLAY_BUCKET` |
| **Dashboard UI** | Vite + React + Tailwind | `src/frontend/`, `index.html` → `:3000` |
| **Demo store** | Standalone Vite page + Urchin SDK | `demo.html`, `src/demo/` → `/demo.html` |
| **Recording SDK** | Custom `UrchinReplaySDK` + `rrweb` | `src/sdk/index.ts` (không dùng `posthog-js`) |
| **Deploy config** | Wrangler | `wrangler.toml` |

**Không phải** Next.js / OpenNext / Prisma project. Đừng áp dụng checklist OpenNext/Prisma vào repo này.

### Key API routes (Worker)

- `POST /api/v1/projects/:projectId/snapshots` — ingest snapshots (Urchin SDK)
- `POST /api/v1/snapshots` — shorthand ingest
- `GET /api/v1/projects/:projectId/sessions` — list sessions
- `GET /api/v1/projects/:projectId/sessions/:sessionId` — session + timeline
- `GET /api/v1/projects/:projectId/sessions/:sessionId/snapshots` — replay events
- `POST /array/*`, `POST /decide/*` — stub tương thích PostHog SDK (chưa production-ready)

Vite proxy (`vite.config.ts`) forward `/api`, `/array`, `/decide` → `http://localhost:8787`.

---

## Nguyên tắc chung

- Giữ code đơn giản, dễ bảo trì; không over-engineer hoặc tạo abstraction mới nếu chưa cần.
- Luôn đọc issue/context trước khi code: GitHub issue, PR liên quan, CI log, README, `wrangler.toml`, `schema.sql`.
- Không commit secrets, `.dev.vars`, database local, artifact build/test (`.wrangler/`, `dist/`).
- Khi nhắc đến issue/PR/action run, luôn dùng link GitHub có thể click.
- Sau khi thay đổi code/config, luôn chạy validation phù hợp và ghi rõ kết quả.
- Sau mỗi task mới có thay đổi repository, bắt buộc cập nhật `CHANGELOGS.md` trước khi commit hoặc bàn giao.
- Nếu dùng GitHub CLI, dùng full path: `/opt/homebrew/bin/gh`.
- Nếu dùng Claude CLI, dùng full path: `/Users/toanalien/Library/Application Support/com.jean.desktop/claude-cli/claude`.
- Nếu dùng Codex CLI, dùng full path: `/Users/toanalien/Library/Application Support/com.jean.desktop/codex-cli/codex`.

---

## Quy trình cập nhật CHANGELOGS.md

- Khi bắt đầu một task mới, đọc `CHANGELOGS.md` để tránh trùng lặp và thêm task vào mục `Đang thực hiện` kèm link GitHub Issue nếu có.
- Trước khi commit, tạo PR hoặc bàn giao task, cập nhật lại `CHANGELOGS.md` theo trạng thái thực tế:
  - Task đang làm dở hoặc bị block: giữ trong `Đang thực hiện` và ghi ngắn gọn trạng thái/blocker.
  - Task đã hoàn tất: chuyển xuống `Lịch sử hoàn thành`, ghi ngày, mô tả ngắn, link Issue và link PR nếu có.
  - Task chưa có Issue/PR: ghi tên task rõ ràng; bổ sung link ngay khi Issue/PR được tạo.
- Đặt mục mới nhất lên đầu, giữ nguyên lịch sử cũ và không tạo mục trùng cho cùng một task.
- Với task có thay đổi repository, phải đưa thay đổi `CHANGELOGS.md` vào cùng commit với task hoặc một commit tài liệu riêng ngay sau đó.
- Với task chỉ đọc/giải thích và không thay đổi repository, không cần tạo lịch sử giả; chỉ cập nhật nếu trạng thái một task đang theo dõi thực sự thay đổi.
- Không ghi secrets, token, dữ liệu nhạy cảm hoặc chi tiết nội bộ không nên xuất hiện trong Git history.

---

## Quy trình issue → worktree → PR

1. Đọc danh sách issue:
   - Ưu tiên issue `priority:p0`, sau đó `priority:p1`.
   - Bỏ qua epic nếu còn issue con cụ thể.
   - Chọn issue có scope rõ và có thể validate được.
2. Đọc chi tiết issue đã chọn: user story, acceptance criteria, technical notes, out of scope.
3. Tạo/spawn worktree bằng Jean nếu có thể:
   - Dùng Jean MCP/tool `create_worktree` với `projectId`, `issueNumber`, `baseBranch`.
   - Không tự tạo raw `git worktree add` trừ khi user yêu cầu rõ.
   - Nếu Jean MCP socket lỗi/không available, ghi rõ lý do và tiếp tục trong current Jean worktree nếu đang ở sẵn Jean workspace.
4. Implement task trong worktree:
   - Chỉ sửa đúng phạm vi issue.
   - Tránh thay đổi unrelated formatting lớn.
   - Cập nhật docs/config/test nếu acceptance criteria yêu cầu.
5. Validate local (xem mục Validation bên dưới).
6. Commit/push:
   - Dọn artifacts trước khi commit: `dist/`, `.wrangler/`, logs, local D1/R2 state nếu bị track nhầm.
   - Chạy `git diff --check`.
   - Commit message ngắn, ví dụ: `feat: add demo store with Urchin SDK`.
   - Push branch.
7. Tạo PR:
   - Prefer Jean PR tool nếu worktree có Jean ID và tool hoạt động.
   - Fallback: `/opt/homebrew/bin/gh pr create`.
   - PR body phải gồm Summary, Issue links, Validation, Notes.
   - Link issue bằng `Closes #<number>` nếu task hoàn tất.
8. Theo dõi CI:
   - `/opt/homebrew/bin/gh pr checks <pr-number> --repo <owner/repo> --watch --fail-fast`
   - Nếu CI fail, đọc log, fix, push lại.

---

## Architecture rules

### Worker (`src/worker/`)

- Entry: Hono app trong `index.ts`; export default cho Wrangler.
- Tách rõ: `ingest.ts` (pipeline), `db.ts` (D1 + in-memory fallback), `storage.ts` (R2), `types.ts`.
- CORS mở cho recording cross-origin; header `X-Urchin-Project-Key` đã được allow.
- In-memory fallback trong `db.ts` chỉ cho local/dev khi binding thiếu — không thay D1/R2 trên production.
- Không log raw snapshot payloads đầy đủ (có thể chứa PII từ DOM).

### SDK (`src/sdk/`)

- Client recording là **`UrchinReplaySDK`**, không phải official `posthog-js`.
- Dùng `rrweb.record` + flush JSON tới `/api/v1/projects/:projectId/snapshots`.
- Privacy defaults: `maskAllInputs`, class `urchin-mask` / `urchin-no-capture` (cũng nhận `ph-mask` / `ph-no-capture` cho interop).
- `flush()` trả `{ ok, count }`; network failure phải re-queue events.
- Tránh capture loop: bỏ qua fetch tới endpoint snapshots của chính SDK.

### Frontend dashboard (`src/frontend/`)

- React dashboard list/filter sessions và play lại bằng `rrweb-player`.
- Gọi API qua relative `/api/...` (Vite proxy → Worker).
- Mock seed sessions chỉ là fallback UI khi API trống — không coi là data production.

### Demo store (`src/demo/`, `demo.html`)

- Trang độc lập để verify end-to-end recording.
- Auto-start SDK; panel hiện session id, flush status, sessions trên Worker.
- Query params hỗ trợ: `?endpoint=...&projectId=...&distinctId=...`.

---

## Local development

```bash
npm install

# Terminal 1 — Worker + local D1/R2 (http://localhost:8787)
npm run d1:init          # lần đầu / khi schema đổi
npm run worker:dev

# Terminal 2 — Dashboard + demo (http://localhost:3000)
npm run dev
# hoặc mở thẳng demo store
npm run demo             # http://localhost:3000/demo.html
```

Smoke verify recording:

1. Mở `http://localhost:3000/demo.html`
2. Interact (pay / rage-click / error / fetch) → **Flush now**
3. Session xuất hiện ở panel phải và trên Dashboard `http://localhost:3000/`

Ingest smoke bằng curl:

```bash
curl -s -X POST http://localhost:3000/api/v1/projects/default/snapshots \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"sid_smoke","distinctId":"smoke","events":[{"type":5,"data":{"tag":"$pageview","payload":{"href":"/"}},"timestamp":'"$(date +%s000)"'}]}'

curl -s 'http://localhost:3000/api/v1/projects/default/sessions?limit=5'
```

---

## Cloudflare Workers / D1 / R2 checklist

### Wrangler (`wrangler.toml`)

- Worker name: `urchin-session-replay`
- `main = "src/worker/index.ts"`
- D1 binding: `DB` → database `urchin-db`
- R2 binding: `REPLAY_BUCKET` → bucket `urchin-snapshots`
- `[site] bucket = "./dist"` — build frontend trước khi deploy Worker phục vụ static

Trước khi deploy remote: cập nhật `database_id` D1 thật (hiện placeholder `local-urchin-db-id`) và tạo R2 bucket nếu chưa có.

### D1 schema

- Nguồn schema hiện tại: root `schema.sql` (chưa dùng thư mục `migrations/` Wrangler).
- Tables: `projects`, `sessions`, `session_events`, `session_chunks`.
- Apply local:

```bash
npm run d1:init
# tương đương: wrangler d1 execute urchin-db --local --file=schema.sql
```

- Apply remote (chỉ khi chắc chắn):

```bash
npx wrangler d1 execute urchin-db --remote --file=schema.sql
```

- Khi schema thay đổi lớn: cân nhắc chuyển sang `migrations/` + `wrangler d1 migrations apply` để tránh re-run `CREATE`/`INSERT` không kiểm soát trên production.
- D1 không hỗ trợ interactive transactions phức tạp; giữ upsert/batch đơn giản như hiện tại trong `db.ts`.

### R2

- Lưu raw rrweb chunk JSON: `projects/{projectId}/sessions/{sessionId}/chunk_*.json`.
- Không lưu blob lớn trong D1.
- Không hardcode credentials; dùng binding + Wrangler/CI secrets nếu cần thêm.
- Playback: đọc R2 trước, fallback in-memory chunks từ `db.ts` khi local/dev.

### Deploy

```bash
npm run build
npm run worker:deploy
```

Dry-run khi kiểm tra config:

```bash
npx wrangler deploy src/worker/index.ts --dry-run
```

GitHub Actions secrets thường cần (khi có CI deploy):

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

---

## Privacy & security

- Mask inputs nhạy cảm ở recording time (`maskAllInputs`, `urchin-mask`).
- Không commit API keys / project keys thật; demo key trong `schema.sql` chỉ cho local.
- Không log passwords, card numbers, hoặc full DOM snapshots trong Worker logs.
- Compatibility routes (`/array`, `/decide`) hiện là stub — đừng quảng cáo drop-in SDK bên thứ ba cho đến khi ingest format đủ chuẩn.
- Không copy code từ thư mục proprietary (ví dụ PostHog `ee/`). Không vendor source PostHog vào repo.
- API lỗi 5xx: trả message an toàn; chi tiết để trong server log.

---

## Validation commands

Chạy tối thiểu trước PR:

```bash
npx tsc -b
npm run build
npx wrangler deploy src/worker/index.ts --dry-run
```

Khi đụng ingest/SDK/demo, thêm smoke:

```bash
# Cần worker:dev + vite đang chạy
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/demo.html
curl -s -X POST http://localhost:3000/api/v1/projects/default/snapshots \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"sid_ci","distinctId":"ci","events":[{"type":5,"data":{"tag":"$pageview","payload":{}},"timestamp":1}]}'
curl -s 'http://localhost:3000/api/v1/projects/default/sessions?limit=1'
```

Repo hiện **chưa** có `lint` / `test:ci` scripts. Nếu thêm, cập nhật mục này và `package.json` cùng lúc.

---

## PR body template

```md
## Summary
- ...

## Issue
Closes #...
Related to #...

## Validation
- `npx tsc -b`
- `npm run build`
- `npx wrangler deploy src/worker/index.ts --dry-run`
- (optional) demo.html + ingest smoke via Vite proxy

## Notes
- Mention D1/R2 migration notes, PostHog-compat caveats, or Jean fallback if applicable.
```

---

## Artifact ignore checklist

Đảm bảo `.gitignore` có các artifact sau:

```gitignore
node_modules
.wrangler
dist
.DS_Store
*.log
.dev.vars*
.npm-cache/
```

Không commit local Miniflare D1/R2 state dưới `.wrangler/`.
