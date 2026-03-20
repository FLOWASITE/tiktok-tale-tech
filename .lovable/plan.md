

# Tăng diện tích ảnh, giảm diện tích chữ trên Carousel Card

## Thay đổi trong `src/components/CarouselCard.tsx`

### 1. Phần ảnh — tăng kích thước
- Đổi `aspect-video` (16:9) → `aspect-[4/3]` để ảnh cao hơn, chiếm nhiều diện tích hơn trên card

### 2. Phần chữ — thu gọn
- **CardHeader** (line 192): Giảm padding từ `p-3 xs:p-4 sm:p-5` → `p-2 xs:p-3 sm:p-3`
- **CardContent** (line 216): Giảm padding từ `p-3 xs:p-4 sm:p-5` → `p-2 xs:p-3 sm:p-3`
- **Topic** (line 261): Giảm `line-clamp-2` → `line-clamp-1` và giảm margin
- **Tags** (line 218): Giảm margin `mb-2 xs:mb-3` → `mb-1.5`
- **Brand + Creator**: Giảm margin giữa các section

Sửa 1 file, ~10 dòng thay đổi. Ảnh sẽ chiếm ~60% card thay vì ~40% như hiện tại.

