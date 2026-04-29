## Hiện trạng tab Video

Trong `ScriptViewer.tsx` (lines 539-549), tab "Video" chỉ render:
- `VideoGeneratorPanel` — 1 form tạo video đơn lẻ
- `VideoGallery` — danh sách raw các lần generate (không gắn với scene)

Vấn đề:
1. **Không có overview** từng scene đã render hay chưa (info này chỉ thấy trong tab "Prompts" qua `SceneVideoStrip`)
2. **Không batch render** được nhiều scene cùng lúc — phải qua `/videos` (Video Studio) thủ công từng scene
3. **Tab Storyboard đang disabled** ("Soon") — kịch bản `ai_video` không có flow visual storyboard
4. **VideoGallery** không group theo scene, chỉ list theo thời gian
5. **Không có CTA ghép phim** sau khi render xong tất cả scene

## Mục tiêu

Biến tab Video thành dashboard render hoàn chỉnh cho kịch bản ai_video, giữ nguyên fallback cho kịch bản loại khác.

## Phạm vi thay đổi

### 1. `src/components/script/ScriptVideoTab.tsx` (mới)
Component mới thay thế nội dung TabsContent value="video", chứa:

**A. Header dashboard** (chỉ hiện khi `isAiVideo`)
- Progress bar tổng: "X/Y scene đã render"
- Estimated cost còn lại + total spent (dùng `useScriptVideoGenerations`)
- Action chính: **"Render tất cả scene chưa quay"** (batch) + **"Ghép thành phim hoàn chỉnh"** (disabled khi chưa đủ scene)

**B. Scene grid** (replace VideoGenerator đơn lẻ cho ai_video)
- Lưới card 2-3 cột, mỗi card = 1 scene từ `parsedPrompts`
- Card hiển thị: số scene, thumb video (nếu có) hoặc placeholder, status badge, duration, aspect, action "Render" / "Re-render" / "Mở Studio"
- Click card mở dialog có `VideoGeneratorPanel` prefilled prompt scene đó (giữ nguyên panel hiện tại)

**C. Gallery group theo scene** (replace VideoGallery flat)
- Tab phụ "Theo scene" / "Theo thời gian"
- View "Theo scene": expand từng scene xem các lần render (versioning), chọn version nào làm "active"
- View "Theo thời gian": giữ VideoGallery cũ

**D. Fallback**: nếu `!isAiVideo` (ví dụ kịch bản TikTok thuần), giữ layout cũ (VideoGeneratorPanel + VideoGallery).

### 2. Bỏ trạng thái "Soon" của tab Storyboard
- File `src/components/ScriptViewer.tsx`, line 477-481: enable tab Storyboard, bỏ Badge "Soon" (vì `StoryboardGenerator` đã tồn tại line 536)

### 3. Hook mới `useScriptVideoBatch`
- File `src/hooks/useScriptVideoBatch.ts` (mới)
- Method `renderMissingScenes(scenes, defaults)`: queue tuần tự `generateVideo` cho từng scene chưa có clip completed
- Trả về progress `{ done, total, currentSceneNumber, errors[] }`
- Tôn trọng quota — nếu 402/429 thì stop và báo upgrade
- Sử dụng `useVideoGeneration` hiện có

### 4. Action "Ghép thành phim hoàn chỉnh"
- Toast info: "Đang chuẩn bị merge timeline…"
- Navigate sang `/videos?tab=storyboard&scriptId=:id` — `StoryboardVideoTab` đã có sẵn (đọc state từ `ScriptToVideoContext`)
- Không build merge logic mới ở phase này (đã tồn tại trong `/videos`)

### 5. Active version per scene
- Migration nhỏ: thêm cột `is_active boolean default false` vào `video_generations` (default true cho clip mới nhất completed của mỗi scene)
- Trigger: khi clip completed mới được set `is_active=true`, các clip cũ cùng `(script_id, scene_number)` set false
- `useScriptVideoGenerations.bySceneNumber` filter `is_active=true`
- UI: dropdown chọn version trong card scene

## Technical details

```text
ScriptViewer (TabsContent value="video")
  └─ ScriptVideoTab
       ├─ ScriptVideoHeader (progress + batch + merge CTA)
       ├─ if isAiVideo:
       │    ├─ ScriptSceneGrid (cards per scene)
       │    │    └─ Click → Dialog<VideoGeneratorPanel scene={...}>
       │    └─ ScriptVideoGalleryGrouped (toggle scene/time)
       └─ else:
            ├─ VideoGeneratorPanel script={script}
            └─ VideoGallery scriptId={script.id}
```

Sử dụng các module có sẵn:
- `useScriptVideoGenerations` (đã có) — đọc clips by scene
- `useVideoGeneration` (đã có) — generateVideo + realtime
- `VideoGeneratorPanel` (đã có) — reuse trong dialog
- `StoryboardVideoTab` ở /videos (đã có) — không động đến

Không edit `_shared/` edge functions. Không tạo edge function mới.

## Files

**Mới:**
- `src/components/script/ScriptVideoTab.tsx`
- `src/components/script/ScriptVideoHeader.tsx`
- `src/components/script/ScriptSceneGrid.tsx`
- `src/components/script/ScriptVideoGalleryGrouped.tsx`
- `src/hooks/useScriptVideoBatch.ts`
- Migration: `add_is_active_to_video_generations`

**Sửa:**
- `src/components/ScriptViewer.tsx` — replace TabsContent video + enable tab storyboard
- `src/hooks/useScriptVideoGenerations.ts` — filter `is_active`
- `src/types/videoGeneration.ts` — thêm field `is_active`

## Out of scope
- Không build video editor/timeline merge mới (đã có ở /videos)
- Không chạm Audio Studio / Publish menu
- Không refactor VideoGeneratorPanel (giữ nguyên props)
