

# Sửa lỗi: Không thể chỉnh sửa chi tiết trong Kế hoạch AI Campaign

## Nguyên nhân

Bug nằm ở **stale state** trong `CampaignDashboard.tsx`:

1. Khi user click vào một plan, object plan được lưu vào state: `setSelectedPlan({ plan, goalName })`
2. Object plan này là **snapshot tại thời điểm click** — không cập nhật khi data thay đổi
3. Khi user sửa một piece và nhấn "Lưu", mutation `updatePlan` ghi DB thành công và invalidate query
4. Query re-fetch trả về data mới → mảng `plans` cập nhật
5. **Nhưng** `selectedPlan.plan` vẫn giữ object cũ → UI hiển thị data cũ, trông như edit không có tác dụng

## Giải pháp

### File: `src/components/agents/CampaignDashboard.tsx`
- Thay đổi `selectedPlan` state từ `{ plan, goalName }` thành `{ planId, goalName }`
- Derive plan thực tế từ mảng `plans` (luôn fresh): `plans.find(p => p.id === selectedPlan.planId)`
- Nếu plan không tìm thấy (bị xóa), tự động quay lại danh sách

### File: `src/components/agents/CampaignPlanReview.tsx`  
- Thêm **optimistic update** cho `handleSaveEdit`: cập nhật local pieces ngay lập tức trước khi mutation hoàn thành
- Đảm bảo `handleDeletePiece` và `handleAddPiece` cũng cập nhật local state tương tự
- Thêm loading indicator trên nút "Lưu" khi mutation đang pending

Tổng cộng sửa **2 file**, không thay đổi DB hay edge function.

