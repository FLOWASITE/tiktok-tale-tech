

## Loại bỏ màu đỏ/hồng lòe loẹt

### Vấn đề
Từ 3 ảnh user gửi:
1. **Dropdown menu**: Item "Phím tắt" bị highlight màu hồng đỏ rực
2. **Sidebar**: Nút "Đoạn chat mới" có background gradient hồng, search input viền hồng
3. **Chat input**: Viền đôi màu hồng khi focus (từ `chat-input-glow` CSS class + `border-2` + `focus:ring-primary`)

### Nguyên nhân gốc
Primary color là `340 82% 52%` (hồng đỏ TikTok). Nó bị dùng quá nhiều: gradient buttons, focus glow, border glow → tạo cảm giác "màu mè".

### Giải pháp: Giữ lại primary nhưng giảm intensity

**1. `src/components/topic/chatbot/ConversationHistorySidebar.tsx`**
- Nút "Đoạn chat mới": đổi thành style tối giản — `variant="outline"` hoặc ghost đơn giản, không gradient, không shadow
- Search input: giữ nguyên (đã dùng `border-0`, `bg-transparent`)

**2. `src/components/topic/chatbot/ChatInputArea.tsx`**
- Textarea: bỏ `border-2` → `border`, bỏ `focus:ring-2 focus:ring-primary/10` → dùng ring nhẹ hơn `focus:ring-1 focus:ring-border`
- Bỏ class `chat-input-glow` khỏi wrapper div (loại bỏ double glow effect hồng)
- Nút Send: bỏ gradient `from-primary to-violet-600`, đổi thành `bg-primary hover:bg-primary/90` đơn giản, bỏ `shadow-lg shadow-primary/25`

**3. `src/index.css`**
- Loại bỏ hoặc giảm `.chat-input-glow` — thay bằng subtle border thay vì glow hồng

### Kết quả
UI sạch sẽ, monochromatic theo phong cách Soft Luxury — không còn gradient hồng lòe loẹt ở input, button và focus states.

