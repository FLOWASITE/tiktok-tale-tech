

## Audit: Frontend UI/UX vs Backend Visual Engine (Phases A-F)

### Kết luận tổng quan

Backend (`generate-carousel-image` + `overlay-text-canvas`) đã implement đầy đủ 6 phases. Frontend có **3 gaps** cần fix để tận dụng hết backend.

---

### ✅ Đã hoạt động đúng (không cần sửa)

| Phase | Mô tả | Trạng thái |
|-------|--------|------------|
| A | Gallery hook dark gradient (`bottomGradient: true`) | ✅ Backend tự detect `slideRole === 'hook' && carouselStyle === 'gallery'` → không cần FE thay đổi |
| B | Multi-layer text hierarchy (`parseTextLayers`) | ✅ Backend parse `textContent` → `textLayers[]` → overlay-text-canvas render multi-block |
| D | Content-aware text fitting (`adjustOverlayForTextDensity`) | ✅ Backend tự adjust trước khi gửi overlay |
| E | Listicle decorations (badge + progress dots) | ✅ Backend detect `carouselStyle === 'listicle' && slideRole === 'body'` |
| F | Seamless scene description chaining | ✅ `CarouselViewer.handleGenerateAllImages` đã dùng `result?.sceneDescription` |

---

### ❌ 3 Gaps cần fix

#### Gap 1: `brandColors` không được truyền từ frontend (Phase C bị hỏng)

**Vấn đề**: `handleGenerateImage` và `handleGenerateAllImages` trong `CarouselViewer.tsx` không truyền `brandColors` xuống `generateImage()`. Backend nhận `brandColors = undefined` → Phase C (brand color blending vào prompt + overlay) không hoạt động.

**Fix**: Đọc brand colors từ `carousel.brand_guideline` hoặc brand template, truyền vào `generateImage()` options.

**Files**: `src/components/CarouselViewer.tsx`
- Extract brand colors (từ brand template hoặc parse từ guideline)
- Thêm `brandColors` vào cả `handleGenerateImage` và `handleGenerateAllImages`

#### Gap 2: `AITool` selector vẫn hiển thị nhưng không còn dùng

**Vấn đề**: `CarouselForm.tsx` vẫn có state `aiTool` và `AIToolSelector` import nhưng không render (đã ẩn). Tuy nhiên `aiTool` vẫn được submit trong `CarouselFormData` và hiển thị badge trong `CarouselViewer`. Backend giờ dùng `ai_function_configs` table → `aiTool` field là legacy noise.

**Fix**: Low priority — cosmetic cleanup. Có thể giữ nguyên vì không gây lỗi.

#### Gap 3: `VisualPresetSelector` không preview design tokens

**Vấn đề**: User chọn visual preset nhưng không thấy preview (color palette, font, spacing) trước khi generate. Đây là UX gap — user không biết mỗi preset trông thế nào cho đến khi đã generate ảnh.

**Fix**: Thêm mini preview strip cho mỗi preset option (color dots + font name). Data có thể fetch từ `carousel_style_presets` table hoặc hardcode từ `FALLBACK_OVERLAY_MATRIX`.

**Files**: `src/components/carousel/VisualPresetSelector.tsx`

---

### Đề xuất thực hiện

1. **Gap 1 (brandColors)** — quan trọng nhất, Phase C backend hoàn toàn vô dụng nếu không fix. ~30 phút.
2. **Gap 3 (preset preview)** — UX improvement, ~1-2 giờ.
3. **Gap 2 (aiTool cleanup)** — optional, cosmetic.

