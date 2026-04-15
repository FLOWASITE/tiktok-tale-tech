## Nâng cấp chức năng Kho chủ đề

### Hiện trạng

Popover "Kho chủ đề" hiện có: search, 4 filter tabs (Tất cả/Chưa dùng/Yêu thích/Đã tạo), danh sách với hover actions (star/reuse/delete), và link sang Kho Ý Tưởng. Thiếu nhiều chức năng quản lý nâng cao.

### Các cải tiến mới

**1. Sắp xếp (Sort)**

- Thêm dropdown sort bên cạnh search: Mới nhất, Cũ nhất, Điểm cao nhất, A-Z
- Default: Mới nhất (hiện tại)

**2. Hiển thị 2 chế độ: List / Compact Grid**

- Toggle nhỏ (List/Grid icon) ở header
- Grid mode: hiển thị dạng tag cards nhỏ gọn, 2 cột, chỉ topic + category icon + star
- List mode: giữ nguyên layout hiện tại

**3. Thống kê mini ở header**

- Bar nhỏ hiển thị: tỷ lệ đã dùng / chưa dùng dưới dạng progress bar mỏng
- Tooltip chi tiết khi hover

**4. Bulk actions**

- Checkbox nhỏ hiện khi hover bên trái mỗi item
- Khi có item được chọn: hiện thanh actions ở footer (Xóa hàng loạt, Đánh dấu yêu thích hàng loạt)

**5. Drag to reorder / Pin to top**

- Nút "Pin" trong hover actions — đẩy topic lên đầu danh sách
- Pinned items hiển thị với icon pin nhỏ, luôn ở trên cùng

**6. Quick preview on hover**

- Khi hover vào topic > 1s: hiện tooltip mở rộng với reasoning, full keywords, scores breakdown
- Không cần click vào để xem chi tiết

&nbsp;

### Files thay đổi

- `src/components/TopicSuggestionPanel.tsx` — Toàn bộ popover section (lines 275-517)
- `src/hooks/useTopicHistory.ts` — Thêm `pinTopic`, `bulkDelete`, `bulkToggleFavorite` methods

### Chi tiết kỹ thuật

- Sort: thêm state `historySortBy` với useMemo sort trên `filteredHistory`
- View mode: state `historyViewMode: 'list' | 'grid'`
- Bulk select: state `selectedHistoryIds: Set<string>`, checkbox toggle per item
- Pin: update `topic_history` row với field `is_pinned` (cần migration thêm column `is_pinned boolean default false`)
- Quick preview: `HoverCard` từ radix-ui (đã có trong project) với delay 800ms
  &nbsp;

### Database migration

```sql
ALTER TABLE public.topic_history ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
```