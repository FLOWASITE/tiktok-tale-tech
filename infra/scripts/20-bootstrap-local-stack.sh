#!/usr/bin/env bash
# Bootstrap Supabase Docker stack LOCAL để test self-host trước cutover.
# Tiền điều kiện: Docker Desktop / Docker Engine + 8GB RAM trống
# Chạy trên macOS, WSL2, hoặc Linux. Không cần server vật lý.
#
# Output: Supabase stack chạy local với schema Flowa, sẵn sàng test 248 edge functions.

set -euo pipefail

# === Config ===
WORK_DIR="${WORK_DIR:-$HOME/flowa-local-test}"
SUPABASE_REPO="https://github.com/supabase/supabase"
FLOWA_REPO_PATH="$(cd "$(dirname "$0")/../.." && pwd)"

echo "=== Flowa Local Docker Bootstrap ==="
echo "Work dir: $WORK_DIR"
echo "Flowa repo: $FLOWA_REPO_PATH"

# === 1. Clone supabase docker stack ===
if [ ! -d "$WORK_DIR/supabase" ]; then
  echo "[1/5] Cloning supabase/supabase (shallow)..."
  mkdir -p "$WORK_DIR"
  git clone --depth 1 "$SUPABASE_REPO" "$WORK_DIR/supabase"
fi

DOCKER_DIR="$WORK_DIR/supabase/docker"
cd "$DOCKER_DIR"

# === 2. Copy override + init script ===
echo "[2/5] Copy override + init-extensions.sql..."
cp "$FLOWA_REPO_PATH/infra/docker-compose.local.yml" "$DOCKER_DIR/docker-compose.override.yml"
cp "$FLOWA_REPO_PATH/infra/init-extensions.sql" "$DOCKER_DIR/init-extensions.sql"

# === 3. Setup .env ===
if [ ! -f "$DOCKER_DIR/.env" ]; then
  echo "[3/5] Tạo .env (cần edit thủ công sau)..."
  cp "$DOCKER_DIR/.env.example" "$DOCKER_DIR/.env"
  # Merge keys cần cho self-host từ Flowa .env.example
  echo "" >> "$DOCKER_DIR/.env"
  echo "# === Flowa self-host additions ===" >> "$DOCKER_DIR/.env"
  grep -E "^[A-Z_]+=" "$FLOWA_REPO_PATH/infra/.env.example" >> "$DOCKER_DIR/.env" || true
  echo ""
  echo "⚠️  EDIT $DOCKER_DIR/.env với keys thật trước khi tiếp tục."
  echo "   Tối thiểu cần: POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY,"
  echo "                  OPENROUTER_API_KEY, OPENAI_API_KEY, AI_ENCRYPTION_KEY"
  echo ""
  read -p "Đã edit xong? (y/N) " ans
  [ "$ans" != "y" ] && exit 0
else
  echo "[3/5] .env đã tồn tại, skip."
fi

# === 4. Boot stack ===
echo "[4/5] docker compose up -d..."
docker compose pull
docker compose up -d

echo "Đợi Postgres healthy..."
for i in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U postgres &>/dev/null; then
    echo "✓ Postgres ready"
    break
  fi
  sleep 2
done

# === 5. Apply Flowa schema ===
echo "[5/5] Apply Flowa schema snapshot..."
SCHEMA_FILE="$FLOWA_REPO_PATH/infra/snapshots/schema.sql"
if [ ! -f "$SCHEMA_FILE" ]; then
  echo "✗ Không tìm thấy schema snapshot ở $SCHEMA_FILE"
  echo "  Chạy: bash infra/scripts/10-export-schema.sh trước"
  exit 1
fi

docker compose exec -T db psql -U postgres -d postgres < "$SCHEMA_FILE" 2>&1 | tail -20

echo ""
echo "=== ✓ DONE ==="
echo "Supabase Studio: http://localhost:8000"
echo "API:             http://localhost:8000/rest/v1/"
echo "Edge Functions:  http://localhost:8000/functions/v1/<name>"
echo ""
echo "Smoke test: bash infra/scripts/21-smoke-test-local.sh"
echo "Stop:       cd $DOCKER_DIR && docker compose down"
echo "Reset:      cd $DOCKER_DIR && docker compose down -v"
