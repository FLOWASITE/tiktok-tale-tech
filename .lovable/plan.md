

## Hiểu yêu cầu

User muốn quá trình **tạo prompt carousel** (gọi `generate-carousel`) chạy **background** — nghĩa là user có thể rời khỏi màn hình carousel (đi sang trang khác, đóng dialog, v.v.) mà process vẫn tiếp tục và khi quay lại sẽ thấy kết quả.

Hiện tại: nếu user thoát màn hình → component unmount → `generateCarousel()` promise bị bỏ rơi → state `generating` reset → carousel mới không xuất hiện trong list khi quay lại.

## Điều tra cần làm (read-only)

1. **`useCarousels.ts`** — hook hiện tại: `generateCarousel()` set `generating=true`, await edge function, push vào state. Nếu component dùng hook unmount → state mất.
2. **`generate-carousel/index.ts`** — edge function: kiểm tra đã có `EdgeRuntime.waitUntil()` để persist DB chưa, hay vẫn rely vào client nhận response rồi mới insert.
3. **Nơi gọi `generateCarousel()`** — `CarouselGeneratorDialog` hoặc tương tự — xem flow UI.
4. **Realtime** — `carousels` table có enable realtime publication chưa? Nếu có → frontend ở bất kỳ đâu cũng có thể subscribe và pick up row mới.

## Giải pháp đề xuất (2 tầng)

### Tầng 1: Background-safe ở edge function
File: `supabase/functions/generate-carousel/index.ts`
- Sau khi tạo xong slides_content (AI call), wrap step **INSERT vào `carousels` table** trong `EdgeRuntime.waitUntil()` để dù client disconnect, DB vẫn được ghi.
- Trả response sớm (nếu có thể) hoặc đảm bảo INSERT hoàn tất trước khi response — tùy hiện trạng.

### Tầng 2: Global generation tracker ở frontend
File mới: `src/contexts/CarouselGenerationContext.tsx`
- Context provider ở root (App.tsx) — track tất cả carousel đang generate (Map<tempId, {status, formData, startedAt}>).
- `generateCarousel()` move từ `useCarousels` → context → **không bị unmount khi user đổi route**.
- `useCarousels` subscribe context để hiển thị trạng thái + hiển thị mini tracker (đã có `CarouselMiniTracker`) global.

### Tầng 3: Realtime subscription cho `carousels` table
File: `src/hooks/useCarousels.ts`
- Migration: `ALTER PUBLICATION supabase_realtime ADD TABLE public.carousels;` (nếu chưa)
- Hook subscribe INSERT events filtered by `organization_id` → tự động prepend carousel mới vào list khi DB có row, kể cả khi process chạy ở session/tab khác.

### Tầng 4: UI feedback global
- `CarouselMiniTracker` (đã có) render ở root layout, đọc từ `CarouselGenerationContext` → hiển thị progress dù user ở page nào.
- Khi xong: toast "Carousel sẵn sàng!" với CTA "Xem kết quả" → navigate về trang carousel.

## Files dự kiến đụng

- `supabase/functions/generate-carousel/index.ts` — `EdgeRuntime.waitUntil` cho DB persist
- `supabase/migrations/*` — enable realtime cho `carousels` table (nếu chưa)
- `src/contexts/CarouselGenerationContext.tsx` — **mới**, global generation tracker
- `src/App.tsx` — wrap với `CarouselGenerationProvider` + render `CarouselMiniTracker` global
- `src/hooks/useCarousels.ts` — bridge với context + realtime subscription
- Component đang gọi `generateCarousel()` — chuyển sang dùng context thay vì hook trực tiếp

## Kết quả mong đợi

- User submit form tạo carousel → có thể rời màn hình ngay, đi sang trang khác.
- Mini tracker bottom-right hiện trên mọi page với progress + ETA.
- Edge function hoàn tất → DB có row → realtime push → carousel xuất hiện trong list dù user đang ở đâu.
- Toast "Sẵn sàng" + CTA quay lại xem.
- Không còn cảnh "thoát màn hình → mất tiến trình".

