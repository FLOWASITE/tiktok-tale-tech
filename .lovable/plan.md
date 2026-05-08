## Mục tiêu
Khi `script_purpose = 'ai_video'`, gộp Step 3 (Tạo kịch bản) và Step 4 (Tạo Video) thành **một step duy nhất** tên "Kịch bản & Quay". Stepper rút gọn từ 4 → 3 bước cho luồng Video AI.

```text
Trước:
  1 Nội dung → 2 Định dạng Social → 3 Tạo kịch bản → 4 Tạo Video

Sau (ai_video):
  1 Nội dung → 2 Định dạng Social → 3 Kịch bản & Quay (combined)

Sau (purpose khác):
  1 Nội dung → 3 Tạo kịch bản  (giữ nguyên)
```

## Thay đổi UX

**Step 3 "Kịch bản & Quay"** trở thành step có 2 trạng thái:

- **State A — Chưa có script** (`!generatedScript`):
  - Hiện toàn bộ block "Cấu hình" hiện tại (chips video_type / character_type / dialogue_style…)
  - CTA chính: **"Tạo kịch bản AI"** (hoặc "Tạo lại (thay thế)" nếu đã có).
  - Subtitle nhỏ: "Sau khi tạo xong, bạn sẽ mở thẳng Studio để quay từng scene."

- **State B — Đã có script** (`generatedScript` xuất hiện):
  - Tự động transition trong cùng step (không nhảy step).
  - Hiển thị "Kịch bản sẵn sàng quay" + summary card (số scene, tổng thời lượng) như Step 4 hiện tại.
  - 2 CTA:
    - Primary: **"Mở Video Studio"** → navigate `/videos?tab=scripts&view=:id`
    - Secondary: **"Chỉnh sửa cấu hình"** (collapse summary, mở lại config + CTA "Tạo lại (thay thế)")
    - Tertiary text-link: "Để sau, xem kịch bản" → `/scripts`

Stepper hiển thị Step 3 ở trạng thái:
- `current` khi đang config / generating
- `current` (vẫn step 3) khi đã sinh xong — checkmark được đánh dấu chỉ khi user click "Mở Video Studio" (lúc đó user rời stepper).

## Thay đổi code (1 file)

**`src/components/script/ScriptFormStepper.tsx`**

1. `buildSteps()` (lines 111–124): bỏ nhánh push `STEP_VIDEO`. Đổi label step `STEP_GENERATE` thành `'Kịch bản & Quay'` khi `isVideoAi`, giữ `'Tạo kịch bản'` khi không.
2. Bỏ hằng `STEP_VIDEO = 4` (hoặc giữ tên nhưng không add vào steps array).
3. Bỏ effect auto-advance sang `STEP_VIDEO` (lines ~341–347): không còn cần advance, chỉ cần re-render Step 3 ở State B.
4. Khối render `currentStep === STEP_VIDEO` (lines 1056–1126) → di chuyển vào trong block `currentStep === STEP_GENERATE` như một conditional trên `generatedScript && isVideoAi`:
   - Nếu `generatedScript && isVideoAi && !editingConfig` → render summary + CTAs (State B).
   - Ngược lại → render config + CTA "Tạo kịch bản" (State A).
5. Thêm local state `const [editingConfig, setEditingConfig] = useState(false)` để nút "Chỉnh sửa cấu hình" có thể quay về State A mà không xoá `generatedScript`.
6. Navigation footer (lines 1129–1178):
   - Xoá nhánh `currentStep === STEP_VIDEO` (lines 1142–1144).
   - Khi ở STEP_GENERATE State B: ẩn nút "Tiếp tục"/"Tạo kịch bản" footer, chỉ giữ "Quay lại". State A: giữ nút "Tạo kịch bản AI" như cũ.
7. Cập nhật `ScriptNew.tsx` không cần đổi (logic auto-mở viewer khi `purpose !== 'ai_video'` vẫn đúng).
8. Memory: cập nhật `mem://features/video/script-to-studio-link-vn.md` ghi chú stepper Video AI giờ là 3 bước (Nội dung → Định dạng Social → Kịch bản & Quay).

## Edge cases
- User ở State B bấm "Quay lại" footer → về Step 2 (Định dạng Social), `generatedScript` vẫn được giữ; quay lại Step 3 vẫn là State B.
- User ở State B bấm "Chỉnh sửa cấu hình" → State A, CTA hiển thị "Tạo lại (thay thế)" với tooltip cảnh báo.
- Purpose không phải `ai_video`: không có Step 2, Step 3 chỉ là "Tạo kịch bản" (giữ nguyên hành vi cũ — sau khi sinh xong, `ScriptNew` mở `ScriptViewer` dialog).

## Test thủ công
1. `/scripts/new` chọn purpose `ai_video` → stepper 3 bước.
2. Sinh script → vẫn ở Step 3, hiện summary + "Mở Video Studio".
3. Bấm "Chỉnh sửa cấu hình" → quay về form config, CTA = "Tạo lại (thay thế)".
4. Đổi purpose sang `social_video` → stepper 2 bước (1 Nội dung, 3 Tạo kịch bản), behaviour cũ.