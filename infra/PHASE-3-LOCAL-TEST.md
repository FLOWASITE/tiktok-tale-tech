# Phase 3 — Local Docker Testing Plan

Mục đích: Verify toàn bộ stack chạy được trên Docker **trước khi** đụng server vật lý.
Test trên laptop (Mac/WSL2/Linux) trong 1-2h.

## Tiền điều kiện
- Docker Desktop hoặc Docker Engine 24+
- 8GB RAM trống, 20GB disk
- Supabase CLI (`brew install supabase/tap/supabase`)
- Optional: OpenAI API key + OpenRouter API key để test self-host AI routing

## Bước 1 — Bootstrap stack (15 phút)
```bash
bash infra/scripts/20-bootstrap-local-stack.sh
```
Script sẽ:
1. Clone `supabase/supabase` shallow vào `~/flowa-local-test/`
2. Copy `docker-compose.local.yml` + `init-extensions.sql`
3. Tạo `.env` template (cần edit keys)
4. `docker compose up -d`
5. Apply `infra/snapshots/schema.sql` vào local Postgres

**Pause point**: Sau khi script tạo `.env`, edit và set:
- `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY` (auto-generated nếu để default cũng OK cho test)
- `OPENROUTER_API_KEY` + `OPENAI_API_KEY` (cần thật để test AI calls)
- `AI_ENCRYPTION_KEY` + `CREDENTIAL_ENCRYPTION_KEY` — **copy nguyên từ Lovable Cloud secrets** (nếu không, không decrypt được social tokens cũ; cho test cứ random 32 bytes hex)

## Bước 2 — Smoke test (5 phút)
```bash
bash infra/scripts/21-smoke-test-local.sh
```
Checks:
- ✓ REST API up
- ✓ pgvector + pg_cron extensions
- ✓ 5/5 core tables exist (brand_templates, scripts, multi_channel_contents, industry_templates, agent_pipelines)
- ✓ RLS enabled
- ✓ Edge runtime container up
- ✓ OpenAI embedding endpoint reachable (nếu set key)

## Bước 3 — Deploy edge functions (10 phút pilot, 30 phút full)
```bash
# Pilot: 10 functions trọng tâm
bash infra/scripts/22-deploy-edge-functions-local.sh

# Full: tất cả 248
ALL=1 bash infra/scripts/22-deploy-edge-functions-local.sh
```

## Bước 4 — Test self-host AI routing
Verify rằng `SELF_HOSTED_MODE=true` thực sự route call → OpenRouter:
```bash
curl http://localhost:8000/functions/v1/generate-sample-text \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Viết một câu hello world tiếng Việt", "model":"google/gemini-2.5-flash"}'
```
Expected: 200 OK với content được generate. Check logs container `functions`:
```bash
docker compose logs -f functions | grep -i "openrouter\|provider"
```
Phải thấy `[ai-provider] Routing to openrouter` hoặc tương đương.

## Bước 5 — Dry-run data migration (sample 1 org)
Trong terminal khác:
```bash
# Lấy 1 sample org từ Lovable Cloud (read-only)
PGURL="postgres://postgres:[lovable-pwd]@db.rllyipiyuptkibqinotz.supabase.co:5432/postgres"
pg_dump "$PGURL" \
  -t organizations -t brand_templates -t scripts \
  --data-only --column-inserts \
  --where="organization_id='<your-test-org-uuid>'" \
  > /tmp/sample-org.sql

# Import vào local
docker compose exec -T db psql -U postgres < /tmp/sample-org.sql
```

## Bước 6 — Cleanup
```bash
cd ~/flowa-local-test/supabase/docker
docker compose down -v  # xóa volumes
```

## Done criteria
Phase 3 hoàn tất khi:
- [ ] Stack boot < 60s, không error
- [ ] Schema apply không lỗi (268 migrations equivalent)
- [ ] 10 pilot edge functions deploy thành công
- [ ] `generate-sample-text` trả response 200 với OpenRouter routing
- [ ] Embedding endpoint trả vector 384-dim
- [ ] Sample data import OK, query bằng REST API trả đúng

## Sau Phase 3
Khi 6 tiêu chí trên ✓ → sẵn sàng triển khai lên server vật lý dùng `infra/scripts/00-server-bootstrap.sh` + `01-install-supabase.sh`. Không cần thay đổi code.
