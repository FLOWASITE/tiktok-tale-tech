

## Plan: Template System cho Overlay Layout

### Ý tưởng
Thêm một bộ template có sẵn (poster, infographic, quote card, v.v.) để user chọn trước khi tạo ảnh, thay vì để AI tự quyết định layout. Template sẽ map trực tiếp sang `StructuredOverlayRequest.layout` + preset elements.

### Thay đổi

**1. Định nghĩa templates — `src/config/overlayTemplates.ts` (file mới)**

Tạo config với ~5 template presets:

| Template | Layout | Elements mặc định |
|----------|--------|-------------------|
| `poster` | `stack` | Banner top + Headline + CTA |
| `infographic` | `split` | Banner + Hero text trái + Cards (2x2) phải + Footer |
| `quote_card` | `stack` | Hero text (3xl, gradient) + Banner bottom |
| `feature_list` | `banner_cards` | Banner top + Cards (vertical) |
| `contact_card` | `stack` | Headline + Footer (phone/web/address) |

Mỗi template có: `id`, `name`, `description`, `icon` (emoji), `layout`, `defaultElements` (partial — AI sẽ fill content vào các slot này).

**2. UI chọn template — `src/components/multichannel/OverlayTemplatePicker.tsx` (file mới)**

- Grid 2-3 cột với card cho mỗi template (icon + name + mô tả ngắn)
- Thêm option "🤖 AI tự chọn" (default, giữ behavior hiện tại)
- Hiển thị trong Step 3 của `SimpleImageGenerator.tsx`, ngay dưới Hybrid mode toggle, chỉ khi `useHybridMode === true`

**3. Tích hợp vào pipeline — `src/components/multichannel/SimpleImageGenerator.tsx`**

- Thêm state `overlayTemplate: string | 'auto'` (default `'auto'`)
- Khi user chọn template khác `'auto'`:
  - Vẫn gọi `decomposeRequestWithAI()` để AI sinh **content** (text banner, card labels, v.v.)
  - Nhưng **override** `layout` và `elements structure` từ template config
  - Ví dụ: template `infographic` → force `layout: 'split'`, đảm bảo có banner + cards + footer
- Truyền template info vào `batchOptions.structuredOverlay`

**4. Logic merge template + AI content — `src/lib/hybridImageGenerator.ts`**

- Thêm hàm `applyTemplate(templateId, aiDecomposed)`:
  - Lấy template config từ `overlayTemplates`
  - Override `layout` từ template
  - Giữ AI-generated text content nhưng đảm bảo các slot bắt buộc của template có mặt
  - Ví dụ: template `infographic` yêu cầu `cards` → nếu AI không sinh cards, tạo placeholder từ content

### Files

- `src/config/overlayTemplates.ts` — **mới** — template definitions
- `src/components/multichannel/OverlayTemplatePicker.tsx` — **mới** — picker UI
- `src/components/multichannel/SimpleImageGenerator.tsx` — thêm state + render picker
- `src/lib/hybridImageGenerator.ts` — thêm `applyTemplate()` merge logic

### Không thay đổi
- Edge functions (`overlay-text-canvas`, `generate-brand-image`) — không cần sửa vì chúng đã hỗ trợ tất cả layout types
- AI decomposition prompt — không cần sửa vì template chỉ override layout, không thay đổi cách AI sinh content

