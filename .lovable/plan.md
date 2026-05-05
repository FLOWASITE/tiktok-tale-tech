## Vấn đề
`useTopicHistory` mặc định `limit = 100` nên Kho ý tưởng chỉ tải 100 item đầu. Nút "Tải thêm" trong `TopicBankGrid` còn bị ẩn khi user áp filter (search/category/date/view), khiến lọc trên >100 topic bị thiếu.

## Thay đổi

### 1. `src/hooks/useTopicHistory.ts`
- Tăng `limit` mặc định từ `100` → `500` (giữ option để caller override).
- Đảm bảo `loadMore` dùng `range(offset, offset + limit - 1)` (hiện đang `offset + limit` — off-by-one làm trùng 1 item; sửa luôn).

### 2. `src/components/topic/TopicBankGrid.tsx`
- Bỏ điều kiện ẩn nút "Tải thêm" khi có filter — chỉ cần `hasMore` là show. Lý do: filter là client-side trên `history`, nên cần load đủ data thì lọc mới chính xác.
- Hiển thị thêm tổng số đã tải vs `stats.totalTopics` (vd: "Hiển thị 45 / Đã tải 350 ý tưởng") để user biết còn data.
- Tự gọi `loadMore()` 1 lần khi user áp filter mà `filteredItems.length === 0` và `hasMore === true` (auto-fetch giúp UX mượt).

### 3. `src/pages/Topics.tsx` & `src/components/topic/MobileTopicBankSheet.tsx`
- Truyền `limit: 500` rõ ràng (hoặc dựa default mới) — không thay đổi gì khác.

## Không động tới
- Schema DB, RLS, edge function.
- Logic save/draft/favorite.
- `QuickSearch`, `ContentPipelineView`, `AILearningDashboard` — vẫn dùng default mới (500), không ảnh hưởng vì các view này hiển thị giới hạn khác.
