

## Thêm filter "Chưa được tạo nội dung" vào popover Đã tạo

### Mô tả
Thêm toggle/button lọc trong popover "Đã tạo" để chuyển đổi giữa:
1. **Tất cả** (default): Hiển thị toàn bộ topic history  
2. **Chưa được tạo nội dung**: Chỉ hiển thị các topic có `usageStatus` là `draft` | `suggested` | `selected` (chưa dùng để tạo content thực tế)

### Chi tiết kỹ thuật

**`src/components/TopicSuggestionPanel.tsx`**
- Thêm state `historyFilter: 'all' | 'unused'` (default 'all')
- Thêm 2 buttons trong header popover (dưới tiêu đề) để toggle filter
- Lọc `topicHistory` khi `historyFilter === 'unused'`: chỉ giữ items có `usageStatus` khác `created` và `published`
- Cập nhật empty state text cho trường hợp lọc "Chưa được tạo nội dung": "Không có chủ đề chưa được tạo nội dung"

**UI Implementation**
- 2 buttons nhỏ pill-shaped trong header popover (bên dưới "Chủ đề đã tạo trước đây")
- Button active có bg-primary, inactive có bg-muted
- Kích thước text-[10px] h-6

**Logic lọc**
```typescript
const filteredHistory = useMemo(() => {
  if (historyFilter === 'unused') {
    return topicHistory.filter(item => 
      !['created', 'published'].includes(item.usageStatus)
    );
  }
  return topicHistory;
}, [topicHistory, historyFilter]);
```

