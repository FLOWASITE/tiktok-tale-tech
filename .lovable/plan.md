

## Hoàn thiện chức năng "Đã tạo" và liên kết với Kho Ý Tưởng

### Vấn đề hiện tại
Popover "Đã tạo" đã có UI nhưng thiếu:
1. Badge trạng thái chi tiết cho mỗi item (draft/suggested/selected/created/published)
2. Nút nhanh mở Kho Ý Tưởng (`/topics`) từ popover
3. Hiển thị category icon và score cho mỗi item
4. Không phân biệt rõ "Chưa tạo nội dung" vs "Đã tạo nội dung"

### Giải pháp

**`src/components/TopicSuggestionPanel.tsx`** — Nâng cấp popover "Đã tạo":

1. **Badge trạng thái cho mỗi item**: Hiển thị badge màu theo `usageStatus`:
   - `draft`/`suggested` → "Ý tưởng" (xám)
   - `selected` → "Đã chọn" (xanh dương)
   - `created` → "Đã tạo" (tím)
   - `published` → "Đã đăng" (xanh lá)

2. **Category icon + score**: Thêm icon category (Leaf/TrendingUp/Calendar/Zap) và điểm score nếu có

3. **Nút "Xem tất cả trong Kho Ý Tưởng"**: Footer popover có link đến `/topics` — tận dụng toàn bộ hệ thống quản lý topic đã có sẵn (lọc, phân tích, bulk actions...)

4. **Cải thiện filter "Chưa tạo nội dung"**: Thêm count badge cho mỗi tab filter

5. **Favorite indicator**: Hiển thị icon ⭐ nếu `isFavorite === true`

### Chi tiết kỹ thuật

```text
Popover "Đã tạo":
┌─────────────────────────────┐
│ Chủ đề đã tạo trước đây    │
│ [Tất cả (15)] [Chưa tạo (8)]│
├─────────────────────────────┤
│ 🌿 Topic name...      82   │
│   12/4/2026  [Ý tưởng]     │
│ 🔥 Topic name...      ⭐   │
│   11/4/2026  [Đã đăng]     │
│ ...                         │
├─────────────────────────────┤
│ 📚 Xem tất cả trong Kho ÝT │
└─────────────────────────────┘
```

### Files thay đổi
- `src/components/TopicSuggestionPanel.tsx` — Nâng cấp popover content

