## Mục tiêu
Fix dứt điểm việc sau khi AI import website/fanpage, step **Giọng nói** vẫn trống ở:
- Định vị thương hiệu
- Tone of Voice
- Mức trang trọng

## Nguyên nhân hiện tại
Response import thực tế đã có dữ liệu:
```text
tone_of_voice: ["Chuyên nghiệp", "Uy tín", "Tận tâm", "Trang trọng"]
brand_positioning: "Công Ty ... là công ty tư vấn kiểm toán..."
formality_level: "formal"
```
Nhưng form UI lại dùng option enum cố định:
```text
brandPositioning: business | expert | agency | consultant
toneOfVoice: expert | calm | confident | friendly | analytical | serious | inspirational
formalityLevel: formal | semi_formal | casual | friendly
```
Ngoài ra **brand_positioning hiện đang là select**, nên câu định vị dài từ AI không thể hiển thị. Đây là lý do field nhìn vẫn trống dù backend trả dữ liệu.

## Kế hoạch sửa

### 1. Tách “Định vị thương hiệu” thành input textarea thay vì select
Trong `BrandFormStepDNA.tsx`:
- Đổi `Định vị thương hiệu` từ `<Select>` sang `<Textarea>`.
- Cho phép hiển thị nguyên câu AI extract được, ví dụ: “TAF là công ty tư vấn kiểm toán...”
- Giữ placeholder ngắn gọn và style theo design system.

### 2. Không normalize `brand_positioning` thành enum nữa
Trong `src/lib/brandVoiceNormalization.ts`:
- Sửa `normalizeBrandPositioning` để trả về **string nguyên văn đã trim** thay vì ép về `business/expert/...`.
- Chỉ clamp độ dài an toàn, không biến câu AI thành `business`.
- Giữ normalization cho `tone_of_voice` và `formality_level` vì 2 field này vẫn là option UI.

### 3. Map tone thực tế của AI sang option form tốt hơn
Với response kiểu:
```text
"Chuyên nghiệp", "Uy tín", "Tận tâm", "Trang trọng"
```
Sửa mapping để ra ít nhất:
```text
expert, calm, serious
```
Cụ thể:
- `Chuyên nghiệp`, `Uy tín` → `expert`
- `Tận tâm`, `Ấm áp`, `An tâm` → `calm`
- `Trang trọng`, `Chuẩn mực` → `serious`

### 4. Không để chọn Industry ghi đè mất dữ liệu import
Trong `BrandCreate.tsx`:
- Khi user chọn ngành sau import, chỉ apply tone/formality từ industry pack nếu import không có dữ liệu.
- `brand_positioning` luôn ưu tiên câu AI import; không ép qua enum.

### 5. Thêm fallback ngay tại hydrate
Nếu AI không trả tone hoặc mapping rỗng nhưng `formality_level=formal`, tự set tone `serious` để UI không trống hoàn toàn.

## Verify
- Dùng response import `taf.vn` đã capture:
  - Định vị thương hiệu phải hiện nguyên câu dài trong textarea.
  - Tone phải tick được ít nhất `Chuyên gia`, `Điềm tĩnh`, `Nghiêm túc`.
  - Mức trang trọng phải chọn `Trang trọng`.
- Kiểm tra flow chọn ngành sau import không làm mất 3 field này.