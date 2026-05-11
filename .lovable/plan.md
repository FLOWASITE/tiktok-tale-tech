## Vấn đề
Sau fix lần trước, checkbox "Màu chủ đạo" vẫn rỗng (chỗ khoanh đỏ). Hai nguyên nhân khả dĩ:

1. **Build chưa load** — banner "A new build is ready / See latest build" trong screenshot cho thấy user đang xem bundle CŨ. Cần bấm "See latest build" để load fix.
2. **Edge case**: nếu vì lý do nào đó `raw_meta.color_palette.primary` null nhưng `candidates[0]` có giá trị (vd palette extract failed mid-way), điều kiện `autoColor` hiện tại sẽ miss.

## Sửa (1 file)
`src/components/brand/BrandImportDialog.tsx`

### 1. Mở rộng fallback `autoColor` (line 145)
Thêm `color_palette.candidates?.[0]` vào chuỗi fallback:
```ts
const palette = result.raw_meta?.color_palette;
const autoColor = palette?.primary 
  || palette?.candidates?.[0]
  || result.raw_meta?.theme_color 
  || result.suggestion?.primary_color_suggestion;
if (autoColor) next.add('primary_color');
```

### 2. Safety net qua `renderPreviewValue` (line 336)
Đồng bộ thứ tự fallback giống effect để `value` không bao giờ falsy khi có ít nhất 1 candidate:
```ts
case 'primary_color': 
  return result.raw_meta?.color_palette?.primary 
    || result.raw_meta?.color_palette?.candidates?.[0]
    || result.raw_meta?.theme_color 
    || s.primary_color_suggestion 
    || null;
```

### 3. Defensive auto-tick khi render
Trong block render (sau line 465), nếu `isColor && value && !checked && !targetBrand` (chỉ apply khi tạo brand mới), schedule một `useEffect` riêng auto-add `primary_color` vào `selectedFields`. Tránh race với effect chính bằng cách check `!selectedFields.has('primary_color')` trước khi setState.

Thực tế gọn hơn: thêm 1 `useEffect([result])` second pass — nếu `renderPreviewValue('primary_color')` truthy mà set chưa có, add vào. Đây là fail-safe phòng case effect chính chạy trước khi `result.raw_meta` populate đầy đủ.

## Không đổi
- `handleApply` (line 230-233) đã đọc đúng fallback chain.
- Logic click swatch (line 565-570) đã auto-tick khi user click — giữ nguyên.
- Edge function `import-brand-from-website` không cần đổi (palette.primary đã set đúng từ logo extraction).

## Test
1. **Quan trọng**: bấm "See latest build" trên banner → reload → import lại zalhub.vn.
2. Kỳ vọng: checkbox "Màu chủ đạo" tick sẵn, swatch Primary có ring active, badge "Từ logo" xanh.
3. Bỏ tick → swatch mất active → submit không lưu màu.
4. Click Secondary → checkbox vẫn tick, đổi màu sang Secondary.
