---
name: Script→Video Studio Link
description: Liên kết 2 chiều Kịch bản ai_video ↔ Video Studio — auto-fill QuickClip, filter Storyboard/Gallery theo script_id, reverse-link strip per scene
type: feature
---

## Luồng đi (Script → Studio)
- ScriptViewer (`script_purpose='ai_video'`) → nút "Quay với Video Studio" → `navigate('/videos', { state: { fromScript: { script: {id, title, scenes[]}, activeSceneIndex } } })`.
- `ScriptToVideoContext` (sessionStorage `flowa_script_to_video_v1`) hydrate state, persist khi đổi tab.
- QuickClipTab auto-fill `prompt/duration/aspect` từ `currentScene`, gửi `script_id + scene_number` xuống `generate-video` edge function.
- Auto `markSceneCompleted` + `goToNextScene` khi job hoàn thành (realtime).

## Luồng về (Studio → Script)
- `useScriptVideoGenerations(scriptId)` fetch + realtime tất cả `video_generations` thuộc 1 script, group theo `scene_number` (rank: completed > processing > pending > failed).
- `<SceneVideoStrip>` render dưới mỗi `PurposeAwarePromptCard` trong ScriptViewer với 4 trạng thái: chưa quay / đang xử lý / đã quay (thumbnail + preview dialog) / lỗi.
- Click "Quay scene này" trên strip → navigate Studio với `activeSceneIndex = sceneNumber - 1`.

## Gallery filter
- VideoGalleryTab có 2 dropdown: Script (Tất cả / Quick Clip rời / per-script với count) + Aspect ratio.
- Khi chọn script: clip sort theo `scene_number ASC`. Title script lấy từ bảng `scripts`, cache trong state.
- Mỗi card có badge `Scene N · {scriptTitle}` clickable → mở `/scripts`.

## DB
Không cần migration mới — `video_generations.script_id` + `scene_number` đã có từ migration `20260208040527`.
