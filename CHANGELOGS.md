# CHANGELOGS — Urchin Session Replay

## Đang thực hiện

_(trống)_

## Lịch sử hoàn thành

### 2026-08-10 — Branding / license hygiene (không affiliated PostHog)
- Thêm `LICENSE` (MIT © 2026 Toan Vo).
- Viết lại README: disclaimer độc lập, bỏ wording “PostHog clone”, mapping stack trung lập, trademark notice.
- Cập nhật `package.json` description, `index.html` title, Navbar subtitle.
- SDK nhận cả `urchin-mask` / `urchin-no-capture` và `ph-*` interop; demo dùng `urchin-mask`.
- Làm mềm comment Worker + bổ sung quy tắc branding trong `AGENTS.md`.

### 2026-08-10 — Update AGENTS.md cho đúng stack Urchin
- Viết lại `AGENTS.md`: bỏ Next.js/OpenNext/Prisma; mô tả Worker+Hono, D1, R2, Vite/React, `UrchinReplaySDK`, demo store, validation và deploy thực tế của repo.
- Thêm `CHANGELOGS.md` để khớp quy trình agent.

### 2026-08-10 — Demo store gắn Urchin SDK
- Thêm `demo.html` + `src/demo/` để verify session recording end-to-end.
- Vite multi-page + proxy `/api`; SDK `flush()` trả `{ ok, count }`; link **Demo Store** trên Navbar.
