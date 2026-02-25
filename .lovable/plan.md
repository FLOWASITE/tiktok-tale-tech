
Mấu chốt bạn gặp là đúng: luồng chat hiện tại **không đi qua Core Content pipeline** như flow “Tạo nội dung đa kênh”.

## Chẩn đoán chính xác từ code + log

1. **Chat chỉ gọi `generate_multichannel` trực tiếp**
   - `content-agent` hiện ép gọi `generate_multichannel` ngay.
   - `tool-definitions` không có tool `generate_core_content` cho agent dùng.
   - Log gần nhất xác nhận payload chỉ có `topic/channels/content_goal/journey_stage/content_angle`, không có `coreContentId`.

2. **Bằng chứng dữ liệu cho thấy Core Content chưa được dùng trong bản ghi đa kênh**
   - `multi_channel_contents` gần nhất đều có `core_content_id = null`, `content_role = null`.
   - Query tổng cho thấy `with_core = 0`, `with_role = 0`.

3. **Một điểm gây “success giả” vẫn còn tồn tại**
   - `agent-base.ts` đã gửi `success/error` vào tool message cho model, nhưng hàm `executeAgent` vẫn có thể trả `success: true` dù tool tạo nội dung fail (vì không có guard fail-fast ở tầng agent result).

4. **Ràng buộc status Core Content có thể làm rơi về topic-mode**
   - `generate-multichannel` chỉ load Core Content khi `status = 'approved'`.
   - Trong flow wizard, Core Content mới tạo thường là `draft`; nếu áp logic cứng này thì dễ fallback về topic-based generation.

## Cách xử lý dứt điểm (theo đúng tinh thần flow Create Multi-channel)

### 1) Buộc chat dùng quy trình 2 bước: Core Content → Transform đa kênh
- **File:** `supabase/functions/_shared/tool-executor.ts`
- Nâng `executeGenerateMultichannel` thành orchestration pipeline:
  1. Gọi `generate-core-content` trước (với topic, goal, angle, role, org, brand, audience nếu có)
  2. Lấy `coreContentId` từ kết quả
  3. Gọi `generate-multichannel` với `coreContentId` + `contentRole` + các tham số chiến lược
- Trả về result gộp (có `core_content_id`, `multichannel_content_id`, summary 2 bước) để chat hiển thị rõ đã đi đúng pipeline.

### 2) Mở rộng schema tool để không mất dữ liệu chiến lược của flow chuẩn
- **File:** `supabase/functions/_shared/tool-definitions.ts`
- Thêm/chuẩn hóa các tham số cho `generate_multichannel`:
  - `content_role` (seed/sprout/harvest)
  - `target_audience` (optional)
  - giữ `journey_stage`, `content_angle`, `auto_research`
- Đảm bảo mô tả tool ghi rõ: “luồng này tạo Core Content trước rồi mới transform”.

### 3) Sửa prompt Content Agent để tuân thủ quy trình mới
- **File:** `supabase/functions/_shared/agents/content-agent.ts`
- Cập nhật quy tắc:
  - Khi user yêu cầu tạo nội dung đa kênh, **phải dùng flow Core Content trước**
  - Luôn xác định `content_role` (từ goal/angle/journey) trước khi tạo
  - Kết quả trả về nêu rõ 2 giai đoạn đã chạy.

### 4) Chặn thành công giả ở Agent layer
- **File:** `supabase/functions/_shared/agents/agent-base.ts`
- Thêm guard:
  - Nếu tool tạo nội dung chính (`generate_multichannel`, `generate_script`, `generate_carousel`) thất bại và không có phương án thành công thay thế → trả `success: false` cho agent.
- Mục tiêu: supervisor không đi tiếp như “đã hoàn tất” khi thực tế pipeline fail.

### 5) Đồng bộ logic Core Content status để tránh fallback sai
- **File:** `supabase/functions/generate-multichannel/index.ts`
- Khi nhận `coreContentId`:
  - Cho phép dùng Core Content cùng tổ chức theo quy tắc an toàn (không chỉ mỗi `approved` cứng), hoặc thêm logic ưu tiên nguồn vừa tạo trong pipeline chat.
- Vẫn giữ kiểm tra membership/org để đảm bảo an toàn dữ liệu.

## Kết quả sau khi áp dụng

- Chat sẽ tạo nội dung đúng chuỗi:
  1) sinh Core Content
  2) transform sang đa kênh từ Core Content đó
- `multi_channel_contents` sẽ có:
  - `core_content_id` khác null
  - `content_role` khác null
- `/core-content` và `/multichannel` liên kết đúng như flow chuẩn, không còn cảm giác “Core Content bị bỏ qua”.

## Kế hoạch kiểm thử bắt buộc (E2E)

1. Gửi trong chat: “Tạo nội dung đa kênh cho hôm nay”.
2. Kiểm tra log phải có cả 2 bước: gọi `generate-core-content` rồi `generate-multichannel`.
3. Kiểm tra DB:
   - có bản ghi mới trong `core_contents`
   - bản ghi mới trong `multi_channel_contents` có `core_content_id` trỏ đúng sang bản ghi trên và có `content_role`.
4. Vào `/core-content`: thấy bản ghi mới.
5. Vào `/multichannel`: thấy nội dung mới và liên kết đúng Core Content.
6. Test lại trên mobile + desktop để xác nhận không lệch flow.

## Ghi chú thêm

- Cảnh báo console về `ref` trong `CoreContentCard/Badge` là vấn đề UI riêng, không phải nguyên nhân “Core Content không được sử dụng”. Có thể xử lý ở task riêng sau khi fix pipeline xong.
