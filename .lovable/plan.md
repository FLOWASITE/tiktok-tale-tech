
Di chuyển "Kho Ý Tưởng" từ sidebar (`AppSidebar.tsx`) vào dropdown menu "..." trên ChatHeader (Flowa Mind/Team menu).

## Thay đổi

**1. `src/components/AppSidebar.tsx`**
- Xóa item `Kho Ý Tưởng` (`/topics`) khỏi `quickItems` array.

**2. `src/components/topic/chatbot/ChatHeader.tsx`**
- Thêm `DropdownMenuItem` "Kho Ý Tưởng" với icon `Lightbulb`, đặt trên cùng (trước "Đoạn chat mới") hoặc sau "Xem Insights" — sẽ đặt sau "Đoạn chat mới" để gom nhóm điều hướng.
- onClick: `navigate('/topics')` — cần dùng `useNavigate` từ react-router-dom (kiểm tra xem ChatHeader đã có sẵn chưa, nếu chưa thì import).

## Giữ nguyên
- Route `/topics` và page `Topics.tsx` không đổi.
- Các link nội bộ tới `/topics` (TopicSuggestionPanel, ScriptTopicDiscoveryPanel) giữ nguyên.
