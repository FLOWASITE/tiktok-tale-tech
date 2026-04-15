

## Redesign nút Social Publish — gọn gàng, khoa học hơn

### Vấn đề hiện tại
Mỗi `DirectPublishButton` render cả text dài ("Đăng ngay", "Đăng lại", "Kết nối để đăng") + icon lịch riêng → hàng nút dài, tràn trên mobile 707px. Không thống nhất visual giữa các trạng thái.

### Giải pháp: Icon-only buttons + Tooltip + Dropdown actions

**Thiết kế mới cho Row 2 trong CarouselViewer header:**

```text
┌─────────────────────────────────────────────────────┐
│ [FB✓] [IG] [LI] [X] [TT]  │  [📅 Lên lịch ▾]     │
└─────────────────────────────────────────────────────┘

FB✓ = icon Facebook + green ring (đã đăng)
IG   = icon Instagram + primary ring (sẵn sàng)
LI   = icon LinkedIn + dashed ring (chưa kết nối)
```

**Chi tiết:**

1. **Icon-only circular buttons** (32x32px) thay vì text buttons:
   - Đã đăng: green background/ring + check overlay nhỏ
   - Sẵn sàng (có connection): primary border, hover glow
   - Chưa kết nối: dashed border, opacity-50
   - Click → mở dialog publish hiện tại (hoặc navigate settings nếu chưa kết nối)

2. **Tooltip** hiển thị tên platform + trạng thái khi hover

3. **Nút lịch gộp chung**: 1 nút "Lên lịch" duy nhất bên phải → click mở dropdown chọn platform để schedule (thay vì mỗi platform 1 icon lịch riêng)

### Thay đổi

**File: `src/components/social/DirectPublishButton.tsx`**
- Khi nhận prop `iconOnly` (hoặc detect từ className): render icon-only button 32x32 với Tooltip
- 3 visual states: published (green), connected (primary), disconnected (dashed/muted)  
- Bỏ text labels, chỉ giữ icon platform
- Bỏ inline CalendarClock button (sẽ gộp ở parent)

**File: `src/components/CarouselViewer.tsx` (Row 2, lines 803-837)**
- Render 5 `DirectPublishButton` dạng icon-only trong flex row
- Thêm 1 nút "Lên lịch" Popover/Dropdown bên phải cho phép chọn platform + datetime

### Files thay đổi
- `src/components/social/DirectPublishButton.tsx` — icon-only mode với 3 visual states
- `src/components/CarouselViewer.tsx` — Row 2 layout gọn lại

