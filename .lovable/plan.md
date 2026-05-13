# Cải thiện Background Carousel Generation

Mục tiêu: tạo Carousel (cả prompt-text lẫn image batch) tiếp tục chạy/khôi phục được khi user reload, đóng tab, đổi route, hoặc mất mạng — kèm tracker đa-job toàn cục và resume thay vì fail toàn bộ.

## Hiện trạng (vấn đề)

1. **Prompt-streaming (`generate-carousel`)**: job lưu trong `useState` của `CarouselGenerationContext` — F5/đóng tab → mất hết, dù backend vẫn ghi `carousels` row. Không có entry trong `generation_tasks`.
2. **Image batch**: đã có `generation_tasks` row nhưng UI tracker chỉ hiển thị khi user đứng đúng route `/carousel/:id`. Không có badge global cho biết "đang chạy 2 carousel nền".
3. **Resilience**: stream đứt → watchdog abort → toàn bộ job thành `error`. Không retry slide bị lỗi, chỉ có DB-sync fallback. Image batch khi 1 slide fail thì cả batch đánh dấu `needs_regeneration_slides` nhưng không auto-retry.
4. **Đa-job**: code đã hỗ trợ array `jobs[]` nhưng tracker UI chỉ render `activeJob` (job mới nhất). Không có notification center.

## Phạm vi

Cả `generate-carousel` (prompt streaming) và `generate-carousel-images-batch` (image gen).

## Thay đổi

### 1. Persist prompt-stream job vào `generation_tasks` (mới)

**Migration**: thêm `'carousel_prompt'` vào CHECK constraint `task_type`.

```sql
ALTER TABLE public.generation_tasks DROP CONSTRAINT IF EXISTS generation_tasks_task_type_check;
ALTER TABLE public.generation_tasks ADD CONSTRAINT generation_tasks_task_type_check
CHECK (task_type IN ('core_content','multichannel','carousel_image','image_generation','carousel_prompt'));
```

**Frontend (`CarouselGenerationContext.tsx`)**:
- Trước khi mở SSE: insert row `generation_tasks` `{task_type:'carousel_prompt', input_params: formData, status:'pending'}` → lấy `taskId`. Truyền `taskId` vào body SSE để edge function update progress.
- Mỗi event `progress / slide_done / carousel_saved`: throttle (1.5s) update `generation_tasks` `{progress, progress_message, current_step, result_id: carouselId}`.
- Khi `result` nhận được → `status='completed', result_id=carouselId, result_type='carousels'`.
- Khi error/cancel → `status='failed' / 'cancelled'`.

**Backend (`generate-carousel/index.ts`)**:
- Nhận `taskId` từ body. Sau mỗi phase quan trọng (`carousel_saved`, batch milestone), update `generation_tasks` qua service client → đảm bảo state còn đúng cả khi client disconnect (background persistence pattern đã có).

### 2. Rehydrate khi reload

Trong `CarouselGenerationProvider` mount (sau khi có `user`):
- Query `generation_tasks` `task_type IN ('carousel_prompt','carousel_image')` `status IN ('pending','generating')` last 30 phút.
- Convert mỗi row → `CarouselGenerationJob` (đọc `input_params`, `progress`, `current_step`, `result_id`).
- Subscribe Realtime `generation_tasks` filter `user_id=eq.<id>` → cập nhật progress live mà KHÔNG cần SSE (nguồn truth = DB).
- Nếu task `result_id` đã có và row `carousels` đầy đủ slides_content → mark job `done`.

→ Sau reload, user vẫn thấy "Carousel A — 60% (slide 4/7)" tiếp tục chạy.

### 3. Tracker đa-job toàn cục

**Component mới `GlobalCarouselJobsBadge.tsx`** mount trong `AppLayout` (mọi route):
- Floating pill bottom-right hiển thị số job đang chạy: "🎨 2 carousel đang tạo".
- Click → mở `Sheet` list job với progress bar, currentStep, partialSlides preview thumbnail, action [Mở] [Hủy] [Bỏ qua].
- Dùng `CarouselGenerationContext` (đã expose `jobs[]`) — chỉ thay UI render từ `activeJob` sang loop `jobs.filter(j => j.status==='generating')`.
- Refactor `CarouselGenerationTracker` page-level: vẫn cho route `/carousel/:id?generating=1`, dùng chung context, không tự fetch.

### 4. Resume khi stream đứt

**SSE consumer** (`CarouselGenerationContext`):
- Khi watchdog abort hoặc network error mà có `savedCarouselId` + slide đang dở:
  - Thay vì fail ngay, gọi reconnect endpoint `/functions/v1/generate-carousel?resume=<carouselId>&fromSlide=<n>` (mới).
  - Tối đa 2 retry, exponential backoff 4s/12s.
  - Nếu vẫn fail → DB-sync fallback (đã có), nếu DB có đủ slides → done; thiếu → error với CTA "Tạo lại slide còn thiếu".

**Backend `generate-carousel`** chấp nhận `resume` query: load carousel hiện có, skip slides đã sinh trong `slides_content`, tiếp tục stream từ slide kế.

**Image batch (`generate-carousel-images-batch`)**:
- Sau mỗi slide ảnh fail (timeout/429/circuit breaker), schedule auto-retry 1 lần (đã có concept) + ghi `generation_tasks.progress_message = "Slide N retry…"`.
- Job-level: nếu sau retry vẫn còn `needs_regeneration_slides` ≥ 1 → status `completed_with_warnings` (nhãn riêng), không fail toàn batch.

### 5. UX cải thiện

- Toast khi reload: "Bạn có 2 carousel đang chạy nền. Click để xem".
- `beforeunload` cảnh báo nhẹ chỉ khi job <30% (job >30% chắc chắn resume được, không cần warning).
- Badge có 3 trạng thái: tạo prompt 🟦 / tạo ảnh 🟪 / có cảnh báo 🟧 (slide cần regen).

## Files (dự kiến)

- **Migration mới**: `supabase/migrations/<ts>_add_carousel_prompt_task_type.sql`
- `src/contexts/CarouselGenerationContext.tsx` — insert task, throttled update, rehydrate on mount, realtime subscribe, resume-with-retry logic
- `src/components/carousel/GlobalCarouselJobsBadge.tsx` (mới) + mount trong `src/components/AppLayout.tsx`
- `src/components/carousel/CarouselGenerationTracker.tsx` — đọc job theo `id` từ context thay vì self-managed state
- `src/lib/carouselImageBatch.ts` — pass `taskId` qua, cập nhật `progress_message` chuẩn
- `supabase/functions/generate-carousel/index.ts` — nhận `taskId` + update DB; hỗ trợ `resume` mode
- `supabase/functions/generate-carousel-images-batch/index.ts` — slide-level auto-retry + status `completed_with_warnings` mapping

## Không làm

- Không đổi prompt logic / palette extractor / seamless validation (đã polish trong các turn trước).
- Không làm Service Worker / Web Push (over-engineering cho phạm vi này).
- Không đổi schema `carousels` table (chỉ đụng `generation_tasks`).

## Rủi ro

- Thêm DB write mỗi 1.5s/job → tăng tải nhẹ; mitigate bằng throttle + `update` không `upsert`.
- Resume mode cần backend chấp nhận partial state — phải test kỹ với carousel 5/7/10 slides.
- Realtime channel cho `generation_tasks` đã có — chỉ thêm consumer trong context, không tăng connection.
