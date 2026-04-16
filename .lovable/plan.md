

## Tăng giới hạn "Kho chủ đề" trong TopicSuggestionPanel

### Vấn đề
Dòng 168 trong `src/components/TopicSuggestionPanel.tsx` có hard-coded `.slice(0, 30)`, khiến popover "Kho chủ đề" luôn chỉ hiển thị tối đa 30 items dù database có nhiều hơn.

```typescript
const historyItems = useMemo(() => topicHistory.slice(0, 30), [topicHistory]);
```

### Giải pháp
Bỏ `.slice(0, 30)` để hiển thị toàn bộ `topicHistory` (đã được giới hạn 100 từ hook `useTopicHistory`). Popover đã có pagination (`ITEMS_PER_PAGE = 20`) và scroll nên không ảnh hưởng performance.

### Thay đổi
**File: `src/components/TopicSuggestionPanel.tsx`** (dòng 168)
- Đổi `topicHistory.slice(0, 30)` → `topicHistory` (bỏ slice)

### Không thay đổi
- Không thay đổi hook, database, hay component khác
- Pagination nội bộ popover (20 items/page) vẫn giữ nguyên

