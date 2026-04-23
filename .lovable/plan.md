
Mục tiêu: giảm mạnh lượng text bị nhét lên ảnh, chỉ giữ text ngắn kiểu hook/headline/CTA khi thật sự cần; không dùng toàn bộ channel content làm text overlay nữa.

1. Nguyên nhân gốc cần sửa
- `src/components/multichannel/MultiChannelFormWizard.tsx`
  - auto pipeline đang luôn truyền `imageContentType: 'with_text'`
- `src/hooks/useAutoImagePipeline.ts`
  - `channelTexts` hiện là full nội dung từng kênh
  - hook này lại map trực tiếp full content đó vào:
    - `textsPerChannel`
    - `textToInclude`
- `src/hooks/useAutoImageGeneration.ts`
  - `channelText = textsPerChannel?.[channel] || textToInclude`
  - rồi gửi thẳng vào `generate-brand-image` và fallback canvas
- Hệ quả:
  - AI bị yêu cầu render quá nhiều chữ
  - fallback canvas cũng overlay nguyên đoạn dài
  - ảnh nhìn như poster chữ thay vì visual social graphic

2. Đổi nguyên tắc dữ liệu text cho image pipeline
- Tách rõ 2 loại dữ liệu:
  - `channelContent`: nội dung post đầy đủ, chỉ dùng làm `contentSummary`/bối cảnh
  - `overlayText`: text ngắn để hiện trên ảnh
- Quy tắc mới:
  - ảnh không bao giờ lấy full `channelTexts[channel]` làm `textToInclude`
  - `textToInclude` chỉ được lấy từ nguồn ngắn:
    - `selected_hooks[channel].text_overlay`
    - hoặc `global_hook.text_overlay`
    - hoặc `opening_line`
    - hoặc 1 helper rút gọn headline có giới hạn ký tự

3. Sửa auto pipeline để không ép “with_text” một cách mù quáng
- File: `src/components/multichannel/MultiChannelFormWizard.tsx`
- Thay vì luôn gửi:
  - `imageContentType: 'with_text'`
- Đổi sang logic có điều kiện:
  - nếu có short overlay text đủ tốt thì `with_text`
  - nếu không có thì `background_only`
- Mục tiêu:
  - ảnh auto mặc định thiên về visual sạch
  - chỉ bật text-on-image khi thật sự có hook ngắn đáng để render

4. Thêm helper chuẩn hóa “short overlay text”
- Tạo shared helper mới, ví dụ:
  - `src/lib/imageOverlayText.ts`
- Helper này sẽ:
  - ưu tiên `text_overlay`
  - fallback sang `opening_line`
  - fallback sang headline rút gọn từ content
  - cắt độ dài tối đa, ví dụ 45–70 ký tự
  - loại bỏ markdown, line breaks, emoji dư thừa, CTA dài, danh sách
- Output:
  - `null` nếu không có text ngắn phù hợp
  - text ngắn, 1 ý chính, không phải đoạn văn

5. Sửa `useAutoImagePipeline.ts` để dùng short text thay vì full content
- Hiện tại:
  - `textsPerChannel` lấy từ `channelTexts[channel]`
  - `textToInclude` lấy first non-empty full content
- Cần đổi:
  - `contentSummaries` vẫn dùng full content như hiện tại
  - `textsPerChannel` phải được build từ helper short overlay text
  - `textToInclude` shared chỉ dùng khi mọi channel dùng cùng 1 short hook; nếu không thì để `undefined`
- Đồng thời:
  - nếu không channel nào có short text hợp lệ -> `imageContentType = 'background_only'`
  - `useCanvasFallback` chỉ bật khi có short text thật

6. Sửa `useAutoImageGeneration.ts` để chặn text quá dài trước khi render
- Thêm một lớp guard frontend:
  - nếu `channelText` vượt ngưỡng ký tự / số từ
  - coi như không hợp lệ cho text-on-image
- Áp dụng ở 2 nơi:
  - Step 1: không gửi `textToInclude` dài vào `generate-brand-image`
  - Step 3: không canvas-overlay text dài
- Debug metadata cần thêm:
  - `overlayTextLength`
  - `overlayTextSource`
  - `textSuppressedBecauseTooLong`
- Mục tiêu:
  - kể cả khi upstream truyền nhầm full content, ảnh vẫn không bị spam chữ

7. Giảm prompt ép text trong backend khi text không đạt chuẩn
- File: `supabase/functions/generate-brand-image/index.ts`
- Không cần đổi shared builder toàn cục trước mắt.
- Chỉ cần chuẩn hóa input trước khi build prompt:
  - nếu `textToInclude` quá dài -> bỏ `textToInclude`
  - hoặc tự downgrade sang `background_only`
- Như vậy:
  - prompt builder không còn sinh block `TEXT IN IMAGE (REQUIRED)` với đoạn dài
  - AI không bị ép render paragraph lên ảnh

8. Giữ footer/logo nhưng giảm text chính
- Không tắt footer/logo fallback.
- Phân biệt rõ:
  - footer/contact branding = branding nhỏ, chấp nhận
  - headline/main text = phải ngắn
- Nếu ảnh cần branding:
  - vẫn cho Step 2 logo overlay
  - vẫn cho Step 4 footer overlay
  - nhưng không để Step 1/3 render đoạn nội dung dài
- Mục tiêu:
  - ảnh vẫn có nhận diện thương hiệu
  - nhưng phần chữ chính không còn “quá nhiều”

9. Cập nhật Render Debug Timeline để thấy vì sao text bị giảm/bỏ
- File: `src/components/ui/RenderDebugTimeline.tsx`
- Bổ sung hiển thị:
  - overlay text source: `text_overlay` / `opening_line` / `trimmed_summary` / `suppressed`
  - overlay text length
  - text mode: `with_text` hay `background_only`
  - lý do suppress:
    - `text too long`
    - `no short hook available`
    - `auto downgraded to background_only`
- Mục tiêu:
  - bấm vào ảnh sẽ thấy ngay vì sao ảnh ít chữ hơn hoặc không có chữ

10. File cần sửa
- `src/components/multichannel/MultiChannelFormWizard.tsx`
- `src/hooks/useAutoImagePipeline.ts`
- `src/hooks/useAutoImageGeneration.ts`
- `src/components/ui/RenderDebugTimeline.tsx`
- `supabase/functions/generate-brand-image/index.ts`
- thêm helper mới dùng chung, ví dụ:
  - `src/lib/imageOverlayText.ts`

11. Tiêu chí nghiệm thu
- Auto-generated images không còn lấy full post content làm text trên ảnh.
- Phần text chính trên ảnh chỉ còn:
  - hook ngắn
  - headline ngắn
  - hoặc không có text nếu không đủ điều kiện
- Footer/logo vẫn hoạt động độc lập.
- Debug timeline phải trả lời được:
  - text trên ảnh lấy từ đâu?
  - dài bao nhiêu?
  - có bị suppress vì quá dài không?
  - ảnh đang là `with_text` hay `background_only`?
