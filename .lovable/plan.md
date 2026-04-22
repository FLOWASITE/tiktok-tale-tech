
# Sửa lỗi “Không tạo được nội dung thủ công” do thiếu `content_goal` khi lưu `multi_channel_contents`

## Vấn đề đã xác định
Lỗi trong screenshot là:

```text
null value in column "content_goal" of relation "multi_channel_contents" violates ...
```

Qua code hiện tại, nguyên nhân nằm ở `supabase/functions/generate-multichannel/index.ts`:

- Nhánh insert **non-streaming** đã có:
  - `content_goal: formData.contentGoal || 'engagement'`
- Nhưng nhánh insert **streaming-mode** tại khoảng dòng `3277-3311` đang insert vào `multi_channel_contents` mà **không set `content_goal`**
- Bảng `multi_channel_contents` đang yêu cầu `content_goal` là bắt buộc, nên luồng tạo thủ công bị fail ở bước lưu DB
- Screenshot progress 95% cũng khớp với việc AI đã tạo xong nội dung nhưng fail ở bước persistence

## Mục tiêu sửa
Đảm bảo mọi luồng tạo nội dung thủ công đều luôn có strategy tối thiểu trước khi insert:

- `content_goal`
- `selected_channels`
- các field chiến lược liên quan nếu cần đồng bộ (`content_role`, `content_angle`)

## Cách triển khai

### 1) Chuẩn hóa strategy sớm trong `generate-multichannel`
Trong `supabase/functions/generate-multichannel/index.ts`:

- Sau khi parse `formData`, tạo một bước chuẩn hóa dùng chung:
  - `resolvedContentGoal`
  - `resolvedContentRole`
  - `resolvedContentAngle`
  - `resolvedSelectedChannels`

Ưu tiên:
1. giá trị user gửi lên
2. giá trị derive từ `targetJourneyStage` / existing content / core content
3. fallback an toàn (`education` hoặc giá trị đang được hệ thống dùng nhất quán)

Mục tiêu là tránh mỗi nhánh insert/update tự fallback khác nhau.

### 2) Vá nhánh insert của streaming-mode
Ở block insert `multi_channel_contents` quanh dòng `3277+`, bổ sung ít nhất:

- `content_goal: resolvedContentGoal`
- `selected_channels: resolvedSelectedChannels`

Và đồng bộ thêm nếu schema/logic hiện dùng:
- `content_role: resolvedContentRole || null`
- `content_angle: resolvedContentAngle || null`

Như vậy streaming-mode sẽ lưu metadata giống non-streaming hơn, không còn fail vì null bắt buộc.

### 3) Đồng bộ fallback giữa streaming và non-streaming
Hiện có dấu hiệu fallback không nhất quán:
- nhiều chỗ derive `education`
- một chỗ insert fallback `engagement`

Sẽ chuẩn hóa để cả 2 nhánh dùng cùng một nguồn truth, tránh:
- UI/manual mode ra một kiểu
- Telegram/agent mode ra một kiểu
- DB saved row thiếu field ở một nhánh nhưng không thiếu ở nhánh khác

### 4) Rà lại các luồng insert/update khác của `multi_channel_contents`
Kiểm tra nhanh các chỗ:
- create mới
- expand mode
- regenerate mode
- single-channel mode
- streaming persistence

Mục tiêu:
- chỗ nào insert row mới thì phải luôn có `content_goal`
- nếu bảng còn bắt buộc `selected_channels`, cũng phải được set đầy đủ
- update path không được vô tình làm mất `content_goal`

## Files cần sửa
- `supabase/functions/generate-multichannel/index.ts`

## Không cần sửa
- DB schema
- frontend component progress UI
- Telegram webhook
- `src/integrations/supabase/types.ts`

## QA sau khi implement

### Case 1 — Tạo nội dung thủ công từ UI
Thử tạo 1 bài thủ công với 1 kênh (ví dụ Facebook)

Kỳ vọng:
- không còn lỗi `null value in column "content_goal"`
- tiến trình chạy xong và lưu được row mới

### Case 2 — Tạo thủ công nhiều kênh
Thử 2–3 kênh

Kỳ vọng:
- row `multi_channel_contents` được tạo thành công
- `selected_channels` và `content_goal` có giá trị hợp lệ

### Case 3 — Streaming path
Chạy đúng luồng đang gây lỗi trong screenshot

Kỳ vọng:
- không fail ở mốc 90–95%
- sau khi AI tạo xong, persistence hoàn tất

### Case 4 — Non-streaming path
Xác nhận luồng cũ vẫn hoạt động

Kỳ vọng:
- không regression
- content goal vẫn được lưu đúng

### Case 5 — Existing strategy missing from request
Tạo bài mà request không gửi rõ `contentGoal`

Kỳ vọng:
- hệ thống tự derive/fallback
- DB vẫn có `content_goal` hợp lệ

## Kết quả sau khi sửa
Luồng tạo nội dung thủ công sẽ không còn bị fail ở bước lưu dữ liệu. Nội dung tạo xong sẽ được persist thành công vào `multi_channel_contents`, thay vì dừng ở 95% do thiếu `content_goal`.
