

## Plan: Gallery dạng Folder — Mỗi Content là 1 Folder chứa ảnh

### Ý tưởng
Thay vì hiển thị flat grid tất cả ảnh, Gallery sẽ hiển thị theo 2 cấp:
- **Cấp 1 (mặc định):** Grid các "Folder Card" — mỗi card đại diện 1 content (carousel hoặc multichannel), hiển thị thumbnail, tên, số ảnh, nguồn, người tạo
- **Cấp 2 (khi click vào folder):** Mở ra grid ảnh bên trong folder đó (giữ nguyên UI ảnh hiện tại)

### UI Flow

```text
┌─────────────────────────────────────────┐
│  Gallery                                │
│  Stats cards (giữ nguyên)               │
│                                         │
│  [Search] [Sort] [Grid] [Nguồn filter]  │
│                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ 📁thumb │ │ 📁thumb │ │ 📁thumb │   │
│  │ Title   │ │ Title   │ │ Title   │   │
│  │ 5 ảnh   │ │ 3 ảnh   │ │ 7 ảnh   │   │
│  │ Carousel│ │ Multi   │ │ Carousel│   │
│  └─────────┘ └─────────┘ └─────────┘   │
│                                         │
│  Click folder → breadcrumb appears:     │
│  Gallery > "Tên content"                │
│                                         │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐         │
│  │img│ │img│ │img│ │img│ │img│         │
│  └───┘ └───┘ └───┘ └───┘ └───┘         │
└─────────────────────────────────────────┘
```

### Thay đổi chi tiết

**1. Hook `useCarouselGallery.ts` — thêm grouped data**

- Thêm interface `ContentFolder` với fields: `id`, `title`, `source`, `thumbnailUrl`, `imageCount`, `latestDate`, `createdByName`, `createdByAvatar`, `brandName`, `brandLogoUrl`, `channel` (cho multichannel)
- Thêm `useMemo` tạo `contentFolders` bằng cách group `images` theo `carouselId`, lấy thumbnail từ ảnh đầu tiên, đếm số ảnh
- Áp dụng filter (source, search, creator, sort) lên folders thay vì ảnh ở cấp 1
- Thêm state `selectedFolderId` + hàm `setSelectedFolderId` để chuyển cấp
- Khi `selectedFolderId` !== null, `filteredImages` chỉ trả ảnh thuộc folder đó
- Export thêm: `contentFolders`, `selectedFolderId`, `setSelectedFolderId`

**2. Component `CarouselGalleryView.tsx` — 2 chế độ hiển thị**

- Thêm state tracking từ hook: `selectedFolderId`, `setSelectedFolderId`, `contentFolders`
- **Cấp 1 (Folder view):** Khi `selectedFolderId === null`:
  - Render grid `ContentFolderCard` thay vì `GalleryImageCard`
  - Mỗi folder card: thumbnail mosaic (2x2 grid nhỏ từ 4 ảnh đầu), title, badge nguồn (Carousel/Multichannel), số ảnh, người tạo, thời gian
  - Click → `setSelectedFolderId(folder.id)`
  - Bulk mode vẫn hoạt động ở cấp folder (chọn folder = chọn tất cả ảnh bên trong)
- **Cấp 2 (Image view):** Khi `selectedFolderId !== null`:
  - Breadcrumb: `Gallery > {folder title}` với nút Back
  - Hiển thị grid ảnh giống hiện tại (GalleryImageCard), chỉ filter theo folder
  - Giữ nguyên lightbox, download, delete per-image
  - Filter bar ẩn bớt (không cần filter nguồn/content nữa)

**3. Component mới `ContentFolderCard` (inline trong CarouselGalleryView.tsx)**

- Thumbnail: Nếu có 1-3 ảnh → single image, nếu >= 4 ảnh → 2x2 mosaic grid
- Badge nguồn (Carousel với icon Layers, Multichannel với ChannelIcon)
- Title truncate
- Số ảnh + thời gian relative
- Hover effect giống card hiện tại

**4. Trang `Gallery.tsx` — không đổi logic**, chỉ stats cards giữ nguyên

### Không thay đổi
- Logic fetch data từ Supabase (2 bảng carousel_images + channel_image_history)
- GalleryImage interface
- Delete/bulk delete logic
- Lightbox component
- Stats cards trên trang Gallery

### Kết quả
- UX tốt hơn: dễ tìm ảnh theo content thay vì scroll qua hàng trăm ảnh flat
- Giữ nguyên tất cả tính năng cũ (search, filter, sort, bulk ops, lightbox) ở cả 2 cấp

