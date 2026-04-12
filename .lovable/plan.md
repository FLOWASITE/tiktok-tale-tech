

# Nâng cao thẩm mỹ cho Problem Section

## Vấn đề hiện tại
Section đã có cấu trúc tốt nhưng thiếu chiều sâu thị giác. Trên nền Light theme, các card trông phẳng và ambient background quá nhẹ, không tạo được cảm giác "nặng nề, mệt mỏi" như mục tiêu emotional design.

## Thay đổi

### 1. Background layer phong phú hơn
- Thêm noise texture overlay (SVG filter, opacity 2%) tạo chiều sâu
- Thêm grid pattern rất nhẹ (giống GradientMesh đang dùng ở Hero)
- Tăng nhẹ opacity radial gradient ambient (0.035 → 0.05) để tách biệt section rõ hơn
- Thêm top/bottom subtle divider line (border-t/border-b `border-red-100/20`)

### 2. Card redesign - Glassmorphism + depth
- Thêm `backdrop-blur-sm` cho cards
- Thêm inner glow effect (box-shadow inset nhẹ)
- Icon container: thêm subtle animation (pulse nhẹ khi hover)
- Hover: thêm glow shadow đỏ trầm muted (`0 8px 32px rgba(248,113,113,0.08)`)
- Bottom insight: thêm arrow icon animated (slide-right nhẹ khi hover)
- Thêm card number/index nhỏ góc trên-phải (01, 02, 03, 04) với opacity thấp

### 3. Decorative elements
- Thêm floating dots/particles rất nhẹ (3-5 dots, red muted, animation chậm)
- Thêm decorative dashed connecting lines giữa heading và cards grid
- Thêm subtle "crack" pattern giữa 2 hàng cards (tạo cảm giác "vỡ/rạn")

### 4. Typography refinement
- Stat number: thêm text-shadow nhẹ cho depth
- Title: letter-spacing tighter (-0.02em)
- Description: tăng line-height lên 1.75 cho dễ đọc hơn
- Tag "VẤN ĐỀ": thêm subtle pulse animation

### 5. Transition statement nâng cấp
- Thêm animated particles converging vào "Agent vận hành"
- Gradient line: từ thin → thicker với glow effect
- Thêm subtle arrow/chevron pointing down trước transition

### 6. Animation polish
- Cards: stagger delay tăng lên (0, 150ms, 300ms, 450ms) cho dramatic hơn
- Stat counter: thêm slight overshoot effect (count lên qua target rồi settle)
- Ambient glow trên mỗi card: animate opacity pulse chậm

## File thay đổi
- **Edit**: `src/landing/components/ProblemSection.tsx` (toàn bộ changes)

## Giữ nguyên
- Content text, translation keys
- Color palette (red muted #f87171, amber #fb923c, indigo bridge)
- Grid layout 2x2
- Responsive breakpoints
- Existing design system (font, theme, Tailwind classes)

