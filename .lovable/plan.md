## Cho phép đóng màn hình tạo nội dung khi đang chạy

### Vấn đề

Drawer `MobileGenerationSheet` chặn đóng khi đang tạo ảnh (`canClose = !isGenerating && !isImageGenerating`). Nếu ảnh bị lỗi/timeout mà state không chuyển sang 'complete' hoặc 'error', người dùng bị kẹt vĩnh viễn.

### Giải pháp

Luôn hiển thị nút X để đóng, kèm cảnh báo nếu đang tạo dở. Không chặn cứng việc đóng drawer.

### Thay đổi trong `MobileGenerationSheet.tsx`

1. **Bỏ chặn đóng cứng**: Thay `canClose` logic -- luôn cho phép đóng drawer, nhưng nếu đang generating thì hiển thị confirm toast trước khi đóng.
2. **Luôn hiển thị nút X**: Bỏ điều kiện `{canClose && ...}` quanh nút X, nút X luôn hiển thị.
3. **Thêm logic xác nhận**: Khi bấm đóng trong lúc generating, show `toast` cảnh báo "Nội dung đang tạo sẽ tiếp tục ở nền" 

```text
Trước: canClose = !isGenerating && !isImageGenerating → chặn cứng
Sau:   Luôn cho đóng, nút X luôn hiển thị
```

### File cần sửa

- `src/components/multichannel/MobileGenerationSheet.tsx` -- Bỏ chặn đóng, luôn hiển thị nút X