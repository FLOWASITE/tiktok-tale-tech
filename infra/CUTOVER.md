# CUTOVER CHECKLIST — D13

> Print ra giấy hoặc mở trên máy thứ hai. Tick từng box.

## Pre-flight (D12 chiều)

- [ ] DNS TTL `api.flowa.one` đã giảm xuống 60s (làm trước 24h)
- [ ] Lovable Cloud DB connection string đã có (`pg_dump` test thành công)
- [ ] Self-host stack đã chạy ổn định ≥ 24h với data dry-run
- [ ] Tất cả 250 edge functions đã deploy thành công lên self-host
- [ ] OAuth redirect URI đã update ở 21 providers (Google, FB, TikTok, …)
- [ ] Frontend build mới với `VITE_SUPABASE_URL=https://api.flowa.one` đã test
- [ ] Backup script chạy thành công ≥ 1 lần (`/var/log/flowa-backup.log`)
- [ ] Restic restore test thành công
- [ ] Maintenance mode page đã chuẩn bị (HTML tĩnh)
- [ ] Thông báo user về downtime 02:00-07:00 (email + banner in-app)
- [ ] UPS đã test, máy phát có dầu

## Cutover (D13 đêm)

### 02:00 — Bắt đầu
- [ ] Bật maintenance page (Nginx serve HTML tĩnh thay vì proxy frontend)
- [ ] Disable cron jobs trên Lovable Cloud: `UPDATE cron.job SET active = false`
- [ ] Note thời điểm cuối cùng có data: `SELECT max(updated_at) FROM core_contents`

### 02:15 — Dump
- [ ] `pg_dump` từ Lovable Cloud (size ước lượng: __ GB, thời gian: __ phút)

### 03:00 — Restore
- [ ] `pg_restore` lên self-host
- [ ] Re-apply cron jobs (đã edit URL `*.supabase.co` → `api.flowa.one`)
- [ ] `ANALYZE` toàn bộ DB

### 04:00 — Storage migration
- [ ] Migrate file storage (carousel, video, audio, brand assets)
- [ ] Verify file counts giữa Lovable Storage API và `/mnt/storage-data`

### 05:00 — DNS switch
- [ ] Đổi A record `api.flowa.one` → IP server vật lý
- [ ] `dig api.flowa.one` từ nhiều location → đã propagate
- [ ] SSL cert active (`curl -I https://api.flowa.one`)

### 05:30 — Frontend deploy
- [ ] Build production với env mới
- [ ] Deploy lên `/var/www/flowa/` (Nginx serve)
- [ ] Hard refresh + test login flow

### 06:00 — Smoke test (kéo dài 1h)
- [ ] Login email/password
- [ ] Login Google OAuth
- [ ] Tạo brand template mới
- [ ] Generate 1 multichannel content (3-4 channels)
- [ ] Generate 1 carousel
- [ ] Publish lên Facebook test page
- [ ] Publish lên LinkedIn test
- [ ] Realtime: mở 2 tab, edit ở tab 1, thấy update ở tab 2
- [ ] Edge function streaming (generate-carousel SSE)
- [ ] File upload → vào Storage bucket
- [ ] Payment flow VNPay (sandbox)
- [ ] Agent pipeline chạy 1 stage

### 07:00 — Mở traffic
- [ ] Tắt maintenance mode
- [ ] Post status update trên Telegram channel admin
- [ ] Monitor Grafana 1h liên tục

## Rollback plan (nếu fail trong window)

Nếu smoke test fail > 30% flows:
1. Đổi DNS `api.flowa.one` về lại Lovable Cloud (TTL 60s = 1 phút)
2. Re-enable cron jobs trên Lovable Cloud
3. Frontend rollback git tag cũ
4. Post-mortem trong 48h, không ép cutover lại trong tuần

## Post-cutover (D14-D20)

- [ ] D14: Monitor 24/7 (giảm sleep)
- [ ] D14-D20: Giữ Lovable Cloud sống nhưng **READ-ONLY** (revoke write access)
- [ ] D21: Tắt hẳn Lovable Cloud subscription
