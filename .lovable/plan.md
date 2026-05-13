## Mục tiêu

Rà soát toàn diện vòng thứ 4 trên flow Carousel sau 3 vòng fix trước. Tập trung tìm các lỗ hổng còn sót: bảo mật, telemetry, race condition, lifecycle worker, UX edge case.

---

## Phát hiện theo độ ưu tiên

### 🔴 P0 — Cần fix ngay (bug rõ ràng / bảo mật)

**1. `delete-carousel-image` — thiếu auth + chỉ xoá storage, không xoá DB row**
- File chạy bằng SERVICE_ROLE_KEY và **không kiểm JWT** → bất kỳ ai biết URL đều có thể xoá ảnh của org khác (cross-tenant).
- Chỉ `supabase.storage.remove([filePath])` mà **không xoá row trong `carousel_images`** → orphan rows.
- Fix: validate JWT, verify caller sở hữu `carouselId` (qua `organization_id` + RLS check), xoá luôn DB row tương ứng.

**2. `CarouselGenerationTracker.onTaskProgress` parse sai `slide_N_done`**
- Backend ghi `current_step: "slide_5_done"` sau khi xong slide 5. UI đang `parseInt("5_done") = 5` rồi set `next[4] = 'generating'`.
- Hệ quả: slide cuối cùng không bao giờ chuyển sang trạng thái `done` cho tới khi event `complete` về; tracker hiển thị "đang tạo" kể cả khi ảnh đã lưu.
- Fix: tách regex `^slide_(\d+)(_done)?$` và set `'done'` khi có suffix `_done`.

**3. `generate-carousel-image` — `DESCRIBE_DISABLED_UNTIL_RESTART` là module-scope, không reset**
- Một user gặp 402 trên Gemini Flash Lite → flag bật cho **toàn bộ** request kế tiếp trong worker (cross-user, cross-org), kéo dài tới khi worker bị recycle (có thể nhiều giờ).
- Fix: đổi thành time-boxed cooldown (`disabledUntil = Date.now() + 5*60_000`) và reset sau 5 phút; log mỗi lần skip.

**4. Streaming branch của `generate-carousel` mở SSE trước khi check auth/rate-limit**
- `runCarouselPipelineStreaming` được spawn ngay khi `wantStream=true`, sau đó internal-fetch về JSON branch — auth và rate-limit chỉ chạy **bên trong** internal fetch.
- Hệ quả: client unauth vẫn mở được SSE connection (server giữ kết nối đến khi inner fetch trả 401, mới emit `error` event). Lãng phí worker + có thể bị quét DoS.
- Fix: chạy `auth.getUser` + `checkRateLimit` đồng bộ TRƯỚC khi return `Response(stream)`; nếu fail trả 401/429 trực tiếp.

---

### 🟡 P1 — Nên fix sớm (UX / data integrity)

**5. `useCarousels` realtime chỉ listen `INSERT`**
- Background batch update `seamless_score`, `needs_regeneration`, `status` → card list không refresh dữ liệu mới cho tới khi user F5.
- Fix: thêm subscription cho `UPDATE` event, merge vào `setCarousels`.

**6. `trySyncFromDb` match theo `topic + user_id` có race condition**
- Nếu user bấm tạo lần 2 với cùng topic ngay sau khi stream lần 1 đứt, fallback có thể kéo về carousel của job mới (đè lên job cũ).
- Fix: capture `carousel.id` ngay khi event `slide_done` đầu tiên về (backend đã có id sau khi insert), lưu vào job state, và `trySyncFromDb` ưu tiên query theo `id`. Nếu không có id, fallback thêm điều kiện `created_at BETWEEN startedAt AND startedAt + 10min`.

**7. `regenerate-carousel-caption` thiếu auth + rate-limit**
- Không thấy JWT validation, không qua `checkRateLimit`, không ghi `ai_metrics`.
- Fix: copy pattern auth từ `generate-carousel`, thêm rate-limit 10 req/min, log metrics với `action_type='carousel_regen_caption'`.

**8. Image batch không có cancel từ UI**
- Khi batch chạy 6-10 slides ~3-5 phút, user không có cách nào dừng (chỉ cancel được prompt phase). Nếu chọn sai style hoặc thấy slide 1-2 lỗi vẫn phải đợi hết.
- Fix: thêm nút "Dừng tạo ảnh" trên `CarouselGenerationTracker` → update `generation_tasks.status='cancelled'`; backend loop check cờ này mỗi vòng iteration.

---

### 🟢 P2 — Polish (defensive)

**9. `useCarouselImages.saveImage` deselect + insert không atomic**
- 2 query tách biệt: nếu user spam regen, có cửa sổ ngắn không có row `is_selected=true` cho slide đó → UI nhấp nháy "no image".
- Fix: gói trong RPC function hoặc đổi sang `upsert` với `ON CONFLICT (carousel_id, slide_number, version) DO UPDATE`.

**10. `launchCarouselImageBatch` cooldown chỉ filter `user_id`**
- User chuyển org rồi retry cùng carousel_id → vẫn bị block 60s. Hiếm gặp nhưng không correct.
- Fix: thêm filter `organization_id` vào query cooldown.

**11. `CarouselForm` MAX_TOPIC_LENGTH=300 nhưng server không enforce**
- Client giới hạn 300 ký tự, nhưng `generate-carousel` chỉ chạy `sanitizeInput` (không cắt độ dài). API có thể bị spam topic 10K ký tự → cost cao.
- Fix: server reject nếu `topic.length > 500` với 400.

**12. `generate-carousel-images-batch` ai_metrics không phân biệt được provider thực sự dùng**
- Telemetry mới ghi `function_name` nhưng không có `model` / `provider` cho từng attempt → khó debug "PoYo timeout vs GeminiGen 402".
- Fix: `generate-carousel-image` trả thêm `providerUsed` + `modelUsed` trong response, batch ghi vào `ai_metrics.metadata`.

---

## Thứ tự thực hiện đề xuất

```text
Round 4a (bảo mật + bug rõ): 1 → 3 → 2 → 4
Round 4b (UX):                7 → 8 → 5 → 6
Round 4c (polish):            9 → 12 → 10 → 11
```

## Files dự kiến chạm

```text
P0:
  supabase/functions/delete-carousel-image/index.ts
  supabase/functions/generate-carousel-image/index.ts
  supabase/functions/generate-carousel/index.ts
  src/components/carousel/CarouselGenerationTracker.tsx

P1:
  src/hooks/useCarousels.ts
  src/contexts/CarouselGenerationContext.tsx
  supabase/functions/regenerate-carousel-caption/index.ts
  supabase/functions/generate-carousel-images-batch/index.ts (cancel check)
  src/components/carousel/CarouselGenerationTracker.tsx (cancel button)

P2:
  src/hooks/useCarouselImages.ts
  src/lib/carouselImageBatch.ts
  supabase/functions/generate-carousel/index.ts (length cap)
  supabase/functions/generate-carousel-image/index.ts (return provider)
```

Sau khi approve, tôi sẽ làm theo round (4a trước, kiểm tra rồi sang 4b/4c) để dễ rollback.
