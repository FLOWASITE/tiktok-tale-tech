

# Redesign Problem Cards: White + Premium

## Mục tiêu
Chuyển cards từ tông đỏ-cam (bg-red-50, border-red-100) sang nền trắng sạch, hài hòa với tổng thể website, nhưng vẫn đặc biệt và premium.

## Thay đổi trong `ProblemSection.tsx`

### Card background & border
- **Nền**: `bg-white` (hoặc `bg-card`) thay vì `bg-red-50/20`
- **Border**: `border-border/40` mặc định, hover chuyển sang `rgba(248,113,113,0.2)` — chỉ hint đỏ khi tương tác
- **Box-shadow**: Thêm subtle multi-layer shadow kiểu Apple: `0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)` — tạo depth mà không cần màu

### Điểm đặc biệt để card nổi bật
- **Top accent line**: Mỗi card có một thanh gradient mỏng 2px ở cạnh trên (`linear-gradient(90deg, #f87171, #fb923c)`), opacity 40% → 70% on hover — tạo "chấm phá" tinh tế
- **Icon container**: Chuyển từ `bg-red-100/50` → `bg-gradient-to-br from-red-50 to-orange-50` với border nhẹ hơn — vẫn giữ hint đỏ nhưng trên nền trắng sẽ đẹp hơn
- **Ambient glow**: Giảm opacity đáng kể (từ 0.07 → 0.03) để không tạo vệt cam trên nền trắng
- **Hover state**: Card lift cao hơn (`translateY(-6px)`) + shadow lớn hơn + top accent line sáng lên — tạo cảm giác interactive premium

### Background section
- Giảm opacity ambient radial gradients (0.05 → 0.025) vì cards trắng sẽ tự tạo contrast
- Grid pattern giữ nguyên nhưng giảm opacity thêm

## Kết quả mong đợi
Cards trắng sạch, hòa hợp với website, nhưng có top accent line gradient đỏ-cam + shadow depth + hover effects làm chúng trông premium và đặc biệt hơn các card thông thường.

## File thay đổi
- `src/landing/components/ProblemSection.tsx` — chỉnh card styles + section background

