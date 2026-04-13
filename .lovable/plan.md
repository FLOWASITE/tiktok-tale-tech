

## Làm lại style Lịch sử Chat giống ChatGPT

### Thay đổi theo ảnh tham khảo

**1. `src/pages/FlowaChatPage.tsx` — Thêm toggle đóng/mở sidebar**
- Thêm state `sidebarOpen` (default: true)
- Khi đóng: sidebar width = 0, hiển thị nút mở lại (icon PanelLeft) ở góc trái chat area
- Animation mượt với `transition-all duration-300`

**2. `src/components/topic/chatbot/ConversationHistorySidebar.tsx` — Redesign giống ChatGPT**
- **Header**: Nút đóng sidebar (PanelLeftClose) + nút "Đoạn chat mới" (SquarePen icon) trên cùng một dòng, bỏ text "Lịch sử chat"
- **Search**: Giữ thanh tìm kiếm "Tìm kiếm đoạn chat" bên dưới header
- **Conversation items**: Đơn giản hóa — chỉ hiển thị title (1 dòng, truncate), bỏ icon MessageSquare, bỏ summary, bỏ timestamp/message count. Active item có background nhẹ
- **Hover actions**: Menu 3 chấm chỉ hiện khi hover
- **Date groups**: Giữ nhóm theo ngày nhưng style nhẹ hơn (text nhỏ, muted)
- **Footer**: Hiển thị user info + plan badge ở cuối sidebar (giống ChatGPT)
- Props mới: `onCollapse` callback

**3. `src/components/topic/chatbot/ChatHeader.tsx` — Thêm nút mở sidebar khi collapsed**
- Khi sidebar đóng: hiển thị nút PanelLeft ở đầu header để mở lại

### Style mục tiêu
- Nền sidebar: `bg-sidebar` hoặc `bg-muted/30` 
- Items: padding `py-2 px-3`, text `text-sm`, no border/shadow
- Active: `bg-primary/10` subtle
- Hover: `bg-muted/50`
- Tổng thể: clean, minimal, monochromatic

### File thay đổi
1. `src/pages/FlowaChatPage.tsx` — Toggle sidebar state
2. `src/components/topic/chatbot/ConversationHistorySidebar.tsx` — Redesign UI
3. `src/components/topic/chatbot/ChatHeader.tsx` — Nút mở sidebar khi collapsed

