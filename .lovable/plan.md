

## Hoàn thiện quản lý Lịch sử Chat

### Vấn đề chính
Hiện tại sidebar lịch sử và chatbot dùng **hai instance `useChatConversations` riêng biệt** — chúng không chia sẻ state. Khi chọn conversation ở sidebar, chatbot không load tin nhắn tương ứng. Nút "Cuộc hội thoại mới" ở sidebar cũng không hoạt động (`{/* handled by chatbot reset */}`). Và tin nhắn chat hiện vẫn lưu ở localStorage thay vì đồng bộ với database.

### Giải pháp: Shared State + Đồng bộ DB

**1. `src/pages/FlowaChatPage.tsx` — Một instance `useChatConversations` duy nhất**
- Chuyển `useChatConversations` lên FlowaChatPage, truyền xuống cả sidebar và chatbot
- Xóa `DesktopHistorySidebar` wrapper component (không cần riêng nữa)
- Khi sidebar chọn conversation → gọi `loadConversation` → chatbot nhận messages từ DB
- Khi nhấn "New conversation" → gọi `clearCurrentConversation` + `resetMessages`

**2. `src/components/topic/TopicAIChatbot.tsx` — Nhận conversation state từ props**
- Thêm props: `conversationState` chứa conversations, currentConversation, messages, actions
- Xóa instance `useChatConversations` nội bộ
- Khi user gửi tin nhắn đầu tiên (chưa có currentConversation) → tự động `createConversation`, sau đó `addMessage`
- Mỗi tin nhắn gửi/nhận → gọi `addMessage` để persist vào DB
- Khi load conversation từ sidebar → map `ChatConversationMessage[]` sang `ChatMessage[]` hiển thị

**3. `src/hooks/useChatMessages.ts` — Đồng bộ với DB thay vì chỉ localStorage**
- Khi `currentConversation` thay đổi → load messages từ DB và set vào state
- Giữ localStorage như fallback/cache
- `resetMessages` → gọi `clearCurrentConversation` + reset UI

**4. `src/components/topic/chatbot/ConversationHistorySidebar.tsx` — Cải thiện UX**
- Nhóm conversations theo ngày: Hôm nay / Hôm qua / Tuần này / Cũ hơn
- Highlight conversation đang active rõ ràng hơn
- Thêm skeleton loading khi đang load messages

**5. `src/components/topic/chatbot/ChatHeader.tsx` — Kết nối sidebar mobile**
- Mobile: mở Sheet sidebar → dùng cùng shared state
- Nút "New conversation" hoạt động đúng

### Luồng hoạt động mới

```text
FlowaChatPage
  └── useChatConversations (single instance)
       ├── ConversationHistorySidebar (desktop/mobile)
       │    ├── Select → loadConversation → messages load from DB
       │    └── New → clearCurrentConversation + resetMessages
       └── TopicAIChatbot
            ├── First message → auto createConversation
            ├── Each message → addMessage to DB
            └── Display messages from shared state
```

### File thay đổi
1. `src/pages/FlowaChatPage.tsx` — Shared state, bỏ wrapper
2. `src/components/topic/TopicAIChatbot.tsx` — Nhận conversation từ props, auto-create on first message, persist messages
3. `src/hooks/useChatMessages.ts` — Sync với conversation messages từ DB
4. `src/components/topic/chatbot/ConversationHistorySidebar.tsx` — Nhóm theo ngày
5. `src/components/topic/chatbot/ChatHeader.tsx` — Kết nối shared state cho mobile sidebar
6. `src/components/topic/chatbot/types.ts` — Thêm conversation props type

