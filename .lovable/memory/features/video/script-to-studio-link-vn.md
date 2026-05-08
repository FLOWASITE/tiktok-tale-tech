---
name: Script→Video Studio Link
description: ScriptFormStepper Video AI gộp 3 bước (Nội dung → Định dạng Social → Kịch bản & Quay); workspace 2-cột storyboard rail + QuickClip embedded; Soft Luxury polish
type: feature
---

## Stepper (Video AI, purpose=ai_video)
3 bước: `[1 Nội dung] [2 Định dạng Social] [3 Kịch bản & Quay]`. Step 3 có 2 trạng thái:
- **State A** (chưa có script / `editingConfig=true`): hero icon neutral (`bg-foreground/[0.05] border`), title "Sẵn sàng tạo kịch bản & quay" + hint subtitle "Tạo xong sẽ mở thẳng Video Studio…". Card "Cấu hình" có sub-hint "AI sẽ tôn trọng các lựa chọn này"; chip row có **divider dọc** (`w-px h-5 bg-border/50`) tách Character Type (preset) vs Character Profile (hồ sơ thật). Footer ước tính có icon Clock + text "~15–30s tạo kịch bản · sau đó vào Studio để quay".
- **State B** (đã có `generatedScript`, `!editingConfig`):
  - **Mini Storyboard Preview**: pill row scrollable hiện 4 scene đầu (`#N ~Ns mô-tả-56-ký-tự`), click pill = `handleOpenStudio(idx)`; nếu >4 → nút `+N scene khác`.
  - 1 CTA primary "Mở Video Studio" (`bg-foreground`).
  - 3 ghost link cùng hàng: "Xem/Sửa kịch bản" (mở `<ScriptViewer>` dialog inline), "Chỉnh sửa cấu hình" (`setEditingConfig(true)`), "Để sau — về danh sách" (`navigate('/scripts')`).
- Footer "Tiếp tục"/"Tạo kịch bản" được ẩn khi ở State B (CTAs đã render inline).
- Constant `STEP_VIDEO=4` còn trong file nhưng không add vào `buildSteps()` nữa.

## Tab structure (sau merge)
Video Studio còn 5 tab: `[Kịch bản & Quay] [Storyboard] [Audio] [Gallery] [Chi phí]`. Tab "Quick Clip" độc lập **đã bị xoá** — Quick Clip giờ là panel "Quay scene" bên trong workspace của 1 kịch bản.

## ScriptWorkspace (2-cột, Soft Luxury polish)
- Trigger: ScriptsTab → click card script → `setWorkspaceScript(s)` thay vì mở `ScriptViewer` dialog. Sau `generateScript` thành công cũng vào thẳng workspace.
- Hydrate `ScriptToVideoContext` qua `buildScriptToVideoNavState` khi mount; `clearScript()` khi back.
- **Title strip** phẳng (`bg-card/40`, không gradient), icon container neutral, badge phụ động: "{rendered}/{total}", "{processing} đang render" (amber), "{failed} lỗi" (destructive). Progress bar có label `{pct}%` mono bên phải. AdminModelBadge di vào ngay cạnh badge metadata (top bar chỉ còn back + viewer fullscreen).
- **Action row động hierarchy**:
  - `hasMissing` → "Render N scene còn thiếu" = primary `bg-foreground`, "Ghép phim" = outline disabled (tooltip "Cần ít nhất 2 scene…").
  - `!hasMissing && canMerge` → "Đã render đủ" = ghost disabled, "Ghép phim" = primary.
  - `total === 0` → cả 2 disabled, hint "Cần ít nhất 1 scene".
- **Cột trái (storyboard rail)**:
  - Header row có counter `{rendered}/{total}` align-right.
  - Filter chips `[Tất cả|Chưa quay|Đang render|Lỗi]` với count; chip có count=0 (trừ Tất cả) bị disable opacity-40.
  - Scene item active: border `foreground/40` + bg `foreground/[0.04]` + dải dọc trái `w-0.5 bg-foreground/70` (bookmark indicator).
  - Mobile: rail `max-h-[40vh]`, lg+ giữ `calc(100vh-320px)`.
  - Empty state: card lớn với CTA "Mở viewer để chỉnh" + hint Quick Clip.
- **Cột phải**: `<QuickClipTab embedded />` — auto-fill prompt/aspect/duration từ `currentScene`.

## QuickClipTab embedded mode
Prop `embedded?: boolean`. Khi `embedded=true`:
- Bỏ qua `QuickClipContextPicker`, ẩn context badge / scene navigator / header strip "Quick Clip".
- Giữ: prompt + Smart Prompt + MultiCharacterPicker + CharacterProductMap + AspectRatioPicker + duration + generate + ModelUsedBadge + PublishVideoMenu.

## Routing & deep-link
- `/videos?tab=scripts&view=<scriptId>` → auto vào workspace của script đó.
- Legacy `/videos?tab=quick` → redirect `?tab=scripts`. `fromScript` state → set `initialViewScriptId` → mở workspace.
- `ScriptFormStepper` State B Mini Storyboard pill click → `/videos?tab=scripts&view=<id>` với `state` chứa scene index.

## Reverse link (Studio → Script)
Không đổi: `useScriptVideoGenerations(scriptId)` + `<SceneVideoStrip>` trong `ScriptViewer` vẫn hoạt động khi user "Mở viewer fullscreen".

## DB
Không migration mới — `video_generations.script_id` + `scene_number` đã có.
