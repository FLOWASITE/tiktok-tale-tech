
## Phân tích vấn đề (đồng ý với chuyên gia)

Chuyên gia chỉ ra **lỗi thiết kế cốt lõi**: `seamlessContext.previousSceneDescription` chỉ có giá trị khi slide N-1 đã xong trước slide N. Nếu frontend (hoặc batch function) chạy parallel → field rỗng → "seamless carousel" trở thành lời hứa rỗng. Đây là **silent failure** — user không biết, hệ thống không cảnh báo.

## Khảo sát hiện trạng (cần đọc trước khi sửa)

Cần xác minh chính xác orchestration hiện tại:
- `supabase/functions/generate-carousel-images-batch/index.ts` — đã thấy: **for-loop sequential** (i=0..totalSlides-1), nhưng truyền `seriesBible` + `siblingsSummary` **giống nhau** cho mọi slide → KHÔNG có `previousSceneDescription` thực sự cập nhật theo slide.
- `supabase/functions/generate-carousel-image/index.ts` — cần đọc: nó làm gì với `seamlessContext.previousSceneDescription`? Có lưu lại scene description sau khi generate không?
- `src/components/carousel/*` — tìm chỗ frontend gọi `generate-carousel-image` parallel (Promise.all). Cần xác định: hiện tại UI đang dùng batch (sequential) hay parallel từ FE?
- Khả năng PoYo image-to-image: kiểm tra `_shared/image-providers/*` xem provider nào support `previous_image_reference` / image input.

## Kế hoạch sửa (3 lớp)

### Lớp 1 — Backend bắt buộc sequential cho slide 2..N

**File:** `supabase/functions/generate-carousel-images-batch/index.ts`

- Slide 1 (hook): generate độc lập → sau khi xong, **trích xuất `sceneDescription`** từ kết quả (ask AI mô tả lại cảnh vừa tạo trong 50 từ EN, hoặc echo lại prompt scene block) và lưu vào biến `previousSceneSummary`.
- Slide 2..N: **bắt buộc chờ slide N-1 xong**, truyền:
  - `previousSceneDescription`: scene của slide N-1 (vừa generate)
  - `previousImageUrl`: URL ảnh slide N-1 (cho image-to-image nếu provider hỗ trợ)
  - `accumulatedSceneChain`: chuỗi tóm tắt 1-2 slide gần nhất (tránh drift quá xa khỏi slide 1)
- Loại bỏ khả năng parallel cho slide 2..N. Slide 1 có thể được generate trước/song song với việc fetch metadata.

### Lớp 2 — Frontend KHÔNG được bypass batch

**Files cần kiểm tra & sửa:**
- `src/components/carousel/*Generator*.tsx` / `*Viewer*.tsx`
- Bất kỳ chỗ nào gọi `supabase.functions.invoke('generate-carousel-image', ...)` trực tiếp trong vòng lặp / `Promise.all`

**Hành động:**
- Mọi luồng generate **toàn bộ carousel** phải đi qua `generate-carousel-images-batch` (đã sequential ở Lớp 1).
- Chỉ cho phép gọi `generate-carousel-image` đơn lẻ khi user **regenerate 1 slide cụ thể** — và trong trường hợp này, **tự động truyền `previousSceneDescription` + `previousImageUrl`** lấy từ slide N-1 đã có trong DB.

### Lớp 3 — Tận dụng PoYo nano-banana image-to-image

**File:** `supabase/functions/generate-carousel-image/index.ts` + provider layer

- Khi `previousImageUrl` được truyền vào và provider = PoYo (nano-banana hỗ trợ img2img):
  - Gửi ảnh slide N-1 làm **reference image** (low strength ~0.3-0.4) để giữ palette/style/lighting/composition flow.
  - Prompt vẫn mô tả scene mới của slide N, nhưng có ràng buộc visual hard-coded từ ảnh trước.
- Fallback: nếu provider không hỗ trợ img2img → chỉ dùng `previousSceneDescription` text (như hiện tại) nhưng lần này nó **thực sự có giá trị** vì đã chờ sequential.

### Lớp 4 — Validation post-hoc (chống silent failure)

- Sau khi batch xong **toàn bộ slide**, trigger `validate-seamless-consistency` (đã có) **tự động** thay vì chờ user bấm.
- Nếu `overallScore < 60` → đánh dấu carousel `needs_regeneration: true` + hiện banner UI "Tính liên tục thấp — bấm để tạo lại slide X, Y".
- Lưu thêm field `generation_mode: 'sequential_v2'` vào carousel để phân biệt với data cũ.

## Files dự kiến sửa
- `supabase/functions/generate-carousel-images-batch/index.ts` (logic sequential + scene chain)
- `supabase/functions/generate-carousel-image/index.ts` (nhận `previousImageUrl`, dùng img2img khi có)
- `supabase/functions/_shared/image-providers/*` (thêm img2img path cho PoYo nếu chưa có)
- `src/components/carousel/*` (chuyển mọi luồng "generate all" sang batch; regenerate 1 slide phải truyền context slide N-1)
- `src/hooks/useCarousels.ts` hoặc hook tạo ảnh (nếu có Promise.all → bỏ)
- Optional: migration thêm cột `carousels.generation_mode` + `carousels.needs_regeneration`

## Tradeoff cần user xác nhận

Sequential slide 2..N sẽ **tăng latency tuyến tính** (5 slide × ~15s = 75s thay vì ~20s parallel). Đổi lại: seamless thực sự hoạt động. Có 2 hướng giảm thiểu:
1. **UI streaming**: hiện ảnh slide 1 ngay khi xong, các slide sau xuất hiện dần (skeleton + progress) — UX vẫn tốt dù tổng thời gian dài hơn.
2. **Tùy chọn user**: thêm toggle "Seamless mode (chậm hơn, đẹp hơn)" vs "Independent slides (nhanh, mỗi slide 1 concept)" trong form tạo carousel.

Sau khi approve, tôi sẽ đọc các file còn thiếu rồi triển khai theo đúng 4 lớp trên.
