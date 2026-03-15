

## Plan: Cách 1 — AI tự render text trong ảnh (bỏ Satori overlay riêng)

### Ý tưởng
Thay vì pipeline 3 bước (Background → Logo → Satori Overlay), gộp structured overlay content vào prompt AI để model tự render text, banner, cards trực tiếp trong ảnh. Pipeline giảm còn 2 bước: **AI Generate (có text) → Logo Overlay**.

### Rủi ro đã biết
- Chữ tiếng Việt (dấu sắc/huyền/hỏi/ngã/nặng) có thể bị sai
- Layout không pixel-perfect như Satori
- Không kiểm soát chính xác vị trí banner/cards
- Mỗi lần sửa text phải tạo lại ảnh từ đầu (~10-15s)

### Cách tiếp cận: Thêm mode mới, không phá mode cũ

Thêm option `overlayMode: 'ai_render' | 'satori'` (default `'satori'`) để user có thể chọn. Khi `ai_render`:

**1. Client — `src/hooks/useAutoImageGeneration.ts`**
- Khi `structuredOverlay` có mặt VÀ `overlayMode === 'ai_render'`:
  - Không force `background_only` — thay vào đó truyền structured overlay data vào body của `generate-brand-image`
  - Skip Step 3 (canvas text) và Step 4 (Satori overlay) hoàn toàn
  - Chỉ giữ Step 2 (logo overlay) sau khi AI generate xong

**2. Edge function — `supabase/functions/generate-brand-image/index.ts`**
- Nhận thêm optional field `structuredElements` trong request body
- Khi có `structuredElements`, append vào prompt AI một đoạn mô tả text layout:
  ```
  IMPORTANT: Render the following text elements DIRECTLY in the image:
  - Top banner bar (red background): "AI & KẾ TOÁN"
  - Large headline (left side): "Giải pháp tự động hóa"
  - 4 info cards (right side, 2x2 grid):
    📉 Giảm 50% chi phí
    🤖 Tự động hóa quy trình
    ...
  - Footer bar (bottom): 📞 0909... | 🌐 website.com
  Text must be crisp, readable, Vietnamese diacritics must be PERFECT.
  ```
- Sử dụng model `google/gemini-3-pro-image-preview` (tốt hơn cho text rendering)

**3. Hàm chuyển đổi structured → prompt text**
- Tạo helper `structuredElementsToPromptText()` trong `generate-brand-image/index.ts`
- Chuyển đổi banner, heroText, cards, headline, cta, footer thành mô tả ngôn ngữ tự nhiên cho AI

**4. UI — `src/components/multichannel/SimpleImageGenerator.tsx`**
- Thêm toggle "AI tự render text" vs "Programmatic overlay" trong advanced options khi hybrid mode bật
- Default vẫn là Satori (safe), user opt-in cho AI render

### Files sẽ chạm
- `src/hooks/useAutoImageGeneration.ts` — thêm `overlayMode` logic, conditional skip overlay steps
- `supabase/functions/generate-brand-image/index.ts` — nhận `structuredElements`, build prompt text
- `src/components/multichannel/SimpleImageGenerator.tsx` — toggle UI cho overlay mode
- `src/lib/hybridImageGenerator.ts` — thêm `overlayMode` vào types (nếu cần)

### Kết quả kỳ vọng
User có thể thử AI render text trực tiếp. Nếu chất lượng chữ Việt OK → dùng luôn (nhanh hơn, ít step hơn). Nếu không → quay lại Satori mode. Cả 2 mode đều hoạt động song song.

