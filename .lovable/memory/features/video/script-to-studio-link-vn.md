---
name: Script→Video Studio Link
description: Tab "Kịch bản & Quay" workspace 2-cột — storyboard rail trái + Quick Clip embedded phải, không còn tab Quick Clip độc lập
type: feature
---

## Tab structure (sau merge)
Video Studio còn 5 tab: `[Kịch bản & Quay] [Storyboard] [Audio] [Gallery] [Chi phí]`. Tab "Quick Clip" độc lập **đã bị xoá** — Quick Clip giờ là panel "Quay scene" bên trong workspace của 1 kịch bản.

## ScriptWorkspace (2-cột, mới)
- Trigger: ScriptsTab → click card script → `setWorkspaceScript(s)` thay vì mở `ScriptViewer` dialog. Sau `generateScript` thành công cũng vào thẳng workspace.
- Hydrate `ScriptToVideoContext` qua `buildScriptToVideoNavState` khi mount; `clearScript()` khi back.
- **Cột trái (storyboard rail)**: list scene + status (`useScriptVideoGenerations`) + click → `setActiveSceneIndex`.
- **Cột phải**: `<QuickClipTab embedded />` — auto-fill prompt/aspect/duration từ `currentScene`.
- **Header workspace**: Topic + Title + Progress `X/Y scene đã quay` + nút batch `renderMissingScenes` + `mergeMovie` (Creatomate) + "Mở viewer fullscreen" (mở `ScriptViewer` dialog để đọc/edit markdown).

## QuickClipTab embedded mode
Prop `embedded?: boolean`. Khi `embedded=true`:
- Bỏ qua `QuickClipContextPicker` (parent đã đảm bảo có `activeScript`).
- Ẩn context badge + "Đổi kịch bản" (workspace header đã có).
- Ẩn scene navigator (rail trái đã có).
- Ẩn header strip "Quick Clip".
- Giữ: prompt + Smart Prompt + MultiCharacterPicker + CharacterProductMap + AspectRatioPicker + duration + generate + ModelUsedBadge + PublishVideoMenu.

## Routing & deep-link
- `/videos?tab=scripts&view=<scriptId>` → auto vào workspace của script đó.
- Legacy `/videos?tab=quick` (URL/state) → redirect sang `?tab=scripts`. Nếu kèm `fromScript` state → set `initialViewScriptId` → mở workspace.
- `ScriptFormStepper` step "Tạo Video" CTA navigate `/videos?tab=scripts&view=<id>` thay vì `?tab=quick`.
- `StoryboardVideoTab.onJumpToTab('quick')` được map về `'scripts'`.

## ScriptLinkBanner
Chỉ render khi `tab !== 'scripts'` (workspace header đã có cùng info). Vẫn dùng để hiển thị progress khi user đang ở Audio/Gallery/Storyboard/Costs.

## Reverse link (Studio → Script)
Không đổi: `useScriptVideoGenerations(scriptId)` + `<SceneVideoStrip>` trong `ScriptViewer` vẫn hoạt động khi user "Mở viewer fullscreen".

## DB
Không migration mới — `video_generations.script_id` + `scene_number` đã có.
