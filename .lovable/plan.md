

## Banner nhắc nhở kết nối social khi tạo nội dung

### Vấn đề
User chọn kênh xuất bản (Facebook, Instagram...) ở Step 4 nhưng không biết brand chưa kết nối kênh đó → tạo xong nội dung mới phát hiện không đăng được.

### Giải pháp
Thêm banner cảnh báo ngay dưới phần "Kênh xuất bản" (CompactChannelGrid) trong Step 4 khi có kênh được chọn mà brand chưa kết nối.

### Thay đổi

**1. Tạo component mới: `src/components/multichannel/UnconnectedChannelsBanner.tsx`**
- Nhận props: `selectedChannels`, `brandTemplateId`
- Dùng `useSocialConnections({ brandTemplateId })` để lấy danh sách kết nối
- So sánh kênh đã chọn vs kênh đã kết nối → lọc ra kênh chưa kết nối
- Nếu không có kênh nào chưa kết nối → render null
- UI: Banner nhỏ màu amber/warning với icon AlertTriangle, liệt kê tên kênh chưa kết nối, kèm nút "Kết nối ngay" dẫn đến trang Brand → tab Kết nối

```text
┌─ ⚠️ ─────────────────────────────────────────┐
│  2 kênh chưa kết nối: Facebook, Instagram    │
│  Bạn cần kết nối để đăng bài tự động         │
│                          [Kết nối ngay →]     │
└───────────────────────────────────────────────┘
```

**2. Sửa `src/components/multichannel/MultiChannelFormWizard.tsx`**
- Import `UnconnectedChannelsBanner`
- Chèn ngay sau `CompactChannelGrid` (line ~1846), trước gradient divider
- Truyền `selectedChannels={formData.channels}` và `brandTemplateId`

### Mapping kênh
Một số kênh trong form dùng tên khác với platform trong `social_connections`:
- `facebook` → `facebook`
- `instagram` → `instagram`
- `tiktok` → `tiktok`
- `linkedin` → `linkedin`
- `threads` → `threads`
- `youtube` → `youtube`
- `twitter`/`x` → `twitter`
- `website`/`blog` → `website`
- `zalo` → `zalo_oa`

Banner sẽ chỉ cảnh báo cho các kênh có thể publish trực tiếp (không bao gồm `email`, `newsletter`...).

### File cần tạo/sửa
- **Tạo**: `src/components/multichannel/UnconnectedChannelsBanner.tsx`
- **Sửa**: `src/components/multichannel/MultiChannelFormWizard.tsx` (thêm import + 1 dòng JSX)

