## Mục tiêu

Bổ sung trang **`/admin/storage`** ("File & Bộ nhớ Hệ thống") cho phép admin:
1. Xem tổng quan dung lượng Storage buckets + Database tables theo nhóm.
2. Duyệt file thực tế trong buckets (filter, sort, preview, xóa từng file).
3. Dọn dẹp thủ công các bảng cache/log/embedding theo điều kiện (expired, theo ngày, theo loại) — bổ sung cho cron tự động đã có.
4. Audit mọi thao tác xóa vào `admin_audit_logs`.

## Hiện trạng phát hiện

- **Storage buckets**: `brand-logos` (28 file, 25 MB), `carousel-images` (97 file, 304 MB) — đều public.
- **Bảng cache/log lớn**: `edge_function_metrics` 14.6k rows, `ai_response_cache` 179, `channel_image_history` 99, `web_search_cache` 104, `agent_execution_logs` 148, …
- **Đã có** `AdminCronMonitor` cho cron `cleanup-old-media`, các function dọn dẹp DB (`cleanup_expired_cache`, `cleanup_old_edge_metrics`, `cleanup_expired_generation_tasks`, `cleanup_knowledge_graph_cache`, `cleanup_telegram_processed_updates`, …) đã có sẵn — chưa có UI để gọi trực tiếp.

## Phạm vi

### A. Tab "Storage Buckets" (file vật lý)
- Card tổng quan mỗi bucket: số file, tổng dung lượng, file mới/cũ nhất, % public.
- Bảng file: cột `name | bucket | size | created_at | last_accessed | preview`.
  - Filter: bucket, khoảng ngày, search theo tên, sort (size/date).
  - Pagination 50/lần (Load more).
  - Hành động: **Xem trước** (mở public URL trong dialog), **Xóa** (single + bulk select), **Tải xuống**.
- Nút "Tìm orphan" → liệt kê file không được tham chiếu trong `carousel_images.image_url`, `channel_image_history.image_url`, `brand_templates.logo_url` → cho phép xóa hàng loạt.

### B. Tab "Bộ nhớ DB" (cache/log/embedding)
Mỗi nhóm là card có: số rows, dung lượng, oldest record, nút action.
- **Cache**: `ai_response_cache`, `web_search_cache`, `knowledge_graph_cache`, `telegram_example_cache`
  - Action: "Xóa expired" (gọi function có sẵn), "Xóa tất cả", "Xóa > N ngày".
- **Logs**: `edge_function_metrics`, `agent_execution_logs`, `agent_pipeline_logs`, `cron_run_logs`, `admin_audit_logs`, `campaign_kpi_logs`, `regulation_propagation_log`, `usage_logs`, `telegram_messages_log`, `sales_chat_messages_log`, `content_publishing_logs`, `approval_logs`, `campaign_notification_logs`
  - Action: "Xóa > N ngày" (default 30/90 tùy bảng), preview 10 dòng gần nhất.
- **Embeddings**: `content_embeddings`, `conversation_embeddings`
  - Action: xóa theo organization, xóa orphan (không có content_id tương ứng).
- **Tasks tạm**: `generation_tasks`, `workflow_checkpoints`, `telegram_processed_updates`, `telegram_chat_state` — gọi function cleanup tương ứng.

### C. Tab "Lịch sử dọn dẹp"
- Liệt kê 50 thao tác xóa gần nhất từ `admin_audit_logs` filter `action LIKE 'storage_%' OR 'cleanup_%'`.
- Hiển thị: thời gian, admin, target, số rows/file ảnh hưởng, kích thước thu hồi.

## Triển khai kỹ thuật

### Edge function mới: `admin-storage-manager`
JWT validate + `has_role(user, 'admin')`. Action-based router:
```
{ action: 'list_bucket_files', bucket, prefix?, search?, limit, offset, sort }
{ action: 'delete_bucket_files', bucket, paths: string[] }
{ action: 'find_orphan_files', bucket }
{ action: 'get_db_stats' } → trả size + count cho ~20 bảng
{ action: 'cleanup_table', table, mode: 'expired'|'older_than'|'all', days?: number }
{ action: 'preview_table', table, limit }
```
Mọi mutation ghi `admin_audit_logs` với `action`, `target_type`, `target_id`, `metadata` (rows_deleted, bytes_freed).

### Migration mới
- Thêm whitelist function `admin_cleanup_table(p_table text, p_mode text, p_days int)` SECURITY DEFINER:
  - Switch case theo `p_table` (chỉ cho phép các bảng đã liệt kê) — tránh SQL injection.
  - Trả về `rows_deleted int`.
- Index hỗ trợ: `created_at` đã có sẵn ở hầu hết bảng.

### Frontend
- File mới `src/pages/AdminStorageMemory.tsx` (3 tabs trên).
- Component con: `BucketFileTable.tsx`, `DbCleanupCard.tsx`, `OrphanFinderDialog.tsx`, `CleanupHistoryTable.tsx` trong `src/components/admin/storage/`.
- Hook `useAdminStorage.ts` wrap các call edge function bằng TanStack Query.
- Route mới trong `src/app/routes.tsx`: `/admin/storage` (lazy import) + thêm card "File & Bộ nhớ" vào `AdminDashboard.tsx`.

### Bảo mật
- Edge function: 401 nếu không phải admin.
- Whitelist tên bảng — không nhận raw SQL.
- Confirm dialog 2 bước cho "Xóa tất cả" hoặc xóa > 100 file.
- Rate limit: tối đa 5 thao tác xóa/phút/admin (in-memory map).

## File thay đổi
- **Mới**: `supabase/functions/admin-storage-manager/index.ts`, `supabase/migrations/<ts>_admin_cleanup_table.sql`, `src/pages/AdminStorageMemory.tsx`, `src/components/admin/storage/{BucketFileTable,DbCleanupCard,OrphanFinderDialog,CleanupHistoryTable}.tsx`, `src/hooks/useAdminStorage.ts`.
- **Sửa**: `src/app/routes.tsx` (route), `src/pages/AdminDashboard.tsx` (thêm card điều hướng).

## Ngoài phạm vi
- Tự động thay đổi lịch cron (đã có ở AdminCronMonitor).
- Restore file đã xóa (storage không có versioning bật).
- Quota per-organization (ý tưởng cho bản sau).
