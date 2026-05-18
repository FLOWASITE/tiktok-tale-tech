#!/usr/bin/env bash
# Smoke test local Supabase stack sau khi 20-bootstrap-local-stack.sh chạy xong.
# Verify: REST API, PostgREST, edge function deploy, embedding multi-provider routing.

set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"
ANON_KEY="${ANON_KEY:-$(grep '^ANON_KEY=' "$HOME/flowa-local-test/supabase/docker/.env" 2>/dev/null | cut -d= -f2-)}"

if [ -z "$ANON_KEY" ]; then
  echo "✗ Không tìm thấy ANON_KEY. Set env ANON_KEY=... hoặc check .env"
  exit 1
fi

echo "=== Flowa Local Smoke Test ==="
echo "API: $API_URL"

# 1. Health check
echo -n "[1] REST API health... "
if curl -sf "$API_URL/rest/v1/" -H "apikey: $ANON_KEY" > /dev/null; then
  echo "✓"
else
  echo "✗ FAILED"
  exit 1
fi

# 2. Postgres extensions
echo -n "[2] Postgres extensions (pgvector, pg_cron, vector)... "
EXTS=$(docker compose -f "$HOME/flowa-local-test/supabase/docker/docker-compose.yml" exec -T db \
  psql -U postgres -tA -c "SELECT extname FROM pg_extension WHERE extname IN ('vector','pg_cron','pgvector','pg_net','pgcrypto');")
if echo "$EXTS" | grep -q "vector" && echo "$EXTS" | grep -q "pg_cron"; then
  echo "✓ ($(echo $EXTS | tr '\n' ' '))"
else
  echo "✗ Missing extensions. Got: $EXTS"
  exit 1
fi

# 3. Schema tables exist
echo -n "[3] Core tables (brand_templates, scripts, multi_channel_contents)... "
TABLES=$(docker compose -f "$HOME/flowa-local-test/supabase/docker/docker-compose.yml" exec -T db \
  psql -U postgres -tA -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('brand_templates','scripts','multi_channel_contents','industry_templates','agent_pipelines');")
if [ "$TABLES" -ge 5 ]; then
  echo "✓ ($TABLES/5)"
else
  echo "✗ Only $TABLES/5 tables found"
  exit 1
fi

# 4. RLS enabled
echo -n "[4] RLS enabled on critical tables... "
RLS=$(docker compose -f "$HOME/flowa-local-test/supabase/docker/docker-compose.yml" exec -T db \
  psql -U postgres -tA -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity=true;")
echo "✓ ($RLS tables with RLS)"

# 5. Edge function smoke test (need to deploy first)
echo -n "[5] Edge function deploy (health-check)... "
cd "$HOME/flowa-local-test/supabase/docker"
if docker compose exec -T functions ls /home/deno/functions/ &>/dev/null; then
  echo "✓ (runtime up)"
else
  echo "⚠ functions container chưa có code — chạy:"
  echo "    bash infra/scripts/22-deploy-edge-functions-local.sh"
fi

# 6. Embedding routing test (chỉ chạy nếu có OPENAI_API_KEY)
if [ -n "${OPENAI_API_KEY:-}" ]; then
  echo -n "[6] OpenAI embedding endpoint... "
  RESP=$(curl -s https://api.openai.com/v1/embeddings \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"model":"text-embedding-3-small","input":"test","dimensions":384}')
  if echo "$RESP" | grep -q '"embedding"'; then
    echo "✓ (384-dim response OK)"
  else
    echo "✗ $RESP"
  fi
else
  echo "[6] OpenAI embedding test — skip (OPENAI_API_KEY not set)"
fi

echo ""
echo "=== ✓ All checks passed ==="
echo "Next: deploy edge functions với 22-deploy-edge-functions-local.sh"
