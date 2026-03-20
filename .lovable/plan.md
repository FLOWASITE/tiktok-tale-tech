

# Cải thiện Grid Layout cho Carousel Card

## Hiện trạng
Từ screenshot: Grid ảnh hiện tại có nền xám, gap nhỏ (0.5), overlay "+N" đơn giản, và thiếu bo góc cho từng ảnh con. Layout trông khá "flat" và thiếu chiều sâu.

## Thay đổi trong `src/components/CarouselCard.tsx`

### 1. Bo góc thông minh cho ảnh trong grid
- Ảnh đơn: bo góc trên cả 2 bên (`rounded-t-lg`)
- Grid 2 ảnh: ảnh trái bo góc trên-trái, ảnh phải bo góc trên-phải
- Grid 3+: ảnh featured bo góc trên-trái, ảnh phải-trên bo góc trên-phải

### 2. Tăng gap và thêm hiệu ứng
- Tăng `gap-0.5` → `gap-1` cho grid rõ ràng hơn
- Thêm `group-hover:scale-105` cho từng ảnh con tạo hiệu ứng zoom nhẹ

### 3. Nâng cấp overlay "+N"
- Thêm gradient overlay thay vì `bg-black/60` đơn giản
- Dùng backdrop-blur nhẹ
- Tăng kích thước font và thêm text nhỏ "ảnh" bên dưới số

### 4. Cải thiện badge đếm ảnh
- Chuyển từ badge đơn giản → badge có backdrop-blur + border nhẹ
- Thêm icon rõ ràng hơn

### 5. Placeholder "Chưa có ảnh" đẹp hơn
- Thêm gradient background nhẹ và pattern subtle

Sửa 1 file `src/components/CarouselCard.tsx`, ~30 dòng thay đổi trong phần image grid (line 136-189).

