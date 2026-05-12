## Audit luồng background — Nội dung đa kênh (text + ảnh)

### Kiến trúc hiện tại

```
Wizard ──► useStreamingGeneration ──► insert generation_tasks (multichannel)
                                  └─► fetch generate-multichannel (stream:true, taskId)
                                          └─► updateTaskProgress / completeTask / failTask
                                          └─► EdgeRuntime.waitUntil giữ persist khi client disconnect

Wizard (auto) ──► useAutoImageGeneration ──► createImageGenerationTask (task_type='image_generation')
                                          └─► invoke generate-brand-image (taskId)
                                                  └─► updateImageTaskStatus + waitUntil persistence

useBackgroundGeneration (Realtime + polling 30s) ──► ActiveTasksIndicator (Wizard) + GlobalCarouselGenTracker
```

### Những gì hoạt động tốt
- `generate-multichannel` và `generate-brand-image` đều **xử lý disconnect đúng**: tiếp tục lưu DB, dùng `EdgeRuntime.waitUntil`, có recovery qua `recoverGeneratedMultichannel` / `recoverGeneratedBrandImage`.
- Realtime subscription cho `generation_tasks` lọc theo `user_id`, có fallback polling 30s, có auto-recover task "zombie" sau 10 phút.
- Watchdog streaming: 30s first-byte, sliding window cho chunk tiếp theo.
- Stream progress 10–90% chuẩn theo memory `Streaming Resilience`.

### 5 vấn đề phát hiện (ưu tiên giảm dần)

**1. Image tasks không lên UI tracker (NGHIÊM TRỌNG)**
- `useBackgroundGeneration.TaskType = 'core_content' | 'multichannel' | 'carousel_image'` — **thiếu `'image_generation'`**.
- Hậu quả: user đóng tab khi ảnh đang render → quay lại KHÔNG thấy task nào trong `ActiveTasksIndicator`, không biết ảnh còn chạy. Phải đợi recovery silently.
- `getTaskResult` không có nhánh xử lý `result_type='brand_images'` hoặc tương đương.

**2. Stale threshold 10 phút giết task ảnh hợp lệ**
- `STALE_TASK_THRESHOLD_MS = 10 * 60 * 1000` ở `useBackgroundGeneration.ts:42`.
- Ảnh Nano Banana Pro / fallback PoYo có thể chạy > 10 phút khi load cao → auto-fail dù edge function vẫn đang upsert.
- Đề xuất: nâng lên 20–25 phút cho image, hoặc check theo `task_type` (text 10 phút, image 20 phút).

**3. Logic insert task duplicated 3 nơi**
- `useStreamingGeneration.ts:154` raw insert
- `useStreamingCoreContent.ts:101` raw insert
- `imageGenerationTasks.ts` insert
- `useBackgroundGeneration.createTask` không được tái dùng → dễ drift khi đổi schema. Nên gom về 1 helper.

**4. Auto image pipeline không tạo "parent" task cho cả lô**
- Mỗi channel tạo 1 task riêng (5 channels = 5 rows). UI khó hiển thị "đang tạo ảnh cho 5 kênh, xong 2/5".
- Nên có 1 task cha `task_type='multichannel_images'` + N task con, hoặc dùng `progress` + `current_step` để gom.

**5. Resume sau reload chỉ có cho multichannel/core_content**
- `MultiChannelFormWizard.tsx:1108` chỉ tìm task `core_content` & `multichannel`. Không có nhánh resume image pipeline.
- Khi user F5 trong lúc ảnh đang chạy → wizard mở lại Step cuối, image grid trống cho tới khi recovery polling tự fill.

### Phạm vi fix đề xuất (chỉ frontend + 1 type union)

**Files:**
- `src/hooks/useBackgroundGeneration.ts` — thêm `'image_generation'` vào `TaskType`, mở rộng `getTaskResult` để fetch ảnh từ `multi_channel_contents` theo `result_id` + `channel`, tách `STALE_TASK_THRESHOLD_MS` theo task_type (text 10', image 25').
- `src/components/multichannel/ActiveTasksIndicator.tsx` — render task `image_generation` (label "Ảnh kênh X" + progress).
- `src/components/multichannel/MultiChannelFormWizard.tsx` — nhánh resume image: nếu có active `image_generation` task khớp `generatedContentIdProp` → set `imagePhase='generating'` + bỏ qua auto-trigger để tránh duplicate.
- `src/lib/imageGenerationTasks.ts` — set `result_type='multi_channel_image'` thống nhất, lưu `channel` vào `input_params` (đã có).
- (Tùy chọn) refactor 2 hook stream dùng chung `createTask` từ `useBackgroundGeneration`.

**Không động vào:**
- Edge functions `generate-multichannel`, `generate-brand-image` (logic background đã đúng).
- Schema `generation_tasks`, RLS.
- Realtime channel.

### Kết quả kỳ vọng
- User đóng tab giữa chừng → quay lại thấy đầy đủ task text + ảnh đang chạy với progress thực.
- Không còn "zombie fail" ảnh do timeout 10 phút.
- Logic tạo task gom về 1 chỗ, dễ maintain.
