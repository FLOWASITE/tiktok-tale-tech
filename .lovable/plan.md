

## Thêm nút "Chủ đề đã tạo" vào TopicSuggestionPanel

### Mô tả
Thêm một nút nhỏ bên cạnh badge "Mặc định" (vị trí khoanh đỏ trong screenshot) để mở danh sách các chủ đề đã tạo trước đây từ bảng `topic_history`. User click vào sẽ hiện popover/dropdown chứa danh sách topic cũ, click chọn sẽ điền vào ô chủ đề.

### Kiến trúc

```text
TopicSuggestionPanel header row:
  [Gợi ý chủ đề ∧]  ...  [📋 Đã tạo] [🔆 Mặc định] [🔄]
                            ↑ NÚT MỚI
                            → Click → Popover với danh sách topic_history
```

### Chi tiết kỹ thuật

**1. `src/components/TopicSuggestionPanel.tsx`**
- Thêm nút "Đã tạo" (icon `History` hoặc `Clock`) vào header row, trước badge source "Mặc định"
- Click mở Popover hiển thị danh sách topic từ `topic_history` (tối đa 10-15 gần nhất)
- Mỗi item hiển thị: topic text (truncate), ngày tạo, badge trạng thái (đã dùng/chưa dùng)
- Click vào item → gọi `onSelect(topic)` → đóng popover

**2. Props mới cho `TopicSuggestionPanel`**
- Thêm prop `onSelectHistory?: (topic: string) => void` (hoặc tái sử dụng `onSelect`)
- Thêm prop `brandTemplateId?: string` để query topic_history theo brand

**3. Hook lấy dữ liệu**
- Sử dụng hook `useTopicHistory` đã có sẵn (file `src/hooks/useTopicHistory.ts`)
- Query `topic_history` lọc theo `brand_template_id`, sắp xếp `created_at DESC`, limit 15

**4. `src/components/topic/TopicIdeaHub.tsx`**
- Truyền thêm `brandTemplateId` xuống `TopicSuggestionPanel`

**5. UI Popover**
- Dùng `Popover` + `PopoverTrigger` + `PopoverContent` từ shadcn
- Hiển thị danh sách scrollable (max-h-60)
- Empty state: "Chưa có chủ đề nào được tạo"
- Mỗi item: hover highlight, icon nhỏ cho trạng thái

### Files thay đổi
1. `src/components/TopicSuggestionPanel.tsx` — thêm nút + popover lịch sử
2. `src/components/topic/TopicIdeaHub.tsx` — truyền `brandTemplateId` prop

