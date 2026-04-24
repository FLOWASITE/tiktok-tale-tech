

## Kết luận: bài đa kênh vừa tạo KHÔNG thật sự lỗi

Bài `34580c54-50df-4f46-952a-51bf3d129650` ("Personalization at Scale với AI") đã được:
- Generate xong qua DashScope (`qwen-plus`)
- Self-Critique chấm 88/100 tier `GOOD`, refined 1 lần, `passed: true`
- Lưu thành công vào `multi_channel_contents` với status `approved`
- Task `73b204db` đã `completed` với `result_id` đúng

Nhưng UI lại hiện "lỗi nội dung". Có 3 nguyên nhân chồng lên nhau:

### 1. Length-validation report `compliance=fail, score=67/100`
- `facebook_content` = 1067 ký tự, `instagram_content` = 656 ký tự
- Vượt ngưỡng "ideal length" cho Facebook (~500) và Instagram (~300)
- Đây chỉ là **soft warning** về độ dài, không phải lỗi compliance thật (compliance-precheck báo `risk=low, issues=0`, forbidden words = 0)
- Nhưng frontend đang đọc field này và hiển thị thành "lỗi nội dung"

### 2. Quick-suggestions hook spam lỗi nền
- `useHookAI.quickSuggestions` đang fail liên tục (~30 lần/30s) do Lovable Gateway 402 "Not enough credits" trên `evaluate-hook` (`google/gemini-2.5-flash-lite`)
- Circuit breaker đã `OPEN` cho model này
- Tuy đã `silent` ở console, vẫn có thể đẩy state lỗi vào UI hoặc làm user hiểu nhầm

### 3. Critique trả về `severity: error` cho CTA
- Trong `critique_details.issues` có 1 item `severity: error` về CTA chưa đủ cụ thể
- Nếu UI render `severity=error` thành banner đỏ → user thấy "có lỗi" dù `passed: true` và `needs_manual_review: false`

## Hướng xử lý

### A. Phân biệt "warning chất lượng" vs "lỗi tạo nội dung"
- File: `src/pages/MultiChannelCreate.tsx`, `src/components/multichannel/CreatePreviewPanel.tsx`
- Chỉ hiển thị "lỗi" khi:
  - `status` của task = `failed`
  - hoặc generation throw thật
- Với `length-validation fail` + `critique severity=error` mà `passed=true`:
  - đổi thành badge vàng "Gợi ý cải thiện" thay vì đỏ "Lỗi"
  - kèm tooltip nêu rõ vấn đề (ví dụ "FB dài hơn khuyến nghị")

### B. Fix length-validation cho ngữ cảnh thật
- File: `supabase/functions/generate-multichannel/index.ts` (phần `length-validation`)
- Hiện đang chấm `compliance=fail` quá nghiêm với bài longform (Facebook 1000+ chars vẫn hợp lệ)
- Đổi:
  - `fail` chỉ khi vượt **hard limit** của platform (FB: 63k, IG caption: 2200)
  - `warn` khi vượt ideal range
- Không gộp length warning vào field `compliance` để tránh frontend hiểu nhầm thành compliance fail

### C. Tách critique error thật vs gợi ý
- File: `supabase/functions/_shared/self-critique.ts` (hoặc tương đương)
- Quy ước:
  - `severity: error` chỉ dùng cho violation compliance/forbidden words/missing CTA hoàn toàn
  - Issue về "CTA chưa đủ cụ thể" → `severity: warning`
- Tránh case bài `passed=true, score=88` mà vẫn có `severity: error` gây nhiễu UI

### D. Dập tắt quick-suggestions storm
- File: `src/hooks/ai/useHookAI.ts`
- Khi `evaluate-hook` fail liên tục >3 lần (402/circuit-open):
  - tạm dừng auto retry trong 5 phút
  - không log warning mỗi lần nữa
- File: `supabase/functions/generate-hooks/index.ts` (đoạn evaluate)
- Khi circuit breaker `OPEN` cho `gemini-2.5-flash-lite`:
  - skip evaluate, trả hooks không kèm score
  - không gọi lại Lovable Gateway nữa cho tới khi breaker `HALF_OPEN`

### E. Hiển thị critique đúng tier
- File: `src/components/multichannel/CreatePreviewPanel.tsx`
- Với content có `critique_score >= 80` và `passed=true`:
  - badge xanh "Đạt chất lượng (88/100 — GOOD)"
  - các issue gom vào panel "Gợi ý tối ưu" có thể thu gọn
- Không bao giờ render đỏ khi `passed=true` và `needs_manual_review=false`

## File cần sửa

- `src/pages/MultiChannelCreate.tsx`
- `src/components/multichannel/CreatePreviewPanel.tsx`
- `src/hooks/ai/useHookAI.ts`
- `supabase/functions/generate-multichannel/index.ts` (length-validation block)
- `supabase/functions/_shared/self-critique.ts` (severity rules)
- `supabase/functions/generate-hooks/index.ts` (skip evaluate khi breaker OPEN)

## Tiêu chí nghiệm thu

- Bài `34580c54...` hiển thị badge xanh "Đạt 88/100 GOOD", không còn nhãn "lỗi nội dung"
- Length warning chỉ là badge vàng tooltip, không gọi là "compliance fail"
- Console không còn spam `[useHookAI.quickSuggestions] Auxiliary hook request failed`
- Nếu bài thật sự fail (task.status=failed) thì mới hiện banner đỏ
- Critique `severity=error` chỉ xuất hiện khi có vi phạm compliance thật

