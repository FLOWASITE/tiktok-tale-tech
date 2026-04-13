

# Thêm nút "Tạo cuộc hội thoại mới" ra ngoài Chat Header

## Vấn đề
Nút tạo cuộc hội thoại mới (`+`) chỉ xuất hiện bên trong `ConversationHistorySidebar`. Người dùng phải mở sidebar lịch sử trước rồi mới bấm được — không trực quan.

## Giải pháp
Thêm một nút `+` (hoặc icon `SquarePen`) trực tiếp lên `ChatHeader`, cạnh nút History, để tạo cuộc hội thoại mới mà không cần mở sidebar.

## Thay đổi

### `src/components/topic/chatbot/ChatHeader.tsx`
- Thêm một `Button` mới với icon `SquarePen` (hoặc `Plus`) ngay trước hoặc sau nút History
- `onClick` gọi `onNewConversation` trực tiếp
- Tooltip: "Cuộc hội thoại mới"
- Kích thước nhất quán: `h-6 w-6 sm:h-7 sm:w-7`

Chỉ cần sửa 1 file duy nhất.

