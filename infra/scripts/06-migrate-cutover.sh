#!/usr/bin/env bash
# =============================================================================
# 06-migrate-cutover.sh
# 🚨 CUTOVER SCRIPT — chạy 1 lần duy nhất vào D13 (window 02:00-07:00)
# =============================================================================
# QUY TRÌNH:
#   1. Bật maintenance mode trên app frontend
#   2. pg_dump full từ Lovable Cloud
#   3. Restore lên self-host Postgres
#   4. Migrate Storage bucket files (rsync)
#   5. Verify row counts
#   6. Switch DNS api.flowa.one → self-host
#   7. Smoke test
# =============================================================================
set -euo pipefail

LOVABLE_DB_URL="${LOVABLE_DB_URL:?postgres://... từ Lovable Cloud}"
SELF_HOST_DB_URL="${SELF_HOST_DB_URL:?postgres://postgres:pass@localhost:5432/postgres}"
LOVABLE_STORAGE_API="${LOVABLE_STORAGE_API:?https://rllyipiyuptkibqinotz.supabase.co}"
SELF_HOST_STORAGE_PATH="${SELF_HOST_STORAGE_PATH:-/mnt/storage-data}"
DUMP_FILE="/mnt/backups/cutover-$(date +%Y%m%d-%H%M).dump"

confirm() {
  read -p "$1 [yes/NO] " ans
  [[ "$ans" == "yes" ]] || { echo "Aborted"; exit 1; }
}

echo "============================================="
echo "FLOWA CUTOVER — $(date)"
echo "============================================="
confirm "⚠️  Đã bật maintenance mode trên frontend chưa?"

echo "==> [1/6] pg_dump full từ Lovable Cloud (~30 phút tùy size)"
time pg_dump "$LOVABLE_DB_URL" \
  -Fc -Z 6 \
  --no-owner --no-acl \
  --exclude-schema=supabase_functions \
  --exclude-schema=net \
  --exclude-schema=cron \
  -f "$DUMP_FILE"
echo "✅ Dump xong: $(du -h "$DUMP_FILE" | cut -f1)"

echo "==> [2/6] Restore lên self-host (~20 phút)"
time pg_restore "$SELF_HOST_DB_URL" \
  --no-owner --no-acl \
  --clean --if-exists \
  -j 4 \
  "$DUMP_FILE"

echo "==> [3/6] Re-apply cron jobs (đã edit URL ở D7)"
psql "$SELF_HOST_DB_URL" -f /mnt/backups/cron-jobs.sql

echo "==> [4/6] Migrate Storage bucket files"
# Cần Supabase CLI hoặc mc (MinIO client) — đây là placeholder
echo "⚠️  Migrate Storage bằng tool riêng (rsync qua S3 API hoặc supabase storage download)"
confirm "Storage files đã migrate xong?"

echo "==> [5/6] Verify row counts"
for table in profiles organizations brand_templates topics scripts carousels multi_channel_contents agent_pipelines social_connections; do
  L=$(psql "$LOVABLE_DB_URL"     -At -c "SELECT count(*) FROM public.$table" 2>/dev/null || echo "?")
  S=$(psql "$SELF_HOST_DB_URL"   -At -c "SELECT count(*) FROM public.$table" 2>/dev/null || echo "?")
  STATUS="✅"; [ "$L" != "$S" ] && STATUS="❌"
  printf "%s %-30s Lovable=%s  Self-host=%s\n" "$STATUS" "$table" "$L" "$S"
done

confirm "Row counts OK?"

echo "==> [6/6] Switch DNS api.flowa.one → self-host"
echo "⚠️  THỦ CÔNG: đổi A record api.flowa.one ở registrar → IP server vật lý"
echo "    TTL nên đã set 60s từ trước cutover"
confirm "DNS đã đổi và propagate (kiểm tra: dig api.flowa.one)?"

echo "==> Smoke test"
curl -fsS https://api.flowa.one/auth/v1/health && echo " ✅ Auth"
curl -fsS https://api.flowa.one/rest/v1/      -H "apikey: $SUPABASE_ANON_KEY" && echo " ✅ REST"

cat <<'DONE'

🎉 CUTOVER COMPLETE.

Bước tiếp theo:
- Tắt maintenance mode
- Monitor Grafana 24h
- GIỮ Lovable Cloud sống thêm 7 ngày làm rollback (không touch DB ở đó)
DONE
