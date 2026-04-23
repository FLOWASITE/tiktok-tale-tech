
Mục tiêu: xác định đúng nguyên nhân tạo ảnh bị lỗi và sửa để flow không chết ở bước generate ảnh chính.

1. Nguyên nhân chính đã thấy từ code + logs
- Lỗi không nằm ở `overlay-logo-canvas` hay `overlay-text-canvas`.
- Điểm hỏng chính là `generate-brand-image`.
- Edge logs đang báo rất rõ:
  - `GeminiGen.ai failed: GeminiGen generation timeout after 60s`
- File gây ra timeout:
  - `supabase/functions/_shared/geminigen-image-generator.ts`
  - hiện `pollTask(..., maxAttempts = 20)` với `pollInterval = 3000`
  - tức chỉ chờ tối đa `60s`
- Trong khi ảnh thực tế của flow này thường lâu hơn, nhất là nhánh `ai_render` có prompt dài + structured instructions.
- Hệ quả:
  - `generate-brand-image` fail ở provider chính
  - frontend nhận lỗi kiểu chung chung (`network error` / `Failed to fetch`) nên nhìn như lỗi mạng, nhưng gốc là timeout provider

2. Vì sao UI đang báo lỗi mơ hồ
- `src/lib/invokeEdgeFunctionWithTimeout.ts` chỉ bọc fetch trực tiếp và trả `Error(...)` rất generic.
- Khi function fail hoặc mạng đứt giữa chừng, UI chỉ thấy:
  - `Failed to fetch`
  - `network error`
- Hook `src/hooks/useAutoImageGeneration.ts` hiện ném lỗi Step 1 ngay khi `generate-brand-image` fail, nên toàn pipeline dừng trước khi kịp tới fallback canvas.

3. Việc cần sửa ở backend để hết lỗi gốc
- File: `supabase/functions/_shared/geminigen-image-generator.ts`
- Tăng polling budget cho GeminiGen:
  - nâng `maxAttempts` mặc định từ `20` lên mức phù hợp hơn cho flow article image, ví dụ `30-33`
  - vẫn giữ `pollInterval = 3000`
- Mục tiêu:
  - tăng cửa sổ chờ từ `60s` lên `90-99s`
  - khớp với comment trong file đang nói chính `generate-brand-image` cần ~80-90s
- Đồng thời log rõ hơn:
  - model
  - uuid
  - số lần poll
  - tổng thời gian trước timeout

4. Đồng bộ `generate-brand-image` để gọi GeminiGen với budget đúng
- File: `supabase/functions/generate-brand-image/index.ts`
- Ở nhánh:
  - `isGeminiGenModel(primaryModel)`
- Sửa call:
  - truyền `maxAttempts` tường minh vào `generateImageViaGeminiGen(...)`
- Khuyến nghị:
  - với `ai_render` + `structuredElements` hoặc `textToInclude`, cho budget cao hơn
  - với ảnh nền đơn giản thì có thể giữ thấp hơn nếu muốn
- Kết quả:
  - không phụ thuộc default ngầm
  - dễ tune theo mode ảnh

5. Giữ fallback provider nhưng phân loại lỗi tốt hơn
- File: `supabase/functions/generate-brand-image/index.ts`
- Hiện sau khi GeminiGen timeout có fallback sang PoYo.
- Cần giữ fallback này, nhưng chuẩn hóa payload trả về để frontend biết:
  - provider nào timeout
  - đã fallback hay chưa
  - fallback có fail tiếp không
- Thêm metadata response khi success/fail:
  - `provider`
  - `providerTimeout: boolean`
  - `fallbackTried: boolean`
  - `fallbackProvider`
  - `errorCode`
- Mục tiêu:
  - debug timeline và UI biết chính xác hỏng ở provider nào

6. Sửa frontend để hiện đúng lỗi thay vì “network error”
- File: `src/lib/invokeEdgeFunctionWithTimeout.ts`
- Cần cải thiện phần lỗi fetch:
  - nếu fetch ném lỗi, trả lỗi có `cause/context` rõ hơn
  - preserve status/body khi có response lỗi
- File: `src/hooks/useAutoImageGeneration.ts`
- Ở Step 1:
  - log thêm provider metadata từ backend
  - nếu fail do timeout/provider error, toast phải nói đúng:
    - timeout provider tạo ảnh
    - fallback provider thất bại
    - hay lỗi mạng thật
- Mục tiêu:
  - user không còn nhìn thấy lỗi giả dạng “mạng” trong khi thực tế là provider timeout

7. Tích hợp nguyên nhân này vào Render Debug Timeline
- File: `src/hooks/useAutoImageGeneration.ts`
- File: `src/components/ui/RenderDebugTimeline.tsx`
- Bổ sung step details cho STEP 1:
  - provider chính
  - timeout hay không
  - fallback provider có chạy hay không
  - lý do Step 1 fail nếu fail
- Nếu ảnh fail hoàn toàn:
  - vẫn nên lưu `renderDebug` tạm cho channel lỗi để timeline/debug panel còn xem được nguyên nhân
- Mục tiêu:
  - bấm vào ảnh hoặc trạng thái lỗi là thấy ngay:
```text
STEP 1 — GeminiGen timeout after 60s
fallback to PoYo — failed/succeeded
STEP 2/3/4 — skipped because base image missing
```

8. Kiểm tra secondary issue đang gây nhiễu
- Console còn có warning accessibility:
  - `DialogContent requires a DialogTitle`
  - `Missing Description`
- Đây không phải nguyên nhân ảnh fail.
- Có thể sửa riêng sau, nhưng không ưu tiên cho bug hiện tại.

9. File cần sửa
- `supabase/functions/_shared/geminigen-image-generator.ts`
- `supabase/functions/generate-brand-image/index.ts`
- `src/lib/invokeEdgeFunctionWithTimeout.ts`
- `src/hooks/useAutoImageGeneration.ts`
- `src/components/ui/RenderDebugTimeline.tsx`

10. Tiêu chí nghiệm thu
- Tạo ảnh không còn fail sớm ở mốc 60s khi dùng GeminiGen.
- Nếu provider chính chậm:
  - hoặc chờ đủ và thành công
  - hoặc fallback provider chạy rõ ràng
- UI không còn chỉ báo `network error` cho case timeout provider.
- Render Debug Timeline hiển thị được:
  - provider chính
  - timeout/fallback reason
  - step nào đã chạy / bị skip
- Khi bug tái diễn, có thể nhìn timeline để biết chính xác:
```text
provider timeout
hay fallback provider fail
hay overlay fail
```
