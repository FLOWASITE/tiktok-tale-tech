

# Thêm Sort theo Năm/Tháng cho Channel Group View

## Mô tả
Thêm dropdown sắp xếp bài viết trong mỗi tab kênh theo năm/tháng (mới nhất, cũ nhất) và nhóm hiển thị theo tháng.

## Thay đổi

### `src/components/multichannel/ChannelGroupView.tsx`

**Thêm state sort + UI control:**
- Thêm state `sortBy` với các option: `newest` (mới nhất), `oldest` (cũ nhất), `month_group` (nhóm theo tháng)
- Đặt Select dropdown sort ở góc phải header kênh (bên cạnh nút Đăng tất cả / Lên lịch)

**Logic sort:**
- `newest` / `oldest`: sort `items` theo `created_at`
- `month_group`: nhóm items theo tháng/năm (ví dụ "Tháng 4, 2026", "Tháng 3, 2026"), hiển thị mỗi nhóm với tiêu đề tháng + grid cards bên dưới

**Layout khi nhóm theo tháng:**
```text
── Tháng 4, 2026 (5 bài) ──────────
[Card] [Card] [Card] [Card] [Card]

── Tháng 3, 2026 (3 bài) ──────────
[Card] [Card] [Card]
```

### Files
| File | Thay đổi |
|------|----------|
| `src/components/multichannel/ChannelGroupView.tsx` | Thêm sort state, Select dropdown, logic sort/group theo tháng |

