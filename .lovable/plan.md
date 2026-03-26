# Rà soát Form Tạo Campaign — Các vấn đề cần cải thiện

## Tóm tắt

File chính: `src/pages/CampaignCreate.tsx` (861 dòng) — form 5 bước tạo/sửa campaign. Sau khi rà soát chi tiết, phát hiện 8 vấn đề cần fix.

---

## 1. Thiếu validation ngày: end_date < start_date

**Dòng 284-298**: `canProceed()` chỉ check có giá trị, không check `end_date >= start_date`. User có thể tạo campaign với ngày kết thúc trước ngày bắt đầu.

**Fix**: Thêm check `new Date(formData.end_date) >= new Date(formData.start_date)` vào case 1.

---

## 2. Thiếu validation tên campaign (độ dài, ký tự đặc biệt)

**Dòng 446-451**: Input tên không có `maxLength`, không trim whitespace khi submit. User có thể nhập tên rỗng chỉ gồm spaces.

**Fix**: Thêm `maxLength={100}`, trim tên trong `handleSubmit`, và check `formData.name.trim()` trong `canProceed()`.

---

## 3. Budget nhận giá trị âm

**Dòng 713-718**: Input budget type="number" không có `min={0}`. User có thể nhập số âm.

**Fix**: Thêm `min={0}` cho input budget và các input KPI target.

---

## 4. Submit không có confirm dialog

**Dòng 307-351**: `handleSubmit` thực hiện tạo/sửa campaign ngay lập tức không có confirm. Đặc biệt ở edit mode, milestones bị xóa toàn bộ rồi insert lại — nếu insert fail thì mất data.

**Fix**: Thêm confirm dialog trước khi submit. Wrap milestone delete+insert trong transaction logic (check insert success trước khi toast navigate).

---

## 5. Completed steps logic quá lỏng

**Dòng 160-179**: Step 2 và 3 được tự động mark completed nếu step 1 xong, bất kể user có điền gì. Điều này khiến stepper misleading — user nghĩ đã hoàn thành nhưng thực tế chưa điền KPI.

**Fix**: Step 2 completed khi có ít nhất 1 key_message hoặc CTA. Step 3 completed khi có ít nhất 1 KPI target > 0. Giữ logic cho phép skip (canProceed = true) nhưng không đánh dấu completed.

---

## 6. MilestoneEditor dialog thiếu DialogDescription

**File**: `src/components/campaign/CampaignMilestoneEditor.tsx` dòng 205-211. Dialog thiếu `DialogDescription` → console warning accessibility.

**Fix**: Thêm `<DialogDescription>` vào edit milestone dialog.

---

## 7. Channel selection không có icon

**Dòng 751-768**: Channels chỉ hiển thị text, không có visual indicator. So với campaign type selector (có emoji icon), channel selector kém trực quan.

**Fix**: Thêm icon cho mỗi channel 

---

## 8. Form không có unsaved changes warning

User có thể navigate away (nhấn Back/Hủy) khi đang có data chưa save mà không có warning.

**Fix**: Thêm `useBeforeUnload` hoặc confirm dialog khi user nhấn Hủy/Back mà form đã có data.

---

## Tóm tắt mức độ ưu tiên


| #   | Vấn đề                      | Mức độ                   |
| --- | --------------------------- | ------------------------ |
| 1   | end_date < start_date       | **Cao** — data sai       |
| 2   | Tên campaign không validate | **Cao** — data sai       |
| 3   | Budget/KPI âm               | **Trung bình**           |
| 4   | Submit không confirm        | **Trung bình** — UX      |
| 5   | Completed steps misleading  | **Trung bình** — UX      |
| 6   | Missing DialogDescription   | **Thấp** — accessibility |
| 7   | Channel thiếu icon          | **Thấp** — UX            |
| 8   | Unsaved changes warning     | **Thấp** — UX            |


## Thay đổi files

- `src/pages/CampaignCreate.tsx` — fix #1, #2, #3, #4, #5, #7, #8
- `src/components/campaign/CampaignMilestoneEditor.tsx` — fix #6