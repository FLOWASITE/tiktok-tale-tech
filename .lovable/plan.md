

# Thiết kế lại Carousel Card — Thẩm mỹ & Sang trọng

## Vấn đề
Card hiện tại trông khá "flat" và có quá nhiều badge/tag chen chúc, thiếu hierarchy rõ ràng. Cần redesign để tạo cảm giác premium, thoáng, dễ scan.

## Thiết kế mới

### Layout Structure
```text
┌──────────────────────────────┐
│  [Image Grid 4:3]            │  ← Giữ nguyên grid ảnh
│  Status pill (góc phải trên) │
│  Image count (góc trái dưới) │
├──────────────────────────────┤
│  Platform icon + Brand logo  │  ← Dòng nhỏ, subtle
│                              │
│  Title (2 dòng max)          │  ← Font lớn hơn, medium weight
│  "3 giờ trước"               │  ← Muted, nhỏ
│                              │
│  ┌─ Avatar ── Creator Name ─┐│  ← Bottom row
│  │           [👁 Xem] [🗑] ││
│  └──────────────────────────┘│
└──────────────────────────────┘
```

### Thay đổi chính: `src/components/CarouselCard.tsx`

1. **Loại bỏ badge overload**: Xóa hàng badge (platform, slide count, style) — chuyển platform + brand thành dòng icon nhỏ subtle phía trên title
2. **Status badge**: Di chuyển vào overlay góc phải trên ảnh (glass effect) thay vì cạnh title
3. **Typography upgrade**: Title dùng `font-medium tracking-tight`, không bold quá
4. **Spacing thoáng hơn**: Tăng padding, giảm clutter
5. **Bottom bar**: Creator + Actions trên cùng 1 dòng, Actions chỉ hiện khi hover
6. **Card style**: Thêm subtle border-radius lớn hơn (`rounded-xl`), shadow nhẹ hơn, hover effect tinh tế
7. **Bỏ status indicator line trên cùng** — đã có status pill trên ảnh
8. **Bỏ glow effect** — thay bằng subtle shadow transition

Sửa 1 file `src/components/CarouselCard.tsx`, redesign toàn bộ phần content bên dưới ảnh.

