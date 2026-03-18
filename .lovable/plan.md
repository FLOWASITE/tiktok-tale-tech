

# Quick Action chips hoạt động trực tiếp — không mở Brainstorm AI

## Vấn đề
Hiện tại click chip "Viral tuần này", "Theo trend"... đều mở `TopicBrainstormSheet`. User muốn hành động nhanh hơn — click là có kết quả ngay, không qua chatbot.

## Giải pháp
Khi click chip, trực tiếp chèn một chủ đề mẫu phù hợp vào ô nhập topic qua `onSelect()`. Mỗi chip có danh sách 3-4 chủ đề mẫu, click sẽ chọn ngẫu nhiên 1 cái và fill vào input.

## Thay đổi: `TopicIdeaHub.tsx`

1. **Chuyển `QUICK_ACTIONS`** từ dạng `{ prompt }` sang `{ topics: string[] }` — mỗi chip chứa danh sách chủ đề mẫu thay vì prompt cho AI
2. **`handleQuickAction`** → gọi `onSelect(randomTopic)` thay vì mở sheet
3. **Xóa** state `showBrainstormSheet`, `brainstormPrompt` và `TopicBrainstormSheet` render

```text
Trước: Click chip → mở Brainstorm Sheet → chat AI → chọn topic
Sau:   Click chip → fill topic ngay vào input (random từ danh sách mẫu)
```

Ví dụ topics cho mỗi chip:
- **Viral tuần này**: "Top xu hướng viral đang được chia sẻ nhiều nhất tuần này", "Hiện tượng mạng tuần này và góc nhìn chuyên gia", ...
- **Theo trend**: "Bắt trend mới nhất: Phân tích và ứng dụng cho thương hiệu", ...
- **Mùa lễ hội**: "Chiến lược nội dung mùa lễ hội sắp tới", ...
- **So sánh A vs B**: "So sánh phương pháp truyền thống vs hiện đại", ...

Chỉ sửa 1 file: `TopicIdeaHub.tsx`.

