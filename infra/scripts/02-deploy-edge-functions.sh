#!/usr/bin/env bash
# =============================================================================
# 02-deploy-edge-functions.sh
# Deploy toàn bộ 250 edge functions lên self-host Supabase
# Cần Supabase CLI v1.200+
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FUNCTIONS_DIR="$REPO_ROOT/supabase/functions"

# Self-host endpoint
export SUPABASE_URL="${SUPABASE_URL:-http://localhost:8000}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?Set in env}"

if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI chưa cài. cài: brew install supabase/tap/supabase"
  exit 1
fi

cd "$REPO_ROOT"

# Liệt kê function (bỏ _shared, __tests__)
mapfile -t FUNCTIONS < <(find "$FUNCTIONS_DIR" -mindepth 1 -maxdepth 1 -type d \
  -not -name '_shared' -not -name '__tests__' -printf '%f\n' | sort)

echo "==> Tổng số: ${#FUNCTIONS[@]} functions"

FAILED=()
COUNT=0

for fn in "${FUNCTIONS[@]}"; do
  COUNT=$((COUNT+1))
  printf "[%d/%d] Deploy %s ... " "$COUNT" "${#FUNCTIONS[@]}" "$fn"
  if supabase functions deploy "$fn" --no-verify-jwt 2>&1 | tail -1; then
    echo "✅"
  else
    echo "❌"
    FAILED+=("$fn")
  fi
done

echo ""
echo "==> Hoàn tất. Failed: ${#FAILED[@]}"
if [ ${#FAILED[@]} -gt 0 ]; then
  printf '  - %s\n' "${FAILED[@]}"
  exit 1
fi
