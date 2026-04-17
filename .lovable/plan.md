
User muốn xóa 2 menu "Curated Events" và "Curated News" khỏi sidebar Admin vì thấy vô nghĩa.

## Kế hoạch

### Thay đổi
**File:** `src/components/AppSidebar.tsx`
- Xóa menu item "Curated Events" (`/admin/curated-events`)
- Xóa menu item "Curated News" (`/admin/curated-news`)

### Không thay đổi
- Giữ nguyên routes và pages (`AdminCuratedEvents`, `AdminCuratedNews`) — chỉ ẩn khỏi sidebar, không xóa code/data
- Giữ nguyên hook `useCuratedNews`, types `curatedData.ts`, bảng DB `curated_events` / `curated_news` — vì có thể đang được dùng bởi tính năng khác (trending topics, AI suggestions)
- Không động đến edge functions

### Lý do giữ data layer
Curated data có thể được consume bởi hệ thống Trending Topics / AI content generation (xem `HybridTrendingTopic` với source `curated_event` / `curated_news`). Chỉ ẩn UI admin, không phá backend.
