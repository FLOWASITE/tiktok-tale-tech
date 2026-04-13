

## Làm gọn ChatHeader - Giảm số lượng icon hiển thị

### Vấn đề
Header đang có **9 icon liên tiếp** gây rối mắt: AI Pro Mode, New Chat, History, Search, Sound, Help, Artifacts, Refresh, và More menu. Cần giữ lại chỉ các icon thiết yếu.

### Giải pháp
Chỉ giữ **4 icon chính** trên header, ẩn các icon phụ vào dropdown menu:

| Giữ lại | Ẩn vào menu "More" |
|---------|-------------------|
| Brain (AI Pro Mode) | Search |
| SquarePen (New chat) | Volume |
| History | Help |
| Artifacts | Refresh |

### Thay đổi

**`src/components/topic/chatbot/ChatHeader.tsx`**
- Xóa các button Search, Sound, Help, Refresh khỏi vị trí hiện tại
- Thêm các chức năng này vào `DropdownMenuContent` (đã có trên mobile, mở rộng cho cả desktop)
- Đổi tên menu thành "Tùy chọn" cho rõ nghĩa
- Giữ nguyên 4 icon chính: Brain, SquarePen, History, Artifacts

Kết quả: Header gọn gàng, chỉ còn ~4-5 icon thay vì 9 icon chen chúc.

