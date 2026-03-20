

# Bỏ hiển thị Chủ đề (topic) trùng lặp trên Carousel Card

## Vấn đề
Card hiện hiển thị cả `carousel.title` (dòng 218) và `carousel.topic` (dòng 285) — nội dung gần giống nhau, gây trùng lặp.

## Giải pháp
Xóa phần hiển thị `topic` (dòng 284-287) trong `CardContent`, chỉ giữ lại `title` ở `CardHeader`.

### Thay đổi: `src/components/CarouselCard.tsx`
- Xóa dòng 284-287 (block `{/* Topic */}`)

1 file, xóa 4 dòng.

