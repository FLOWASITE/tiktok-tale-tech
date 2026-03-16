

## Plan: Auto-select Template dựa trên nội dung

### Ý tưởng
Khi `overlayTemplate === 'auto'`, thay vì bỏ qua template hoàn toàn (như hiện tại), hệ thống sẽ **phân tích nội dung** và tự động chọn template phù hợp nhất, rồi áp dụng `applyTemplate()` với template đó.

### Thay đổi

**1. Tạo hàm `autoSelectTemplate()` trong `src/lib/hybridImageGenerator.ts`**

Hàm nhận `description` + `overlayConfig` (kết quả AI decomposition) và trả về template ID tối ưu:

```typescript
function autoSelectTemplate(
  description: string,
  overlayConfig: StructuredOverlayConfig
): string {
  // Has contact info (phone/email/address) → contact_card
  const hasContactInfo = extractFooterItemsFromText(description).length >= 2;
  if (hasContactInfo && !overlayConfig.cards) return 'contact_card';

  // Has 4+ cards or list/grid keywords → infographic
  if (overlayConfig.cards && overlayConfig.cards.items.length >= 4) return 'infographic';

  // Has cards but fewer → feature_list
  if (overlayConfig.cards && overlayConfig.cards.items.length >= 2) return 'feature_list';

  // Has heroText (big number/stat) + banner → quote_card
  if (overlayConfig.heroText && !overlayConfig.cards) return 'quote_card';

  // Has headline + CTA → poster
  if (overlayConfig.headline || overlayConfig.cta) return 'poster';

  // Default: poster (most versatile)
  return 'poster';
}
```

Logic ưu tiên:
- Có thông tin liên hệ (≥2 items) + không có cards → `contact_card`
- Có ≥4 cards → `infographic` (split layout, grid 2x2)
- Có 2-3 cards → `feature_list` (banner + danh sách dọc)
- Có heroText (số liệu nổi bật) mà không cards → `quote_card`
- Có headline/CTA → `poster`
- Fallback → `poster`

**2. Cập nhật flow trong `SimpleImageGenerator.tsx`**

Hiện tại khi `overlayTemplate === 'auto'`, code bỏ qua `applyTemplate()` hoàn toàn:
```typescript
const { backgroundPrompt, overlayConfig } = overlayTemplate !== 'auto'
  ? applyTemplate(overlayTemplate, decomposed, ...)
  : decomposed; // ← không apply template gì cả
```

Thay đổi: Gọi `autoSelectTemplate()` rồi `applyTemplate()`:
```typescript
const selectedTemplate = overlayTemplate !== 'auto' 
  ? overlayTemplate 
  : autoSelectTemplate(summaryText, decomposed.overlayConfig);
const { backgroundPrompt, overlayConfig } = applyTemplate(selectedTemplate, decomposed, ...);
```

Áp dụng tương tự cho cả `.catch` fallback block.

**3. Truyền template ID thực tế vào `batchOptions`**

Lưu `resolvedTemplate` vào state để edge function nhận đúng template ID (không phải `'auto'`):
- Thêm state `resolvedTemplate` — được set sau khi auto-select
- `batchOptions.structuredTemplate` dùng `resolvedTemplate` thay vì `overlayTemplate`

### Files cần sửa
- `src/lib/hybridImageGenerator.ts` — thêm + export `autoSelectTemplate()`
- `src/components/multichannel/SimpleImageGenerator.tsx` — dùng auto-select khi `'auto'`, lưu resolved template

### Scope
- ~30 dòng code mới, ~10 dòng sửa
- Không ảnh hưởng edge function (nhận template ID như cũ)
- Khi user chọn template cụ thể → vẫn hoạt động y như trước

