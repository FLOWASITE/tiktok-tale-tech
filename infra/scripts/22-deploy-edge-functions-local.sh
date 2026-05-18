#!/usr/bin/env bash
# Deploy 248 edge functions vào local Supabase stack.
# Cần supabase CLI: brew install supabase/tap/supabase  (hoặc npm i -g supabase)

set -euo pipefail

WORK_DIR="${WORK_DIR:-$HOME/flowa-local-test/supabase/docker}"
FLOWA_REPO_PATH="$(cd "$(dirname "$0")/../.." && pwd)"

if ! command -v supabase &>/dev/null; then
  echo "✗ Cần Supabase CLI: brew install supabase/tap/supabase"
  exit 1
fi

echo "=== Deploy edge functions to local stack ==="
cd "$FLOWA_REPO_PATH"

# Pilot mode: deploy 10 functions trước để verify
PILOT=(
  health-check
  embed-content
  generate-embedding
  generate-multichannel
  generate-script
  ai-edit-channel
  agent-pipeline
  generate-carousel
  help-chatbot
  generate-sample-text
)

API_URL="${API_URL:-http://localhost:8000}"

# Supabase CLI cần link với project local
export SUPABASE_URL="$API_URL"
export SUPABASE_ANON_KEY="$(grep '^ANON_KEY=' "$WORK_DIR/.env" | cut -d= -f2-)"
export SUPABASE_SERVICE_ROLE_KEY="$(grep '^SERVICE_ROLE_KEY=' "$WORK_DIR/.env" | cut -d= -f2-)"

echo ""
echo "Pilot deploy ${#PILOT[@]} functions..."
echo "(Để deploy hết 248, set ALL=1)"
echo ""

FUNCS_TO_DEPLOY=("${PILOT[@]}")
if [ "${ALL:-0}" = "1" ]; then
  echo "Deploying ALL functions..."
  FUNCS_TO_DEPLOY=()
  for d in supabase/functions/*/; do
    name=$(basename "$d")
    [ "$name" = "_shared" ] && continue
    [ "$name" = "_tests" ] && continue
    FUNCS_TO_DEPLOY+=("$name")
  done
fi

FAILED=()
for fn in "${FUNCS_TO_DEPLOY[@]}"; do
  echo -n "  $fn... "
  if supabase functions deploy "$fn" \
       --project-ref local \
       --no-verify-jwt 2>&1 | tail -1 | grep -q "Deployed"; then
    echo "✓"
  else
    echo "✗"
    FAILED+=("$fn")
  fi
done

echo ""
echo "=== Done: $((${#FUNCS_TO_DEPLOY[@]} - ${#FAILED[@]}))/${#FUNCS_TO_DEPLOY[@]} deployed ==="
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "Failed: ${FAILED[*]}"
  exit 1
fi
