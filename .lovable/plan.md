

## Hoàn thiện UI Cấu hình gói - Dễ sử dụng hơn

Cải thiện trải nghiệm sử dụng trang Cấu hình gói với layout rõ ràng hơn, responsive tốt hơn trên mobile, và thao tác trực quan hơn.

### Cải tiến

**1. Layout dạng bảng so sánh (Comparison Table)**
- Chuyển từ card grid sang bảng ngang so sánh các gói cạnh nhau (desktop)
- Mỗi hàng là 1 trường (Brands, Scripts, Giá...), mỗi cột là 1 gói
- Dễ so sánh giá trị giữa các gói hơn card riêng lẻ
- Mobile: giữ card layout hiện tại (responsive fallback)

**2. Toggle chỉnh sửa (Edit Mode)**
- Mặc định hiển thị dạng read-only (text/badge) cho gọn gàng
- Nút "Chỉnh sửa" bật edit mode, lúc này mới hiện input fields
- Giảm visual clutter khi chỉ cần xem thông tin

**3. Cải thiện hiển thị giá**
- Format giá hiển thị dạng "199.000₫" thay vì input number thô
- Hiển thị giá năm kèm "tiết kiệm X%" so với giá tháng x12

**4. Feature badges cải tiến**
- Hiển thị features dạng checklist (✓/✗) so sánh giữa các gói
- Thêm feature chung cho tất cả gói hoặc từng gói riêng
- Drag-drop sắp xếp thứ tự features

**5. Summary cards nâng cấp**
- Thêm card "Gói phổ biến nhất" (gói có nhiều workspace nhất)
- Thêm card "ARPU" (Average Revenue Per User)
- Mini sparkline cho trend MRR (nếu có data lịch sử)

### Kỹ thuật

**File sửa:** `src/components/admin/plans/PlanLimitsManager.tsx`
- Thêm state `isEditMode` toggle giữa view/edit
- Tạo component `ComparisonTable` cho desktop view
- Tạo component `PlanCard` cho mobile view
- Thêm logic tính % tiết kiệm giá năm
- Format giá dạng readable trong view mode
- Giữ nguyên logic save/undo/diff hiện tại

