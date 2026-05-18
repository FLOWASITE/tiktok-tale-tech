# Kế hoạch Self-host Supabase trên Server Vật Lý

## Bối cảnh đã chốt
- **Phạm vi**: Self-host TOÀN BỘ Supabase stack (Postgres + PostgREST + GoTrue + Storage + Realtime + Edge Runtime + Kong)
- **Lý do**: Data sovereignty - data ở VN
- **Hạ tầng**: **Server vật lý của user** (on-premise)
- **Timeline**: <2 tuần, downtime vài giờ chấp nhận được
- **Frontend**: vẫn dùng Lovable.dev để dev → build → deploy lên hosting riêng

---

## 1. Yêu cầu phần cứng server vật lý

### Cấu hình tối thiểu (1 server, all-in-one)
| Thành phần | Spec |
|---|---|
| CPU | 8 cores / 16 threads (Xeon E-2388G hoặc Ryzen 7 5800X trở lên) |
| RAM | 64 GB ECC DDR4 |
| Storage OS | 2× 500 GB NVMe RAID 1 (hệ điều hành + Docker) |
| Storage DB | 2× 2 TB NVMe RAID 1 (Postgres data) |
| Storage backup | 4× 4 TB HDD RAID 10 (backup + Storage bucket) |
| Network | 2× 1 Gbps NIC (bonding), public IP tĩnh |
| UPS | Tối thiểu 30 phút |

### Cấu hình khuyến nghị (2 server tách App/DB)
- **App Server**: 8 core / 32 GB RAM / 500 GB NVMe (Kong, GoTrue, Storage, Realtime, Edge Runtime)
- **DB Server**: 16 core / 128 GB RAM / 2 TB NVMe RAID 10 + 8 TB HDD backup
- Kết nối nội bộ 10 Gbps switch

### Yêu cầu phòng máy
- Nhiệt độ 18-24°C, độ ẩm 40-60%
- 2 đường điện độc lập + UPS + máy phát
- 2 đường internet ISP khác nhau (Viettel + FPT) để failover
- Public IP tĩnh + reverse DNS
- Firewall cứng (pfSense/MikroTik) trước server

---

## 2. Stack phần mềm

### OS & Base
- **Ubuntu Server 22.04 LTS** (hoặc Debian 12)
- Docker 24+ & Docker Compose v2
- Nginx (reverse proxy + SSL termination)
- Certbot (Let's Encrypt SSL cho `api.flowa.one`, `db.flowa.one`)
- Fail2ban + UFW firewall
- Prometheus + Grafana (monitoring)
- Restic (backup encrypted offsite)

### Supabase Stack (qua `supabase/docker`)
- Postgres 15 + extensions: `pgvector`, `pg_cron`, `pg_net`, `pgsodium`, `pg_graphql`
- PostgREST (REST API)
- GoTrue (Auth)
- Storage API (S3-compatible, MinIO backend hoặc local filesystem)
- Realtime (WebSocket)
- Edge Runtime (Deno - chạy 250 edge functions)
- Kong API Gateway
- Studio (web UI quản trị)
- Vector (logs)
- Imgproxy (image transformations)

---

## 3. Roadmap 14 ngày

### **Tuần 1: Chuẩn bị hạ tầng & code (D1-D7)**

**D1-D2: Hạ tầng vật lý**
- Cài Ubuntu 22.04, RAID, network bonding
- Cấu hình firewall, SSH key-only, fail2ban
- Cài Docker + Compose
- Setup DNS: `api.flowa.one`, `studio.flowa.one` → IP server
- Phát hành SSL cert qua Certbot

**D3-D4: Triển khai Supabase stack**
- Clone `supabase/docker`
- Viết `docker-compose.override.yml`:
  - Bật extensions (`pgvector`, `pg_cron`, `pg_net`)
  - Config GoTrue cho 21+ OAuth providers (Google, Facebook, Zalo, TikTok, LinkedIn, X, Threads, Instagram, GBP, Blogger, …)
  - Mount Storage volume
  - Set JWT secret, anon key, service role key mới
- Boot stack, verify health từng service
- Cài Postgres extensions, tạo schema rỗng

**D5: Refactor AI Provider**
- Sửa `supabase/functions/_shared/ai-provider.ts`: bỏ Lovable Gateway, route 100% qua OpenRouter + 9Router + DashScope direct
- Test local với 3-5 edge functions critical (`generate-script`, `generate-carousel`, `topic-ai`)
- Add secrets mới: `OPENROUTER_API_KEY`, `NINE_ROUTER_API_KEY`, `DASHSCOPE_API_KEY` vào `.env` của self-host

**D6: Edge Functions deploy pipeline**
- Viết script `deploy-all-functions.sh` (loop 250 functions, `supabase functions deploy --project-ref local`)
- Setup GitHub Actions: push → SSH deploy functions tự động
- Test deploy 10 functions mẫu

**D7: Cron jobs & Storage**
- Export `pg_cron` jobs hiện tại từ Lovable Cloud (script `export-cron-jobs.ts`)
- Export danh sách Storage buckets + policies
- Apply lên self-host

### **Tuần 2: Migrate data & cutover (D8-D14)**

**D8-D9: Dry-run migration**
- `pg_dump -Fc` từ Lovable Cloud (schema only) → restore lên self-host → verify
- `pg_dump -Fc` data (sample 10%) → restore → smoke test
- Test auth flow, OAuth callbacks, edge functions, realtime

**D10: OAuth re-registration**
- Update redirect URI ở 21+ providers từ `*.supabase.co` → `api.flowa.one`
- Google, Facebook, Zalo, TikTok, LinkedIn, X, Threads, Instagram, GBP, Blogger, Bluesky, …
- Document từng provider (cần Console access)

**D11: Full dry-run cutover**
- Maintenance mode trên app
- `pg_dump` full → restore → verify row counts
- Migrate Storage bucket files (rsync hoặc `mc mirror`)
- Đo thời gian thực tế

**D12: Frontend deploy pipeline**
- Build Vite production → deploy lên hosting riêng (Nginx trên cùng server hoặc Cloudflare Pages)
- Update env: `VITE_SUPABASE_URL=https://api.flowa.one`, anon key mới
- Test toàn bộ flows quan trọng

**D13: CUTOVER (4-6h downtime)**
- 02:00 - Bật maintenance mode
- 02:15 - `pg_dump` full từ Lovable Cloud
- 03:00 - Restore lên self-host
- 04:00 - Migrate Storage files
- 05:00 - Switch DNS `api.flowa.one` → self-host
- 05:30 - Deploy frontend mới
- 06:00 - Smoke test 20 flows critical
- 07:00 - Mở lại traffic, tắt maintenance

**D14: Monitoring & rollback plan**
- Theo dõi Grafana 24h
- Giữ Lovable Cloud sống thêm 7 ngày làm rollback
- Document runbook cho team

---

## 4. Backup & Disaster Recovery

- **Postgres**: `pg_dump` daily → Restic encrypt → backup offsite (rsync sang VPS Hà Nội/HCM khác)
- **WAL archiving**: continuous archive sang second disk (PITR khả thi trong 7 ngày)
- **Storage bucket**: rsync incremental hàng giờ → offsite
- **Config**: git repo private cho `docker-compose.yml`, `.env.template`
- **Test restore**: 1 lần/tháng (mandatory)

---

## 5. Rủi ro & mitigation

| Rủi ro | Mitigation |
|---|---|
| Mất điện kéo dài | UPS 30 phút + máy phát + 2 đường điện |
| Đứt internet | 2 ISP failover qua pfSense |
| Hỏng disk | RAID 1/10 + hot spare |
| Mất server vật lý (cháy, trộm) | Backup offsite hàng giờ + standby server tại location khác |
| OAuth callbacks fail | Test từng provider trước cutover, giữ Lovable Cloud rollback 7 ngày |
| Edge function thiếu deps | Pin Deno version giống Lovable Cloud (1.45+), test toàn bộ 250 functions |
| pg_cron jobs sai timezone | Set `TZ=Asia/Ho_Chi_Minh` cho container Postgres |
| Realtime WebSocket qua Nginx | Cấu hình proxy `Upgrade` headers đúng |

---

## 6. Câu hỏi cần user xác nhận

1. **Server đã có sẵn chưa?** Spec hiện tại (CPU/RAM/Disk)?
2. **Phòng máy ở đâu?** (văn phòng / colocation datacenter VN)
3. **ISP nào?** (Viettel/FPT/VNPT) — cần public IP tĩnh
4. **Domain `api.flowa.one`** đã sẵn sàng để trỏ DNS chưa?
5. **Có team DevOps/sysadmin** để vận hành 24/7 hay solo?
6. **Frontend deploy ở đâu** sau cutover: Nginx cùng server, Cloudflare Pages, hay VPS riêng?

Sau khi user trả lời, sẽ bắt đầu **D5 - refactor `ai-provider.ts`** (việc duy nhất làm được trong repo này, các bước hạ tầng còn lại làm ngoài Lovable).
