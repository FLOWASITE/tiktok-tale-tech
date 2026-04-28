Kết quả kiểm tra hiện tại:
- Nút “Chạy ngay” đã gọi được backend function và trả `success: true`, nhưng summary = 0 vì trong 3 bảng metadata (`channel_image_history`, `carousel_images`, `video_generations`) hiện không còn bản ghi nào cũ hơn 7 ngày.
- Vẫn còn 758 file cũ hơn 7 ngày trong storage bucket `carousel-images`; các file này là file mồ côi, không còn được tham chiếu bởi `carousel_images`/`channel_image_history`, nên logic hiện tại không đưa chúng vào danh sách xóa.
- Bảng `cron_run_logs` đang không có dòng nào dù function chạy xong; cần sửa quyền/ghi log để admin monitor hiển thị đúng lịch sử.

Kế hoạch sửa:

1. Sửa backend function `cleanup-old-media`
   - Bổ sung bước quét storage bucket `carousel-images` để tìm file cũ hơn 7 ngày.
   - Chỉ xóa file storage mồ côi: không còn URL tương ứng trong `channel_image_history`, `carousel_images`, và các nơi có thể còn dùng ảnh.
   - Giữ an toàn cho `brand-logos` và các asset thương hiệu; không xóa logo/brand asset theo cleanup media.
   - Thêm các chỉ số mới vào summary: `orphan_storage_files_found`, `orphan_storage_files_removed`, `orphan_storage_files_skipped_protected`.
   - Chia batch để tránh timeout khi có hàng trăm file.

2. Sửa ghi log cron
   - Thêm policy/hoặc cơ chế ghi log phù hợp để backend function ghi được `cron_run_logs` bằng service role.
   - Nếu ghi log lỗi, function sẽ đưa lỗi này vào response/log rõ ràng thay vì im lặng làm UI tưởng không có lịch sử.

3. Cập nhật Admin Cron Monitor
   - Hiển thị riêng số “DB records deleted” và “Orphan storage files removed”.
   - Toast sau khi bấm “Chạy ngay” sẽ báo cả số file storage mồ côi đã xóa, không chỉ số bản ghi DB.
   - Sau khi chạy xong, refresh log ngay và nếu vẫn không có log thì hiển thị cảnh báo rõ.

4. Kiểm chứng sau sửa
   - Chạy lại `cleanup-old-media` thủ công.
   - Xác nhận số file cũ trong `carousel-images` giảm từ 758 xuống 0 hoặc chỉ còn file đang được bảo vệ.
   - Xác nhận `cron_run_logs` có dòng `triggered_by = manual` với duration, summary và errors.
   - Kiểm tra lại UI `/admin/cron-monitor` để nút “Chạy ngay” phản ánh đúng kết quả.