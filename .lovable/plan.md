
Mục tiêu: loại sạch phần màu đỏ/hồng/violet còn sót trong toàn bộ UI chat, không chỉ input. Giữ đỏ chỉ cho trạng thái nguy hiểm như Xóa/Lỗi.

Vì sao bản trước chưa hết:
- Bản trước mới xử lý `ChatInputArea.tsx` + một phần `index.css`.
- Màu lèo loẹt vẫn còn nằm ở 2 chỗ gốc:
  1. Token theme global vẫn là hồng đỏ (`--primary`, `--accent`, `--ring`) trong `src/index.css`
  2. Nhiều component chat vẫn hard-code gradient `from-primary / to-violet / fuchsia` và state `text-primary`, `bg-primary/10`, `ring-primary`

Kế hoạch sửa dứt điểm:

1. Chuẩn hóa lại palette sang “soft luxury” trong `src/index.css`
- Đổi `--primary`, `--accent`, `--ring`, `--sidebar-primary`, `--sidebar-ring` từ hồng đỏ sang tông neutral/charcoal/slate.
- Đổi các gradient/glow global (`--gradient-primary`, `--gradient-glow`, `--gradient-header`, `glow-primary`) sang neutral nhẹ hoặc bỏ hẳn.
- Giữ `--destructive` là đỏ để nút xóa/cảnh báo vẫn đúng ngữ nghĩa.

2. Sửa shared primitives để menu/input không còn highlight đỏ
- `src/components/ui/dropdown-menu.tsx`:
  - đổi trạng thái hover/focus/highlight item từ `bg-accent` sang muted neutral
  - thêm `data-[highlighted]` neutral để item “Phím tắt” không còn đỏ khi rê/chọn
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
  - đổi focus ring sang border/ring trung tính, bỏ cảm giác glow hồng

3. Sweep toàn bộ chat UI còn hard-code màu rực
- `src/components/topic/chatbot/ChatHeader.tsx`
  - bỏ avatar/logo gradient đỏ-tím
  - đổi active states của icon/menu về muted/foreground
  - bỏ glow ở nút AI Pro
- `src/components/topic/TopicAIChatbot.tsx`
  - đổi viền wrapper `border-primary/20` sang `border-border`
  - đổi nút scroll-to-bottom sang style neutral
- `src/components/topic/chatbot/AgentPipelineBar.tsx`
  - bỏ nền gradient đỏ-tím
  - active/completed pills dùng muted + neutral border
  - progress bar dùng neutral thay vì tím/hồng
- `src/components/topic/chatbot/SmartInputSuggestions.tsx`
  - bỏ chips gradient primary-violet
- `src/components/topic/chatbot/AgentMentionPopover.tsx`
  - bỏ selected state đỏ và icon tile gradient
- `src/components/topic/chatbot/ChatMessageBubble.tsx`
  - bỏ avatar assistant gradient đỏ-tím
  - đổi bubble user từ gradient sang solid neutral sạch
  - giữ readability tốt giữa user/assistant
- `src/components/topic/chatbot/BrandContextCard.tsx`
- `src/components/topic/chatbot/PersonalizedWelcome.tsx`
  - bỏ các halo/gradient/fuchsia background
- `src/components/topic/chatbot/MessageSkeleton.tsx`
- `src/components/topic/chatbot/MessageFeedback.tsx`
- `src/components/topic/chatbot/ChatOnboarding.tsx`
- `src/components/topic/chatbot/ContentPipelineSteps.tsx`
  - hạ toàn bộ `primary` highlight còn sót xuống muted/neutral

4. Nguyên tắc style sau khi sửa
- Không dùng đỏ/hồng/tím cho các trạng thái bình thường trong chat
- Primary của chat chuyển sang neutral sang trọng
- Hover/focus = muted nhẹ
- CTA chính = solid, không gradient
- Destructive vẫn đỏ để phân biệt rõ

5. Kiểm tra sau khi sửa
- Desktop `/chat`: header, menu 3 chấm, sidebar, search, input focus, mention popover, smart chips, pipeline bar, bubble user/assistant, nút cuộn xuống
- Mobile `/chat`: sheet lịch sử chat, dropdown/menu focus states
- Xác nhận không còn vùng nào “đỏ lèo loẹt”, trừ nút xóa/cảnh báo

Chi tiết kỹ thuật:
- File gốc gây ra vấn đề lớn nhất: `src/index.css`
- File còn hard-code màu rực nhất trong chat: `ChatHeader.tsx`, `TopicAIChatbot.tsx`, `AgentPipelineBar.tsx`, `ChatMessageBubble.tsx`, `SmartInputSuggestions.tsx`, `AgentMentionPopover.tsx`, `BrandContextCard.tsx`, `PersonalizedWelcome.tsx`
- Đây là một đợt “full sweep” cho chat UI, không phải vá lẻ từng nút nữa
