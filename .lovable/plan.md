## Vấn đề

Khi `purpose='ai_video'`, stepper luôn hiển thị 4 step. Nhưng logic nút primary ở footer dựa vào `isLastStep` — vì Step 4 (Tạo Video) bây giờ luôn có mặt, Step 3 (Tạo kịch bản) không còn là last step nên hiện nút **"Tiếp tục"** thay vì **"Tạo kịch bản AI"**. Người dùng bấm Tiếp tục → nhảy sang Step 4 mà chưa generate script → thấy empty state "Cần kịch bản trước khi tạo video".

## Giải pháp

Sửa logic chọn nút primary ở footer của `ScriptFormStepper.tsx` (block dòng 1185–1220):

- **Step 4 (`STEP_VIDEO`)**: giữ nguyên — không hiện CTA submit (đã có CTA inline).
- **Step 3 (`STEP_GENERATE`)**: luôn hiện nút **"Tạo kịch bản AI"** gọi `handleSubmit` (bất kể có phải last step hay không). Khi script đã tồn tại (`generatedScript`), đổi label thành **"Tạo lại kịch bản"** để rõ ý — và auto-advance effect dòng 343 sẽ tự đẩy sang Step 4.
- **Các step khác**: giữ nguyên nút "Tiếp tục" gọi `handleNext`.

Không thay đổi: `buildSteps`, auto-advance effect, empty state Step 4 (vẫn hữu ích cho trường hợp user click trực tiếp vào Step 4 ở stepper khi chưa có script).

## File thay đổi

- `src/components/script/ScriptFormStepper.tsx` — chỉnh khối điều kiện nút primary (dòng 1185–1220).
