

## Sửa chữ tràn khỏi ô chat

### Nguyên nhân
Trong `ChatMessageBubble.tsx` (line 156-157), container bubble có `max-w-[90%]` nhưng thiếu `overflow-hidden` và `break-words`. Khi nội dung chứa chuỗi dài không có dấu cách (như JSON, URL), text sẽ tràn ra ngoài khung.

### Giải pháp

**`src/components/topic/chatbot/ChatMessageBubble.tsx`** — Line 156-157:

Thêm `overflow-hidden break-words` vào class của div bubble:

```tsx
// Trước
'relative group/message rounded-2xl px-3.5 py-2.5 max-w-[90%] text-sm transition-all duration-200',

// Sau
'relative group/message rounded-2xl px-3.5 py-2.5 max-w-[90%] text-sm transition-all duration-200 overflow-hidden break-words',
```

Đồng thời thêm `overflow-x-auto` hoặc `overflow-wrap: anywhere` vào div markdown content (line 213) để đảm bảo code blocks và JSON cũng không tràn:

```tsx
// Line 213 — thêm [overflow-wrap:anywhere]
"text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 [overflow-wrap:anywhere]"
```

### Kết quả
Text dài (JSON, URL, code inline) sẽ tự động xuống dòng trong ô chat thay vì tràn ra ngoài.

