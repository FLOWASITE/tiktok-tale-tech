

# Fix: Đăng bài Facebook kèm ảnh

## Nguyên nhân
`DirectPublishButton` hiện tại chỉ truyền `content` (text) mà **không truyền `mediaUrls`** (ảnh) cho edge function `publish-facebook`. Ảnh của mỗi kênh đã có sẵn trong `content.channel_images?.[channel]?.url` và `generatedImages[channel]`, nhưng không được forward xuống.

## Kế hoạch sửa

### 1. Thêm prop `mediaUrls` vào `DirectPublishButton`
- **File**: `src/components/social/DirectPublishButton.tsx`
- Thêm `mediaUrls?: string[]` vào interface `DirectPublishButtonProps`
- Truyền `mediaUrls` vào `publishOptions` khi gọi `publishToFacebook` / `publishToTwitter`
- Hiển thị preview ảnh trong confirmation dialog

### 2. Truyền ảnh từ `MultiChannelViewer` vào `DirectPublishButton`
- **File**: `src/components/MultiChannelViewer.tsx` (line ~1559)
- Lấy URL ảnh từ `generatedImages[channel] || content.channel_images?.[channel]?.url`
- Truyền vào prop `mediaUrls={imageUrl ? [imageUrl] : undefined}`

### 3. Truyền ảnh từ `SchedulePanel` vào `DirectPublishButton`
- **File**: `src/components/SchedulePanel.tsx` (line ~360)
- Tương tự, lấy ảnh từ `content.channel_images` và truyền vào

### 4. Edge function `publish-facebook` — không cần sửa
Code đã hỗ trợ `mediaUrls` đầy đủ (photo post via `/{pageId}/photos`). Chỉ thiếu phần truyền dữ liệu từ frontend.

## Tổng kết thay đổi
- 3 file frontend, 0 file backend
- Không thay đổi DB/RLS

