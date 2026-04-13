

## Làm lại UI Flowa Team Chat trên Desktop

### Vấn đề hiện tại
Chat UI hiện tại có phong cách "chatbot widget" — nhỏ, chật, icon rất bé (3-3.5px), padding hẹp, wrap trong Card với border. Trên desktop 2071px, giao diện trông lạc lõng và không tận dụng không gian.

### Thiết kế mới — Modern AI Chat (kiểu ChatGPT/Claude)

```text
┌──────────────────────────────────────────────────────────┐
│ Desktop Layout                                           │
├────────────┬─────────────────────────────────────────────┤
│            │  ┌─ Header (slim, clean) ──────────────┐   │
│ History    │  │ Flowa Mind    [Pro] [New] [⋯]       │   │
│ Sidebar    │  └─────────────────────────────────────────┘│
│ (280px)    │                                             │
│            │  ┌─ Messages (centered, max-w-3xl) ────┐   │
│ [+ New]    │  │                                      │   │
│ Today      │  │  Welcome message                     │   │
│  ├ Conv 1  │  │  User bubble (right-aligned)         │   │
│  ├ Conv 2  │  │  AI response (left, spacious)        │   │
│ Yesterday  │  │                                      │   │
│  ├ Conv 3  │  └──────────────────────────────────────┘   │
│            │                                             │
│            │  ┌─ Input (centered, max-w-3xl) ────────┐  │
│            │  │ [textarea]              [Mic] [Send]  │  │
│            │  └──────────────────────────────────────────┘│
└────────────┴─────────────────────────────────────────────┘
```

### Thay đổi cụ thể

**1. `src/pages/FlowaChatPage.tsx` — Layout 2 cột cho desktop**
- Desktop: History Sidebar (280px, luôn hiển thị) + Chat area
- Mobile: giữ nguyên layout hiện tại (Sheet-based history)
- Sidebar sử dụng `ConversationHistorySidebar` component hiện có, nhưng render trực tiếp thay vì trong Sheet

**2. `src/components/topic/chatbot/ChatHeader.tsx` — Thiết kế lại header**
- Bỏ CardHeader, dùng div với border-b đơn giản
- Icon lớn hơn (w-4 h-4 → w-5 h-5), button lớn hơn (h-8 w-8)
- Bỏ gradient background, dùng background trong suốt
- Bỏ view tabs (Chat/Insights) — chuyển Insights vào dropdown
- Font size lớn hơn cho title (text-base)
- Loại bỏ History button trên desktop (vì sidebar luôn hiện)

**3. `src/components/topic/chatbot/ChatInputArea.tsx` — Input area hiện đại**
- Bỏ toolbar phía trên (markdown preview, shortcuts buttons) — chuyển vào dropdown
- Input textarea lớn hơn: min-h-[48px], font sm → base, padding rộng hơn
- Send button lớn hơn: h-10 w-10 → h-11 w-11
- Rounded-2xl thay vì rounded-xl
- Bỏ border-t cứng, dùng shadow-up subtle

**4. `src/components/topic/TopicAIChatbot.tsx` — Bỏ Card wrapper trên desktop**
- Desktop: Bỏ Card component, render trực tiếp với flex layout
- Bỏ border-2 border-primary/20
- Messages area căn giữa với max-w-3xl và padding thoải mái

**5. `src/components/topic/chatbot/SimpleMessageList.tsx` — Spacing thoáng hơn**
- Tăng gap giữa messages: pt-4 → pt-6
- Padding ngang rộng hơn: px-4 → px-6

### Nguyên tắc thiết kế
- Tuân thủ Soft Luxury: monochromatic, backdrop-blur, rounded-2xl
- Desktop-first: tận dụng không gian rộng
- Mobile không bị ảnh hưởng: dùng responsive breakpoints (lg:)

### File thay đổi
1. `src/pages/FlowaChatPage.tsx` — Layout 2 cột
2. `src/components/topic/chatbot/ChatHeader.tsx` — Header mới
3. `src/components/topic/chatbot/ChatInputArea.tsx` — Input mới
4. `src/components/topic/TopicAIChatbot.tsx` — Bỏ Card wrapper desktop
5. `src/components/topic/chatbot/SimpleMessageList.tsx` — Spacing

