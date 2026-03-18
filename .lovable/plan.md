# Cải thiện UI trang Đăng ký / Đăng nhập

## Phân tích hiện tại

Trang auth hiện tại khá cơ bản: card trắng đơn giản, spacing đều nhau, thiếu visual hierarchy. Trên mobile không có branding panel (đã ẩn). Form đăng ký dài và các elements thiếu nhóm logic rõ ràng.

## Thiết kế mới

### Layout & Background

- Thay gradient background nhạt bằng pattern tinh tế hơn: gradient mesh nhẹ kết hợp primary/secondary colors
- Card auth: thêm subtle shadow lớn hơn, border nhẹ hơn, padding thoáng hơn

### Left Panel (Desktop) - Nâng cấp visual

- Thêm decorative gradient blob/circle phía sau content
- Typography lớn hơn, bold hơn cho tagline
- Feature list: thêm icon background circle với màu primary nhẹ

### Auth Card - Cải thiện layout

- **Google button nổi bật hơn**: Tăng height, thêm hover shadow, border rõ hơn
- **Divider**: Thêm spacing tốt hơn
- **Form fields**: Thêm icon prefix (Mail icon cho email, Lock cho password, User cho name)
- **Password field**: Gom password + confirm password visual gần nhau hơn
- **Terms checkbox**: Style nhẹ nhàng hơn với background subtle
- **Submit button**: Thêm gradient primary->secondary, tăng height

### Mobile

- Hiện logo + tagline ngắn phía trên card (thay vì chỉ logo nhỏ)
- Card full-width với rounded top corners

### Animations

- Staggered fade-in cho form fields
- Smooth tab transition

## File thay đổi


| File                                           | Thay đổi                                                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/pages/Auth.tsx`                           | Redesign layout, thêm icons cho input, cải thiện spacing, gradient button, mobile branding, decorative elements |
| `src/components/PasswordStrengthIndicator.tsx` | Nhỏ gọn hơn, compact layout                                                                                     |
