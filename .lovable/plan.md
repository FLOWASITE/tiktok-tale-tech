

# Rà soát UI "Thêm mới Carousel" — Kế hoạch cải thiện

## Vấn đề hiện tại

Sau khi xem UI trực tiếp, tôi nhận thấy các vấn đề sau:

1. **Form quá dài** — phải scroll nhiều, trải nghiệm trên mobile kém. Có 7 section xếp dọc liên tiếp
2. **Slide count grid không đều** — 6 options trong 4 cột = hàng cuối chỉ có 2 items, lệch layout
3. **Brand Template nằm ngoài "Cài đặt nâng cao" nhưng Brand Name/Guideline lại ẩn bên trong** — logic nhóm không nhất quán
4. **AI Tool selector chiếm diện tích lớn** nhưng đa số user chỉ chọn 1 lần, nên thu gọn
5. **Campaign selector** chiếm 1 section riêng cho tính năng tùy chọn, không cần thiết ở vị trí chính
6. **Header icon + title + badge** chiếm 120px chiều cao phía trên, có thể compact hơn

## Thay đổi

### `src/components/CarouselForm.tsx`

**A. Compact header** — Thu gọn icon + title thành 1 dòng ngang thay vì layout dọc centered

**B. Nhóm lại các section hợp lý:**
- **Nhóm 1 (Bắt buộc):** Chủ đề + Phong cách Carousel (2 field quan trọng nhất)
- **Nhóm 2 (Cài đặt tạo ảnh):** Platform + Số lượng ảnh + AI Tool — gom vào 1 card có border, layout compact hơn
- **Nhóm 3 (Cài đặt nâng cao):** Brand Template + Campaign + Brand Name/Guideline/Logo — tất cả vào collapsible section

**C. Slide count:** Đổi từ `grid-cols-4` sang `grid-cols-3` (3 cột x 2 hàng) cho đều

**D. AI Tool selector:** Chuyển sang dạng `Select` dropdown thay vì 4 cards lớn — tiết kiệm ~150px chiều cao

**E. Platform + Slide count cùng hàng:** Trên màn hình đủ rộng, Platform (2 cards) và Slide count nằm cạnh nhau

### `src/components/carousel/SlideCountSelector.tsx`
- Đổi `grid-cols-4` → `grid-cols-3` cho layout 2x3 đều

### `src/components/carousel/AIToolSelector.tsx`
- Chuyển thành dropdown Select compact thay vì 2x2 grid cards
- Vẫn giữ icon + description nhưng dạng inline trong SelectItem

### `src/components/carousel/PlatformSelector.tsx`
- Giảm padding từ `p-4` → `p-3`, icon từ `w-8 h-8` → `w-6 h-6` để compact hơn

## Kết quả dự kiến
- Giảm ~40% chiều dài scroll form
- Các section được nhóm logic rõ ràng hơn
- Brand/Campaign/Advanced gom sạch vào 1 collapsible
- Trải nghiệm mobile tốt hơn đáng kể

