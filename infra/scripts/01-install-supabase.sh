#!/usr/bin/env bash
# =============================================================================
# 01-install-supabase.sh
# Clone supabase/docker + apply Flowa override + boot stack
# =============================================================================
set -euo pipefail

SUPABASE_DIR="/opt/supabase"
INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Clone supabase/supabase → $SUPABASE_DIR/docker"
mkdir -p "$SUPABASE_DIR"
if [ ! -d "$SUPABASE_DIR/supabase" ]; then
  git clone --depth 1 https://github.com/supabase/supabase.git "$SUPABASE_DIR/supabase"
fi
cp -rn "$SUPABASE_DIR/supabase/docker" "$SUPABASE_DIR/" || true

cd "$SUPABASE_DIR/docker"

echo "==> Copy Flowa override + init SQL"
cp "$INFRA_DIR/docker-compose.override.yml" ./docker-compose.override.yml
cp "$INFRA_DIR/init-extensions.sql" ./init-extensions.sql

echo "==> Copy .env.example (BẠN PHẢI EDIT thủ công trước khi up)"
if [ ! -f .env ]; then
  cp "$INFRA_DIR/.env.example" .env
  echo ""
  echo "⚠️  CHƯA boot stack. Edit /opt/supabase/docker/.env ngay bây giờ:"
  echo "    - Sinh POSTGRES_PASSWORD (openssl rand -hex 32)"
  echo "    - Sinh JWT_SECRET (openssl rand -hex 20)"
  echo "    - Điền ENCRYPTION_KEY (copy từ Lovable Cloud secrets)"
  echo "    - Điền OPENROUTER_API_KEY + DASHSCOPE_API_KEY"
  echo ""
  echo "Sau đó chạy lại script này để tiếp tục."
  exit 0
fi

echo "==> docker compose pull + up"
docker compose pull
docker compose up -d

echo "==> Chờ Postgres healthy (60s)"
for i in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ Postgres ready"; break
  fi
  sleep 2
done

echo "==> Generate ANON_KEY + SERVICE_ROLE_KEY mới (in ra để copy lại .env)"
docker compose exec -T kong cat /home/kong/temp.yml 2>/dev/null || true

cat <<'NEXT'

✅ Supabase stack đang chạy local.

Verify:
  curl http://localhost:8000/auth/v1/health
  curl http://localhost:8000/rest/v1/   -H "apikey: <anon_key>"

Tiếp theo:
1. certbot --nginx -d api.flowa.one -d studio.flowa.one
2. cp ../nginx/flowa.conf /etc/nginx/sites-available/
   ln -s /etc/nginx/sites-available/flowa.conf /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
3. bash 02-deploy-edge-functions.sh

NEXT
