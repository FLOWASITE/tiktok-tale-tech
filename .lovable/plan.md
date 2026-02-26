## Hiển thị Topics dạng Card với Action Buttons

### Mục tiêu

Thay thế nội dung research dạng text thô (đã bị ẩn) bằng danh sách **topic cards** đẹp mắt. Mỗi card hiển thị tên topic, score và có **3 nút hành động**: Multi-channel, Script, Carousel.

### Thiết kế UI

```text
┌─────────────────────────────────────────┐
│ [Star] Chủ đề được chọn:               │
│        "Topic refined..."               │
│ [Lightbulb] Lý do chọn: ...            │
├─────────────────────────────────────────┤
│ [Lightbulb] 5 topics gợi ý             │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Topic 1 (selected)        score: 85 │ │
│ │ reasoning text...          category │ │
│ │ [Multi] [Script] [Carousel]         │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Topic 2                   score: 72 │ │
│ │ reasoning text...          category │ │
│ │ [Multi] [Script] [Carousel]         │ │
│ └─────────────────────────────────────┘ │
│ ...                                     │
└─────────────────────────────────────────┘
```

### Chi tiết kỹ thuật

**File chỉnh sửa:** `src/components/topic/chatbot/ChatMessageBubble.tsx`

1. **Bỏ điều kiện ẩn** `!message.selectedTopic` ở dòng 208 -- nhưng thay vì show markdown thô, thêm block mới render `suggestedTopics` dạng cards ngay sau block "Chủ đề được chọn".
2. **Render suggested topics cards** khi `message.suggestedTopics` tồn tại:
  - Mỗi topic là 1 card với gradient border, hiển thị:
    - Tên topic (bold, có highlight nếu là selected topic)
    - Reasoning (text mô tả)
    - Score (badge màu theo mức: xanh >= 80, vàng >= 60, xám)
    - Category badge
  - 3 nút action: **Multi** (MessageSquare icon), **Script** (Video icon), **Carousel** (Images icon)
  - Nút action gọi `onTopicAction` với topic được convert sang `ExtractedTopic` format
  - Trong embedded mode: hiện nút "Chọn topic này" thay vì 3 nút action
3. **Giữ nguyên** block markdown cho các message không có `suggestedTopics` (message thường, không phải research result).
4. **Ẩn markdown thô** chỉ khi có `suggestedTopics` (thay vì check `selectedTopic` như trước), vì nội dung đã được thể hiện qua cards.

### Trình tự

1. Sửa điều kiện ẩn markdown: `!message.suggestedTopics?.length` thay vì `!message.selectedTopic`
2. Thêm block render suggested topic cards ngay sau block selected topic (sau dòng 286)
3. Mỗi card tái sử dụng cùng pattern action buttons đã có ở `extractedTopics` (dòng 362-425)