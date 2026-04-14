

## Hoàn thiện UI Cấu hình gói - Bản nâng cấp cuối

Sau khi review kỹ code hiện tại, đây là những điểm còn thiếu cần bổ sung:

### Vấn đề hiện tại

1. **Không có "Lưu tất cả"** - Phải save từng gói riêng lẻ, bất tiện khi chỉnh nhiều gói cùng lúc
2. **Thoát edit mode mất dữ liệu** - Nhấn "Xong" sẽ gọi `handleUndoAll()` xóa hết thay đổi chưa lưu mà không cảnh báo
3. **Cột save hardcode 4 gói** - `grid-cols-[160px_repeat(4,1fr)]` sẽ vỡ nếu thêm/bớt gói
4. **Mobile không có nút Undo** - Chỉ desktop mới thấy nút "Hoàn tác tất cả"
5. **Không hiện badge thay đổi** - Header cột không cho biết gói nào đang có pending changes
6. **Thiếu empty state** - Nếu chưa có plan nào, UI trống không hướng dẫn
7. **Feature trùng lặp** - Có thể thêm feature đã tồn tại mà không kiểm tra

### Cải tiến

**1. Nút "Lưu tất cả" (Bulk Save)**
- Thêm nút "Lưu tất cả thay đổi" bên cạnh "Hoàn tác tất cả" trong toolbar
- Gọi save tuần tự cho tất cả gói có changes, hiển thị progress

**2. Cảnh báo khi thoát edit mode**
- Nếu có unsaved changes, hiện AlertDialog hỏi "Lưu trước khi thoát?" với 3 option: Lưu tất cả / Hủy thay đổi / Quay lại

**3. Badge "đã sửa" trên header cột**
- Hiển thị dot nhỏ hoặc badge "Đã sửa" trên header cột của gói có pending changes

**4. Mobile UX cải thiện**
- Thêm floating action bar khi có changes (sticky bottom)
- Nút Undo + Save all trên mobile

**5. Duplicate feature check**
- Kiểm tra feature đã tồn tại trước khi thêm, hiện toast warning

**6. Grid cols dynamic**
- Dùng `gridTemplateColumns` inline thay vì hardcode 4

### Kỹ thuật

**File sửa:** `src/components/admin/plans/PlanLimitsManager.tsx`
- Thêm `handleSaveAll()` gọi `saveMutation.mutateAsync` tuần tự cho mỗi plan có changes
- Sửa onClick "Xong" button: check `hasAnyChanges()` → hiện confirm dialog thay vì trực tiếp undo
- Thêm `AlertDialog` cho exit-edit-mode confirmation
- Header cột: thêm dot indicator `{hasChanges(plan.id) && <span className="h-2 w-2 rounded-full bg-primary" />}`
- Sửa grid template dùng `style={{ gridTemplateColumns: \`160px repeat(${plans.length}, 1fr)\` }}`
- Thêm check duplicate trong `handleAddFeature` và global add
- Mobile: thêm sticky bottom bar khi `isEditMode && hasAnyChanges()`

