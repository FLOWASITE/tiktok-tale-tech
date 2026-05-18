#!/usr/bin/env bash
# =============================================================================
# 10-export-schema.sh
# Snapshot toàn bộ public schema từ Lovable Cloud → infra/snapshots/schema.sql
# Chạy: bash infra/scripts/10-export-schema.sh
# Yêu cầu: env PG* đã set (Supabase pooler), pg_dump v15+
# =============================================================================
set -euo pipefail

OUT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../snapshots" && pwd)"
OUT="$OUT_DIR/schema.sql"

if [ -z "${PGHOST:-}" ]; then
  echo "❌ PGHOST chưa set. Cần kết nối Supabase pooler hoặc set DATABASE_URL"
  exit 1
fi

echo "==> Dumping public schema → $OUT"
pg_dump --schema-only --no-owner --no-privileges --schema=public -f "$OUT"

echo "==> Lines: $(wc -l < "$OUT"), Size: $(du -h "$OUT" | cut -f1)"
echo "✅ Done. Commit file vào git."
echo ""
echo "Lưu ý: schema này KHÔNG bao gồm auth.* và storage.* (Supabase manage,"
echo "khi self-host thì supabase/docker tự tạo)."
