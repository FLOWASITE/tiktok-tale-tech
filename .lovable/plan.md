## Phase 3 — Async Video Job Pipeline

Mục tiêu: chuyển `generate-video` từ "submit + poll inline" (chặn 150s, dễ timeout với Veo/Sora 60–120s) sang "submit-only + background poller" để hỗ trợ video dài, multi-scene, và nhiều job song song mà không tốn wall-clock của edge function.

### Vấn đề hiện tại
- `generate-video` gọi `generateVideoViaPoyo` / `generateVideoViaGeminiGen` inline → block tới 150s; nếu Veo Fast trả về sau 90s + retry là vỡ.
- Không có cơ chế retry tự động khi provider trả 5xx tạm thời.
- Client phải giữ HTTP connection mở suốt thời gian render.
- Frontend Quick Clip + Storyboard tab chưa có realtime cập nhật progress.

### Kiến trúc mới
```text
Client ──POST──▶ generate-video ──submit only──▶ Provider (PoYo/GeminiGen)
                      │                               │
                      ▼                               ▼
              video_generations row              task_id stored
              status='processing'                provider_task_id
                      │
                      │  (returns immediately ~2s)
                      ▼
                Client subscribes via Supabase Realtime
                      │
                      ▼
   pg_cron (mỗi 30s) ──▶ video-job-poller ──▶ check provider status
                                 │
                                 ▼
                        update row → 'completed' | 'failed'
                        Realtime push tới client → UI cập nhật
```

### Database changes (1 migration)
1. Thêm cột vào `video_generations`:
   - `provider_task_id text` — task ID từ PoYo/GeminiGen
   - `poll_attempts int default 0` — đếm số lần poll, max 60 (~30 phút)
   - `last_polled_at timestamptz`
   - `negative_prompt text`, `voiceover_url text`, `bgm_url text`, `subtitle_srt text` (chuẩn bị Phase 6)
2. Mở rộng enum `video_provider` thêm `geminigen` và `poyo`.
3. Index mới: `idx_video_generations_pending_poll on (status, last_polled_at) where status = 'processing'` để poller scan nhanh.
4. Bật `realtime` publication cho `video_generations` để frontend subscribe.

### Edge function thay đổi

**`generate-video/index.ts`** — chuyển sang submit-only:
- Gọi `submitPoyoVideoTask` (đã export sẵn) hoặc `submitGeminiGenVideoTask` (cần export thêm từ `geminigen-video-generator.ts`).
- Lưu `provider_task_id` vào row, trả response `{ job_id, status: 'processing', provider_task_id }` ngay (~2s thay vì 150s).
- Giữ chế độ `sync=true` (qua query param hoặc body flag) cho test/agent flow muốn chờ kết quả.

**`generate-video-poller/index.ts`** (mới):
- Service-role client.
- Query: `SELECT * FROM video_generations WHERE status='processing' AND poll_attempts < 60 ORDER BY last_polled_at NULLS FIRST LIMIT 20`.
- Với mỗi row: gọi đúng provider's status endpoint dùng helper mới `pollProviderStatus(provider, taskId)`.
- Status `finished` → update `video_url`, `thumbnail_url`, `status='completed'`, `completed_at`, `progress=100`.
- Status `failed` → `status='failed'`, ghi `error_message`.
- Còn `processing` → `poll_attempts++`, `last_polled_at=now()`, cập nhật `progress` ước tính (linear 10→90% theo attempts).
- Nếu `poll_attempts >= 60` → mark `failed` với `TIMEOUT_AFTER_30MIN`.
- Trả tổng kết `{ checked, completed, failed, still_processing }`.

**`_shared/poyo-video-generator.ts`** & **`_shared/geminigen-video-generator.ts`**:
- Export `pollPoyoVideoTask` (đã có) và bổ sung `pollGeminiGenVideoTask(taskId, apiKey)` trả `{ status, videoUrl?, error? }`.

### Cron schedule
Sau khi deploy poller, cấu hình cron:
```sql
select cron.schedule(
  'video-job-poller-30s',
  '30 seconds',
  $$ select net.http_post(
       url := 'https://rllyipiyuptkibqinotz.supabase.co/functions/v1/video-job-poller',
       headers := '{"Content-Type":"application/json","apikey":"<anon>"}'::jsonb,
       body := '{}'::jsonb) as request_id; $$
);
```
(SQL chạy qua `supabase--insert` chứ không qua migration, theo guideline không leak anon key vào git).

### Frontend changes
**`src/hooks/useVideoGeneration.ts`**:
- Sau `generateVideo()` trả về `job_id` → setup Supabase Realtime subscription:
  ```
  supabase.channel(`video-job-${jobId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'video_generations', filter: `id=eq.${jobId}` }, callback)
    .subscribe()
  ```
- Expose `jobs[]` state (id, status, progress, video_url, error) để Gallery & Quick Clip render realtime.

**`src/components/video/QuickClipTab.tsx`**:
- Sau khi nhấn "Tạo video" hiển thị inline progress card (status badge + progress bar + ETA "Khoảng 1–3 phút").
- Khi `completed` → preview video + nút "Mở trong Thư viện".

**`src/components/video/VideoGalleryTab.tsx`**:
- Đã có badge status — wire vào jobs realtime để các row processing tự cập nhật mà không cần refetch.

### Files

**New**
- `supabase/functions/video-job-poller/index.ts`
- `supabase/migrations/<ts>_video_async_pipeline.sql` (cột mới + enum + realtime publication)

**Modified**
- `supabase/functions/generate-video/index.ts` — submit-only mode
- `supabase/functions/_shared/geminigen-video-generator.ts` — export submit + poll riêng
- `src/hooks/useVideoGeneration.ts` — Realtime subscription
- `src/components/video/QuickClipTab.tsx` — progress card
- `src/components/video/VideoGalleryTab.tsx` — realtime sync
- `src/types/videoGeneration.ts` — thêm field tracking

**Cron setup** (sau deploy, qua `supabase--insert` SQL với anon key thực)

### Resilience
- Poller idempotent (dùng `provider_task_id` để dedupe).
- Single in-flight per cron tick (`LIMIT 20` để không quá tải).
- Provider down → giữ row ở `processing`, `poll_attempts++`; sau 30 phút → `failed` để client thấy lỗi rõ.
- Nếu user disconnect, job vẫn chạy → khi quay lại Gallery tab thấy video đã sẵn sàng.

### Out of scope (để Phase 4–6)
- Multi-scene stitching (Phase 4)
- Quota enforcement chi tiết (Phase 5)
- Voiceover/BGM/subtitle (Phase 6) — đã chuẩn bị cột DB nhưng chưa wire UI.