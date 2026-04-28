## Mục tiêu
Nâng cấp `/admin/cron-monitor` từ trang single-job hiện tại thành dashboard giám sát đầy đủ với cảnh báo, đa job, và công cụ vận hành.

## Trạng thái hiện tại
Trang đã có: 4 stats cards, biểu đồ xu hướng (bar + line, day/week), bảng lịch sử 50 dòng, dialog chi tiết JSON, bộ lọc status/range, nút "Chạy ngay".

## Các nâng cấp đề xuất

### 1. Hỗ trợ nhiều job (multi-job)
Hiện đang hard-code `JOB_NAME = 'cleanup-old-media'`. Bổ sung:
- **Job selector** (dropdown ở header) — query distinct `job_name` từ `cron_run_logs` để tự động phát hiện job mới
- Nếu chỉ có 1 job → ẩn selector, hành xử như cũ
- Tất cả stats/chart/bảng filter theo job được chọn
- Chuẩn bị cho các cron job tương lai (auto-refresh-social-tokens, scheduled-publish, v.v.)

### 2. Banner cảnh báo (Health banner)
Thêm 1 alert card ngay trên cùng khi phát hiện vấn đề:
- **Quá hạn**: lần chạy gần nhất > 26 giờ trước (cron hằng ngày) → cảnh báo cron có thể bị treo
- **Lỗi liên tiếp**: ≥ 2 lần fail liên tiếp gần nhất → cảnh báo
- **Duration spike**: `maxDuration` trong 7 ngày qua > 3× trung bình → gợi ý xem lại
Mỗi cảnh báo hiển thị icon, mô tả ngắn, và CTA (cuộn tới bảng / xem chi tiết).

### 3. Lịch chạy kế tiếp (Next run)
Trong card "Lần chạy gần nhất", thêm dòng phụ "Lần chạy kế tiếp: …" tính từ schedule cron `0 3 * * *` (03:00 UTC) hiển thị theo giờ VN + countdown (`in 4h 12m`).

### 4. Drill-down lỗi tốt hơn
Trong Dialog chi tiết:
- Tách phần **Summary** thành các mục dễ đọc: thẻ riêng cho DB / Storage / Orphan với số đã xóa, không hiện raw JSON ngay
- Toggle "Xem JSON gốc" cho người cần
- Mỗi lỗi: parse `{message, code, stack}` nếu là object; nút copy
- Nếu có `errors[].context.path` (file storage) → hiển thị bucket/path ngắn gọn

### 5. Tìm kiếm & phân trang
- Ô search lọc theo nội dung errors hoặc khoảng thời gian cụ thể
- Tăng giới hạn từ 50 → load thêm (button "Tải thêm 50") thay vì hard-cap

### 6. Export CSV
Nút "Xuất CSV" tải về toàn bộ logs đang hiển thị (gồm columns: started_at, status, duration_ms, channel/carousel/videos, storage, orphan, error_count). Hữu ích cho báo cáo tháng.

### 7. Stats cards nâng cấp nhẹ
- Card "Tổng bản ghi đã xóa": thêm sparkline mini (7 ngày qua) tái dùng `Sparkline` component có sẵn
- Card "Thời lượng trung bình" mới (thay vì duplicate info trong card lỗi) — hiển thị avg + trend so với khoảng trước

### 8. Auto-refresh indicator
Hiện tại refetch mỗi 30s ngầm. Thêm indicator nhỏ "Cập nhật lần cuối: 12s trước" gần nút Làm mới + toggle bật/tắt auto-refresh.

## Phạm vi file thay đổi
- **Chỉ** `src/pages/AdminCronMonitor.tsx` (thêm components nội bộ + helpers)
- Tái sử dụng `Sparkline` từ `src/components/dashboard`
- Không tạo migration, không sửa edge function, không thêm package

## Không thay đổi
- Không động vào `cleanup-old-media` edge function
- Không sửa schema `cron_run_logs`
- Không thay đổi sidebar / route

## Ưu tiên triển khai (nếu cần cắt giảm)
**Must-have**: 1 (multi-job), 2 (health banner), 3 (next run), 4 (drill-down lỗi)
**Nice-to-have**: 5 (search/pagination), 6 (CSV), 7 (sparkline), 8 (auto-refresh indicator)

Tôi sẽ làm tất cả 8 mục trừ khi bạn muốn cắt bớt.
