## Bối cảnh
Flow "Tạo Kịch bản & Video" gồm 4 bước trong `ScriptFormStepper.tsx` + sau đó nhảy sang `ScriptWorkspace.tsx` (tab Kịch bản & Quay):

```text
Step 1: Nội dung (purpose + topic + hook)
Step 2: Định dạng Social  (chỉ ai_video)
Step 3: Tạo kịch bản  (config chips + submit)
Step 4: Tạo Video  (storyboard list → mở Studio)
   ↓ navigate /videos?tab=scripts&view=:id
ScriptWorkspace (rail trái + QuickClip phải)
```

Sau khi đọc kỹ `ScriptFormStepper.tsx`, `ScriptWorkspace.tsx`, `QuickClipTab.tsx`, `ScriptsTab.tsx` — đây là các điểm UI/UX còn thiếu hoặc lệch chuẩn Soft Luxury.

## Các điểm cần hoàn thiện

### P0 — Lỗi trải nghiệm rõ ràng

**1. Step 4 hiển thị nhưng nút "Quay lại" của thanh điều hướng không cho lùi về Step 3 sau khi đã sinh kịch bản**
- Hiện tại `handleBack` dùng `currentVisibleIndex - 1` → OK về mặt logic, nhưng khi user ở Step 4 và bấm Back, sẽ về Step 3 và thấy lại CTA "Tạo lại kịch bản" — gây nhầm là phải tạo lại. Cần đổi label CTA Step 3 thành **"Tạo lại kịch bản (sẽ thay thế bản hiện tại)"** hoặc disable nếu chưa thay đổi config.

**2. Step 4 — "Storyboard" trong stepper trùng lặp với rail trái của Workspace**
- User thấy danh sách scene 2 lần: một lần ở Step 4 stepper, một lần khi click "Mở Video Studio". Đề xuất: **Step 4 chỉ giữ summary + 1 CTA lớn "Mở Video Studio"**, bỏ list scene chi tiết (đã có trong Workspace rail).
- Hoặc giữ list nhưng đổi mục đích: thành **preview-only card** với CTA "Mở Studio để bắt đầu quay" (không click từng scene jump vào — gây 2 navigation pattern).

**3. ScriptWorkspace — `MultiCharacterPicker` ở header bị lặp với picker trong `QuickClipTab` embedded**
- Header workspace có Character picker (cho batch render) → QuickClipTab embedded cũng có Character picker (cho single scene). User chọn 2 chỗ khác nhau, không sync. Cần:
  - Hoặc: **ẩn picker trong QuickClipTab khi `embedded=true`** và dùng selection từ Workspace context.
  - Hoặc: thêm cảnh báo "Đang dùng nhân vật cấp scene, ghi đè cấu hình batch ở header".

### P1 — UI chưa nhất quán Soft Luxury

**4. Step 1 — Section 02 "Hook" dùng gradient amber/orange (`from-amber-500/80 to-orange-500/80`)**
- Vi phạm rule Soft Luxury (neutral gray). Đổi sang `bg-foreground/[0.05] border-border/50`, icon dùng màu `text-foreground/70`.

**5. Step 3 — Card "Cấu hình" dùng `border-primary/20 bg-gradient-to-br from-primary/5`**
- Cũng nên rút gọn về neutral. Giữ icon Sparkles primary nhưng border + bg về neutral.

**6. Step 3 — `gradient-primary glow-primary` trên CTA "Tạo kịch bản AI"**
- Trong khi nút "Mở Video Studio" Step 4 cũng dùng cùng style → loãng visual hierarchy. Đề xuất: **CTA chính dùng `bg-foreground text-background hover:bg-foreground/90`** (Soft Luxury monochrome), bỏ glow.

### P1 — Thiếu thông tin / thiếu feedback

**7. Step 2 (Social Format) — không có preview ratio thực tế**
- Quick-pick chips chỉ cho biết duration nhưng không vẽ khung tỉ lệ. Đề xuất thêm **mini ratio preview** (ô vuông/dọc/ngang nhỏ) bên cạnh label, hoặc visualize khung 9:16 vs 16:9 trong sticky summary.

**8. Step 3 — Estimated cost không hiển thị trước khi sinh**
- Sinh script tốn token nhưng user không thấy estimate. Có thể thêm dòng nhỏ phía dưới CTA: "Ước tính: ~Y token / 1 unit Nội dung của workspace" (đã có pattern trong `quota-units.ts`).

**9. ScriptWorkspace header — không hiển thị **model AI sẽ dùng** cho batch render**
- User chỉ biết khi mở từng scene trong QuickClip. Nên show `AdminModelBadge` ở header workspace (đặc biệt khi có character → auto-lock Veo 3.1).

**10. ScriptWorkspace rail — không có **time-estimate** cho mỗi scene chưa render**
- Chỉ có status badge. Thêm "~2 phút" cạnh status "Chưa quay" để set expectation.

### P2 — Polish

**11. Step 4 empty state khi `!generatedScript`**
- Hiện tại chỉ có 1 button "Quay lại tạo kịch bản". Nên ẩn hẳn Step 4 trong `buildSteps()` cho đến khi có script (hiện đang hiển thị luôn — gây confused). Thay bằng: **chỉ append Step 4 vào `STEPS` array khi `generatedScript` tồn tại**.

**12. Stepper progress line — không phản ánh được trạng thái "đang chạy" của Step 3**
- Khi `isLoading` ở Step 3, progress line vẫn ở mốc 50–66%. Đề xuất: animate line/circle Step 3 với pulse khi `isLoading`.

## Đề xuất ưu tiên

| # | Mức | Estimated effort | File chính |
|---|-----|------------------|-----------|
| 11 | P0 | 5 min | `ScriptFormStepper.tsx` (build steps) |
| 2 | P0 | 15 min | `ScriptFormStepper.tsx` (Step 4 layout) |
| 3 | P0 | 20 min | `QuickClipTab.tsx` + `ScriptWorkspace.tsx` (sync character) |
| 1 | P0 | 5 min | `ScriptFormStepper.tsx` (CTA label Step 3) |
| 4–6 | P1 | 30 min | Soft Luxury restyle |
| 9 | P1 | 10 min | `ScriptWorkspace.tsx` header thêm `AdminModelBadge` |
| 7 | P1 | 20 min | Step 2 ratio preview |
| 8, 10, 12 | P2 | 30 min | Polish |

## Hành động tiếp theo

Anh chọn một trong:

- **A**: Làm hết P0 trước (4 mục: #1, #2, #3, #11) — gọn, ~45 phút.
- **B**: Làm P0 + P1 (gồm thêm restyle Soft Luxury + AdminModelBadge ở workspace) — ~1.5 giờ.
- **C**: Làm tất cả 12 mục.
- **D**: Chỉ làm các mục anh chỉ định (ghi số).

Sau khi anh chọn, tôi sẽ chuyển sang Default mode và áp dụng từng file cụ thể.
