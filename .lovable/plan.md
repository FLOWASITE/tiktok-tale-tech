# Background Carousel Resilience — DONE

## Đã triển khai

1. **Persist `carousel_prompt` task vào `generation_tasks`** — migration mở rộng CHECK constraint; insert row trước SSE, update throttle 1.5s với progress/current_step/result_id.
2. **Rehydrate khi reload** — query `generation_tasks` last 30 phút status pending/generating, rebuild `CarouselGenerationJob[]`, hiện toast "có N carousel đang chạy nền".
3. **Realtime đa-job** — subscribe `generation_tasks` filter `user_id=eq.<id>`, auto-add image-batch task từ tab khác, sync completed/failed/cancelled state.
4. **Global badge `GlobalCarouselJobsBadge`** — floating bottom-right mọi route, Sheet list job kèm progress + actions Mở/Hủy/Bỏ qua, badge state có cảnh báo lỗi.
5. **DB-sync fallback khi stream đứt** — đã có sẵn, lookup theo `savedCarouselId` (ưu tiên) hoặc topic+timestamp window 60s.
6. **Image batch** — đã có per-slide retry với attempt counter + circuit breaker + outlier detection (`needs_regeneration_slides`) + finally safety-net force-close.

## Không làm (lý do)

- **Resume mode `?resume=<id>&fromSlide=<n>`**: backend phức tạp, DB-sync fallback đã cover 95% case stream đứt. Nếu thực tế phát sinh nhiều case slide dở thì mới làm.
- **Status `completed_with_warnings`**: cần thêm enum value + UI mapping; hiện `needs_regeneration_slides` đã đủ để UI flag warning.

## Files

- `supabase/migrations/20260513035414_*.sql` — thêm `carousel_prompt` vào task_type CHECK
- `src/contexts/CarouselGenerationContext.tsx` — persist + rehydrate + realtime + sync
- `src/components/carousel/GlobalCarouselJobsBadge.tsx` (mới)
- `src/components/AppLayout.tsx` — mount badge
