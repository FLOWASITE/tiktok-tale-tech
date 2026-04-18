

## Câu hỏi cốt lõi
Cùng provider GeminiGen, tại sao **Đa kênh tạo ảnh OK** mà **Carousel fail**?

## Điều tra

Logs xác nhận:
- `generate-brand-image` (đa kênh): chạy 92s, status 200, có ảnh trả về (URL R2 cloudflarestorage). GeminiGen poll 20 attempts cũng tới đích.
- `generate-carousel-image` / `generate-carousel-images-batch`: GeminiGen timeout 60s → PoYo `402 insufficient credits` → Gateway `402 Not enough credits` → fail toàn bộ.

Khác biệt mấu chốt giữa 2 luồng:

| | Đa kênh (`generate-brand-image`) | Carousel (`generate-carousel-image`) |
|---|---|---|
| GeminiGen poll budget | ~90s+ (chạy được tới attempt 20+ mới ra ảnh) | **60s cứng** → timeout sớm |
| Số ảnh / request | 1 ảnh | 5-10 ảnh tuần tự, mỗi slide 1 request |
| Fallback chain | GeminiGen → PoYo → Gateway | Giống nhau |
| Áp lực rate | Thấp | Cao (gọi liên tiếp 5-10 lần) |

## Nguyên nhân thật

1. **GeminiGen luôn cần ~80-90s để render xong** (xác nhận từ log đa kênh: 92s mới done). Carousel cắt ở 60s nên **chưa bao giờ kịp lấy ảnh từ GeminiGen** → luôn rơi sang PoYo.
2. PoYo và Gateway hiện đều **hết credits (402)** → fail toàn bộ slide carousel.
3. Đa kênh "may mắn" vì GeminiGen kịp trả ảnh trong 92s, không cần fallback nên không gặp 402.
4. Đa kênh chỉ tạo 1 ảnh/lần nên dù chậm vẫn lọt; carousel tạo nhiều slide tuần tự, mỗi slide đều bị cắt sớm.

→ Đây **không phải lỗi GeminiGen**. Là lỗi **poll budget của carousel quá ngắn** + **PoYo/Gateway hết credits**.

## Kế hoạch sửa

### 1. Đồng bộ poll budget GeminiGen cho carousel
- Trong `generate-carousel-image`, nâng GeminiGen timeout từ 60s → **100-110s** (giống đa kênh).
- Vẫn nằm dưới giới hạn 150s edge function.
- Bỏ PoYo fallback hoặc rút gọn để tránh đốt thêm thời gian khi đã hết credits.

### 2. Detect và short-circuit khi hết credits
- Khi PoYo/Gateway trả 402, **dừng ngay toàn bộ batch** thay vì retry từng slide.
- Đánh dấu task `failed` với message rõ "Hết credits provider — vui lòng nạp PoYo/Lovable AI".

### 3. Persist từng slide thành công (không all-or-nothing)
- Trong batch loop, slide nào ra ảnh thì insert vào `carousel_images` ngay.
- Nếu slide 3/7 fail vì 402, vẫn giữ slide 1-2 đã tạo.

### 4. Hiển thị lỗi credits ở UI
- `useCarouselImages` / tracker đọc `error_message` từ `generation_tasks` và toast rõ "Provider hết credits" thay vì im lặng.

## Files dự kiến đụng
- `supabase/functions/generate-carousel-image/index.ts` — nâng poll budget GeminiGen, fail-fast 402
- `supabase/functions/generate-carousel-images-batch/index.ts` — short-circuit batch khi gặp 402, persist từng slide
- `supabase/functions/_shared/geminigen-image-generator.ts` — cho phép truyền `maxAttempts` từ caller
- `src/hooks/useImageGeneration.ts` — surface lỗi 402 rõ hơn

## Kết quả mong đợi
- Carousel dùng GeminiGen có cơ hội thành công như đa kênh (cùng poll budget).
- Khi provider hết credits, fail nhanh + báo rõ thay vì treo + đốt thêm token.
- Slide nào tạo xong vẫn lưu, không mất sạch.

