
# Hoàn thiện AI tạo nhân vật

## Vấn đề hiện tại

1. **Edge function thiếu middleware chuẩn** -- không dùng `withPerf`, không log metrics
2. **Không tránh trùng** -- AI có thể tạo nhân vật giống nhân vật đã tồn tại trong org
3. **Dialog không cho chỉnh sửa** -- user phải lưu rồi sửa, không thể chỉnh tên/mô tả inline trước khi lưu
4. **Không auto-select sau lưu** -- nhân vật mới tạo không được tự động thêm vào danh sách đã chọn
5. **Thiếu số lượng linh hoạt** -- luôn tạo `min(remaining, 2)`, user không chọn được 1 hay 3

## Thay đổi

### 1. Edge function `generate-character` -- nâng cấp

- Thêm `withPerf` wrapper + `saveMetrics` cho observability
- Nhận thêm `existing_names: string[]` từ client -> inject vào prompt để AI tránh trùng tên/ngoại hình
- Thêm `body_type` vào `required` trong tool schema (hiện chỉ optional)
- Thêm field `suggested_voice_style` để AI gợi ý phong cách giọng phù hợp (VD: "Trầm ấm, chậm rãi")

### 2. Frontend `MultiCharacterPicker.tsx` -- cải thiện UX

- Gửi `existing_names` (tên các profile hiện có) lên edge function khi generate
- Thêm dropdown chọn số lượng nhân vật muốn tạo (1-3)
- Cho phép inline edit tên + mô tả + trang phục trên mỗi card kết quả trước khi lưu
- Auto-select nhân vật mới vào picker sau khi lưu thành công (thay vì chỉ close dialog)
- Hiển thị `suggested_voice_style` trên card kết quả

### 3. File thay đổi

| File | Thay đổi |
|---|---|
| `supabase/functions/generate-character/index.ts` | withPerf, existing_names dedup, suggested_voice_style, body_type required |
| `src/components/video/MultiCharacterPicker.tsx` | count picker, inline edit, auto-select, existing_names pass-through |
