## Vấn đề

Sau khi AI đọc website/fanpage, ở step "Giọng nói" (Brand Voice & DNA) có 3 field không được autofill:
- **Định vị thương hiệu** (`brand_positioning`)
- **Tone of Voice** (`tone_of_voice`)
- **Mức độ trang trọng** (`formality_level`)

### Nguyên nhân

1. **Extractor schema thiếu field**: `supabase/functions/_shared/brand-extractor.ts` chỉ extract `tone_of_voice`, KHÔNG có `brand_positioning` và `formality_level` trong `BrandSuggestion` interface, `SYSTEM_PROMPT`, `TOOL_SCHEMA` và sanitize block.
2. **BrandCreate hydration không set positioning/formality**: `src/pages/BrandCreate.tsx` (effect tại line 265) chỉ gọi `setToneOfVoice` từ `s.tone_of_voice` nhưng không có nhánh nào set `setBrandPositioning` hay `setFormalityLevel` từ suggestion. (Hai setter chỉ chạy khi user chọn industry pack qua `handleIndustryTemplateSelect`.)
3. **Tone of voice**: thực ra ĐÃ extract + hydrate đúng. Nhưng vì 2 field còn lại trống, user thấy cả block "Giọng nói" như chưa autofill. Cần verify lại sau khi fix 2 field kia + thêm log nếu vẫn miss.
4. **Dialog ALL_FIELDS thiếu mục cho positioning/formality** → user không thấy AI có gợi ý gì cho 2 field này.

## Phạm vi fix (UI + extractor prompt, không đụng schema DB — cột đã tồn tại trong `brand_templates`)

### 1. `supabase/functions/_shared/brand-extractor.ts`
- Thêm vào `BrandSuggestion`:
  - `brand_positioning?: string | null` (1 câu định vị, "for [audience] who [need], [brand] is [category] that [benefit]" hoặc tự do 1-2 câu)
  - `formality_level?: 'casual' | 'neutral' | 'formal' | null`
- Thêm rule trong `SYSTEM_PROMPT`:
  - `brand_positioning`: 1 câu ngắn (≤ 200 ký tự) chốt vị thế thương hiệu trên thị trường, suy luận từ tagline + mission + USP + tone của source. Null nếu không đủ bằng chứng.
  - `formality_level`: phân loại 1 trong 3 giá trị dựa trên cách xưng hô/dùng từ (anh/chị, bạn, mình, quý khách…). Null nếu source quá ngắn.
- Thêm vào `TOOL_SCHEMA.parameters.properties`: `brand_positioning` (string|null), `formality_level` (string|null, enum hợp lệ).
- Sanitize trong `suggestion`: `brand_positioning: trimOrNull(args.brand_positioning)?.slice(0, 280) ?? null`, `formality_level` validate enum.

### 2. `src/components/brand/BrandImportDialog.tsx`
- Thêm vào `ALL_FIELDS` (group `Voice`):
  - `{ key: 'brand_positioning', label: 'Định vị thương hiệu', group: 'Voice' }`
  - `{ key: 'formality_level', label: 'Mức độ trang trọng', group: 'Voice' }`
- Update `ImportableField` type union ở đầu file.
- Trong effect auto-select (line 121): `if (s.brand_positioning) next.add('brand_positioning')`, `if (s.formality_level) next.add('formality_level')`.
- Trong `buildUpdates` (line 186): set `updates.brand_positioning = s.brand_positioning` và `updates.formality_level = s.formality_level`.
- Trong `renderPreviewValue` switch (line 319) + helper bên dưới (line 694): trả về string preview (formality dịch sang VN: casual="Thân mật", neutral="Trung tính", formal="Trang trọng").

### 3. `src/pages/BrandCreate.tsx`
- Trong hydration effect (line 265-291), thêm:
  ```ts
  if (s.brand_positioning) setBrandPositioning(s.brand_positioning);
  if (s.formality_level) setFormalityLevel(s.formality_level);
  ```
- Đặt trước nhánh `s.target_audience` để giữ thứ tự logic.

### 4. Memory update
- Cập nhật `mem://features/brand/import-visuals-vn.md` (đổi tên/scope thành import-suggestion) liệt kê thêm 2 field mới.

## Out of scope
- Không sửa DB schema (cột đã có).
- Không đụng `_shared` file khác.
- Không đổi flow IndustrySelectionDialog.

## Verify sau khi build
- Import 1 website rõ tone (vd flowa.one) → mở step "Giọng nói": 3 field đều có giá trị, badge "AI gợi ý" hiển thị (nếu UI có sẵn).
- Nếu tone vẫn trống: kiểm tra response của edge function `import-brand-from-website` xem `suggestion.tone_of_voice` có rỗng không (do AI conservative).