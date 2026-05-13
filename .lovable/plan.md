## Kết luận kiểm tra lại

Carousel không tạo ảnh vì **luồng ảnh đang bị ép chạy qua Lovable AI Gateway**, không phải GeminiGen:

1. `generation_tasks` gần nhất `8ea25682-5d0d-4048-84b5-536361150252` failed:
   - `status = failed`
   - `successCount = 0`, `failCount = 6`
   - slide 1 lỗi: `Đã hết credits AI. Vui lòng nâng cấp.`
   - slide 2-6 bị skip vì batch thấy `CREDITS_EXHAUSTED`

2. Log function xác nhận:
   - `carousel-creative-direction` gọi `google/gemini-2.5-flash` qua Lovable Gateway và bị `402 Not enough credits`
   - `generate-carousel-image` log:
     - `resolved model=geminigen/nano-banana-pro`
     - nhưng sau đó: `visualPreset='minimalist' is editorial → bypass geminigen/nano-banana-pro → google/gemini-3.1-flash-image-preview`
     - rồi Gateway trả `402 Not enough credits`

3. Root cause trong code:
   - `generate-carousel-image/index.ts` dòng 738-752 có rule `editorialPresets` gồm `minimalist`
   - nếu preset là `minimalist`, code set `forceLovableGateway = true`
   - kết quả: dù admin config đang đặt `generate-carousel-image = geminigen/nano-banana-pro`, nó vẫn bị bypass sang Lovable AI

4. Có thêm lỗi phụ:
   - `carousel-creative-direction` vẫn dùng Lovable Gateway text model; tuy fail-soft không làm hỏng batch, nhưng vẫn tạo log 402 và gây nhiễu.
   - `generate-carousel-images-batch` còn 2 call phụ `extract-carousel-palette` và `extract-carousel-lexicon` cũng dùng Lovable Gateway nếu slide 1 tạo thành công.

## Plan sửa

### 1. Không ép preset `minimalist` sang Lovable Gateway nữa
- Trong `generate-carousel-image`, bỏ hoặc đổi rule `editorialPresets` để **không force Gateway khi requested model là external provider** (`geminigen/*`, `poyo/*`, `kie/*`).
- Nếu admin đã chọn `geminigen/nano-banana-pro`, phải ưu tiên GeminiGen đúng như cấu hình.

### 2. Chặn fallback sang Lovable Gateway khi provider riêng còn được cấu hình
- Khi `requestedModel` là `geminigen/*` và GeminiGen lỗi non-credit:
  - thử fallback provider riêng theo cấu hình hiện có nếu có (`PoYo` nếu key/circuit cho phép)
  - nếu không có fallback riêng, trả lỗi provider thật thay vì rơi xuống Lovable Gateway.
- Khi Gateway hết credit, message phải ghi rõ là **Lovable AI Gateway hết credit**, không nói chung chung “provider ảnh”.

### 3. Tắt Lovable AI cho các bước phụ carousel image
- `carousel-creative-direction`: nếu không có provider override ngoài Lovable, fail-soft ngay hoặc route qua provider text riêng đã có (`DashScope/Qwen`) thay vì Gateway.
- `extract-carousel-palette` và `extract-carousel-lexicon`: không được gọi Lovable Gateway khi Gateway đang hết credit; nếu chưa có provider vision riêng thì skip an toàn, không làm fail batch.

### 4. Giữ telemetry rõ ràng
- Log rõ `requestedModel`, `effectiveProvider`, `fallbackReason`, `gatewayBypassed` để lần sau nhìn `ai_metrics`/logs biết ngay ảnh chạy qua GeminiGen hay Gateway.

### 5. Validate sau khi sửa
- Deploy/test 2 function liên quan:
  - `generate-carousel-image`
  - `generate-carousel-images-batch`
- Chạy thử bằng request carousel gần nhất, kỳ vọng log phải có:
  - `Routing to GeminiGen.ai: geminigen/nano-banana-pro`
  - không còn `LAYER 5 ... bypass ... google/gemini-3.1-flash-image-preview`
  - không còn `Background gen error: 402 Not enough credits` từ Lovable Gateway