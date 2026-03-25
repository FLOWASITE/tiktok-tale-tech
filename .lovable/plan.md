

# Fix: 13 Pipelines Bị Kẹt Ở Bước Đăng Bài (Publish) — ĐÃ HOÀN THÀNH

## Đã thực hiện

### Phần 1: Backfill `target_channels` ✅
- Thêm action `backfill_publish` vào edge function
- Đã chạy: fix được 2 pipelines thiếu channels, 11 pipeline khác đã có sẵn

### Phần 2: Fix `check_scheduled_publish` ✅  
- Mở rộng logic để cũng trigger pipelines có `scheduled_publish_at = null`
- Trước đó chỉ query `lte(scheduled_publish_at, now)` → bỏ qua null

### Phần 3: UI — Nút "Fix & Retry Publish" ✅
- Thêm alert card trên CampaignDashboard phát hiện pipelines publish thiếu channels
- Nút gọi `backfill_publish` action

### Phần 4: Trigger publish ✅
- Đã trigger 3 pipelines sẵn sàng (1 đến hạn 25/3 + 2 không có schedule)
- 10 pipelines còn lại sẽ tự động publish khi đến ngày scheduled
