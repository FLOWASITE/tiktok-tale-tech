

## Sửa popover "Đã tạo" không hiển thị đủ dữ liệu

### Nguyên nhân
Popover "Đã tạo" truyền `brandTemplateId` vào `useTopicHistory`, khiến hook chỉ query các topic có `brand_template_id` khớp chính xác. Trong khi đó, **96% topic history** (2658/2810 records) có `brand_template_id = NULL** — do trước đây hệ thống chưa liên kết topic với brand. Kết quả: popover gần như trống khi brand được chọn.

### Giải pháp
Bỏ prop `brandTemplateId` khi gọi `useTopicHistory` trong `TopicSuggestionPanel` — để popover luôn hiển thị **tất cả topic** của organization, không lọc theo brand. Logic lọc brand chỉ cần cho phần gợi ý AI, không cho lịch sử.

### Thay đổi

**`src/components/TopicSuggestionPanel.tsx`** — Dòng 133-136:
```typescript
// Trước:
const { history: topicHistory, ... } = useTopicHistory({
    brandTemplateId,
    enabled: true,
});

// Sau:
const { history: topicHistory, ... } = useTopicHistory({
    enabled: true,
});
```

1 dòng thay đổi duy nhất.

