
## Hiểu yêu cầu
User chỉ vào nút **"Tạo ảnh với Gemini"** trong khung Prompts của carousel viewer. Hiện tại nút này tạo ảnh **đơn lẻ cho 1 slide** — có thể đang dùng model/provider khác với batch "Tạo carousel" tổng. User muốn **đồng bộ**: nút này phải xài **cùng model + provider** với luồng tạo carousel hàng loạt (hiện đang là `geminigen/nano-banana-2` qua provider GeminiGen.ai).

## Điều tra cần làm
1. Tìm component render nút "Tạo ảnh với Gemini" (search "Tạo ảnh với Gemini").
2. Xem nó đang gọi edge function nào, truyền model gì.
3. So sánh với luồng batch `generate-carousel-images-batch` → `generate-carousel-image` để biết model/provider chuẩn.
4. Đồng bộ: nút đơn lẻ phải truyền cùng `aiTool`/model resolution như batch.

## Giả thuyết nguồn lệch
- Nút này có thể hard-code `model: 'google/gemini-2.5-flash-image'` (Lovable Gateway) thay vì để edge function tự resolve sang `geminigen/nano-banana-2` từ `ai_config`.
- Hoặc gọi thẳng `generate-carousel-image` nhưng không truyền `carouselId` đầy đủ → resolver fallback sang Gateway.

## Kế hoạch sửa
1. **Tìm & xác minh**: Đọc component có nút "Tạo ảnh với Gemini" + handler.
2. **Đồng bộ payload**: Đảm bảo handler gọi `generate-carousel-image` với **cùng body shape** như batch loop:
   - `carouselId`, `slideNumber`, `textContent`, `platform`, `brandColors`, `carouselStyle`, `visualPreset`, `carouselTopic`, `previousImageUrl`, `seamlessContext`.
   - Không hard-code model — để edge function resolve theo `ai_config` (đang là `geminigen/nano-banana-2`).
3. **Đổi label nếu cần**: "Tạo ảnh với Gemini" → giữ nguyên hoặc đổi thành "Tạo ảnh" để khỏi gây hiểu nhầm provider.
4. **Verify**: Bấm nút → log `generate-carousel-image` phải hiện `Routing to GeminiGen.ai: geminigen/nano-banana-2` giống batch.

## Files dự kiến đụng
- Component carousel viewer chứa nút "Tạo ảnh với Gemini" (cần search xác định, có thể `src/components/carousel/CarouselSlideViewer.tsx` hoặc `CarouselPromptCard.tsx`)
- Handler tạo ảnh đơn slide — đảm bảo dùng cùng `useImageGeneration.generateImage()` với đầy đủ options như batch

## Kết quả mong đợi
- Nút "Tạo ảnh với Gemini" gọi cùng provider GeminiGen + model `nano-banana-2` như batch.
- Logs giống nhau giữa 2 luồng.
- Khi GeminiGen 503/hết credit, cùng fallback chain (PoYo → Gateway).
