## Mục tiêu
Tạo trang `/admin/cron-monitor` cho admin xem trạng thái cron `cleanup-old-media`: lần chạy gần nhất, số bản ghi đã xóa (channel_images, carousel_images, videos, storage files), thời gian chạy (duration), nguồn trigger (cron/manual), lỗi nếu có. Cho phép trigger thủ công và xem lịch sử các lần chạy.

## Việc cần làm

### 1. Database — bảng log run history
Tạo migration mới với bảng `cron_run_logs`:
- `id`, `job_name` (text, indexed), `started_at`, `completed_at`, `duration_ms`
- `status` ('success' | 'partial' | 'failed')
- `triggered_by` ('cron' | 'manual')
- `summary` (jsonb) — chứa số bản ghi xóa từng loại + storage stats
- `errors` (jsonb array)
- RLS: chỉ admin SELECT (`has_role(auth.uid(), 'admin')`); service role full access cho INSERT từ edge function
- Index trên `(job_name, started_at DESC)` để query nhanh

### 2. Edge function `cleanup-old-media` — bổ sung log
Sửa `supabase/functions/cleanup-old-media/index.ts`:
- Đọc `triggered_by` từ body (default 'cron')
- Track `startTime`, tính `duration_ms` cuối hàm
- INSERT 1 row vào `cron_run_logs` với toàn bộ summary + errors trước khi return (kể cả nhánh catch error → status 'failed')
- Status logic: `errors.length === 0` → 'success'; có errors nhưng vẫn xóa được → 'partial'; throw → 'failed'

### 3. Trang admin mới `src/pages/AdminCronMonitor.tsx`
- Card thống kê tổng: lần chạy gần nhất (relative time), tổng bản ghi xóa 7 ngày qua, success rate
- Nút "Chạy ngay" → invoke `cleanup-old-media` với `triggered_by: 'manual'`, refetch list sau 2s
- Bảng lịch sử (20 lần gần nhất, có pagination):
  - Cột: Started At | Trigger | Duration | Status (badge) | Channel imgs | Carousel imgs | Videos | Storage files | Errors (expandable)
  - Click row mở dialog chi tiết hiển thị full `summary` jsonb + danh sách errors
- Filter theo status (all/success/partial/failed) và range thời gian (24h/7d/30d)
- Empty state khi chưa có log + hint "Cron chạy 03:00 UTC mỗi ngày"

### 4. Routing & navigation
- Thêm route `/admin/cron-monitor` trong `src/app/routes.tsx` (theo pattern `<ProtectedRoute><AdminProtectedRoute><AppLayout>...`)
- Thêm link trong sidebar admin (tìm component navigation admin hiện có để chèn item "Cron Monitor")

### 5. Backfill nhẹ (optional, làm ngay sau migrate)
Insert 1 row "info" vào `cron_run_logs` để empty state có context, hoặc bỏ qua — chờ lần cron tiếp theo (03:00 UTC).

## Kỹ thuật chi tiết
- **Migration SQL**: dùng pattern `public.cron_run_logs` + RLS policies + index
- **Edge function**: dùng `serviceClient` đã có, ghi log trong `try/finally` để chắc chắn record dù có throw
- **UI**: shadcn Table + Badge + Dialog (đã có); React Query với `queryKey: ['cron-logs', filters]`, refetch interval 30s khi tab active
- **Mở rộng tương lai**: schema `job_name` cho phép tái dùng cho các cron khác (auto-refresh-social-tokens, scheduled-publisher, v.v.) — chỉ cần mỗi function INSERT vào cùng bảng

## Files thay đổi
- `supabase/migrations/<new>.sql` (tạo bảng + RLS + index)
- `supabase/functions/cleanup-old-media/index.ts` (thêm logging)
- `src/pages/AdminCronMonitor.tsx` (mới)
- `src/app/routes.tsx` (thêm route)
- Component sidebar admin (thêm nav item)
