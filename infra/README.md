# Flowa Self-Host Infrastructure

Toàn bộ code/config để chạy stack Flowa trên **server vật lý văn phòng** (Ubuntu 22.04 + Docker).

> **Scope**: solo ops, server cũ tận dụng. Tối ưu cho đơn giản & dễ vận hành, không phải HA enterprise.

## Cấu trúc
```
infra/
├── README.md                          # File này
├── RUNBOOK.md                         # Quy trình vận hành hằng ngày + xử lý sự cố
├── CUTOVER.md                         # Checklist cutover từ Lovable Cloud → self-host
├── docker-compose.override.yml        # Override cho supabase/docker (extensions, OAuth, …)
├── .env.example                       # Template env vars (copy → .env, fill secrets)
├── nginx/
│   └── flowa.conf                     # Reverse proxy: api.flowa.one + studio.flowa.one
└── scripts/
    ├── 00-server-bootstrap.sh         # Cài Ubuntu base: Docker, UFW, fail2ban, swap
    ├── 01-install-supabase.sh         # Clone supabase/docker + apply override
    ├── 02-deploy-edge-functions.sh    # Loop deploy 250 edge functions
    ├── 03-backup-postgres.sh          # Daily pg_dump + Restic encrypted backup
    ├── 04-export-cron-jobs.ts         # Dump pg_cron jobs từ Lovable Cloud
    ├── 05-export-storage-buckets.ts   # Dump Storage buckets + policies
    └── 06-migrate-cutover.sh          # 4-6h cutover: pg_dump → restore → DNS switch
```

## Workflow tổng thể

```
┌─────────────────────────────────────────────────────────────┐
│ TUẦN 1: Chuẩn bị (làm song song với Lovable Cloud chạy prod)│
├─────────────────────────────────────────────────────────────┤
│ D1-D2  scripts/00-server-bootstrap.sh                       │
│ D3-D4  scripts/01-install-supabase.sh                       │
│ D5     ✅ ai-provider.ts shim (đã commit) + test local       │
│ D6     scripts/02-deploy-edge-functions.sh (dry-run)        │
│ D7     scripts/04 + 05 export configs từ Lovable Cloud      │
├─────────────────────────────────────────────────────────────┤
│ TUẦN 2: Migrate + cutover                                   │
├─────────────────────────────────────────────────────────────┤
│ D8-D9  Dry-run pg_dump → restore lên self-host              │
│ D10    Update OAuth redirect URI (21 providers) — manual    │
│ D11    Full dry-run cutover, đo thời gian                   │
│ D12    Setup frontend deploy (Nginx + Vite build)           │
│ D13    🚨 CUTOVER: scripts/06-migrate-cutover.sh (4-6h)     │
│ D14    Monitor Grafana 24h, giữ Lovable Cloud làm rollback  │
└─────────────────────────────────────────────────────────────┘
```

## Quick start (D1)

```bash
# Trên server vật lý (Ubuntu 22.04 fresh install)
ssh root@<server-ip>
git clone https://github.com/<your-org>/flowa.git
cd flowa/infra
sudo bash scripts/00-server-bootstrap.sh
```

Sau đó đọc `RUNBOOK.md` để biết các bước tiếp theo.

## Cảnh báo solo ops

- **Backup là sinh mạng**. Test restore 1 lần/tháng — không test = không có backup.
- **UPS bắt buộc** (server văn phòng dễ mất điện). Tối thiểu 30 phút để shutdown sạch.
- **2 ISP** (Viettel + FPT) qua router failover. Đứt 1 đường = đứt user.
- **Monitoring** (Grafana + alert qua Telegram bot) bật từ ngày đầu, không phải sau khi sập.
