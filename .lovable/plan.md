## Chẩn đoán

Bạn không thấy ảnh được tạo vì **bước tạo nội dung carousel (text/prompt) bị watchdog client cắt trước khi tới bước tạo ảnh**. Ảnh chưa bao giờ được kích hoạt.

### Bằng chứng từ log

**Edge function `generate-carousel`** (phiên 14:22:30 → 14:24:01):
- 14:22:38–14:23:15 — gọi qwen-plus sinh slides (~36s, cold start)
- 14:23:15–14:23:34 — Self-Critique chấm điểm = 0/100 (POOR)
- 14:23:34–14:24:00 — Refinement chạy thêm rồi **timeout 25s, dùng fallback**
- 14:24:01 — trả response (200) — **tổng 85s**, `coldStart:true`

**Client `CarouselGenerationContext`**:
- Watchdog `FIRST_BYTE_TIMEOUT_MS = 30_000` — không nhận được byte SSE đầu trong 30s
- 14:23:00 → `[CarouselGen] Watchdog timeout — aborting` → fetch bị huỷ
- Client cancel ⇒ pipeline `runCarouselPipelineStreaming` không kịp emit `result` ⇒ `autoGenerateImages` không trigger ⇒ `generate-carousel-images-batch` không bao giờ chạy.

### Vì sao first-byte không tới trong 30s

Trong `generate-carousel/index.ts` ở nhánh streaming (line 766–828):
1. Trước khi `return new Response(stream)`, có **preflight `authClient.auth.getUser()`** — đây là 1 round-trip mạng có thể chậm vài giây khi cold-start.
2. SSE stream được trả về NGAY, nhưng **emit đầu tiên (`planning`) phụ thuộc vào việc `runCarouselPipelineStreaming` được scheduler chạy** — không có byte mồi nào được flush trước.
3. Cold-start Deno + TLS handshake + auth round-trip + scheduler cộng dồn vượt 30s ngưỡng client.

### Vấn đề phụ (làm chậm thêm 45s và xói chất lượng)

Self-Critique luôn chấm `score: 0` (xem log: "Initial score: 0", "Tier: POOR, Issues: 6") → trigger refinement → refinement timeout 25s → dùng fallback. Việc score = 0 có vẻ là **bug parsing** trong critique loop khi dùng qwen-plus (provider Dashscope), không thực sự đánh giá được output.

---

## Kế hoạch sửa

Chỉ đụng tới phần frontend + edge function `generate-carousel` (không động vào batch ảnh — batch ảnh vốn đã hoạt động đúng nếu được trigger).

### 1. Flush byte mồi SSE trước khi chạy pipeline (`supabase/functions/generate-carousel/index.ts`)
- Trong nhánh `wantStream`, ngay sau `makeSSEStream()` và TRƯỚC khi schedule `runCarouselPipelineStreaming`, gọi `emit({ type: 'progress', step: 'connecting', percent: 1, message: 'Đang khởi tạo...' })` đồng bộ.
- Mục đích: client nhận byte đầu trong <1s ⇒ chuyển sang `IDLE_TIMEOUT_MS = 150s` ⇒ đủ chỗ cho self-critique 45s + AI 36s.

### 2. Tăng `FIRST_BYTE_TIMEOUT_MS` từ 30s → 60s (`src/contexts/CarouselGenerationContext.tsx` line 69)
- Phòng vệ cho trường hợp cold-start cực mạnh trên Lovable Cloud edge runtime.
- Giữ `IDLE_TIMEOUT_MS = 150s` cho các sự kiện tiếp theo.

### 3. Cho phép tắt Self-Critique khi nó score = 0 lặp lại
- Trong `generate-carousel/index.ts`, khi `[Self-Critique] Initial score: 0` → bỏ qua refinement, log `[Self-Critique] SKIPPED — parser broken for provider X`. Tránh tốn thêm 45s phí cho mỗi lần tạo carousel.
- Đồng thời giảm `Refinement timeout` từ 25s → 15s để giảm dead-time.

### 4. (Tuỳ chọn, low risk) Bỏ preflight `auth.getUser()` cho streaming
- Có thể chuyển preflight auth thành emit lỗi `event: error` qua SSE thay vì block response. Việc này rút ngắn thời gian tới byte đầu thêm 1–3s.
- Hoặc giữ nguyên auth nhưng cache `authClient` ở module-scope để cold-start chỉ trả phí 1 lần.

---

## Kiểm chứng sau khi fix
1. Mở console preview → tạo carousel mới với cùng prompt "7 nguyên tắc vàng content marketing 2026".
2. Quan sát: trong <2s xuất hiện log `[CarouselGen]` nhận event `connecting`/`planning` (first byte OK).
3. Pipeline hoàn thành, emit `result` → toast "🎨 Ảnh đang được tạo nền".
4. Kiểm tra logs `generate-carousel-images-batch` chạy, `carousel_images` được insert dần.
5. UI carousel mới hiển thị 6 ảnh.

Nếu bạn đồng ý plan này tôi sẽ implement: chỉ sửa 2 file core (`generate-carousel/index.ts` + `CarouselGenerationContext.tsx`), không động đến `generate-carousel-image*`.
