

# Cải thiện UI chế độ "Theo kênh" cho Social

## Tổng quan
Nâng cấp giao diện Channel Group View với 3 cải thiện: header kênh có màu brand, thông tin tài khoản đã kết nối, và nút hành động nhanh theo kênh.

## Thay đổi

### 1. `src/components/multichannel/ChannelGroupView.tsx` — Redesign toàn bộ

**Header kênh nổi bật hơn:**
- Áp dụng màu brand từ `channelColors.ts` cho mỗi section header (background gradient nhẹ + left border đậm)
- Icon kênh lớn hơn (size `lg`) với background brand color
- Label kênh đậm hơn, font size lớn hơn

**Thông tin kết nối social:**
- Nhận thêm prop `socialConnections` từ hook `useSocialConnections`
- Hiển thị avatar + username tài khoản đã kết nối bên cạnh tên kênh
- Badge "Đã kết nối" (xanh) hoặc "Chưa kết nối" (cam) 

**Nút hành động nhanh:**
- Thêm nút "Đăng tất cả" (cho bài approved chưa đăng) ở góc phải header mỗi kênh
- Nút "Lên lịch" cho bulk schedule theo kênh
- Các nút chỉ hiện khi có bài eligible (approved + chưa published)

### 2. `src/pages/MultiChannel.tsx` — Truyền thêm data

- Gọi `useSocialConnections` để lấy danh sách kết nối
- Truyền `socialConnections` xuống `ChannelGroupView`
- Cần lấy `brandTemplateId` từ content hoặc filter hiện tại

### 3. `src/components/multichannel/ChannelGroupView.tsx` — Layout chi tiết

```text
┌─────────────────────────────────────────────────────┐
│ 🔵 Facebook  @MyPage • Đã kết nối    [Đăng tất cả] │
│  3 bài  |  1 đã đăng  |  1 duyệt  |  1 nháp        │
├─────────────────────────────────────────────────────┤
│ [Card] [Card] [Card]                                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ⬛ X (Twitter)  @handle • Đã kết nối  [Đăng tất cả] │
│  2 bài  |  2 đã đăng                                │
├─────────────────────────────────────────────────────┤
│ [Card] [Card]                                       │
└─────────────────────────────────────────────────────┘
```

## Technical Details

| File | Thay đổi |
|------|----------|
| `src/components/multichannel/ChannelGroupView.tsx` | Redesign header với brand colors, connection info, action buttons |
| `src/pages/MultiChannel.tsx` | Gọi `useSocialConnections`, truyền connections xuống |
| `src/utils/channelColors.ts` | Đã có sẵn, dùng trực tiếp |

**Props mới cho ChannelGroupView:**
- `socialConnections?: SocialConnection[]` — danh sách kết nối social active

**Mapping kênh → connection:**
- Map `Channel` type sang `SocialPlatform` (twitter↔twitter, facebook↔facebook...)
- Tìm connection có `is_active === true` matching platform
- Hiển thị `platform_avatar_url` + `platform_username`

**Nút "Đăng tất cả":**
- Filter items có `status === 'approved'` và channel chưa published trong `channel_statuses`
- Gọi publish tuần tự hoặc song song cho từng bài eligible
- Disable nút khi không có connection hoặc không có bài eligible

