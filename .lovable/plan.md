

# Hoàn thiện Gallery

## Vấn đề hiện tại
Từ screenshot, Gallery đang hoạt động cơ bản (195 ảnh) nhưng còn thiếu:
1. **Filter source dropdown rỗng** — không hiện text "Tất cả nguồn" (chỉ thấy blank)
2. **Thiếu thanh tìm kiếm** theo tên nội dung
3. **Thiếu bulk actions** — chọn nhiều ảnh để tải/xóa
4. **Thiếu thống kê tổng quan** — summary cards (tổng ảnh, theo nguồn, theo kênh)
5. **Thiếu sort** — sắp xếp theo ngày, tên, version
6. **Thiếu pagination/infinite scroll** — 195 ảnh render hết cùng lúc gây chậm

## Thay đổi

### 1. Cập nhật `Gallery.tsx` — Thêm stats cards
- Hiển thị 3 cards: Tổng ảnh / Carousel / Multichannel với số lượng
- Lấy `sourceCounts` từ hook

### 2. Cập nhật `CarouselGalleryView.tsx` — Hoàn thiện UX
- **Fix source filter**: Đảm bảo placeholder hiển thị đúng
- **Thêm search input**: Tìm theo tên nội dung (`carouselTitle`)
- **Thêm sort**: Mới nhất / Cũ nhất / Tên A-Z
- **Thêm bulk select mode**: Checkbox trên mỗi ảnh, toolbar chọn tất cả / tải về / xóa hàng loạt
- **Thêm pagination**: Load 30 ảnh/trang, nút Load More hoặc infinite scroll
- **Grid size toggle**: Compact (6 cột) / Normal (5 cột) / Large (3 cột)

### 3. Cập nhật `useCarouselGallery.ts`
- Thêm `searchQuery` state + filter theo `carouselTitle`
- Thêm `sortBy` state: `newest` | `oldest` | `name`
- Thêm `bulkDelete` function cho xóa nhiều ảnh
- Thêm `selectedIds` state management

| File | Thay đổi |
|------|----------|
| `src/pages/Gallery.tsx` | Thêm stats cards tổng quan |
| `src/components/carousel/CarouselGalleryView.tsx` | Fix filter, thêm search, sort, bulk select, pagination, grid toggle |
| `src/hooks/useCarouselGallery.ts` | Thêm search, sort, bulk operations |

