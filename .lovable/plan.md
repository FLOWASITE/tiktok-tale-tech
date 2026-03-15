

## Plan: Template System cho AI Render Mode

### Hiện trạng
- Template picker (`OverlayTemplatePicker`) chỉ hiển thị khi `overlayMode === 'satori'` — bị ẩn hoàn toàn khi AI render mode
- Hàm `structuredElementsToPromptText()` trong `generate-brand-image` chuyển elements thành prompt text nhưng không có thông tin layout (poster, split, grid...)
- AI render mode chỉ mô tả từng element riêng lẻ, không hướng dẫn AI về bố cục tổng thể

### Thay đổi

**1. UI — Hiển thị template picker cho cả AI render mode**
- `SimpleImageGenerator.tsx`: Bỏ điều kiện `overlayMode === 'satori'` — show picker khi `useHybridMode === true` (cả 2 mode)
- Truyền `overlayTemplate` vào `batchOptions` khi `ai_render` mode

**2. Client — Truyền template ID sang edge function**
- `useAutoImageGeneration.ts`: Khi `isAiRenderMode`, thêm `structuredTemplate: overlayTemplate` vào body request gửi `generate-brand-image`

**3. Edge function — Dùng template để hướng dẫn layout cho AI**
- `generate-brand-image/index.ts`:
  - Nhận thêm field `structuredTemplate` từ request
  - Cập nhật `structuredElementsToPromptText()` — thêm param `templateId`
  - Map mỗi template sang mô tả layout bằng ngôn ngữ tự nhiên:
    - `poster` → "Stack layout: banner bar at top, large headline centered, CTA button at bottom"
    - `infographic` → "Split layout: left 55% for hero text, right 45% for 2x2 card grid, banner at top"
    - `quote_card` → "Centered large quote text with gradient effect, banner bar at bottom"
    - `feature_list` → "Banner at top, vertical list of feature cards below"
    - `contact_card` → "Headline at top, contact info footer at bottom"
    - `auto` → no layout instruction (AI decides)
  - Prepend layout instruction trước element descriptions

### Files
- `src/components/multichannel/SimpleImageGenerator.tsx` — show picker for both modes, pass template
- `src/hooks/useAutoImageGeneration.ts` — pass `structuredTemplate` in request body
- `supabase/functions/generate-brand-image/index.ts` — use template in prompt generation

