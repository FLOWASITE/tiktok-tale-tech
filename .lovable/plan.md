

# Thêm nút "Viral tuần này" & "Theo trend" vào khu vực Ý tưởng chủ đề

## Vấn đề
Các nút quick action hữu ích ("Viral tuần này", "Theo trend", "Mùa lễ hội", "So sánh A vs B") hiện chỉ nằm bên trong Brainstorm AI chatbot. User phải mở sheet rồi mới thấy — không trực quan.

## Giải pháp
Thêm một hàng chip buttons trực tiếp vào `TopicIdeaHub`, phía trên danh sách gợi ý. Khi click, mở `TopicBrainstormSheet` với prompt tương ứng đã pre-fill.

## Thay đổi: `TopicIdeaHub.tsx`

1. **Import thêm**: `TopicBrainstormSheet`, icons (`Flame`, `TrendingUp`, `Gift`, `Zap`, `MessageSquare`, `Sparkles`)
2. **Thêm state**: `showBrainstormSheet`, `brainstormPrompt`
3. **Thêm hàng quick action chips** (trước `TopicSuggestionPanel`):
   - 🔥 Viral tuần này
   - 📈 Theo trend  
   - 🎁 Mùa lễ hội
   - ⚡ So sánh A vs B

   Mỗi chip khi click sẽ set `brainstormPrompt` và mở sheet.

4. **Render `TopicBrainstormSheet`** với `initialPrompt={brainstormPrompt}`
5. **Props mới**: Thêm `brandTemplateId` và `contentGoal` vào sheet

```text
Layout:
┌─────────────────────────────────────┐
│ 💡 Ý tưởng chủ đề           [▼]    │
├─────────────────────────────────────┤
│ 🔥 Viral  📈 Trend  🎁 Lễ hội  ⚡ │  ← NEW chips
│                                     │
│ [Suggestion 1]                      │
│ [Suggestion 2]                      │
│ ...                                 │
└─────────────────────────────────────┘
```

Style chips: nhỏ gọn (`h-6 text-[10px]`), `variant="outline"`, hover chuyển sang `bg-primary text-primary-foreground`.

Chỉ sửa 1 file: `TopicIdeaHub.tsx`.

