## Mục tiêu
Hoàn thiện 2 màn hình của luồng Video AI:
1. **Step 3 trong `ScriptFormStepper`** — "Kịch bản & Quay" (State A config + State B sẵn sàng quay)
2. **`ScriptWorkspace`** — workspace 2-cột (rail + QuickClip embedded)

Đảm bảo nhất quán Soft Luxury (neutral gray accent, bỏ `text-primary` / `bg-primary/10` cho non-state elements), nâng information density, và làm rõ hierarchy của các CTA.

---

## A. `src/components/script/ScriptFormStepper.tsx`

### A1. State A — Header "Sẵn sàng tạo kịch bản" (lines 810–847)
- **Vấn đề:** vẫn dùng `bg-primary/10 text-primary` cho icon hero — lệch Soft Luxury so với phần config card đã chuẩn hoá.
- **Sửa:**
  - Đổi vòng tròn icon từ `bg-primary/10` → `bg-foreground/[0.05] border border-border/40`, icon từ `text-primary` → `text-foreground/70`.
  - Khi `isVideoAi`: đổi tiêu đề thành **"Sẵn sàng tạo kịch bản & quay"** + subtitle bổ sung dòng nhỏ: "Sau khi tạo xong, kịch bản sẽ mở thẳng Video Studio để bạn render từng scene."
  - Khi non-`ai_video`: giữ nguyên "Sẵn sàng tạo kịch bản".
  - Hợp nhất chip preset/hook/angle thành một hàng pill nhỏ gọn hơn (giảm `gap-3` → `gap-2`, dùng `bg-muted/30 px-2 py-0.5 rounded-full`).

### A2. State A — Section "Cấu hình" (lines 849–1018)
- Thêm hint một dòng dưới header card: "Tinh chỉnh nhanh trước khi sinh — AI sẽ tôn trọng các lựa chọn này." (text `text-[11px] text-muted-foreground`).
- Sắp xếp lại thứ tự chip cho hợp ngữ cảnh Video AI: `Social Format → Duration → Video Type → Character Type → Character Profile → Product → Voice/Dialogue` (hiện tại đã gần đúng, chỉ cần đảm bảo Character Profile đứng cạnh Character Type).
- `MultiCharacterPicker` + `MultiProductPicker`: bọc trong cùng `flex gap-2` row hiện có nhưng thêm divider dọc nhẹ `<span className="w-px h-5 bg-border/40 mx-1" />` giữa "Character Type chip" và "Character Profile" để user nhận ra 2 nhóm khác nhau (preset vs hồ sơ thật).

### A3. State A — Footer "Thời gian ước tính" (lines 1195–1199)
- Khi `isVideoAi`: đổi text thành **"Ước tính ~15–30s tạo kịch bản · sau đó vào Studio để quay"**.
- Thêm icon `Clock` nhỏ phía trước.

### A4. State B — "Kịch bản sẵn sàng quay" (lines 1059–1138)
- **Thêm Mini Storyboard Preview** thay summary 1 dòng hiện tại:
  - Hiển thị tối đa 4 scene đầu dạng pill ngang scrollable: `[#1 ~5s] mô tả ngắn 60 ký tự…` — click pill = `handleOpenStudio(idx)`.
  - Sau pill cuối (nếu `prompts.length > 4`): nút `+N scene khác`.
- **CTA hierarchy:**
  - Primary: "Mở Video Studio" (giữ nguyên màu `bg-foreground`).
  - Secondary outline đổi từ "Chỉnh sửa cấu hình" → 2 nút song song nhỏ hơn (`size="sm"`):
    - "Chỉnh sửa cấu hình" (icon `Sparkles`)
    - "Xem/Sửa kịch bản" → mở `ScriptViewer` dialog (cần state local `viewerOpen` + render `<ScriptViewer>` tại cuối component).
- Đổi text-link "Để sau, xem danh sách kịch bản" → "Để sau — về danh sách".
- Sửa duration tính: nếu `p.duration` không match số → fallback 5s (đã đúng); thêm prefix `~` cho rõ là ước tính.

### A5. Stepper indicator
- Khi ở State B: `completedSteps` chưa add `STEP_GENERATE` → indicator vẫn current. Đề xuất: khi user click "Mở Video Studio" thành công → trước `navigate()` gọi `setCompletedSteps(prev => [...prev, STEP_GENERATE])` để có cảm giác hoàn tất (không bắt buộc nhưng nice-to-have).

---

## B. `src/components/video/ScriptWorkspace.tsx`

### B1. Title strip (lines 207–284)
- Thay `bg-gradient-to-br from-muted/30 to-transparent` → `bg-card/40` (phẳng, soft luxury).
- Icon container: `bg-primary/10` + `text-primary` → `bg-foreground/[0.05] border border-border/40` + `text-foreground/70`.
- Badge `{rendered}/{total} scene` thêm:
  - Nếu `failedScenes > 0`: badge phụ `destructive` "N lỗi".
  - Nếu `processingScenes > 0`: badge phụ "N đang render".
- Progress bar: thêm label `text-[10px] text-muted-foreground` bên cạnh bar: `{pct}%`.

### B2. Action row (lines 252–282) — hierarchy
- **Khi `missing.length > 0`:** "Render N scene còn thiếu" = primary (`bg-foreground text-background`), "Ghép phim" = outline disabled với tooltip "Render đủ scene trước".
- **Khi `missing.length === 0` && `canMerge`:** "Ghép phim" = primary, ẩn nút Render hoặc đổi thành "Render lại" (ghost).
- Nút "Render N scene còn thiếu" thêm sub-text khi hover: tooltip "Sẽ dùng nhân vật & sản phẩm đã chọn ở trên".

### B3. Storyboard rail header (lines 290–292)
- Đổi `Storyboard` → flex row: `Storyboard` + `<span className="ml-auto text-[10px] text-muted-foreground">{rendered}/{total}</span>`.
- Thêm filter chips nhỏ phía trên list: `[Tất cả] [Chưa quay] [Đang render] [Lỗi]` để user nhanh chóng nhảy đến scene cần xử lý. Local state `railFilter` lọc `scenes`.

### B4. Scene item active state (lines 310–315)
- Đổi active style `border-primary bg-primary/5` → `border-foreground/40 bg-foreground/[0.04]` để khớp Soft Luxury.
- Thêm thanh `w-0.5 bg-foreground/70` bên trái khi active (như indicator bookmark).

### B5. Empty state khi `total === 0`
- Hiện chỉ có 1 dòng text. Đổi thành card lớn hơn với CTA: "Mở viewer để chỉnh kịch bản" (nút) + "Hoặc tạo Quick Clip thủ công ở cột bên" (text hint).
- Disable nút Render + Ghép phim ở header strip với tooltip "Cần ít nhất 1 scene".

### B6. Mobile (`< lg`)
- Rail hiện full-width trên mobile, list scene có thể rất dài → giới hạn `max-h-[40vh] overflow-y-auto` cho mobile, `lg:max-h-[calc(100vh-280px)]` giữ nguyên.
- Action buttons trong title strip: trên mobile (`flex-wrap`) hiện đã wrap nhưng thiếu spacing → đổi `gap-1.5` → `gap-2` và full-width khi `< sm`.

### B7. Reorder header strip vs. workspace
- Hiện `AdminModelBadge` đứng cạnh "Mở viewer fullscreen" trên top action bar (lines 193–203). Trên màn hình hẹp, AdminModelBadge dài chiếm chỗ → di chuyển AdminModelBadge xuống title strip card (cạnh Badge `{rendered}/{total}`) như metadata phụ với `text-[10px] opacity-70`.

---

## C. Memory update

Cập nhật `mem://features/video/script-to-studio-link-vn.md`:
- Ghi chú State B có **Mini Storyboard Preview** + 2 CTA secondary (Chỉnh sửa cấu hình / Xem viewer).
- Workspace dùng filter chips trong rail (`Tất cả/Chưa quay/Đang render/Lỗi`).
- CTA hierarchy động: Render khi missing, Ghép phim khi đủ.

---

## Test thủ công
1. `/scripts/new?purpose=ai_video` → Step 3 State A: kiểm tra header neutral, hint "→ Studio", chip ordering có divider giữa Character Type ↔ Character Profile.
2. Sinh script → State B: thấy 4 scene pill, click pill #2 → Studio mở scene 2.
3. Click "Xem/Sửa kịch bản" → mở `ScriptViewer` dialog inline.
4. `/videos?tab=scripts&view=:id` → Title strip phẳng, icon neutral. Render 2 scene → "Ghép phim" thành primary. Filter rail "Lỗi" → chỉ hiện scene fail.
5. Mobile (375px): rail giới hạn 40vh, action buttons full-width.
