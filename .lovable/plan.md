## Mục tiêu
Khi user chọn ngành (industry pack/template) ở bước Identity, tự động nạp sẵn **personas mẫu** từ Industry Memory vào bước Personas, để user không phải bấm "Nhập từ ngành" thủ công.

## Phạm vi
Chỉ FE + 1 hook hiện có (`useIndustryPersonasForImport`). Không sửa edge function, không sửa schema.

## Hành vi
1. **Trigger**: `industryTemplateId` hoặc `globalPackId` thay đổi → fetch xong industry personas.
2. **Điều kiện auto-import** (an toàn, không phá data user):
   - `personas` đang **rỗng** HOẶC chỉ chứa personas có `source_industry_persona_id` của ngành **trước đó** (chưa bị user sửa: `is_customized !== true`).
   - Chưa từng auto-import cho đúng `industryKey` này (track bằng `useRef<Set<string>>` trong session).
3. **Số lượng**: import tối đa **3 personas đầu** (giữ chỗ cho user thêm tay, tổng cap vẫn 5).
4. **Logic mapping**: tái dùng đúng object shape của `handleBatchImport` đã có (gọi hàm helper tách ra để chia sẻ).
5. **Không ghi đè**: nếu có bất kỳ persona nào `is_customized = true` hoặc do user tạo tay (không có `source_industry_persona_id`) → **bỏ qua** auto-import, để user tự bấm.
6. **Đổi ngành**: khi `industryKey` mới khác cũ và toàn bộ personas hiện tại đều là "imported chưa sửa" → xoá personas cũ rồi nạp set mới (vì đã không còn phù hợp ngành).
7. **Feedback**: toast nhẹ `"Đã nạp sẵn N persona mẫu cho ngành <tên>. Bạn có thể chỉnh sửa hoặc xoá."` + nút **Hoàn tác** (revert về state trước import) trong 5s.

## Thay đổi code
- `src/components/BrandFormStepPersonas.tsx`
  - Tách `buildPersonaFromIndustry(industryPersona, opts)` từ logic trong `handleImportPersona` / `handleBatchImport` (DRY).
  - Thêm `useEffect` auto-import theo điều kiện trên, dùng `useRef` để chống chạy lặp.
  - Toast + Undo qua `sonner` action button.
- Không đụng `BrandCreate.tsx` (props đã có `industryTemplateId` + `globalPackId`).

## Edge cases
- Hook đang `loadingIndustry` → chờ, không auto-import.
- `industryPersonas` rỗng (ngành chưa có persona mẫu) → no-op, không toast.
- User vào lại bước Personas sau khi đã xoá hết personas auto-imported → KHÔNG auto-import lại (ref đã đánh dấu industryKey).
- Khi user nhấn **Hoàn tác** → xoá personas vừa thêm (match theo id tạm), giữ ref đã đánh dấu để không spam lại.

## Test tay
1. Tạo brand mới → chọn ngành A → sang Personas: thấy 3 persona đã có sẵn + toast Undo.
2. Sửa 1 persona (đặt `is_customized=true`) → quay lại Identity đổi sang ngành B → Personas: KHÔNG bị ghi đè.
3. Brand chưa sửa gì → đổi ngành A→B → personas auto cập nhật theo B.
4. Ngành không có persona mẫu → không có toast, không lỗi.
