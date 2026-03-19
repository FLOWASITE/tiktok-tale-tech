

## Plan: Thêm 2 nút submit trong form Tạo Carousel

### Thay đổi

**File**: `src/components/CarouselForm.tsx`

Thay nút submit đơn hiện tại (dòng 330-362) bằng 2 nút:

1. **"Tạo Prompt Carousel"** — nút chính (như hiện tại), chỉ generate prompt text, không tạo ảnh
2. **"Tạo Prompt + Ảnh"** — nút thứ hai, gửi form với flag `autoGenerateImages: true` để sau khi tạo prompt xong, hệ thống tự động trigger generate ảnh cho tất cả slides

### Chi tiết kỹ thuật

- Thêm field `autoGenerateImages?: boolean` vào `CarouselFormData` type (`src/types/carousel.ts`)
- Nút 1: submit với `autoGenerateImages: false` (default, giữ flow hiện tại)
- Nút 2: submit với `autoGenerateImages: true`
- Layout: 2 nút ngang hàng, nút Prompt là `outline`, nút Prompt+Ảnh là `gradient-primary` (primary action)
- Cập nhật `CarouselViewer.tsx`: khi nhận carousel mới có `autoGenerateImages: true`, tự động gọi `handleGenerateAllImages()`

### Files changed
| File | Change |
|------|--------|
| `src/types/carousel.ts` | Thêm `autoGenerateImages` field |
| `src/components/CarouselForm.tsx` | 2 nút submit thay vì 1 |
| `src/components/CarouselViewer.tsx` | Auto-trigger image gen khi flag = true |

