

# Hoàn thiện Carousel — Preview ảnh, Đăng Facebook, Filter & UX

Dựa trên kế hoạch đã duyệt trước đó (Preview ảnh, Đăng Facebook & UX) mà chưa được triển khai, kết hợp với việc 4 Carousel styles đã hoàn thành, đây là các cải thiện còn lại:

## 1. Preview ảnh thumbnail trên CarouselCard

**File mới**: `src/hooks/useCarouselCardImages.ts`
- Batch query `carousel_images` lấy ảnh `is_selected=true, slide_number=1` cho danh sách carousel IDs
- Trả về map `{carouselId: imageUrl}`

**File sửa**: `src/components/CarouselCard.tsx`
- Nhận thêm prop `thumbnailUrl?: string`
- Hiển thị ảnh thumbnail ở đầu card (aspect ratio 16:9, rounded-t-lg) nếu có, fallback giữ layout text hiện tại
- Thêm badge overlay "3/6 ảnh" góc trái dưới thumbnail

**File sửa**: `src/pages/Carousel.tsx`
- Gọi `useCarouselCardImages` với danh sách carousel IDs
- Truyền `thumbnailUrl` cho mỗi `CarouselCard`

## 2. Đăng carousel lên Facebook

**File sửa**: `src/components/CarouselViewer.tsx`
- Import `DirectPublishButton` (đã có sẵn tại `src/components/social/DirectPublishButton.tsx`)
- Thêm nút bên cạnh Export/Copy trong header, chỉ hiển thị khi `generatedImages.length > 0`
- Truyền: `content` = caption_suggestion, `mediaUrls` = image URLs, `channel` = 'facebook'

## 3. Filter theo Status & Carousel Style

**File sửa**: `src/components/CarouselFilters.tsx`
- Thêm `status: CarouselStatus | 'all'` và `carouselStyle: CarouselStyleType | 'all'` vào `CarouselFiltersState`
- Thêm 2 dropdown filters: Status (Nháp/Chờ duyệt/Đã duyệt/Đã đăng) và Style (4 options)

**File sửa**: `src/pages/Carousel.tsx`
- Cập nhật `CarouselFiltersState` mới
- Thêm filter logic cho `status` và `carousel_style` trong `filteredCarousels`

## 4. Sort dropdown

**File sửa**: `src/pages/Carousel.tsx`
- Thêm state `sortBy: 'newest' | 'oldest' | 'name_asc'`
- Sort `filteredCarousels` trước pagination
- Render dropdown Sort bên cạnh filters

## 5. Empty state cải thiện cho Gallery tab

**File sửa**: `src/components/GeneratedImagesGallery.tsx`
- Cải thiện empty state (lines 104-115): thêm nút "Tạo tất cả ảnh" gọi callback `onGenerateAll`
- Nhận thêm prop `onGenerateAll?: () => void`

## 6. Carousel Style badge trên CarouselCard

**File sửa**: `src/components/CarouselCard.tsx`
- Thêm badge style (icon + label) từ `CAROUSEL_STYLE_OPTIONS` vào khu vực tags

## Tóm tắt

| File | Thay đổi |
|------|----------|
| `src/hooks/useCarouselCardImages.ts` | **Mới** — batch fetch thumbnail |
| `src/components/CarouselCard.tsx` | Thumbnail preview + style badge |
| `src/components/CarouselViewer.tsx` | DirectPublishButton cho Facebook |
| `src/components/CarouselFilters.tsx` | Filter status + style |
| `src/pages/Carousel.tsx` | Filter logic + sort + thumbnail hook |
| `src/components/GeneratedImagesGallery.tsx` | Empty state + nút "Tạo tất cả" |

