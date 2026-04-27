## Chẩn đoán

Vấn đề không còn nằm ở Provider Geminigen/PoYo hay function `generate-brand-image`. Request vẫn chưa tới function này.

Điểm chặn hiện tại nằm ở tầng trước khi gọi function:

1. Frontend tạo task `generation_tasks` với `task_type = 'image_generation'` trước khi gọi `generate-brand-image`.
2. Database hiện đang có constraint:

```sql
CHECK (task_type IN ('core_content', 'multichannel', 'carousel_image'))
```

Tức là `image_generation` bị chặn. Vì vậy pipeline ảnh dừng trước khi gọi backend/provider.

Ngoài ra, các content bạn vừa tạo có nhiều kênh như `email`, `website`, `telegram`, `google_maps`, `zalo_oa`. Không phải tất cả các kênh đều nên tạo ảnh social image. Cần giới hạn auto image chỉ cho kênh có ảnh phù hợp để tránh pipeline fail/hao phí.

## Kế hoạch sửa

### 1. Sửa database constraint cho task tạo ảnh
Tạo migration mới để cho phép `image_generation` trong `generation_tasks.task_type`:

```sql
ALTER TABLE public.generation_tasks
DROP CONSTRAINT IF EXISTS generation_tasks_task_type_check;

ALTER TABLE public.generation_tasks
ADD CONSTRAINT generation_tasks_task_type_check
CHECK (task_type = ANY (ARRAY[
  'core_content'::text,
  'multichannel'::text,
  'carousel_image'::text,
  'image_generation'::text
]));
```

Không sửa migration cũ, chỉ thêm migration mới.

### 2. Truyền organization_id vào image generation task
Hiện `useAutoImageGeneration` đang gọi `createImageGenerationTask` với `organizationId: undefined`.

Sẽ cập nhật pipeline để nhận và truyền `organizationId` từ `MultiChannelCreate` xuống:

```text
MultiChannelCreate
  -> useAutoImagePipeline.startPipeline(..., { organizationId })
  -> useAutoImageGeneration.generateAllImages
  -> createImageGenerationTask({ organizationId })
```

Việc này giúp tracking task đúng workspace và dễ debug.

### 3. Chỉ auto tạo ảnh cho kênh visual/social
Trong `/multichannel/create`, khi user chọn nhiều kênh, auto image sẽ chỉ chạy cho các kênh có ảnh chính phù hợp, ví dụ:

```text
facebook, instagram, linkedin, twitter, threads, tiktok, youtube, zalo_oa, google_maps, website
```

Có thể bỏ qua các kênh thuần text như `email`, `telegram` trong auto image để tránh tạo ảnh không cần thiết.

UI vẫn sẽ báo rõ: tạo ảnh cho X/Y kênh visual.

### 4. Fallback text chắc chắn hơn cho auto pipeline
Hiện Step 5 auto-trigger dùng `getChannelText(ch)` từ streaming ref. Nếu stream đã hoàn tất hoặc component re-render, có thể rỗng.

Sẽ dùng thứ tự fallback:

```text
result[channel_content_field]
→ getChannelText(channel)
→ topic
```

Và lưu snapshot `generatedChannelTexts` ở `MultiChannelCreate` ngay khi nhận `result`, rồi truyền xuống wizard/auto pipeline.

### 5. Nếu task tracking vẫn lỗi, vẫn gọi generate-brand-image
Đổi logic tạo task ảnh thành “best effort” đúng nghĩa:

- Nếu insert task lỗi do RLS/constraint/connection: log rõ error.
- Không dừng pipeline.
- Vẫn gọi `generate-brand-image` với `taskId: null`.

Hiện code có ý định “proceed without task tracking”, nhưng cần đảm bảo lỗi insert không làm chặn flow ở mọi nhánh.

### 6. Thêm log có thể xác nhận ngay
Thêm log rõ ở các điểm:

```text
[MultiChannelCreate] content result received
[MultiChannelCreate] visual image channels = ...
[AutoImagePipeline] PIPELINE INIT
[Pipeline:<channel>] invoking generate-brand-image
```

Sau khi sửa, nếu provider chưa bị trừ tiền thì log/network sẽ chỉ ra chính xác request bị chặn ở đâu.

## Xác minh sau khi implement

1. Tạo content mới ở `/multichannel/create`.
2. Kiểm tra database: content mới phải có `channel_images` cho ít nhất các kênh visual.
3. Kiểm tra task: phải xuất hiện `generation_tasks.task_type = 'image_generation'`.
4. Kiểm tra function logs: `generate-brand-image` phải có log mới.
5. Nếu provider trả lỗi/timeout/credits, lúc đó mới xử lý tiếp ở tầng Provider.

## Files dự kiến chỉnh

- Thêm migration mới trong `supabase/migrations/` để mở constraint `image_generation`.
- `src/lib/imageGenerationTasks.ts` — log rõ và không block pipeline khi task insert fail.
- `src/hooks/useAutoImageGeneration.ts` — thêm `organizationId` vào options/task.
- `src/hooks/useAutoImagePipeline.ts` — nhận `organizationId`, lọc kênh visual nếu cần.
- `src/pages/MultiChannelCreate.tsx` — truyền `organizationId`, snapshot channel texts, trigger auto pipeline ổn định hơn.
- Có thể chỉnh `src/components/multichannel/MultiChannelFormWizard.tsx` nếu cần truyền fallback text vào Step 5.

<lov-actions>
  <lov-open-history>View History</lov-open-history>
</lov-actions>

<lov-actions>
<lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions>