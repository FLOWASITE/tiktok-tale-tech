

# Fix: Quick action buttons làm mất danh sách gợi ý

## Phân tích vấn đề
Khi click nút "Viral tuần này", "Theo trend"... hiện tại chỉ chọn **ngẫu nhiên 1 chủ đề** và fill vào input. Các chủ đề còn lại trong nhóm đó "mất đi" — user không thấy được danh sách đầy đủ để chọn.

## Giải pháp
Thay vì chọn ngẫu nhiên 1 topic, khi click chip sẽ **hiển thị tất cả topics của nhóm đó** dưới dạng danh sách chips bên dưới, để user tự chọn topic mong muốn. Click vào topic cụ thể mới fill vào input.

## Thay đổi: `TopicIdeaHub.tsx`

1. **Thêm state `activeCategory`** — theo dõi nhóm quick action đang mở (hoặc `null` nếu không có)
2. **Click chip** → toggle `activeCategory` thay vì gọi `onSelect` ngay
3. **Render danh sách topics** của category đang active bên dưới hàng chips, mỗi topic là 1 chip nhỏ có thể click
4. **Click vào topic cụ thể** → gọi `onSelect(topic)` và giữ nguyên danh sách (không đóng)
5. **Giữ nguyên `TopicSuggestionPanel`** bên dưới — không bị ảnh hưởng

```text
Layout khi click "Viral tuần này":
┌─────────────────────────────────────┐
│ 💡 Ý tưởng chủ đề           [▼]    │
├─────────────────────────────────────┤
│ [🔥 Viral✓] [📈 Trend] [🎁] [⚡]  │
│                                     │
│  → Top xu hướng viral tuần này      │  ← expanded topics
│  → Hiện tượng mạng tuần này...      │
│  → Nội dung triệu view tuần này... │
│  → Chủ đề hot nhất tuần này...      │
│                                     │
│ ── Gợi ý chủ đề [AI] [↻] ──       │  ← vẫn hiển thị
│ [suggestion 1] [suggestion 2] ...   │
└─────────────────────────────────────┘
```

Chỉ sửa 1 file: `TopicIdeaHub.tsx`.

