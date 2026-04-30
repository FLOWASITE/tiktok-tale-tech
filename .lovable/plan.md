
# Plan: Tách Social Format thành Step riêng trong Video Script Wizard

## Mục tiêu
Hiện tại `SocialFormatPicker` đang là 1 chip nhỏ chen trong block "Cấu hình" ở Step 2 — dễ bị bỏ qua và không tương xứng với tầm quan trọng (quyết định cả duration + aspect_ratio + tone của toàn bộ pipeline).

→ Nâng lên thành **Step riêng (Step 2: "Định dạng Social")** trong wizard, chỉ áp dụng khi `script_purpose === 'ai_video'`. Các purpose khác (podcast, education...) skip step này tự động.

## Flow mới (conditional)

```text
Video AI:    [1] Nội dung → [2] Định dạng Social → [3] Tạo kịch bản
Khác:        [1] Nội dung →                        [2] Tạo kịch bản
```

## Thay đổi

### 1. `src/components/script/ScriptFormStepper.tsx`

**STEPS dynamic theo purpose:**
- Build `STEPS` qua `useMemo` dựa trên `formData.script_purpose`
- Khi `ai_video` → 3 steps: Nội dung / Định dạng / Tạo kịch bản
- Khác → 2 steps như cũ

**Step mới "Định dạng Social" (ID=2 cho video_ai):**
- Header: icon `Smartphone`, tiêu đề "Chọn nền tảng đăng video", mô tả ngắn
- Body: render full-size `SocialFormatPicker` (không bọc trong popover/chip) — to, rõ, dễ chọn
- Hiển thị **summary card** bên dưới khi đã chọn:
  - "TikTok Short · 15s · 9:16 · Hook 1.5s đầu"
  - Chip nhỏ "Đổi thời lượng thủ công" → mở `DurationSelector` collapsible (giữ override path)
- Nút "← Quay lại" / "Tiếp tục →"
- Validation: phải chọn 1 preset mới cho qua (hoặc cho phép skip với warning nhỏ "Sẽ dùng default 60s/9:16")

**Step "Tạo kịch bản" (cũ Step 2 → giờ Step 3 cho ai_video):**
- Bỏ `SocialFormatPicker` khỏi block "Cấu hình" (lines 619-650)
- Chip Duration ở block Cấu hình giờ chỉ hiển thị **read-only summary** + cho phép override
- Hiển thị badge nhỏ "Đã chọn: TikTok Short · 15s" ở Smart Summary header để user biết format đã set

**Logic step navigation:**
- `goToNextStep()` / `goToPrevStep()` cần handle skip step 2 khi không phải ai_video
- Khi user đổi `script_purpose` ở step 1 từ ai_video → khác (hoặc ngược lại) ở giữa flow, reset step về 1 hoặc adjust

### 2. `src/components/script/StepIndicator.tsx` (kiểm tra)
- Nếu component đã handle dynamic steps qua props thì không cần sửa
- Nếu hardcode → cần verify

### 3. UX micro
- Animate fade-in khi vào step 2 mới
- Auto-suggest preset dựa trên brand's primary channel nếu có (read từ `selectedTemplate.primary_channel`) — pre-select TikTok Short/Reels Standard
- Nút "Bỏ qua, dùng default" ở góc cho power user muốn nhanh

## Files thay đổi

- `src/components/script/ScriptFormStepper.tsx` — STEPS dynamic, render step 2 mới, navigation logic, bỏ SocialFormatPicker chip khỏi step cuối
- `src/components/script/StepIndicator.tsx` — verify support dynamic steps (có thể không cần sửa)

## Out of scope
- Không đổi `SocialFormatPicker` component (giữ nguyên)
- Không đổi data flow xuống edge function (đã đúng từ feature trước)
- Không đổi preset matrix
