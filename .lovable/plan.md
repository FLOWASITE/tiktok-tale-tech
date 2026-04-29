## Mục tiêu

Liên kết hai luồng đang tách rời:
- **Kịch bản Video** (`/scripts/new` → `scripts` table) sinh ra `ParsedPrompt[]` (mỗi prompt = 1 cảnh AI video).
- **Video Studio** (`/videos`) hiện chỉ có **Quick Clip** rời rạc + **Storyboard** ghép thủ công các clip có sẵn.

Sau plan này, người dùng có thể: từ một kịch bản → 1 click "Quay phim với Video Studio" → các scene tự nạp vào hàng đợi → Quick Clip generate từng scene → Storyboard biết clip nào thuộc kịch bản nào → ghép lại theo đúng thứ tự kịch bản.

---

## Kiến trúc liên kết

```text
ScriptViewer (ai_video purpose)
   │  parseScriptContent → ParsedPrompt[]
   ▼
[Nút "Quay với Video Studio"]
   │  navigate('/videos', state: { scriptId, scenes[] })
   ▼
VideoStudioPage  ──►  ScriptContext (mới, nhẹ)
   ├── QuickClipTab    : Banner "Đang quay từ kịch bản X — scene 2/5", auto-fill prompt + duration + aspect
   │                     khi generate → lưu script_id + scene_number vào video_generations
   ├── StoryboardTab   : Mặc định lọc theo script đang active, sắp xếp theo scene_number, 1-click "Ghép theo kịch bản"
   └── GalleryTab      : Group clip theo script, badge "Scene N/Total"
```

DB **không cần thêm cột** — `video_generations.script_id` và `scene_number` đã tồn tại từ migration `20260208040527`. Chỉ cần truyền giá trị khi ghi.

---

## Các thay đổi chi tiết

### 1. ScriptViewer — entry point
**File**: `src/components/ScriptViewer.tsx`

- Khi `script_purpose === 'ai_video'` và có `parsedPrompts.length > 0`, thêm CTA chính: **"Quay với Video Studio"** (icon `Clapperboard`).
- Action: `navigate('/videos', { state: { fromScript: { id, title, topic, scenes: parsedPrompts.map(p => ({ sceneNumber, prompt: p.rawContent || cinematic, duration, aspect })) } } })`.
- Thêm CTA phụ trong từng scene card: **"Quay scene này"** → cùng route nhưng `state.activeSceneIndex = N`.

### 2. ScriptToVideoContext — state liên kết (mới)
**File**: `src/contexts/ScriptToVideoContext.tsx`

- Provider bọc `VideoStudioPage`.
- State: `activeScript: { id, title, scenes: VideoScene[] } | null`, `activeSceneIndex: number`, `completedSceneIds: Record<sceneNumber, video_generation_id>`.
- Hydrate từ `location.state` lần đầu, persist vào `sessionStorage` (key `flowa_script_to_video`) để không mất khi user chuyển tab.
- Methods: `setActiveScene(idx)`, `markSceneCompleted(num, genId)`, `clearScript()`, `goToNextScene()`.

### 3. Banner liên kết — hiển thị toàn page
**File**: `src/components/video/ScriptLinkBanner.tsx` (mới)

- Hiển thị phía trên `<Tabs>` khi `activeScript` tồn tại.
- Nội dung: tiêu đề kịch bản, progress `X/Y scene đã quay`, nút **"Bỏ liên kết"** + **"Mở kịch bản gốc"** (→ `/scripts/{id}`).
- Soft Luxury: nền `bg-muted/30`, border `border-border/60`, icon neutral.

### 4. QuickClipTab — auto-fill từ scene
**File**: `src/components/video/QuickClipTab.tsx`

- Đọc `activeScript`, `activeSceneIndex` từ context.
- Khi có scene active: prefill `prompt`, `duration`, `aspect` từ scene đó. Hiển thị strip nhỏ phía trên textarea: `[← Scene trước]  Scene 2/5: "..."  [Scene sau →]` để chuyển nhanh không cần quay về ScriptViewer.
- Sau khi `generateVideo` thành công, truyền thêm `script_id` + `scene_number` xuống `useVideoGeneration.generateVideo` → `generate-video` edge function → ghi vào `video_generations`.
- Auto `markSceneCompleted` + `goToNextScene()` khi job hoàn thành (lắng nghe Realtime trong context).

### 5. useVideoGeneration — propagate script linkage
**File**: `src/hooks/useVideoGeneration.ts`

- Thêm optional `script_id`, `scene_number` vào tham số `generateVideo`.
- Truyền xuống edge function body. Edge function `generate-video` đã insert vào `video_generations` — chỉ cần forward thêm 2 cột này.

### 6. StoryboardVideoTab — mode "Theo kịch bản"
**File**: `src/components/video/StoryboardVideoTab.tsx`

- Khi `activeScript` tồn tại:
  - Mặc định **chỉ hiển thị clip có `script_id === activeScript.id`**, sắp xếp theo `scene_number`.
  - Tự động tick chọn tất cả + đặt thứ tự theo `scene_number`.
  - Nút prominent **"Ghép theo đúng kịch bản"** (1-click submit render).
  - Cảnh báo nếu thiếu scene: `"Còn 2/5 scene chưa quay → quay nốt ở Quick Clip"` + nút chuyển tab.
- Toggle **"Hiện tất cả clip"** để fallback chế độ tự do hiện tại.

### 7. VideoGalleryTab — group theo script
**File**: `src/components/video/VideoGalleryTab.tsx`

- Thêm filter theo script (dropdown danh sách script gần đây có clip).
- Mỗi clip thuộc script → badge nhỏ `Scene 3 · "Tên script"` (clickable → mở ScriptViewer).

### 8. Reverse link trong ScriptViewer
**File**: `src/components/ScriptViewer.tsx`

- Query `video_generations` theo `script_id`, hiển thị mini-strip dưới mỗi scene: thumbnail + status (`✓ Đã quay`, `⟳ Đang xử lý`, `— Chưa quay`).
- Click thumbnail → mở video preview dialog. Click "Quay lại" → navigate Video Studio đúng scene.

---

## Edge function thay đổi

**`supabase/functions/generate-video/index.ts`**: chỉ thêm 2 dòng — đọc `script_id`, `scene_number` từ body và include khi `insert into video_generations`. Không thay đổi logic provider.

Không cần migration mới.

---

## UX flow tổng

1. User tạo kịch bản `ai_video` 5 scenes ở `/scripts/new`.
2. ScriptViewer mở → click **"Quay với Video Studio"**.
3. Vào `/videos` → Banner xanh nhạt: *"Đang quay: 'Review serum X' — 0/5 scene"*. Tab Quick Clip auto-fill scene 1.
4. Click **Tạo video** → job chạy nền (Realtime). Banner cập nhật `1/5`. Auto chuyển scene 2.
5. Lặp lại đến `5/5`. Banner gợi ý: *"Đã đủ! Sang tab Storyboard để ghép."*
6. Tab Storyboard: clip đã được pre-selected đúng thứ tự → 1-click ghép → render qua Creatomate (đã có sẵn).
7. Quay lại ScriptViewer bất kỳ lúc nào: thấy thumbnail của từng scene đã quay.

---

## Phạm vi & rủi ro

- **Không sửa**: schema DB, `_shared/`, AI provider, Creatomate render logic, audio studio.
- **Backward compatible**: mọi flow Quick Clip / Storyboard hiện tại vẫn dùng được khi không có `activeScript`.
- **Không phá Lovable Cloud auto-gen**: chỉ thêm cột-đã-có vào insert, không edit `client.ts` / `types.ts`.

---

## Files

**Mới**:
- `src/contexts/ScriptToVideoContext.tsx`
- `src/components/video/ScriptLinkBanner.tsx`

**Sửa**:
- `src/components/ScriptViewer.tsx` (thêm CTA + reverse-link strip)
- `src/pages/VideoStudioPage.tsx` (bọc Provider + render Banner)
- `src/components/video/QuickClipTab.tsx` (auto-fill + scene navigator + propagate IDs)
- `src/components/video/StoryboardVideoTab.tsx` (mode theo script)
- `src/components/video/VideoGalleryTab.tsx` (filter + badge scene)
- `src/hooks/useVideoGeneration.ts` (params script_id/scene_number)
- `supabase/functions/generate-video/index.ts` (forward 2 trường vào insert)
