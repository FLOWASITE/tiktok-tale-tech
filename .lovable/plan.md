

## Vấn đề: FloatingImageProgress khi thu nhỏ

### Phân tích

Khi user bấm "Thu nhỏ" trong quá trình tạo ảnh:
1. `isImageGenMinimized = true`, dialog đóng (`onOpenChange(false)`)
2. `FloatingImageProgress` render bên ngoài `DialogContent` nhưng **không có `fixed` positioning**
3. Component chỉ là `motion.div` với `w-full rounded-xl` — render inline trong DOM flow
4. Kết quả: widget floating có thể bị ẩn, nằm sai vị trí, hoặc bị đè bởi các element khác

### Giải pháp

**Fix `FloatingImageProgress.tsx`**: Thêm `fixed` positioning để widget luôn hiển thị ở góc dưới phải màn hình, bất kể trạng thái dialog.

| File | Thay đổi |
|---|---|
| `src/components/multichannel/FloatingImageProgress.tsx` | Thêm `fixed bottom-4 right-4 z-50 w-80` vào wrapper `motion.div`, thay thế `w-full` hiện tại. Đảm bảo widget nổi đúng vị trí khi dialog đã đóng. |

### Chi tiết
- Wrapper class: `fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)]`
- Mobile responsive: `w-72` trên màn hình nhỏ
- Shadow elevation cao hơn: `shadow-2xl` để nổi bật trên nền

