

# Tích hợp nút Gallery trong MultiChannelViewer với trang Gallery (Sidebar)

## Hiện tại
- Nút Gallery trong toolbar MultiChannelViewer → mở panel inline `ChannelImagesGallery` (chỉ hiển thị ảnh của bài viết hiện tại)
- Trang Gallery (`/gallery`) trong sidebar → hiển thị `CarouselGalleryView` với tất cả ảnh từ carousel + multichannel, có filter, search, folder view

## Thay đổi

### Đổi hành vi nút Gallery: navigate sang `/gallery` thay vì toggle panel inline
- Click nút Gallery → đóng dialog MultiChannelViewer → navigate sang `/gallery`
- Truyền `contentId` hoặc `contentTitle` qua URL query param để Gallery page có thể auto-filter cho bài viết đang xem
- Ví dụ: `/gallery?content=<contentId>`

### Cập nhật Gallery page: nhận query param và auto-filter
- Đọc `content` query param từ URL
- Nếu có → auto-set `folderFilter` hoặc `searchQuery` để lọc ảnh của bài viết đó
- Hiển thị breadcrumb "Gallery > [Tên bài viết]" khi đang filter theo content

### Cleanup
- Bỏ state `showGallery` và panel inline `ChannelImagesGallery` trong MultiChannelViewer
- Giữ component `ChannelImagesGallery` vì có thể dùng nơi khác

## Files cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/MultiChannelViewer.tsx` | Bỏ `showGallery` state, đổi onClick nút Gallery thành navigate `/gallery?content=id` |
| `src/pages/Gallery.tsx` | Đọc query param `content`, auto-filter theo contentId |
| `src/hooks/useCarouselGallery.ts` | Thêm support filter theo `contentId` param |

