# Plan — Ghép scene thành phim hoàn chỉnh

## Mục tiêu
Nút "Ghép thành phim" hiện tại chỉ mở Video Studio. Sẽ chuyển thành **merge thực sự**: lấy toàn bộ clip đã render theo đúng thứ tự scene, ghép lại thành 1 MP4 và lưu lại để xem/tải về.

## 1. Backend — Edge function `merge-script-video`

Tạo `supabase/functions/merge-script-video/index.ts`:

- **Input**: `{ script_id: string, clip_ids: string[] }` (đúng thứ tự đã sắp xếp)
- **Auth**: JWT validation qua serviceClient (theo pattern hiện tại)
- **Logic**:
  1. Validate quyền truy cập `script_id` theo `organization_id`
  2. Load các clip từ `video_generations` theo `clip_ids` (status = completed, có `video_url`)
  3. Tải tuần tự các MP4 vào `/tmp/` của Deno runtime
  4. Dùng **ffmpeg concat demuxer** (subprocess `Deno.Command('ffmpeg')`) — re-encode chung codec/preset để xử lý input khác resolution/fps:
     - `ffmpeg -f concat -safe 0 -i list.txt -c:v libx264 -preset veryfast -crf 23 -c:a aac -movflags +faststart out.mp4`
  5. Upload output lên Supabase Storage bucket `script-movies/{org_id}/{script_id}/{timestamp}.mp4` (tạo bucket public nếu chưa có)
  6. Insert record vào bảng mới `script_movies` (xem mục 2)
  7. Return `{ id, video_url, duration }`

**Lưu ý ffmpeg trong edge function**: Deno Deploy runtime KHÔNG có ffmpeg. → Hai lựa chọn:

- **Option A (khuyến nghị)**: dùng provider trung gian — gọi API ghép video của một service hiện có. Nhưng phức tạp.
- **Option B (đơn giản, robust)**: Background Task pattern — edge function nhận request, đẩy job vào bảng `merge_jobs` (status=pending), rồi worker chạy ffmpeg. Vì Lovable Cloud không có worker, fallback thực tế là:
- **Option C (chọn)**: Dùng **Mux / Shotstack / Cloudinary video concat API**. Cụ thể **Cloudinary** miễn phí có endpoint `video/upload` với transformation `fl_splice` để ghép. Yêu cầu user cấu hình `CLOUDINARY_*` secrets.

→ **Đề xuất hỏi user** (xem cuối plan) chọn provider merge: Cloudinary, Shotstack, hoặc client-side ffmpeg.wasm.

## 2. Database — bảng `script_movies`

Migration mới:

```sql
CREATE TABLE public.script_movies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  video_url text NOT NULL,
  thumbnail_url text,
  duration_seconds numeric,
  scene_count int NOT NULL,
  clip_ids uuid[] NOT NULL,
  status text NOT NULL DEFAULT 'completed', -- pending | processing | completed | failed
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.script_movies ENABLE ROW LEVEL SECURITY;

-- RLS: org members CRUD theo organization_id (theo pattern hiện tại)
CREATE POLICY "org members read" ON script_movies FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org members insert" ON script_movies FOR INSERT
  WITH CHECK (user_id = auth.uid() AND organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org members delete" ON script_movies FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE INDEX idx_script_movies_script ON script_movies(script_id, created_at DESC);
```

Bucket Storage `script-movies` (public read).

## 3. Frontend

### Hook mới `src/hooks/useScriptMovieMerge.ts`
- `mergeMovie(scriptId, orderedClipIds)` → invoke edge function, toast progress, return movie record
- `useScriptMovies(scriptId)` → fetch list movies + realtime subscription

### Sửa `ScriptVideoTab.tsx`
- `handleMerge`:
  ```ts
  const orderedClipIds = scenes
    .filter(s => s.clip?.status === 'completed' && s.clip.video_url)
    .sort((a,b) => a.sceneNumber - b.sceneNumber)
    .map(s => s.clip!.id);
  await mergeMovie(script.id, orderedClipIds);
  ```
- Hiển thị badge state: "Đang ghép…" trong header khi merge chạy

### Component mới `src/components/script/ScriptMovieGallery.tsx`
- Hiển thị bên dưới `ScriptVideoGalleryGrouped`
- List các phim đã ghép: thumbnail + video player + nút Tải MP4 + Xoá
- Realtime update khi có movie mới hoàn thành

### Sửa `ScriptVideoHeader.tsx`
- Đổi label nút từ "Ghép thành phim" → vẫn giữ nhưng thêm tooltip: "Ghép {n} scene đã render thành 1 MP4"
- Thêm prop `merging: boolean` để show spinner

## 4. UX Flow
1. User render đủ ≥2 scene
2. Bấm "Ghép thành phim" → confirm dialog hiển thị thứ tự scene và tổng thời lượng dự kiến
3. Edge function chạy → toast "Đang ghép phim, ~30s…"
4. Khi xong → realtime update, gallery xuất hiện movie mới + auto scroll xuống
5. User xem inline / tải MP4 / publish lên kênh

## File changes
- **Tạo**: `supabase/functions/merge-script-video/index.ts`, migration `script_movies` + bucket, `src/hooks/useScriptMovieMerge.ts`, `src/hooks/useScriptMovies.ts`, `src/components/script/ScriptMovieGallery.tsx`, `src/components/script/MergeMovieDialog.tsx`
- **Sửa**: `src/components/script/ScriptVideoTab.tsx`, `src/components/script/ScriptVideoHeader.tsx`

## Câu hỏi cần xác nhận trước khi build
**Provider merge video**: edge function Deno không có ffmpeg sẵn. Bạn muốn:
- **A. Cloudinary** (miễn phí 25GB/tháng, cần `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET`) — recommended
- **B. Shotstack** (chuyên video editing API, có free tier, cần `SHOTSTACK_API_KEY`)
- **C. Client-side ffmpeg.wasm** — không cần backend/secret, nhưng chậm và tốn RAM trình duyệt; chỉ tốt với ≤5 scene ngắn
- **D. Tự host worker ffmpeg** — phức tạp, không khuyến nghị trong scope hiện tại

Mình sẽ hỏi câu này khi bắt đầu implement.
