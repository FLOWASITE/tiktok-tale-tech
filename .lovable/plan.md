

## Xóa nút chat (FAB) trên trang tạo nội dung đa kênh

### Thay đổi

**File: `src/pages/MultiChannelCreate.tsx`**

Xóa block "Mobile Chat FAB + Drawer" (dòng 389-425) bao gồm:
- Nút tròn gradient cố định ở góc dưới phải (FAB)
- Drawer chứa TopicAIChatbot khi nhấn vào nút

Cũng dọn dẹp các import và state không còn dùng:
- `mobileChatOpen` state
- Import `Drawer`, `DrawerContent`, `DrawerHeader`, `DrawerTitle`
- Import `MessageSquare` (nếu không dùng ở chỗ khác)
- Import `TopicAIChatbot` (nếu không dùng ở chỗ khác trong file)

