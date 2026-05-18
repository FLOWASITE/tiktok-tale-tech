#!/usr/bin/env bash
# =============================================================================
# 03-backup-postgres.sh
# Daily backup: pg_dump → Restic encrypted → offsite VPS
# Cron: 0 2 * * *  /opt/flowa/infra/scripts/03-backup-postgres.sh
# =============================================================================
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/mnt/backups/postgres"
DUMP_FILE="$BACKUP_DIR/flowa-$TIMESTAMP.dump"
LOG_FILE="/var/log/flowa-backup.log"

mkdir -p "$BACKUP_DIR"

# Restic config (offsite — VPS Hà Nội hoặc HCM)
export RESTIC_REPOSITORY="${RESTIC_REPOSITORY:-sftp:backup@backup-vps.flowa.one:/restic}"
export RESTIC_PASSWORD_FILE="${RESTIC_PASSWORD_FILE:-/root/.restic-password}"

{
echo "=== Backup start $(date) ==="

# 1. pg_dump custom format (parallel, compressed)
docker exec supabase-db pg_dump \
  -U postgres \
  -d postgres \
  -Fc -Z 9 \
  --no-owner --no-acl \
  -f /tmp/dump.bin

docker cp supabase-db:/tmp/dump.bin "$DUMP_FILE"
docker exec supabase-db rm /tmp/dump.bin

SIZE=$(du -h "$DUMP_FILE" | cut -f1)
echo "✅ pg_dump: $DUMP_FILE ($SIZE)"

# 2. Push lên Restic (encrypted, deduplicated)
restic backup "$DUMP_FILE" --tag daily --tag postgres

# 3. Storage bucket files (incremental)
restic backup /mnt/storage-data --tag daily --tag storage

# 4. Cleanup local dumps > 3 ngày (giữ trên Restic dài hạn)
find "$BACKUP_DIR" -name 'flowa-*.dump' -mtime +3 -delete

# 5. Retention policy: giữ 7 daily, 4 weekly, 6 monthly
restic forget --prune --keep-daily 7 --keep-weekly 4 --keep-monthly 6

echo "=== Backup done $(date) ==="
} >> "$LOG_FILE" 2>&1

# 6. Alert qua Telegram nếu fail (Telegram bot token trong env)
if [ ${PIPESTATUS[0]} -ne 0 ] && [ -n "${TELEGRAM_BOT_TOKEN:-}" ]; then
  curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d chat_id="${TELEGRAM_ADMIN_CHAT_ID}" \
    -d text="🚨 Flowa backup FAILED at $(date)"
fi
