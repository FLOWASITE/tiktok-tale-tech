
# Sửa dứt điểm lỗi “không tạo được nội dung đa kênh thủ công”

## Vấn đề đã xác định
Luồng tạo nội dung hiện không còn fail vì thiếu `content_goal` nữa, mà đang fail ở bước lưu DB với lỗi mới:

```text
Could not find the 'content_angle' column of 'multi_channel_contents' in the schema cache
```

## Nguyên nhân gốc
Trong `supabase/functions/generate-multichannel/index.ts` đã có thay đổi mới để insert:

- `content_goal`
- `content_angle`
- `content_role`
- `selected_channels`

Nhưng schema thật của bảng `multi_channel_contents` hiện chỉ có:

- `content_goal`
- `content_role`
- `selected_channels`

và **không có `content_angle`**.

Dấu hiệu xác nhận:
- log của `generate-multichannel` báo lỗi `PGRST204` với `content_angle`
- `src/integrations/supabase/types.ts` của `multi_channel_contents` không có field `content_angle`
- migration hiện có chỉ thêm `content_role`, không có migration nào thêm `content_angle` cho bảng này

## Hướng sửa đúng
Không đụng DB ngay. Sửa function để:
- vẫn resolve `content_angle` cho prompt/AI logic nội bộ nếu cần
- nhưng **không ghi `content_angle` vào `multi_channel_contents`**

Đây là cách an toàn nhất vì:
- khớp với schema thật đang chạy
- không cần migration mới
- giải quyết trực tiếp lỗi đang chặn tạo nội dung thủ công

## Cách triển khai

### 1) Gỡ `content_angle` khỏi mọi payload ghi vào `multi_channel_contents`
Trong `supabase/functions/generate-multichannel/index.ts`:

#### Streaming create path
Ở block insert `multi_channel_contents` quanh đoạn `3337+`:
- giữ:
  - `content_goal: resolvedContentGoal`
  - `content_role: resolvedContentRole`
  - `selected_channels: resolvedSelectedChannels`
- bỏ:
  - `content_angle: resolvedContentAngle`

#### Non-streaming create path
Ở block insert quanh đoạn `5305+`:
- giữ:
  - `content_goal`
  - `content_role`
  - `selected_channels`
- bỏ:
  - `content_angle`

### 2) Giữ `resolveStrategy()` nhưng chỉ dùng `content_angle` cho generation logic
Hàm `resolveStrategy(formData)` vẫn nên giữ:
- `resolvedContentGoal`
- `resolvedContentAngle`
- `resolvedContentRole`
- `resolvedSelectedChannels`

Nhưng dùng như sau:
- `resolvedContentGoal` + `resolvedContentRole` + `resolvedSelectedChannels` để persist DB
- `resolvedContentAngle` chỉ dùng cho:
  - prompt building
  - strategy validation
  - AI generation / critique context
  - logging nội bộ nếu cần

### 3) Rà lại toàn file để không còn chỗ nào ghi `content_angle` vào `multi_channel_contents`
Kiểm tra toàn bộ các luồng:
- create
- streaming create
- expand
- regenerate
- dedup return path
- any update payload liên quan

Mục tiêu:
- không còn `.insert()` / `.update()` nào trên `multi_channel_contents` chứa `content_angle`

### 4) Chuẩn hóa metadata tối thiểu cần persist
Để tránh lặp bug kiểu cũ, mọi create path của `multi_channel_contents` phải luôn có ít nhất:
- `content_goal`
- `content_role` nếu resolve được
- `selected_channels`

Không ép lưu `content_angle` nếu bảng không có cột này.

## Files cần sửa
- `supabase/functions/generate-multichannel/index.ts`

## Không cần sửa
- database schema
- migration
- frontend form
- Telegram webhook
- `src/integrations/supabase/types.ts`

## QA sau khi implement

### Case 1 — Manual single-channel
Tạo 1 bài thủ công với 1 kênh.

Kỳ vọng:
- không còn lỗi `content_angle`
- row được tạo thành công

### Case 2 — Manual multi-channel
Tạo 2–3 kênh.

Kỳ vọng:
- lưu được `multi_channel_contents`
- `content_goal`, `content_role`, `selected_channels` hợp lệ

### Case 3 — Streaming path
Chạy đúng luồng đang fail ở 90–95%.

Kỳ vọng:
- không fail ở bước persistence
- task hoàn tất và trả content id

### Case 4 — Non-streaming path
Chạy luồng không stream.

Kỳ vọng:
- không regression
- vẫn lưu được bình thường

### Case 5 — Missing strategy from request
Tạo bài không gửi rõ `contentGoal`.

Kỳ vọng:
- hệ thống tự resolve fallback
- DB vẫn lưu được vì có `content_goal`

## Kết quả sau khi sửa
Tạo nội dung đa kênh thủ công sẽ hoạt động lại bình thường. Function vẫn dùng được `content_angle` trong phần AI/strategy, nhưng sẽ không còn ghi vào bảng `multi_channel_contents` khi schema hiện tại không hỗ trợ cột đó.
