## Mục tiêu
Vá các lỗi và bổ sung tính năng còn thiếu cho trang **File & Bộ nhớ Hệ thống** (`/admin/storage`) để thực sự "hoàn thiện" — không chỉ dừng ở scaffold.

## Hiện trạng phát hiện
Sau khi review `AdminStorageMemory.tsx` (624 dòng) và edge function `admin-storage-manager`:

### Bug
1. **Audit log không ghi cho `cleanup_table`**: Edge function gọi `admin_cleanup_table` RPC nhưng KHÔNG `insert` vào `admin_audit_logs`. Query `audit_history` lại lọc `action='cleanup_table'` → tab "Lịch sử dọn dẹp" sẽ luôn trống cho thao tác xóa DB. Đã verify: `admin_audit_logs` hiện không có row nào với action liên quan.
2. **`preview_table` thiếu validation whitelist**: nhận tên bảng tự do từ client → có thể dùng để xem bảng nhạy cảm (vd `profiles`, `social_connections`).
3. **`list_bucket_files` lấy tối đa 1000 file + 1 cấp folder**: bucket `carousel-images` có thể đã >1000 file nested sâu hơn, sẽ bỏ sót.
4. **`get_overview` được gọi 2 lần** (cả StorageTab và MemoryTab dùng cùng key khác nhau) → query trùng. MemoryTab dùng key `db-memory-stats` nhưng query `get_overview` (lấy cả buckets) → lãng phí.
5. **Không có pagination thực sự cho audit**: chỉ load 50 cứng.

### Thiếu tính năng
- Không có **export CSV** lịch sử dọn dẹp.
- Không có **filter theo category/search** trong tab "Bộ nhớ DB".
- Không có **bulk cleanup** (vd "Dọn tất cả expired cache" 1 click).
- Không hiển thị **chi tiết admin nào thực hiện** (chỉ có `admin_user_id` UUID, chưa join profile).
- **PreviewDialog** dump JSON thô — khó đọc, nên render thành table với cột chính.
- Không có **download file** trong BucketBrowser (chỉ "mở tab mới").
- Storage tab thiếu **"Xóa toàn bộ file > N ngày"** trong bucket.
- Không có **estimated savings** sau cleanup (số bytes đã thu hồi).

## Phạm vi triển khai

### A. Vá bug edge function (`supabase/functions/admin-storage-manager/index.ts`)
1. **Ghi audit log** trong case `cleanup_table`:
   ```ts
   await svc.from("admin_audit_logs").insert({
     admin_user_id: user.id,
     action: "cleanup_table",
     target_type: table,
     metadata: { mode, days, rows_deleted: data }
   });
   ```
2. **Whitelist `preview_table`**: dùng cùng `Set` tên bảng như `admin_cleanup_table` (lấy từ migration), reject nếu không nằm trong list.
3. **Phân trang storage list**: dùng paginated `list()` lặp khi `data.length === 1000`, đệ quy folder bằng stack (deep listing).
4. Thêm action mới:
   - `download_file` → trả signed URL 5 phút (cho bucket private).
   - `cleanup_bucket_older_than` → xóa file trong bucket > N ngày, hỗ trợ dry-run.
   - `bulk_cleanup_expired` → gọi tuần tự `cleanup_expired_cache`, `cleanup_knowledge_graph_cache`, `cleanup_telegram_processed_updates`, `cleanup_expired_generation_tasks`, `cleanup_old_checkpoints`, `cleanup_stale_telegram_chat_state` → trả tổng rows.
5. **Audit query** sửa filter `.in("action", ["cleanup_table", "storage_delete_files", "bulk_cleanup_expired"])` và join profile name qua subselect.

### B. Migration mới (`<ts>_admin_storage_v2.sql`)
- Thêm function `admin_bulk_cleanup_expired()` trả jsonb `{ table_name: rows_deleted }`, SECURITY DEFINER + check admin role.
- Cập nhật `admin_cleanup_table` (nếu cần) để thêm bảng `web_search_cache` (đang thiếu trong whitelist hiện tại — verify lại).
- View `v_admin_audit_with_user` JOIN `admin_audit_logs` với `profiles` để hiển thị tên admin.

### C. Frontend (`src/pages/AdminStorageMemory.tsx`)
- Tách MemoryTab dùng query key riêng cho `db_stats` (skip buckets payload bằng action mới `get_db_stats_only`).
- **Thanh tìm kiếm + filter category** ở tab Bộ nhớ DB.
- Nút **"Dọn tất cả expired cache"** ở đầu tab Bộ nhớ DB → gọi `bulk_cleanup_expired`, hiển thị toast với chi tiết từng bảng.
- **PreviewDialog** render thành Table thật: tự suy 5 cột đầu từ keys của row đầu tiên, truncate cell dài.
- **BucketBrowser**:
  - Thêm nút "Xóa file > N ngày" trong header.
  - Nút Download dùng `signed URL` cho file private.
  - Hiển thị tổng dung lượng các file đang chọn.
- **AuditTab**:
  - Hiển thị tên admin (từ view mới).
  - Nút Export CSV (`Papa.unparse` đã có sẵn).
  - Filter theo loại action (dropdown).
  - Pagination "Tải thêm 50".
- Thay JSON dump bằng component `<JsonTree>` đơn giản hoặc table.

### D. Thêm card vào AdminDashboard
Verify đã có card "File & Bộ nhớ" — nếu chưa, thêm với link `/admin/storage` (đã làm ở loop trước, chỉ verify).

## File thay đổi
**Sửa:**
- `supabase/functions/admin-storage-manager/index.ts` (vá audit + thêm 3 action + whitelist preview)
- `src/pages/AdminStorageMemory.tsx` (refactor 3 tab, thêm filter/export/preview table)

**Mới:**
- `supabase/migrations/<ts>_admin_storage_v2.sql` (function bulk cleanup + view audit join profile)

## Bảo mật
- Whitelist tên bảng cho cả `cleanup_table` lẫn `preview_table`.
- Signed URL download chỉ valid 5 phút.
- Rate limit hiện tại 30 ops/phút giữ nguyên, riêng `bulk_cleanup_expired` đếm như 1 op.

## Ngoài phạm vi
- Restore file đã xóa (storage không bật versioning).
- Quota per-organization (kế hoạch sau).
- Background job dọn theo lịch (đã có cron riêng).
