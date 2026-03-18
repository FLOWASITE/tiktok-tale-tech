

# Update Bước 5 (Tạo ảnh AI) trên Landing Page

## Vấn đề
Bước 5 "Tạo ảnh AI đa kênh" hiện chỉ hiển thị text, không có ảnh minh họa như các bước 1, 2, 4, 6.

## Thay đổi

### 1. Copy ảnh từ user uploads vào project
- `user-uploads://image-55.png` → `src/assets/workflow/workflow-ai-image-1.png` (giao diện chọn kênh + kiểm soát AI)
- `user-uploads://image-56.png` → `src/assets/workflow/workflow-ai-image-2.png` (kết quả xem trước ảnh AI)

### 2. Cập nhật `src/components/landing/WorkflowSection.tsx`
- Import 2 ảnh mới
- Tạo mảng `step5AIImages` chứa 2 ảnh
- Thêm điều kiện `step.num === 5` vào render logic để sử dụng `StepWithCarousel` (giống step 1, 2, 4, 6)

Kết quả: Bước 5 sẽ hiển thị carousel 2 ảnh minh họa quy trình tạo ảnh AI, tự động xoay mỗi 5 giây.

