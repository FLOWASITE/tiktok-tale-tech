

## Nâng cấp UI và chức năng Popover "Đã tạo"

### Hiện trạng
Popover "Đã tạo" hiện có: header, 2 filter tabs (Tất cả / Chưa tạo nội dung), danh sách topic với category icon + date + status badge, và link sang Kho Ý Tưởng. Tuy nhiên UI khá đơn giản và thiếu nhiều tương tác.

### Các cải tiến

**1. Mở rộng filter tabs**
- Thêm tab "Yêu thích" (filter `isFavorite`)
- Thêm tab "Đã tạo" (filter `created`/`published`)
- Hiển thị count cho từng tab

**2. Tìm kiếm nhanh trong popover**
- Thêm ô search nhỏ phía trên danh sách
- Filter real-time theo topic text

**3. Hover actions trên mỗi item**
- Nút Star (toggle favorite) hiện khi hover
- Nút Delete hiện khi hover
- Nút "Dùng lại" rõ ràng hơn với icon

**4. Hiển thị thêm thông tin**
- Số lần sử dụng (use count) nếu topic đã dùng nhiều lần
- Related keywords dưới dạng mini tags
- Performance score bar nhỏ (nếu có)

**5. Empty state cải tiến**
- Illustration/icon phù hợp cho từng filter tab khi trống
- CTA "Chọn gợi ý bên dưới để bắt đầu"

**6. Popover rộng hơn và scroll mượt hơn**
- Tăng width từ `w-72` lên `w-80`
- Thêm max height rõ ràng hơn và smooth scroll

### Files thay đổi
- `src/components/TopicSuggestionPanel.tsx` — Nâng cấp toàn bộ popover section (lines 254-377)

### Chi tiết kỹ thuật
- Thêm state `searchQuery` cho popover search
- Mở rộng `historyFilter` type thành `'all' | 'unused' | 'favorites' | 'used'`
- Sử dụng data đã có từ `useTopicHistory` (`toggleFavorite`, `deleteTopic`, `isFavorite`, `performanceScore`)
- Expose thêm `toggleFavorite` và `deleteTopic` từ hook call hiện tại
- Thêm hover group actions cho mỗi item row
- Không cần thay đổi database hay hook logic

