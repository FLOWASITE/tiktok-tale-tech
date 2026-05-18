
## Mục tiêu
Chuyển backend Flowa (DB + Auth + Storage + Realtime + 250 edge functions) từ **Lovable Cloud (Supabase managed)** sang **self-hosted Supabase stack** đặt server tại Việt Nam, để đáp ứng yêu cầu chủ quyền dữ liệu. Timeline: <2 tuần, chấp nhận downtime vài giờ trong cutover.

## Quyết định kiến trúc cốt lõi
- **Không dùng PostgREST trần** — phải có Auth (GoTrue), Storage, Realtime, Edge Runtime vì code hiện tại phụ thuộc trực tiếp (197 hooks dùng `supabase-js`, 250 edge functions, 129 RLS dùng `auth.uid()`, pgvector, pg_cron, realtime channels).
- **Triển khai bằng `supabase/docker` (docker-compose chính thức)** — giữ nguyên 100% API surface (`supabase.from()`, `supabase.auth`, `supabase.functions.invoke`, `supabase.storage`, `.channel()`), code FE/edge functions gần như **không cần sửa**, chỉ đổi env URL/key.
- **Không thể tiếp tục dùng Lovable Cloud sau cutover** — Lovable auto-deploy edge functions + migrations sẽ trỏ vào project cũ. Cần quyết định: (a) đóng băng Lovable, dev tiếp bằng Claude Code + manual deploy, hoặc (b) chạy song song Lovable (staging) + self-host (production), sync 1 chiều qua git+CI.

## Hạ tầng đề xuất (VN)
- **VPS tier 1**: VNG Cloud / Viettel IDC / FPT Cloud — 1 node app + 1 node DB tách riêng
  - **App node**: 8 vCPU / 16 GB RAM / 200 GB SSD — chạy Kong, GoTrue, PostgREST, Realtime, Storage, Edge Runtime, Studio
  - **DB node**: 8 vCPU / 32 GB RAM / 500 GB NVMe — Postgres 15 + pgvector + pg_cron + pgaudit
  - **Backup**: S3-compatible (VNG vStorage hoặc Wasabi VN) cho WAL + pgBackRest daily
- Ubuntu 22.04, Docker + docker-compose, Caddy/Nginx reverse proxy với TLS (Let's Encrypt cho `api.flowa.one`, `studio.flowa.one`).

## Các thay đổi code cần làm
1. **`.env`**: thay `VITE_SUPABASE_URL` → `https://api.flowa.one`, `VITE_SUPABASE_PUBLISHABLE_KEY` → anon key mới của self-host. File auto-gen — phải sửa qua build pipeline mới (không qua Lovable).
2. **Edge functions secrets**: chuyển `LOVABLE_API_KEY` + tất cả secret (Facebook, Google, payOS, VNPay, DashScope, OpenAI, Telegram bot…) sang `.env` của Edge Runtime container.
3. **`supabase/config.toml`**: giữ nguyên — `verify_jwt` flags vẫn hợp lệ với self-host.
4. **Lovable AI Gateway**: KHÔNG còn dùng được sau khi rời Lovable. Phải đổi `_shared/ai-provider.ts` sang OpenRouter / OpenAI / Google trực tiếp, hoặc giữ 9Router self-hosted (đã có integration).
5. **pg_cron jobs** (token refresh 30 phút, scheduled publish 2 phút, cleanup): export từ DB hiện tại bằng `SELECT * FROM cron.job`, re-apply trên self-host.
6. **Storage buckets + policies**: export bucket list, re-create bằng migration trên self-host.
7. **OAuth callback URLs**: 21+ provider (FB/IG/LinkedIn/TikTok/X/Threads/Zalo/GBP/Blogger/Bluesky/Pinterest/Shopify/Wix/WordPress…) phải update redirect URI sang domain mới ở từng dashboard.
8. **Google OAuth (auth signin)**: cấu hình lại trong GoTrue env (`GOTRUE_EXTERNAL_GOOGLE_*`).

## Migration data (downtime cutover)
1. **Dry-run** trên DB rỗng: `pg_dump` schema-only từ Lovable Cloud → restore self-host → verify 388 migrations, 70+ functions, RLS, extensions (`vector`, `pg_trgm`, `pg_cron`, `pgcrypto`).
2. **Test full data dump** (off-hours): `pg_dump --no-owner --no-privileges -Fc` → ước lượng size + thời gian restore.
3. **Cutover window** (~2-4h, công bố trước cho user):
   - T+0: bật maintenance mode trên FE (chặn write)
   - T+5m: `pg_dump` final + dump Storage objects (S3 sync)
   - T+30m-2h: `pg_restore` vào self-host DB, verify counts, vacuum/analyze, reindex IVF
   - T+2h: deploy FE bản mới (env trỏ domain mới) lên hosting riêng (Vercel/Netlify/VNG), update DNS `app.flowa.one`
   - T+3h: smoke test 11 luồng chính (login, generate, publish FB/IG, carousel, agent pipeline, payment)
   - T+4h: tắt maintenance, monitor 24h
4. **Rollback plan**: giữ Lovable Cloud chạy read-only 7 ngày, DNS có thể trỏ ngược nếu critical bug.

## Frontend hosting
Lovable không thể publish FE nếu backend rời Lovable Cloud (mất tích hợp). Đề xuất:
- Build Vite production → host trên **VNG Cloud Object Storage + CDN** hoặc **Vercel** (FE static, không vi phạm chủ quyền dữ liệu vì data nằm ở backend VN).
- CI/CD: GitHub Actions → build → upload → invalidate CDN.

## Timeline 14 ngày
| Ngày | Việc |
|---|---|
| 1-2 | Mua/setup VPS VN, cài Docker, clone `supabase/docker`, cấu hình domain + TLS |
| 3-4 | Dry-run migrations + extensions, fix extension version mismatch nếu có |
| 5-6 | Setup secrets, deploy 250 edge functions thủ công (script `supabase functions deploy --project-ref local`), test 10 function chính |
| 7 | Đổi `_shared/ai-provider.ts` bỏ Lovable Gateway, switch sang OpenRouter+9Router |
| 8 | Setup pg_cron jobs, Storage buckets, OAuth redirect URIs |
| 9-10 | Test data dump full + restore time measurement, setup pgBackRest |
| 11 | Setup FE hosting + CI, build env mới, staging end-to-end |
| 12 | UAT với data thật (clone) |
| 13 | **Cutover** (off-hours, đêm Chủ nhật) |
| 14 | Monitor, fix hotfix |

## Rủi ro chính
- **Lovable AI Gateway lock-in**: phải refactor `ai-provider.ts` + đảm bảo có credit ở OpenRouter/OpenAI/Google đủ cho production traffic.
- **Edge Runtime self-host hỗ trợ Deno nhưng có thể lệch version** với cloud runtime → một số `npm:` specifier có thể fail.
- **Realtime self-host** cần config riêng (RLS-aware), test kỹ các hook `useAgentPipelines`, `useVideoGeneration`.
- **pgvector IVF index** cần `ANALYZE` lại sau restore để query không chậm.
- **Tách khỏi Lovable.dev workflow** — mất auto-deploy, mất type-gen tự động cho `src/integrations/supabase/types.ts`. Phải chạy `supabase gen types typescript` trong CI.
- **Compliance VN**: Nghị định 53/2022 yêu cầu lưu trữ dữ liệu user VN tại VN — self-host VN giải quyết, nhưng FE log/analytics bên thứ 3 (nếu có) vẫn cần review.

## Cần xác nhận trước khi triển khai
1. Chọn nhà cung cấp VPS VN cụ thể (VNG / Viettel / FPT)?
2. Sau cutover còn dùng Lovable.dev để dev frontend không, hay chuyển hẳn sang Claude Code + git CI?
3. Ngân sách hạ tầng/tháng (ước lượng 4-8 triệu VND cho 2 VPS + storage + backup)?
4. Có domain `api.flowa.one` sẵn để trỏ về self-host chưa?
