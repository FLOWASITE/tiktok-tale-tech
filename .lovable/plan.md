

## Chuyển 2 nút vào menu dấu 3 chấm

### Phân tích
Từ ảnh và code hiện tại:
1. **Nút "Đoạn chat mới"**: Hiện đang là Button riêng trong ChatHeader
2. **Nút keyboard shortcuts**: Có state `showShortcutsHint` trong useChatInput nhưng chưa có UI để toggle (có thể đây là nút thứ 2 trong ảnh)

### Giải pháp

**1. `src/components/topic/chatbot/ChatHeader.tsx`**
- Xóa Button "Đoạn chat mới" khỏi header (lines 138-149)
- Thêm 2 item vào DropdownMenu:
  - "Đoạn chat mới" với icon SquarePen
  - "Phím tắt" với icon Keyboard (toggle `onToggleShortcutsHint`)
- Thêm prop `onToggleShortcutsHint?: () => void` vào ChatHeaderProps

**2. `src/components/topic/TopicAIChatbot.tsx`**
- Truyền `onToggleShortcutsHint: () => inputHook.setShowShortcutsHint(!inputHook.showShortcutsHint)` vào ChatHeader

### Kết quả
Header gọn hơn — chỉ còn các icon chính (Brain, History, Artifacts, Menu). Các tính năng phụ (Tạo chat mới, Phím tắt) vào trong menu dấu 3 chấm.

