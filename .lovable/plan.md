# Kế hoạch chuẩn bị Self-host (không cần server)

Mục tiêu: Làm xong toàn bộ phần "code + config + dry-run" trong khi chờ server. Khi server sẵn sàng chỉ cần `git pull && docker compose up && pg_restore`.

Thứ tự: **Phase 1 (Export) ✅ → Phase 2 (Refactor AI) ✅ → Phase 3 (Test Docker local) — sẵn sàng test trên laptop**.

## Trạng thái hiện tại (2026-05-18)
- ✅ **Phase 1 DONE**: schema/cron/storage exported vào `infra/snapshots/`, OAuth migration doc, function manifest 247 functions × 46 secrets
- ✅ **Phase 2 DONE**: shim `_shared/lovable-gateway.ts` + `_shared/embedding.ts`; codemod refactor 44 functions; 4 embedding sites manual; ZERO hard-coded gateway URL còn sót. Chi tiết: `infra/PHASE-2-COMPLETED.md`
- ⏸ **Phase 3 READY**: configs + scripts sẵn sàng (`docker-compose.local.yml`, `20-bootstrap-local-stack.sh`, `21-smoke-test-local.sh`, `22-deploy-edge-functions-local.sh`). Cần chạy trên laptop có Docker. Hướng dẫn: `infra/PHASE-3-LOCAL-TEST.md`

---

## Phase 1 — Export & Version-Control Config (1-2 ngày)

Mục tiêu: Snapshot toàn bộ trạng thái Lovable Cloud hiện tại vào `/infra/snapshots/` để có thể restore deterministic.

### 1.1 Database schema + functions + triggers
- Tạo script `infra/scripts/10-export-schema.sh` chạy `pg_dump --schema-only` (qua connection string read-only)
- Output: `infra/snapshots/schema.sql` (commit vào git)
- Bao gồm: 268 migrations đã apply, 90+ database functions (đã thấy trong context), RLS policies, triggers, materialized views

### 1.2 pg_cron jobs
- Viết `infra/scripts/11-export-cron-jobs.sql`: `SELECT * FROM cron.job` → JSON
- Output: `infra/snapshots/cron-jobs.json`
- Bao gồm: cron 2-min publishing, 30-min token refresh, daily cleanup, daily aggregate stats

### 1.3 Storage buckets + policies
- Viết script Deno query `storage.buckets` + `storage.objects` policies
- Output: `infra/snapshots/storage-config.json` + `infra/snapshots/buckets-manifest.json` (list bucket names, public/private, size)
- KHÔNG export file content (làm sau ở cutover thật)

### 1.4 Auth providers + email templates
- Query GoTrue config qua Supabase Management API
- Output: `infra/snapshots/auth-providers.json` (21 OAuth providers + redirect URIs + scopes)
- Output: `infra/snapshots/email-templates/` (signup, reset, magic-link, invite)

### 1.5 Edge function manifest + secrets requirements
- Script scan `supabase/functions/*/index.ts` tìm tất cả `Deno.env.get(...)` calls
- Output: `infra/snapshots/functions-manifest.json`: 250 functions × secrets cần có
- Tạo `infra/.env.required` checklist (đã có `.env.example`, bổ sung secrets thiếu)

### 1.6 OAuth provider checklist
- Tạo `infra/OAUTH-MIGRATION.md`: bảng 21 providers × console URL × redirect URI hiện tại × redirect URI mới (`api.flowa.one`) × bước update
- Reference: Google, Facebook, Zalo, TikTok, LinkedIn, X, Threads, Instagram, GBP, Blogger, Bluesky, Pinterest, Wix, Shopify, WordPress.com, Telegram

**Output Phase 1**: 1 thư mục `infra/snapshots/` ~ 5-20 MB commit vào git, có thể replay bất cứ lúc nào.

---

## Phase 2 — Refactor AI Provider triệt để (2-3 ngày)

Mục tiêu: Bỏ hoàn toàn dependency vào Lovable Gateway. Mọi AI call đi qua `_shared/ai-provider.ts` → OpenRouter / 9Router / DashScope direct.

### 2.1 Audit hard-coded gateway calls
- `rg "ai.gateway.lovable.dev"` toàn repo → list ra functions còn bypass `callAI()`
- Confirmed culprits cần fix:
  - `supabase/functions/embed-content/index.ts` (gọi trực tiếp `/v1/embeddings`)
  - Có thể còn `health-check`, các function streaming chat dùng `createLovableAiGatewayProvider`
- Output: `infra/AI-MIGRATION-AUDIT.md` (function nào còn bypass, mức độ risk)

### 2.2 Migrate embeddings sang OpenAI/DashScope native
- Hiện dùng `google/text-embedding-004` qua Lovable Gateway (768-dim) + truncate xuống 384
- Đổi sang `openai/text-embedding-3-small` (1536-dim, support truncate API native xuống 384) HOẶC DashScope `text-embedding-v3` (1024-dim)
- Cập nhật `_shared/ai-provider.ts` thêm helper `callEmbedding({ text, dims: 384 })`
- Refactor `embed-content`, `match_blackboard_context` callers (DB function giữ nguyên vì chỉ cần vector 384-dim)

### 2.3 Refactor streaming chat functions
- Functions dùng `npm:ai` + `createLovableAiGatewayProvider` (vd `flowa-chat`, agent functions) → swap provider sang `createOpenAICompatible({ baseURL: openrouter })`
- Giữ AI SDK API surface không đổi, chỉ swap baseURL/headers
- Test với 3 functions critical trước: `generate-script`, `generate-carousel`, `flowa-chat`

### 2.4 Mở rộng `isLovableGatewayDisabled` shim
- Hiện shim chỉ reroute `lovable` provider
- Bổ sung: detect `model.startsWith("google/")` → route qua OpenRouter (vì OpenRouter có Gemini)
- Bổ sung warning log khi `SELF_HOSTED_MODE=true` mà còn function gọi gateway

### 2.5 Test trên Lovable Cloud hiện tại (không break production)
- Set 1 secret toggle `SELF_HOSTED_MODE=false` mặc định
- Deploy refactor, verify mọi function vẫn pass khi flag off
- Bật flag với 3 function pilot, đo error rate 24h
- Document trong `infra/AI-CUTOVER-PLAN.md`

**Output Phase 2**: AI layer hoạt động ở 2 mode (gateway / direct), toggle bằng 1 ENV var, đã test trên production live.

---

## Phase 3 — Docker Stack Local (1-2 ngày)

Mục tiêu: Boot full Supabase stack trên Docker Desktop/WSL2/máy Mac của bạn, verify mọi service. Khi mang lên server vật lý chỉ là copy-paste.

### 3.1 Hoàn thiện `docker-compose.override.yml`
- Đã scaffold ở `infra/docker-compose.override.yml`
- Bổ sung: pin version cụ thể cho từng image (postgres 15.6, postgrest 12.x, gotrue 2.x...)
- Bổ sung: healthcheck cho từng service
- Bổ sung: resource limits (CPU/memory) phù hợp laptop

### 3.2 Init extensions + apply snapshot
- `infra/init-extensions.sql` đã có (`pgvector`, `pg_cron`, `pg_net`...)
- Bổ sung script `infra/scripts/20-bootstrap-local-db.sh`: 
  1. `docker compose up -d db`
  2. Apply `init-extensions.sql`
  3. Apply `infra/snapshots/schema.sql` (từ Phase 1)
  4. Seed 1 row sample mỗi table critical

### 3.3 Smoke test stack
- Script `infra/scripts/21-smoke-test.sh`:
  - `curl localhost:8000/auth/v1/health` → 200
  - `curl localhost:8000/rest/v1/organizations?apikey=...` → 200
  - WebSocket test Realtime
  - Deploy 1 edge function test (`health-check`) → curl
- Output checklist pass/fail

### 3.4 Test edge function deploy pipeline local
- Script `infra/scripts/22-deploy-edge-functions-local.sh` (variant của 02): deploy lên `http://localhost:8000`
- Pilot: deploy 10 functions sample, verify hoạt động
- Document deps issues (Deno version, npm: imports work hay không)

### 3.5 Test pg_dump → pg_restore loop
- Lấy `pg_dump --data-only --table=organizations` từ Lovable Cloud (1 org sample)
- Restore vào local stack
- Verify data + RLS hoạt động đúng với JWT mới

**Output Phase 3**: Full stack chạy được trên máy local, dry-run migration 1 table thành công.

---

## Phần CHƯA làm được (cần server vật lý)
- Cài Ubuntu, RAID, network bonding (script `00-server-bootstrap.sh` đã sẵn)
- Phát hành SSL Certbot cho `api.flowa.one`
- Cutover production thật (script `06-migrate-cutover.sh` đã sẵn)
- Migrate Storage files thật (rsync)
- Update DNS

→ Khi có server, theo `infra/CUTOVER.md` là xong.

---

## Tổng thời gian
~5-7 ngày làm việc thuần (solo, parallel với công việc Flowa thường ngày). Khi server sẵn sàng, cutover thật chỉ mất 4-6h như plan cũ.

## Bắt đầu từ đâu?
Tôi đề xuất **start Phase 1.1 (export schema)** ngay — read-only, zero risk, có ngay file ích lợi.
