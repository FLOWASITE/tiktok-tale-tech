## Vấn đề

Trong `IndustrySelectionDialog`, các card ngành non-compact đang hiển thị trong grid `lg:grid-cols-4` (Phổ biến, Đã dùng gần đây, related packs). Ở viewport ~1538px, panel phải chỉ rộng ~720px → mỗi card ~165px. Nội dung card hiện tại chiếm overhead lớn:

- `p-5` (40px) + icon box `p-3` ~48px + `gap-4` (16px) + `pr-4` (16px) + ChevronRight 20px ≈ **140px**
- → chỉ còn ~25px cho text → "Kế toán" bị wrap thành "K / to / D."

## Giải pháp

Refactor card non-compact (`IndustryCard` lines 294–335) sang **vertical layout** thân thiện với grid 4 cột:

```text
┌─────────────────┐
│ [icon]    [Hot] │
│                 │
│ Kế toán         │
│ Dịch vụ kế toán │
│ +5 ngành phụ    │
└─────────────────┘
```

### Thay đổi cụ thể

**`src/components/brand/IndustrySelectionDialog.tsx`** (chỉ phần non-compact card, lines 294–335):

1. Đổi `flex items-start gap-4` → `flex flex-col gap-3` (icon trên, text dưới)
2. Bỏ `pr-4` và `ChevronRight` ở góc phải (giữ Hot badge absolute như cũ)
3. Giảm icon padding `p-3` → `p-2.5`, dùng `size='sm'` thay `'md'` để tiết kiệm không gian ngang
4. Title: giữ `line-clamp-2` nhưng giờ có full width → đọc rõ
5. Subtitle (`pack.name` khi khác `shortName`): `line-clamp-2` thay `line-clamp-1` để tận dụng vertical space
6. `min-h-[100px]` → `min-h-[140px]` cho cân đối
7. Hover chevron thay bằng border accent (đã có `hover:border-primary`)

**Không đổi**:
- Compact card (mobile drawer)
- Grid layout 4 cột (vertical card hoạt động tốt với 4 cột)
- Logic data, filter, click handler
- Card AI suggestion (đã dùng layout horizontal khác, text vẫn đọc được vì nằm trong grid 3 cột rộng hơn)

## Files
- `src/components/brand/IndustrySelectionDialog.tsx` (chỉ block IndustryCard non-compact)

## Test
Sau khi sửa, kiểm tra preview ở `/brands/new` → mở dialog chọn ngành → các tab "Phổ biến", "Đã dùng gần đây", category cards phải hiển thị đầy đủ tên ngành, không bị cắt ký tự.
