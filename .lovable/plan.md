## Kế hoạch sửa dứt điểm

Mình sẽ đổi hướng từ “normalize xong hy vọng state còn” sang “giữ payload import làm nguồn sự thật và apply lại ở đúng thời điểm UI mở step Giọng nói”.

### 1. Bắt đúng chỗ bị mất dữ liệu
Trong `BrandCreate.tsx`, tạo helper nội bộ để đọc `importedSuggestion.suggestion`, normalize một lần, rồi apply vào state:
- `brand_positioning` → set thẳng free text
- `tone_of_voice` → map về `expert/calm/serious/...`
- `formality_level` → map về `formal/semi_formal/casual/friendly`

Helper này sẽ được gọi ở 3 thời điểm:
- Khi hydrate sau import
- Sau khi chọn ngành Industry Memory
- Khi user chuyển sang step 4 “Giọng nói” nếu state vẫn trống

Mục tiêu: kể cả dialog chọn ngành hoặc render timing làm reset state, step 4 vẫn tự fill lại từ payload import.

### 2. Sửa lỗi double-normalize làm tone bị rỗng
Hiện `handleIndustryTemplateSelect` đang lấy `importedVoice` đã normalize rồi lại gọi `normalizeToneOfVoice(importedVoice?.tone_of_voice)`. Vì `normalizeToneOfVoice` không nhận lại enum array tốt trong một số nhánh, sẽ có rủi ro rỗng/không tick.

Sẽ sửa thành:
- Nếu `importedVoice.tone_of_voice` đã là array enum thì dùng trực tiếp
- Chỉ normalize khi là raw AI labels

### 3. Không cho Industry Memory ghi đè Brand Voice import
Trong `handleIndustryTemplateSelect`:
- Industry chỉ set ngành, pack id, language style, preferred/forbidden terms
- `brand_positioning`, `tone_of_voice`, `formality_level` luôn ưu tiên import nếu import có dữ liệu
- Pack defaults chỉ dùng khi import thật sự không có field đó

### 4. Làm UI step Giọng nói tolerant hơn
Trong `BrandFormStepDNA.tsx`:
- Giữ textarea cho `Định vị thương hiệu`
- Tone buttons sẽ nhận các alias cũ nếu state còn sót từ data cũ như `professional/authoritative/empathetic/...` và normalize trước khi render selected
- Formality select sẽ normalize value trước khi đưa vào `<Select>` để tránh value `neutral/professional` làm Select trống

### 5. Thêm kiểm tra nhanh bằng unit/script nhỏ cho normalization
Thêm hoặc chạy kiểm tra nhỏ với case thực tế:
```text
tone_of_voice: ["Chuyên nghiệp", "Uy tín", "Tận tâm", "Trang trọng"]
brand_positioning: "TAF là công ty tư vấn kiểm toán..."
formality_level: "formal"
```
Kỳ vọng:
```text
brand_positioning: giữ nguyên câu
tone_of_voice: expert, calm, serious
formality_level: formal
```

## Files dự kiến sửa
- `src/pages/BrandCreate.tsx`
- `src/components/BrandFormStepDNA.tsx`
- Có thể chỉnh nhẹ `src/lib/brandVoiceNormalization.ts` nếu cần alias/tolerant input

## Tiêu chí xong
Sau import website/fanpage, vào step 4 phải thấy:
- `Định vị thương hiệu` có câu AI extract trong textarea
- `Tone of Voice` có tick sẵn ít nhất 1-3 option
- `Mức trang trọng` hiển thị option đã chọn, ví dụ `Trang trọng`