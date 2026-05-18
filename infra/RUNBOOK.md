# RUNBOOK — Vận hành Flowa Self-Host (solo ops)

> Tài liệu cho người vận hành. Đọc trước khi sửa bất cứ thứ gì trên server.

## Hằng ngày

| Việc | Khi nào | Cách kiểm |
|---|---|---|
| Check backup chạy thành công | Mỗi sáng 9h | `tail -30 /var/log/flowa-backup.log` |
| Check Grafana alerts | Bất kỳ khi nào nhận Telegram | `https://studio.flowa.one/grafana` |
| Check disk usage | Mỗi tuần | `df -h /mnt/db-data /mnt/storage-data` |
| Check certbot renew | Tự động (cron) | `certbot certificates` |

## Hàng tuần

- `restic check` — verify backup integrity
- `docker compose ps` — đảm bảo tất cả container `healthy`
- Review `auth_logs` + `function_edge_logs` cho anomaly

## Hàng tháng (BẮT BUỘC)

- **Test restore** từ Restic vào server staging giả lập:
  ```bash
  restic restore latest --target /tmp/restore-test
  pg_restore -d test_db /tmp/restore-test/mnt/backups/postgres/flowa-*.dump
  ```
  Không test = không có backup.
- Update Docker images: `docker compose pull && docker compose up -d`
- Review pg_stat_statements top 20 slow queries

## Xử lý sự cố

### 🔴 Mất điện
1. UPS kêu → có 30 phút
2. Nếu > 15 phút không có điện lại → `docker compose down` (graceful)
3. Khi có điện: server tự boot → `systemctl status docker` → `cd /opt/supabase/docker && docker compose up -d`

### 🔴 Đứt internet (1 ISP)
- pfSense tự failover sang ISP backup (< 30s downtime)
- Nếu cả 2 ISP đứt: app inaccessible nhưng DB an toàn → đợi ISP fix

### 🔴 Postgres không boot
```bash
docker compose logs db | tail -100
# Disk full?
df -h /mnt/db-data
# WAL archive bị nghẽn?
ls /mnt/db-data/wal-archive | wc -l   # > 10000 = vấn đề
# Restore từ backup
bash scripts/recover-from-backup.sh latest
```

### 🔴 Edge function lỗi 500 hàng loạt
1. Check edge runtime logs: `docker compose logs functions | tail -200`
2. Check AI provider status (OpenRouter, DashScope health)
3. Check env vars: `docker compose exec functions env | grep -i api_key`
4. Rollback function gần nhất: `git revert <commit> && bash scripts/02-deploy-edge-functions.sh`

### 🔴 Storage bucket fail
- Disk full → mở rộng RAID hoặc cleanup orphan files
- Permission: `chown -R 1000:1000 /mnt/storage-data`

### 🔴 SSL cert hết hạn
```bash
certbot renew --force-renewal
systemctl reload nginx
```

## Khi cần restart toàn bộ

```bash
cd /opt/supabase/docker
docker compose down       # KHÔNG dùng `down -v` (xóa volume!)
docker compose up -d
# Verify
docker compose ps
curl https://api.flowa.one/auth/v1/health
```

## Quy trình deploy code mới từ Lovable.dev

Sau cutover, Lovable.dev vẫn dùng để dev frontend. Backend (edge functions + migrations) deploy thủ công:

```bash
# Trên máy dev
git pull
cd flowa
# Deploy migration mới (nếu có)
psql "$SELF_HOST_DB_URL" -f supabase/migrations/<latest>.sql
# Deploy edge functions thay đổi
SUPABASE_URL=https://api.flowa.one \
SUPABASE_SERVICE_ROLE_KEY=xxx \
  supabase functions deploy <function-name>
# Build + deploy frontend
npm run build
rsync -avz dist/ root@server:/var/www/flowa/
```

→ Cân nhắc setup GitHub Actions để auto-deploy khi merge `main`.

## Liên hệ khẩn cấp

- **Admin chính**: <số điện thoại>
- **ISP Viettel**: 18008168
- **ISP FPT**: 19006600
- **Datacenter nếu colo**: <số hotline>
