

# Tối ưu load ảnh Carousel

## Phân tích hiện tại

Các `<img>` tag đã có `loading="lazy"` nhưng thiếu:
- Skeleton/placeholder khi ảnh đang tải → user thấy khoảng trắng
- `decoding="async"` → block main thread khi decode ảnh lớn
- Preload ảnh kế tiếp trong swipe carousel → swipe bị giật
- Thumbnail strip dùng ảnh full-size → tải thừa bandwidth

## Giải pháp

### 1. Tạo component `OptimizedImage` tái sử dụng
- Hiển thị skeleton placeholder trong khi ảnh đang tải
- Fade-in animation khi ảnh load xong
- Thêm `decoding="async"` để không block UI
- Xử lý lỗi load ảnh với fallback icon

### 2. Áp dụng vào `GeneratedImagesGallery`
- Swipe view: dùng `OptimizedImage` thay `<img>` trực tiếp
- Grid view: tương tự
- Thumbnail strip: thêm skeleton nhỏ

### 3. Áp dụng vào `SlidePromptCard` và `ImageGeneratorButton`
- Thumbnail nhỏ trong header card
- Ảnh preview lớn trong ImageGeneratorButton

### 4. Preload ảnh kế tiếp trong swipe view
- Khi user đang xem slide N, preload slide N+1 bằng `new Image()`
- Giúp swipe mượt hơn

| File | Thay đổi |
|------|----------|
| `src/components/ui/OptimizedImage.tsx` | Tạo mới — skeleton + fade-in + async decode |
| `src/components/GeneratedImagesGallery.tsx` | Thay `<img>` bằng `OptimizedImage` + preload logic |
| `src/components/ImageGeneratorButton.tsx` | Thay `<img>` bằng `OptimizedImage` |
| `src/components/SlidePromptCard.tsx` | Thay thumbnail `<img>` bằng `OptimizedImage` |

Tạo 1 file mới, sửa 3 file, ~80 dòng thay đổi.

