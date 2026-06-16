# Hoàn thiện luồng Multichannel Generation (P1 + P2 + P3)

Mục tiêu: sau khi đã restructure SSE mở ngay, fix nốt 3 lỗ hổng còn lại để user không còn gặp "stuck at init", không mất kết quả khi mạng chập chờn, và thấy rõ tiến trình.

---

## 1. Client Resilience — `useStreamingGeneration`

**Vấn đề:** Khi stream đứt (mạng yếu, browser sleep, edge runtime restart), client chỉ chờ watchdog 180s rồi mark fail, dù backend có thể đã `completed` trong DB.

**Việc làm:**
- Thêm **Realtime subscription** vào `generation_tasks` (filter theo `task_id` hiện tại) song song với SSE. Khi DB báo `status='completed'` → đóng stream sớm, gọi `recoverGeneratedMultichannel` để load kết quả, không chờ watchdog.
- Thêm **polling fallback** mỗi 10s (chỉ bật khi đã >30s không có SSE chunk): `SELECT status, progress, current_step FROM generation_tasks WHERE id=?` → cập nhật UI; nếu `completed`/`failed` → terminate stream sớm.
- Per-channel try/catch ở reducer: 1 kênh fail không reset toàn bộ state đã streamed của kênh khác.
- Khi reload trang giữa chừng: rehydrate từ `generation_tasks` (đã có `result_id` nếu xong, hoặc `progress/current_step` nếu đang chạy) — pattern giống Carousel Background Resilience đã làm.

**File động chạm:**
- `src/hooks/useStreamingGeneration.ts` (thêm Realtime + polling fallback)
- `src/lib/recoverGeneratedMultichannel.ts` (xác nhận có hàm load theo `result_id`, bổ sung nếu thiếu)

---

## 2. Backend Hardening — `generate-multichannel`

**Vấn đề:** Function có thể vượt timeout Edge (400s), 1 kênh fail kéo cả batch fail, prep phase >5s không emit heartbeat → stale-recovery hiểu nhầm là chết.

**Việc làm:**
- Thêm `AbortController` tổng 240s; khi gần hết, gracefully gửi `event: timeout` + mark `failed` với message rõ ràng thay vì để runtime kill im lặng.
- Bọc mỗi channel trong try/catch riêng: fail → emit `channel_error` cho client, tiếp tục các kênh còn lại; cuối cùng task `completed` nếu ≥1 kênh OK, `failed` nếu tất cả fail.
- Trong prep phase (ai-config / smart-context / KG / SEO), nếu bước nào >5s → emit `prep-progress` mỗi 3s với message hiện tại để stale-recovery không hiểu nhầm.
- Persist `progress + current_step + last_heartbeat_at` vào `generation_tasks` sau mỗi prep step (background, non-blocking với `EdgeRuntime.waitUntil` nếu có).
- Log `ai_metrics` cho từng prep step (latency, model, cost) với `trace_id` xuyên suốt.

**File động chạm:**
- `supabase/functions/generate-multichannel/index.ts`
- `supabase/functions/_shared/task-tracking.ts` (nếu cần thêm trường `last_heartbeat_at`)
- Migration mới (nếu thêm cột): `last_heartbeat_at timestamptz` trên `generation_tasks`

---

## 3. UX Banner — `AIGenerationProgress`

**Vấn đề:** User chỉ thấy % và "init" generic, không biết đang nạp ngữ cảnh hay đã treo. Không có nút Hủy.

**Việc làm:**
- Hiển thị **stepper prep phase** rõ ràng (5 bước nhỏ với icon + label tiếng Việt):
  - "Đang nạp cấu hình AI" (ai-config, 8%)
  - "Phân tích thương hiệu & persona" (smart-context, 12%)
  - "Nạp tri thức ngành" (knowledge-graph, 15%)
  - "Nạp ngữ cảnh SEO" (seo-context, 17%)
  - "Bắt đầu tạo nội dung" (prep-done, 18%)
- Step đang chạy: spinner + text bold; step xong: tick xanh; step chưa tới: mờ.
- Sau 18% chuyển sang view "channel grid" như hiện tại.
- Thêm **nút "Hủy" (Stop)** ở góc banner: gọi `AbortController.abort()` ở client + PATCH `generation_tasks` set `status='cancelled'` → backend phát hiện ở vòng tiếp theo cũng dừng. Đảm bảo partial results đã streamed vẫn được persist (giống pattern AI SDK abort).
- Nếu user chọn >4 long-form → hiện inline warning "Có thể mất 60-90s do khối lượng lớn" ngay khi submit (không block).

**File động chạm:**
- `src/components/multichannel/AIGenerationProgress.tsx`
- `src/hooks/useStreamingGeneration.ts` (expose `abort()` function)
- Component bước submit (chỗ chọn channel) — thêm warning text khi long-form >4

---

## Technical notes

- **Realtime channel naming:** dùng `gen-task-${taskId}` để mỗi task có channel riêng, unsubscribe khi unmount.
- **Polling guard:** chỉ poll khi `Date.now() - lastChunkAt > 30_000` để tránh thừa request khi stream khỏe.
- **Cancel semantics:** `status='cancelled'` ≠ `failed`. UI hiện badge "Đã hủy" màu trung tính, không đỏ.
- **Migration cần xác nhận:** `generation_tasks` đã có cột `current_step`, `progress`, `result_id`, `error_message` chưa? Nếu thiếu `last_heartbeat_at` hoặc enum `cancelled` cho `status` thì cần migration additive.

## Ngoài phạm vi (để sprint sau)
- Hard-limit theo tier (P4) — cần align với pricing.
- Cron `recover-stale-multichannel-tasks` (P6) — chỉ cần sau khi P1+P2 chạy ổn.
- Observability dashboard (P5) — tách riêng, không block sprint này.

## Acceptance
- Tắt mạng giữa chừng rồi bật lại trong 30s: UI vẫn hiển thị đúng kết quả khi backend xong (qua Realtime/polling).
- 1 kênh AI fail (vd quota 402): các kênh còn lại vẫn hoàn tất, banner hiện đỏ riêng kênh fail.
- Bấm Hủy giữa prep phase: stream đóng <1s, task `cancelled`, partial channel (nếu có) vẫn lưu.
- Chọn 6 long-form: thấy stepper prep chạy mượt, không bao giờ stuck ở "init" >18s.
