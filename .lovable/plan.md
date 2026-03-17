

# Hiển thị cả hai chỉ số: số bản nội dung và tổng bài trên kênh social

## Vấn đề
Hiện tại hệ thống chỉ đếm số **bản nội dung** (records trong `multi_channel_contents`), không đếm **tổng bài trên các kênh social** (tổng số phần tử trong mảng `selected_channels` của mỗi record). Ví dụ: 12 bản nội dung nhưng thực tế 22 bài trên social.

## Thay đổi

### 1. Sửa `src/hooks/useSubscription.ts`
- Thêm field `multichannel_social_posts` vào `UsageStats`
- Thay query `multi_channel_contents` từ `head: true` (chỉ đếm records) sang query thực tế lấy `selected_channels` rồi tính `sum(selected_channels.length)`
- Giữ nguyên `multichannel` (đếm bản nội dung) để so sánh với plan limit

### 2. Sửa `src/pages/Account.tsx`
- Thêm 1 dòng phụ dưới mục "Nội dung đa kênh" hiển thị tổng bài social posts (ví dụ: "22 bài trên social")
- Hoặc thêm 1 item mới trong usage grid cho "Bài trên Social"

### 3. Sửa `src/components/admin/UserDetailSheet.tsx`
- Fetch thêm tổng `selected_channels` cho user (query `selected_channels` column thay vì chỉ count)
- Hiển thị cả 2 số: "12 bản nội dung" và "22 bài trên social" trong phần "Tổng nội dung đã tạo"

### Chi tiết kỹ thuật
- Query `multi_channel_contents` với `select("selected_channels")` thay vì `head: true`
- Tính tổng: `data.reduce((sum, row) => sum + (row.selected_channels?.length || 0), 0)`
- Áp dụng cùng filter theo period cho trang Account, all-time cho Admin

### Scope
- **3 files**: `useSubscription.ts`, `Account.tsx`, `UserDetailSheet.tsx`
- Không cần migration

