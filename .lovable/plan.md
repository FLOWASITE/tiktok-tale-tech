

# Tại sao sau khi duyệt không thấy nội dung và hình ảnh

## Chẩn đoán chính xác

Tôi đã check DB cho pipeline vừa duyệt (`165d279c...`):

- Content `e10e774e...` đã được tạo thành công từ 00:42 cùng ngày
- Đã có **ảnh Facebook** tại `channel_image_history` (tạo 00:42:02)
- Approval `5a18bd2a...` đã chuyển sang `approved` lúc 15:55:23
- Pipeline đã chuyển `approval → publish`
- Tạo 2 `content_schedules`: Facebook + Website, **scheduled_at = 2026-04-23 09:00**
- Cả 2 schedule vẫn ở trạng thái `scheduled`, chưa published

Kết luận: **luồng duyệt đã chạy ĐÚNG**. Nội dung + ảnh đã có sẵn, và đã được đặt lịch đăng vào 2 ngày sau (23/04). Chưa có gì "mất" cả.

## Vậy tại sao user cảm thấy "không thấy gì"?

Đây là **vấn đề UX** trong `TelegramApp.tsx > ApproveTab`:

1. Sau khi bấm "Duyệt", code chỉ chạy `setItems((arr) => arr.filter((x) => x.id !== id))` — xoá item khỏi list
2. Không hiện thông báo "Đã duyệt xong, sẽ đăng lúc ngày/giờ X"
3. Không link sang chỗ xem nội dung đã duyệt và ảnh
4. Mini App không có tab "Đã duyệt / Lên lịch" để preview content + xem ảnh
5. Nếu tất cả item đã duyệt xong → hiện "Không có nội dung nào chờ duyệt 🎉" → user tưởng "mất hết"

Nội dung thực sự nằm ở trang web `app.flowa.one/multichannel/e10e774e...` và ảnh ở `channel_image_history`, nhưng Mini App không render những chỗ đó.

## Kế hoạch fix

### 1) Toast xác nhận sau khi duyệt
File: `src/pages/TelegramApp.tsx` trong `ApproveTab.act()`

Sau khi invoke `agent-approve`, đọc response:
- Nếu có `scheduled_publish_at` → toast: "Đã duyệt. Sẽ đăng lúc {dd/MM HH:mm}"
- Nếu publish ngay → toast: "Đã duyệt và đang đăng"
- Nếu error → toast đỏ

### 2) Thêm "Preview" trước khi duyệt
Trong card mỗi approval, thêm nút "Xem đầy đủ" mở dialog/drawer hiện:
- Nội dung full (text)
- Ảnh cover từ `channel_image_history` (query theo `content_id` lấy từ `agent_approvals.agent_pipelines.content_id`)
- Danh sách kênh sẽ đăng
- Thời gian đã scheduled nếu có

Query bổ sung trong `ApproveTab.load()`:
```
select id, content_preview, created_at,
       agent_pipelines(content_id, content_title,
         multi_channel_contents(channel_statuses, selected_channels),
         scheduled_publish_at
       )
from agent_approvals
```
Và fetch `channel_image_history` theo `content_id` để hiện ảnh.

### 3) Tab "Lên lịch" mới
Thêm tab `scheduled` vào bottom nav. Hiện danh sách `content_schedules` của org với trạng thái `scheduled` hoặc `publishing`:
- Tiêu đề bài, kênh, thời gian sẽ đăng
- Thumbnail ảnh nếu có
- Nút "Huỷ lịch" gọi update `publish_status = 'cancelled'`

Giúp user thấy rõ: "Bài đã duyệt đang nằm ở đây, sẽ đăng vào ngày X".

### 4) Hiện scheduled time ngay trong card approval
Trước khi duyệt, nếu `agent_pipelines.scheduled_publish_at` đã set (từ Goal Wizard / Campaign Planner), hiện dòng nhỏ:

```
📅 Sẽ đăng: 23/04/2026 09:00 • Facebook, Website
```

Để user biết approve bây giờ không có nghĩa là đăng ngay.

## Files sẽ sửa

- `src/pages/TelegramApp.tsx` — thêm toast, preview drawer, tab Lên lịch, hiện scheduled_at

## Rủi ro

Thấp. Không đụng `agent-approve`, không đổi schema, không đổi RLS. Chỉ cải thiện UX đọc dữ liệu có sẵn.

## Ngoài phạm vi

Nếu user muốn "duyệt xong đăng ngay lập tức", cần bỏ `scheduled_publish_at` của pipeline trước khi duyệt — việc này do Goal Wizard / Campaign quyết định, không phải bug. Có thể thêm toggle "Đăng ngay thay vì theo lịch" trong approve dialog ở lần sau nếu cần.

