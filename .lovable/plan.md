

## Sửa lỗi Lịch sử Chat không hiện đoạn chat

### Nguyên nhân gốc

Có 3 vấn đề chính:

1. **Title không đồng bộ lên sidebar**: Khi `addMessage` cập nhật title cục bộ cho `currentConversation`, nó **không cập nhật** title trong mảng `conversations` (sidebar đọc từ mảng này). Sidebar luôn hiện "Cuộc hội thoại mới".

2. **Title không lưu vào DB**: Title chỉ set local (`content.slice(0, 100)`) nhưng không gọi `updateConversation` để persist xuống database. Khi reload, title mất.

3. **Conversation có thể không hiện sau khi tạo**: Nếu `createConversation` thành công nhưng `addMessage` gọi trước khi `currentConversation` được set (do async timing), message không được lưu. Và sidebar cần được cập nhật title ngay khi user gửi tin nhắn đầu tiên.

### Giải pháp

**1. `src/hooks/useChatConversations.ts` — Đồng bộ title vào conversations list + persist**
- Trong `addMessage`: khi set title local, cũng cập nhật trong mảng `conversations` (cho sidebar)
- Sau khi set title lần đầu, gọi `updateConversation` API để persist title xuống DB
- Đảm bảo `conversations` list luôn reflect title mới nhất

**2. `src/components/topic/TopicAIChatbot.tsx` — Fix async timing**
- Sau `createConversation`, đợi result rồi mới gọi `addMessageToDB` (đã đúng logic nhưng cần đảm bảo `currentConversation` đã set trước khi gọi)
- Truyền `conversationId` trực tiếp vào `addMessageToDB` thay vì rely on `currentConversation` state

**3. `src/hooks/useChatConversations.ts` — `addMessage` nhận `conversationId` parameter**
- Thêm optional `conversationId` param để có thể gọi ngay sau `createConversation` mà không cần đợi state update

### File thay đổi
1. `src/hooks/useChatConversations.ts` — Fix title sync + persist + addMessage nhận conversationId
2. `src/components/topic/TopicAIChatbot.tsx` — Truyền conversationId trực tiếp khi addMessage
3. `src/components/topic/chatbot/types.ts` — Update addMessageToDB signature

