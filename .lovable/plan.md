## Mục tiêu
Phát triển Quick Clip thành flow có **ngữ cảnh bắt buộc**: mỗi clip phải gắn với một **Chủ đề (topic)** và một **Kịch bản (script)**. Người dùng không thể tự gõ prompt rời rạc nữa — phải chọn (hoặc tạo nhanh) Topic → Script → Scene, rồi mới render. Điều này khớp với hướng "kịch bản đưa qua" đang có sẵn trong `ScriptToVideoContext`.

## Hành vi mới của Quick Clip

### 1. Gating bằng Topic + Script
- Khi mở `/videos` tab Quick Clip mà **chưa có `activeScript`** → ẩn toàn bộ form prompt/aspect/duration. Hiện một **Empty State 2-bước**:
  - Bước 1: chọn Chủ đề (combobox topic theo brand/org hiện tại, dùng cùng API `useTopics`)
  - Bước 2: chọn Kịch bản thuộc topic đó (filter `scripts` theo `topic_id` + `script_purpose='ai_video'`), hoặc nút "Tạo kịch bản mới" → điều hướng `/scripts/new?purpose=ai_video&topic_id=...`
- Sau khi chọn xong → hydrate `ScriptToVideoContext` (dùng `buildScriptToVideoNavState` + `setActiveScript`) y như flow từ Stepper.

### 2. Khi đã có activeScript
- Form quay hiện như hiện tại (prompt auto-fill từ scene), **nhưng prompt textarea read-only by default** với nút "Chỉnh sửa scene" để mở inline edit (tránh user lạc đề so với kịch bản).
- Nút "Đổi kịch bản / chủ đề" ở header để quay lại bước chọn (clear context).
- Hiển thị badge **Topic · Script** ở đầu Quick Clip (clickable → mở `/scripts/{id}`).

### 3. Persist & guard
- `handleGenerate` thêm guard cứng: nếu `!activeScript || !currentScene` → toast lỗi và mở lại empty state.
- Payload `generate-video` đã có `script_id + scene_number` — giữ nguyên, không đổi backend.

## Thay đổi file

| File | Việc |
|---|---|
| `src/components/video/QuickClipTab.tsx` | Render gating empty-state khi không có `activeScript`; làm prompt read-only; thêm header badge + nút đổi script |
| `src/components/video/QuickClipContextPicker.tsx` *(mới)* | UI 2-bước Topic→Script picker, dùng `useTopics` + query `scripts` filter `script_purpose='ai_video'`, có nút "Tạo kịch bản mới" |
| `src/lib/scriptToVideoNav.ts` | Export 1 helper `hydrateScriptToVideoFromId(scriptId)` để fetch script từ DB rồi gọi `setActiveScript` (tái dùng cho picker) |
| `src/contexts/ScriptToVideoContext.tsx` | Không đổi API; chỉ dùng `setActiveScript` từ picker |
| `.lovable/memory/features/video/script-to-studio-link-vn.md` | Cập nhật: Quick Clip nay **bắt buộc** có script context, không còn standalone |

## Edge cases
- Brand chưa có topic nào → empty state có CTA "Tạo chủ đề đầu tiên" → `/topics/new`
- Topic có nhưng chưa có script `ai_video` → CTA "Tạo kịch bản video cho topic này"
- User vào Quick Clip qua deep-link `/videos?script_id=xxx` → tự fetch + hydrate, bỏ qua picker

## Ngoài phạm vi
- Storyboard tab và Gallery tab giữ nguyên — chỉ Quick Clip bị gate.
- Không đổi schema DB, không đổi edge function.
