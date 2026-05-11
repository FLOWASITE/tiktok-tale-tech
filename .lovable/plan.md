## Vấn đề
Ở dialog "Import Brand", phần **Màu chủ đạo** không được tick sẵn khi tạo brand mới, dù đã có palette từ logo / theme-color / AI gợi ý. Hệ quả:
- User thấy swatch Primary có ring hồng nhưng checkbox header vẫn rỗng → tưởng đã chọn nhưng thực tế khi submit `primary_color` không nằm trong `selectedFields` → màu **không được lưu** vào brand.
- Logo thì auto-check, gây inconsistency UX.

## Nguyên nhân
`src/components/brand/BrandImportDialog.tsx` line 145:
```ts
// KHÔNG auto-check màu khi tạo brand mới — user phải tự chọn swatch
if (!isCreatingNew && (result.raw_meta?.theme_color || result.suggestion?.primary_color_suggestion)) next.add('primary_color');
```
Guard `!isCreatingNew` chặn auto-check. Ngoài ra điều kiện cũ chỉ check `theme_color` + AI suggestion, bỏ qua `color_palette.primary` (nguồn từ logo — chính là case trong screenshot: "Nguồn: logo brand • 5 màu").

## Sửa
**1 file duy nhất**: `src/components/brand/BrandImportDialog.tsx`

### Thay đổi 1 — auto-check primary_color (line 145)
- Bỏ guard `!isCreatingNew`.
- Mở rộng điều kiện: check thêm `result.raw_meta?.color_palette?.primary` để cover case palette rút từ logo.
- Đồng thời set `selectedPrimaryColor` về palette primary đầu tiên trong effect (line 156) thay vì `null`, để swatch Primary hiển thị active mặc định khớp với checkbox đã tick.

### Thay đổi 2 — đảm bảo click swatch không bị label toggle off
Hiện tại button swatch nằm trong `<label>` (line 471) bao Checkbox. Click button đã `preventDefault + stopPropagation` (line 565-566) nên về lý thuyết không bubble lên Checkbox, nhưng để chắc chắn:
- Trong `onClick` của swatch button: nếu field chưa được tick thì `add`; nếu đã tick rồi thì **chỉ đổi màu, không toggle**. (Hành vi hiện tại đã đúng — chỉ cần verify không có regression sau khi auto-check.)

### Không thay đổi
- Logic `handleApply` (line 229-232) — đã đọc đúng từ `selectedPrimaryColor || palette?.primary || theme_color || ai_suggestion`.
- Hydrate ở `BrandCreate.tsx` — đã có sẵn pipeline đọc `primary_color`.
- Không sửa edge function, không sửa schema.

## Test tay
1. Import 1 website có logo (vd zalhub.vn) → mở dialog confirm:
   - Checkbox "Màu chủ đạo" tick sẵn ✅
   - Swatch Primary có ring active ✅
   - Badge "Từ logo" hiển thị
2. Bấm "Tiếp tục tạo brand" → vào step Visual: thấy primary color đã được set đúng hex của Primary.
3. Click swatch khác (Secondary) → checkbox vẫn tick, màu update sang Secondary.
4. Bỏ tick checkbox "Màu chủ đạo" → swatch mất active state, submit không lưu màu.
5. Brand đang edit (không phải tạo mới) → vẫn auto-check như cũ (không regression).

## Edge cases
- Website không trả về palette nào → field "Màu chủ đạo" không hiển thị (`value` null) → no-op.
- Chỉ có 1 màu duy nhất → render fallback swatch đơn (đã có code path khác), vẫn auto-check.
