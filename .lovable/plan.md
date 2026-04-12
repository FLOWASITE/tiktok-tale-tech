

# Nâng cấp WorkflowSection — Premium Interactive Timeline

## Hiện trạng
Timeline dọc cơ bản: số trong vòng tròn gradient, đường nối tĩnh, text + carousel ảnh. Không có animation khi scroll, cards phẳng, không có hiệu ứng tương tác đặc biệt.

## Thiết kế mới

### 1. Card-based Layout thay vì text thuần
- Mỗi step được wrap trong card trắng premium (giống Problem Section): `bg-card`, multi-layer shadow, `rounded-2xl`
- Top accent line 2px `bg-primary` trên mỗi card
- Hover: card lift `translateY(-4px)` + shadow tăng

### 2. Animated Timeline Line
- Thay đường nối tĩnh bằng **animated progress line** — fill dần từ trên xuống khi user scroll qua section
- Sử dụng Framer Motion `useScroll` + `useTransform` để sync với scroll position
- Step numbers sáng lên (scale + glow) khi scroll tới vị trí tương ứng

### 3. Scroll-triggered Step Animation
- Mỗi step fade-in + slide từ trái/phải xen kẽ (odd: từ trái, even: từ phải) thay vì tất cả từ dưới lên
- Stagger delay tăng dần tạo hiệu ứng "revealing"
- Image carousel có scale-in effect riêng

### 4. Step Number Upgrade
- Thêm ring pulse animation khi step đang active (trong viewport)
- Completed steps (đã scroll qua): checkmark overlay nhỏ giống Pipeline
- Active step: ring glow primary animated

### 5. Content Type Cards (Step 3) Premium
- Cards content type chuyển sang style glassmorphism nhẹ: `backdrop-blur`, border gradient
- Hover: individual card lift + icon animate
- Thêm subtle gradient background cho grid area

### 6. Section Background
- Subtle dot grid pattern (giống Problem Section) opacity rất nhẹ
- Ambient radial gradient nhẹ ở giữa section

### 7. Image Carousel Upgrade
- Border radius lớn hơn (`rounded-2xl`)
- Thêm subtle glow shadow dưới ảnh khi hover
- Dots indicator: animated width transition (active dot rộng hơn thay vì chỉ đổi màu)

## Kỹ thuật
- Framer Motion `useScroll`, `useTransform` cho scroll-driven timeline
- `useInView` cho từng step để trigger animations
- CSS `@keyframes` cho ring pulse
- Giữ nguyên Embla Carousel cho image slides

## File thay đổi
- **Edit**: `src/landing/components/WorkflowSection.tsx`

## Giữ nguyên
- Content text, i18n keys
- 6 steps data structure
- Image imports và carousel logic
- Responsive breakpoints
- Design system colors

