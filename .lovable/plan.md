

# Hoàn thiện chế độ xem "Theo kênh"

## Vấn đề hiện tại

Chế độ xem đã hoạt động cơ bản nhưng còn thiếu một số chi tiết:

1. **Dùng `paginatedContents` thay vì `filteredContents`**: Channel view nhóm theo kênh nên cần dùng toàn bộ danh sách đã lọc, không phải danh sách đã phân trang — nếu không sẽ thiếu bài ở các kênh
2. **Loading skeleton không hỗ trợ channel mode**: Khi loading, channel view hiện skeleton của list view thay vì skeleton phù hợp
3. **Thiếu `onScheduleComplete`**: Grid view truyền callback này cho card nhưng ChannelGroupView thì không
4. **Thiếu thông tin trạng thái theo kênh**: Mỗi section kênh chỉ hiện badge tổng số bài — nên thêm mini-stats (đã đăng / chờ duyệt / nháp) để quản lý dễ hơn
5. **Ẩn pagination khi ở channel mode**: Pagination control không cần thiết khi xem theo kênh
6. **Thêm separator + collapsible**: Cho phép thu gọn từng section kênh để dễ dàng điều hướng khi có nhiều kênh

## Thay đổi

### 1. `src/pages/MultiChannel.tsx`
- Truyền `filteredContents` thay vì `paginatedContents` cho `ChannelGroupView`
- Ẩn phần pagination khi `viewMode === 'channel'`
- Thêm loading skeleton cho channel mode
- Truyền thêm `onScheduleComplete` prop

### 2. `src/components/multichannel/ChannelGroupView.tsx`
- Nhận thêm prop `onScheduleComplete`
- Thêm mini-stats cho mỗi channel section: badges hiển thị số bài draft / approved / published
- Thêm collapsible toggle cho mỗi section kênh (dùng `Collapsible` từ radix)
- Thêm separator giữa các section
- Truyền `onScheduleComplete` xuống `MultiChannelCard`

### Files
| File | Thay đổi |
|------|----------|
| `src/pages/MultiChannel.tsx` | Truyền `filteredContents`, ẩn pagination, loading skeleton channel |
| `src/components/multichannel/ChannelGroupView.tsx` | Mini-stats, collapsible sections, onScheduleComplete |

