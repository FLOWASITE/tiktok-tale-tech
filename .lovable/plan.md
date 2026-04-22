
# Sửa dứt điểm lỗi còn sót của luồng tạo nội dung đa kênh thủ công

## Kết luận hiện tại
Lỗi vẫn đang là:

```text
Could not find the 'content_angle' column of 'multi_channel_contents' in the schema cache
```

Điểm quan trọng:

- schema thật của `multi_channel_contents` không có `content_angle`
- log runtime mới nhất của `generate-multichannel` vẫn đang báo `PGRST204` với `content_angle`
- nhưng file code hiện tại đọc được lại không còn insert `content_angle` ở 2 block create chính

Điều này cho thấy cần xử lý theo hướng:
- hoặc vẫn còn một payload/persistence path khác đang lén đẩy `content_angle`
- hoặc function đang chạy chưa khớp với code hiện tại

## Mục tiêu
Đảm bảo mọi thao tác ghi vào `multi_channel_contents` chỉ dùng các cột có thật trong schema, và runtime thực tế phải khớp với code đã sửa.

## Cách triển khai

### 1) Audit toàn bộ đường ghi `multi_channel_contents`
Rà lại trong `supabase/functions/generate-multichannel/index.ts` tất cả nhánh sau:

- streaming create
- non-streaming create
- expand
- regenerate
- background/disconnect persistence
- mọi helper/object spread/build payload trung gian

Trọng tâm là tìm các trường hợp kiểu:

- object được build ở chỗ khác rồi spread vào `.insert()` / `.update()`
- helper trả về metadata có `content_angle`
- path chạy sau khi client disconnect vẫn dùng payload cũ

### 2) Tách hẳn “AI strategy metadata” khỏi “DB persistence payload”
Giữ `resolvedContentAngle` cho:

- prompt building
- strategy validation
- critique context
- logging nội bộ

Nhưng khi ghi DB, chỉ dùng whitelist cột hợp lệ như:

- `content_goal`
- `content_role`
- `selected_channels`
- các cột nội dung theo kênh
- các metadata khác đang có thật trong schema

### 3) Tạo một helper whitelist payload an toàn cho `multi_channel_contents`
Thay vì tự viết object insert/update rải rác, gom về 1 helper nội bộ trong cùng file, ví dụ theo vai trò:

- `buildMultiChannelCreatePayload(...)`
- `buildMultiChannelUpdatePayload(...)`

Helper này chỉ được phép trả về các field có thật trong schema hiện tại. Như vậy kể cả sau này `resolveStrategy()` có thêm field mới thì cũng không vô tình bị ghi xuống DB.

### 4) Chuẩn hóa lại các path create/update dùng chung helper đó
Áp dụng cùng chuẩn cho:

- streaming create
- non-streaming create
- expand update
- regenerate update nếu có chạm `multi_channel_contents`

Riêng create path phải luôn có tối thiểu:

- `content_goal`
- `selected_channels`
- `content_role` nếu resolve được

Không bao giờ ghi `content_angle` khi bảng chưa có cột này.

### 5) Kiểm tra và đồng bộ runtime đang chạy với code thực tế
Vì log runtime vẫn còn `content_angle` nhưng file hiện tại không còn ở 2 block create chính, cần xác nhận triển khai thực tế:

- function active đã nhận đúng bản code mới chưa
- có lỗi deploy/bundle nào khiến runtime vẫn dùng bản cũ không
- nếu có drift, cần redeploy đúng bản sửa hiện tại

### 6) QA sau khi sửa
Thực hiện lại các case sau:

#### Case 1 — Manual multi-channel
Tạo bài thủ công 2–3 kênh.

Kỳ vọng:
- không còn `PGRST204`
- row `multi_channel_contents` được tạo thành công

#### Case 2 — Streaming path
Chạy đúng luồng đang fail ở ~95%.

Kỳ vọng:
- không fail ở bước lưu
- task có `result_id`

#### Case 3 — Non-streaming path
Tạo bài không stream.

Kỳ vọng:
- không regression
- `content_goal`, `content_role`, `selected_channels` được lưu đúng

#### Case 4 — Task/log verification
Kiểm tra:

- `generation_tasks` không còn error_message chứa `content_angle`
- log `generate-multichannel` không còn `PGRST204` với `multi_channel_contents`

## Files cần sửa
- `supabase/functions/generate-multichannel/index.ts`

## Không cần sửa
- database schema
- migration
- frontend form
- `src/integrations/supabase/types.ts`

## Technical notes
Schema hiện tại của `multi_channel_contents` có:

- `content_goal`
- `content_role`
- `selected_channels`

và không có:

- `content_angle`

Vì vậy fix đúng là khóa chặt payload ghi DB theo schema thật, thay vì tiếp tục để strategy metadata đi thẳng xuống persistence layer.

## Kết quả mong muốn
Sau khi làm xong:

- tạo nội dung đa kênh thủ công không còn fail ở bước lưu
- streaming và non-streaming cùng dùng payload DB-safe
- không còn lặp lại bug kiểu “code thêm field mới nhưng schema chưa có”
