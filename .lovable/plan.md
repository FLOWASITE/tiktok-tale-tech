

## Vấn đề: Layout luôn chỉ có 1 kiểu

### Nguyên nhân gốc

Hệ thống định nghĩa **6 templates** với **5 layout types** (`stack`, `split`, `banner_cards`, `hero_text`, `simple`), nhưng khi truyền layout xuống pipeline, code dùng **ternary cứng** thay vì lấy layout từ template:

```typescript
// SimpleImageGenerator.tsx, line 432 & 454
layout: (overlayConfig.cards ? 'banner_cards' : overlayConfig.heroText ? 'hero_text' : 'simple')
```

Kết quả: dù `autoSelectTemplate` chọn `infographic` (layout `split`) hay `poster` (layout `stack`), layout thực tế gửi đến backend luôn là `banner_cards` (nếu có cards) hoặc `hero_text` / `simple`.

Thêm nữa, type definition trong `useAutoImageGeneration.ts` chỉ cho phép 3 giá trị:
```typescript
layout: 'banner_cards' | 'hero_text' | 'simple'  // THIẾU 'split' và 'stack'
```

### Truy vết flow

```text
autoSelectTemplate() → returns 'infographic' (layout: 'split')
    ↓
applyTemplate('infographic', ...) → returns overlayConfig with split-ready data
    ↓
setHybridOverlay({ layout: overlayConfig.cards ? 'banner_cards' : ... })  ← BUG: ignores template layout
    ↓
useAutoImageGeneration sends layout='banner_cards' to overlay-text-canvas
    ↓
Backend receives 'banner_cards', renders stacked layout instead of split
```

### Backend đã sẵn sàng

`overlay-text-canvas/index.ts` **đã hỗ trợ** `split` layout (line 487, 794). Chỉ cần frontend gửi đúng giá trị.

### Giải pháp

#### 1. `src/hooks/useAutoImageGeneration.ts` — Mở rộng type
```typescript
// Line 52: Thêm 'split' và 'stack'
layout: 'banner_cards' | 'hero_text' | 'simple' | 'split' | 'stack';
```

#### 2. `src/components/multichannel/SimpleImageGenerator.tsx` — Dùng template layout thay vì ternary

Thay thế ternary cứng ở **2 chỗ** (line 432 và 454) bằng logic lấy layout từ template:

```typescript
// Helper function
function getLayoutFromTemplate(templateId: string, overlayConfig: any): string {
  const template = getTemplateById(templateId);
  if (template && template.layout !== 'simple') return template.layout;
  // Fallback cho 'auto' hoặc template không tìm thấy
  if (overlayConfig.cards) return 'banner_cards';
  if (overlayConfig.heroText) return 'hero_text';
  return 'simple';
}

// Line 431-432: Thay ternary
setHybridOverlay({
  layout: getLayoutFromTemplate(selectedTemplate, overlayConfig),
  ...
});
```

Áp dụng tương tự cho block fallback (line 453-454).

#### 3. `src/lib/hybridImageGenerator.ts` — `applyTemplate` trả về template layout

Hiện tại `applyTemplate` trả về `{ backgroundPrompt, overlayConfig }` nhưng **không trả layout type**. Cần bổ sung:

```typescript
return {
  backgroundPrompt: decomposed.backgroundPrompt,
  overlayConfig: overlay,
  layout: template.layout,  // Thêm dòng này
};
```

Cách này sạch hơn — `SimpleImageGenerator` dùng trực tiếp `result.layout` thay vì phải lookup template lại.

### Files cần sửa
- `src/hooks/useAutoImageGeneration.ts` — 1 dòng (type union)
- `src/lib/hybridImageGenerator.ts` — ~3 dòng (return layout)
- `src/components/multichannel/SimpleImageGenerator.tsx` — ~6 dòng (2 chỗ dùng layout từ applyTemplate thay vì ternary)

### Kết quả mong đợi
- Template `infographic` → layout `split` (2 cột: hero trái, cards phải)
- Template `poster` → layout `stack` (xếp dọc)
- Template `quote_card` → layout `hero_text` (hero text lớn giữa)
- Template `feature_list` → layout `banner_cards` (banner + danh sách)
- Template `contact_card` → layout `stack` (headline + footer)

