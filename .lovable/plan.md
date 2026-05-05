## Mục tiêu
Trong tab **Ảnh ref** của `CharacterFormSheet`, bổ sung nút **"Tạo các góc còn lại"** để AI tự sinh tất cả góc nhân vật chưa có (trong số 5: front, side, full-body, close-up, outfit), dùng `refMainUrl` làm identity reference → đỡ phải bấm AI từng góc.

## Thay đổi

### `src/components/characters/CharacterFormSheet.tsx`

1. **Thêm hàm `handleAiGenerateAllRefs`** (cạnh `handleAiGenerateRef`, ~line 169):
   - Yêu cầu `refMainUrl` tồn tại + `name` không rỗng (toast nếu thiếu).
   - Tính `missingLabels = REF_IMAGE_LABELS.filter(l => !usedLabels.has(l.value))` (tối đa 5 - hiện có).
   - Loop tuần tự từng `label` (không Promise.all để tránh rate-limit/quota), gọi `imageActions.generateImage(label, refMainUrl)`.
   - Sau mỗi ảnh thành công → `form.setValue('reference_images', [...current, { url, label }], { shouldDirty: true })` (đọc state mới nhất qua `form.getValues`).
   - Toast progress: "Đang tạo X/Y…" và toast cuối "Đã tạo N góc ảnh".
   - State `bulkGenerating` (boolean) để disable nút.

2. **Thêm nút trong khối Multi reference** (~line 454, ngay trên hoặc cạnh nút AI hiện tại):
   - Hiển thị khi `refImages.length < 5 && refMainUrl` tồn tại.
   - Label: `Tạo {N} góc còn lại` (N = `availableLabels.length`).
   - Variant `outline`, size `sm`, icon `Sparkles` hoặc `Wand2`, có Loader2 khi đang chạy.
   - Disabled khi `bulkGenerating || !refMainUrl || !watched.name?.trim() || imageActions.aiGenerating`.

### Không đụng
- `useCharacterImageActions.ts` (đã hỗ trợ `referenceImageUrl`).
- Edge function `generate-character-image` (đã nhận `reference_image_url`).

## Edge cases
- Nếu 1 góc lỗi (429/402) → dừng loop, giữ các góc đã tạo, toast lỗi cụ thể.
- Nếu đã đủ 5 góc → ẩn nút.
