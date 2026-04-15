

## Thêm phân trang (Pagination) cho Kho chủ đề

### Thay đổi

Thêm pagination vào popover Kho chủ đề, hiển thị 10 items/trang với điều hướng ở footer.

### Chi tiết kỹ thuật

**File: `src/components/TopicSuggestionPanel.tsx`**

1. **Thêm state**: `historyPage` (default 1), reset về 1 khi filter/search/sort thay đổi
2. **Tính toán phân trang**:
   - `ITEMS_PER_PAGE = 10`
   - `totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE)`
   - `paginatedHistory = filteredHistory.slice((page-1)*10, page*10)`
3. **Render `paginatedHistory`** thay vì `filteredHistory` trong cả list view và grid view (lines 492, 553)
4. **UI pagination ở footer** (line 732, trước bulk actions):
   - Khi `totalPages > 1`: hiển thị row với nút Prev/Next + "Trang X/Y"
   - Nút Previous/Next dùng `ChevronLeft`/`ChevronRight` icon, disable khi ở đầu/cuối
   - Style nhỏ gọn phù hợp popover: `text-[10px]`, `h-6` buttons
5. **Reset page**: Thêm `useEffect` reset `historyPage = 1` khi `historyFilter`, `historySearch`, `historySortBy` thay đổi

### Không thay đổi
- Database, hook logic, hoặc file khác

