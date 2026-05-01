## Mục tiêu
Cho phép Carousel post trực tiếp lên **Bluesky** (đã có publish-bluesky edge function hỗ trợ tới 4 ảnh + DirectPublishButton đã whitelist `bluesky`).

## Thay đổi

**File:** `src/components/CarouselViewer.tsx`

1. **Line 115-120** — thêm `bluesky` vào `platformLabels`:
   ```ts
   bluesky: 'Bluesky',
   ```

2. **Line 364** — thêm `'bluesky'` vào `ALL_CAROUSEL_CHANNELS`:
   ```ts
   const ALL_CAROUSEL_CHANNELS = ['facebook', 'instagram', 'linkedin', 'twitter', 'tiktok', 'bluesky'];
   ```

3. **Line 368-371** — thêm vào `CHANNEL_TO_PLATFORM`:
   ```ts
   bluesky: 'bluesky',
   ```

## Cơ chế tự nhiên có sẵn
- `DirectPublishButton` đã chấp nhận `bluesky` (whitelist vừa fix).
- `useDirectPublish.publishToBluesky` đã route qua `channel-publisher` → `publish-bluesky`.
- `publish-bluesky` upload tối đa **4 ảnh đầu** của carousel (`mediaUrls.slice(0, 4)`) + truncate text 300 graphemes.
- Bluesky icon chỉ hiện khi user đã có active connection (filter qua `connectedChannelSet`).

## Lưu ý
- Carousel >4 slides: chỉ 4 ảnh đầu lên Bluesky (đây là limit cứng của AT Protocol, edge function tự cắt).
- Caption dùng `caption_suggestion` hoặc `topic` — sẽ tự truncate xuống 300 ký tự.