## Phạm vi audit

Toàn bộ pipeline tạo Carousel: form → context streaming → edge `generate-carousel` → sequential image batch → seamless validation → UI viewer/tracker. Đã đọc code + chạy query DB thực tế (12 task `carousel_image` gần nhất + 8 carousels gần nhất).

## Tình trạng thực tế từ DB (alarming)

| Khung giờ | Carousels tạo | Image task `failed` | Pattern |
|---|---|---|---|
| 12/05 20:02–20:09 | **8** carousels (cùng 1 user, cùng chủ đề "Cam kết không phát sinh chi phí") | 8/8 fail | xen kẽ `Tất cả 5 slide đều thất bại` và `Auto-recovered: stale background task (>10min)` |
| 09/05 – 12/05 | còn lại đều `failed` | 12/12 fail trong 7 ngày | seamless_score = null cho 100% carousels |
| `carousel_images` rows | chỉ 3 carousels có ảnh thật, gồm 9+9+2 ảnh | — | Tỷ lệ thành công ảnh ~25% |

→ **Image generation đang gãy 100% liên tục**, user phải bấm tạo lại 8 lần liên tiếp. Logs edge không còn (hết retention), nên cần thêm telemetry để chẩn đoán nguyên nhân thực.

## Phát hiện theo mức độ

### P0 — Phải fix ngay
1. **Image batch fail toàn tập, người dùng không biết tại sao**
   - `generate-carousel-images-batch` retry 2 lần × 240s = lên tới 480s/slide × 5 slide = ~40 phút lý thuyết, nhưng worker bị edge runtime kill ⇒ task ở `pending/generating` đến khi watchdog "Auto-recovered" sau 10 phút.
   - `error_message` cuối cùng chỉ là chuỗi tiếng Việt chung chung (`Tất cả 5 slide đều thất bại`), KHÔNG persist nguyên nhân thật của từng provider call.
   - Không có log dòng nào trong `ai_metrics` cho `generate-carousel-image` (không insert metrics khi fail).
   - **Fix:** persist `error_message` chi tiết per-slide vào `result_metadata.results[].error` (đã có), nhưng đồng thời **gom top-2 lỗi distinct lên `error_message` cấp task** ("Slide 1: HTTP 402 …; Slide 3: Timeout 240s"), và bắt buộc insert `ai_metrics` với `error_message` cho mọi attempt fail.

2. **Duplicate carousel — user click 1 lần ra 2 row**
   - `inFlightRef` dedup key = `topic|style|preset` (in-memory, mất khi refresh).
   - Server dedup window 2 phút dùng `eq("topic", …)` — chỉ cần 1 ký tự khác là miss. Bằng chứng: 8 carousel cùng user trong 7 phút, có 4 row `"Cam kết không phát sinh chi phí"` + 4 row `"Cam kết không phát sinh chi phí & chịu trách nhiệm giải trình"`.
   - **Fix:** đổi server dedup sang trim+lowercase + Levenshtein/prefix match, HOẶC dùng `idempotency_key` từ client (uuid sinh ra khi mở form). Phía context: dedup theo `idempotency_key` thay vì topic.

3. **Stream branch thực ra KHÔNG stream "live writing"**
   - `runCarouselPipelineStreaming` internal-fetch lại chính `generate-carousel` ở chế độ JSON. Phải đợi response JSON hoàn thành (~30–60s) mới có slide để emit `slide_start/slide_preview/slide_done`.
   - Hệ quả: emit fake delay 120/320/140 ms giữa các event, user thấy "đang viết Slide N" nhưng slide đó đã xong từ trước.
   - Kèm theo double cost: rate-limit 2 lần, prompt-guard 2 lần, trace fork, headers Authorization forward lại.
   - **Fix:** refactor pipeline thành function nội bộ shared (đừng `fetch` chính nó). Streaming path gọi trực tiếp các bước (planning → AI call → validation → DB) và emit phase event đúng lúc.

### P1 — Quan trọng
4. **Auto image trigger có thể chạy 2 lần**
   - `launchCarouselImageBatch` được gọi cả ở `result` event **và** nhánh DB-sync fallback. Idempotency check chỉ filter `status in (pending, generating)` — nếu lần trước đã `failed`, sẽ tạo task mới (đúng ý đồ, nhưng thiếu cooldown ⇒ retry storm như log thực tế).
   - **Fix:** cooldown 60s sau lần fail gần nhất cho cùng `carouselId`, hoặc đếm `failed` task gần nhất và stop sau 2 lần liên tiếp + báo lỗi rõ ràng.

5. **`trySyncFromDb` brittle**
   - `eq('topic', formData.topic)` — nếu AI title hóa khác chút (carousel title ≠ topic input) thì OK vì so trên `topic`, nhưng vẫn không loại trừ carousel của user khác cùng topic trong cùng 5s → nguy cơ trả về row của session khác.
   - **Fix:** thêm `eq('user_id', user.id)` + `eq('organization_id', currentOrganization.id)`.

6. **Seamless validation không bao giờ chạy trong dataset hiện tại**
   - `seamless_score = null` cho 8/8 carousels. Vì `successCount < 2` (đa số 0). Không phải bug logic, nhưng code path hoàn toàn untested ở môi trường thật.
   - **Fix gián tiếp:** sau khi sửa P0 #1 image fail.

7. **`useCarouselImages.fetchImages` không lọc theo `organization_id`**
   - Chỉ filter `carousel_id`. RLS đảm bảo isolation, nhưng nếu RLS lỏng (admin user, hoặc carousel cross-org) thì leak. Nhỏ nhưng cần consistency.

### P2 — Polish
8. **Brand filter UI** (`Carousel.tsx:63-66`) chỉ match exact `brand_template_id`. Carousels tạo trước khi có Brand context (brand_template_id null) sẽ ẩn khỏi mọi brand → user "mất" carousel. Cần thêm tab "Không gắn brand" hoặc fallback hiển thị khi `currentBrand` chưa chọn.
9. **Tracker fake `revealingSlideMeta` clear** — giữa `slide_start` và `slide_preview` UI flicker do meta lúc đầu chỉ có `slideNumber`. Giữ meta cũ cho tới khi có `slide_preview`.
10. **`progressMessage` finally-safety-net** trong batch dùng `completeTask` ngay cả khi `successCount > 0` nhưng có thể fail giữa chừng — message hoàn thành sai khi thực tế còn slide chưa xử lý do EdgeRuntime kill.
11. **`CarouselFormData.topicHistoryId / campaignId / product_profile_ids`** — không truyền vào server dedup key, hai user khác campaign vẫn share cache (acceptable nhưng nên log).
12. **Thiếu metrics** cho `generate-carousel-images-batch` & `generate-carousel-image` trong `ai_metrics` ⇒ không thể chẩn đoán hậu sự cố. Hiện tại chỉ `generate-carousel` (text path) có sample.

## Đề xuất triển khai theo thứ tự

### Sprint 1 — Stop the bleeding (image fail)
- Bổ sung telemetry chi tiết: per-slide `error_message`, status code, provider name persist vào `generation_tasks.result_metadata.results[]` + `ai_metrics`.
- Truyền top-2 lỗi distinct lên `error_message` cấp task.
- Surface error trong `ActiveTasksIndicator` / `CarouselGenerationTracker` (hiện chỉ hiện chuỗi mặc định).
- Thêm cooldown 60s + max 2 retry tự động cho `launchCarouselImageBatch`.

### Sprint 2 — Dedup & isolation
- `idempotency_key` end-to-end (client tạo uuid khi mở form, server dedup theo key thay vì topic).
- `trySyncFromDb` thêm filter user + org.
- `useCarouselImages` thêm filter `organization_id`.

### Sprint 3 — Stream refactor
- Tách `runCarouselPipeline()` thành module shared, KHÔNG dùng internal fetch.
- Streaming branch gọi trực tiếp pipeline, emit event ở mốc thật (sau khi parse từng slide thay vì sau khi xong toàn bộ).

### Sprint 4 — UX polish
- Fix Brand filter fallback (tab "Chưa gắn brand").
- Fix flicker `revealingSlideMeta`.
- Hiển thị nguyên nhân fail rõ ràng + nút "Tạo lại với provider khác" khi 402.

## Kỹ thuật (cho dev đọc)

```text
Flow hiện tại
─────────────
[CarouselForm] ──submit──> [CarouselGenerationContext.generateCarousel]
                                │
                                ├─ POST /generate-carousel (stream:true)
                                │     └─ runCarouselPipelineStreaming
                                │           └─ INTERNAL fetch → /generate-carousel (stream:false)
                                │                 ├─ withCache → AI call
                                │                 ├─ validateRepairedSlides
                                │                 ├─ postCheckCarouselCompliance (Layer 2)
                                │                 └─ insert into carousels
                                │     └─ emit slide_start/preview/done (DELAY giả)
                                │     └─ emit result
                                ├─ launchCarouselImageBatch (idempotent)
                                │     └─ insert generation_tasks + fire-and-forget
                                │           POST /generate-carousel-images-batch
                                │                 └─ for each slide sequential:
                                │                       POST /generate-carousel-image
                                │                       (PoYo → KIE → GeminiGen, retry 2×)
                                │                 └─ validate-seamless-consistency
```

```text
Telemetry gap quan sát
──────────────────────
generation_tasks.result_metadata = { results[].error: "..." }  ← có
generation_tasks.error_message    = "Tất cả N slide đều thất bại"  ← chung chung
ai_metrics (per-slide attempt)    = KHÔNG có row              ← cần thêm
edge function logs                = đã expire                 ← cần persist
```
