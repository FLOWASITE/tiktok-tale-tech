

## Rà soát Template System — Phát hiện thiếu sót

### Đã hoàn thiện
- **Config** (`overlayTemplates.ts`): 6 templates định nghĩa đầy đủ
- **Picker UI** (`OverlayTemplatePicker.tsx`): Grid chọn template, hiển thị cho cả satori + ai_render mode
- **applyTemplate** (`hybridImageGenerator.ts`): Merge logic cho banner, heroText, headline, cards, cta
- **AI Render prompt** (`generate-brand-image`): `structuredElementsToPromptText()` nhận `templateId`, map layout instructions
- **Data flow**: `SimpleImageGenerator` → `batchOptions.structuredTemplate` → `useAutoImageGeneration` → edge function

### Thiếu sót cần fix

**1. Footer slot không được xử lý (contact_card template bị lỗi)**

Template `contact_card` yêu cầu slot `footer`, nhưng:
- `StructuredOverlayConfig` trong `hybridImageGenerator.ts` **không có field `footer`**
- `applyTemplate()` **không handle** slot `footer` — khi AI không trả footer thì template sẽ thiếu phần này
- `structuredElementsToPromptText()` trong edge function **không render footer** cho AI render mode
- `overlay-text-canvas` **đã hỗ trợ** `footer` (có render logic sẵn) — chỉ thiếu phía client

**Fix cần làm:**
- Thêm `footer?: { items: Array<{ icon?: string; text: string }> }` vào `StructuredOverlayConfig`
- Thêm logic fallback cho `footer` trong `applyTemplate()` (tạo placeholder items từ description)
- Thêm render `elements.footer` trong `structuredElementsToPromptText()` cho AI render mode
- Đảm bảo `decomposeRequestWithAI()` có thể trả về footer (kiểm tra AI prompt)

**2. AI decomposition prompt không yêu cầu footer**

Hàm `decomposeRequestWithAI()` gửi prompt cho Gemini Flash để phân tích nội dung, nhưng schema trả về không bao gồm `footer` field → AI sẽ không bao giờ sinh footer content tự động.

**Fix:** Thêm `footer` vào expected output schema trong prompt gửi AI decomposition.

### Files cần sửa
- `src/lib/hybridImageGenerator.ts` — thêm `footer` vào interface + `applyTemplate` + AI decomposition prompt
- `supabase/functions/generate-brand-image/index.ts` — thêm footer rendering trong `structuredElementsToPromptText()`

### Scope
- ~30-40 dòng code thay đổi
- Không ảnh hưởng các template khác (chỉ contact_card cần footer)
- Không cần sửa overlay-text-canvas (đã hỗ trợ sẵn)

