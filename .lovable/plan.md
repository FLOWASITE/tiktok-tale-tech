
# Cho phép xuất bản nội dung lên Blogger

## Bối cảnh

Edge function `publish-blogger` đã có sẵn và OAuth Blogger đã hoạt động (kết nối lưu vào `social_connections` với `platform = 'blogger'`). Tuy nhiên nút "Đăng ngay" trên UI không xuất hiện cho kênh Blogger vì:

1. `channel-publisher` (router) **không có entry** cho action `blogger` → mọi request bị reject với "Invalid action".
2. `useDirectPublish` thiếu hàm `publishToBlogger`.
3. `DirectPublishButton` không whitelist `blogger` trong `isSupported` → render nút "Sắp ra mắt".
4. `resolve-social-payload.ts` không biết cách lấy nội dung Blogger từ `multi_channel_contents` khi gọi từ Telegram/lịch.
5. Cron `process-scheduled-publishing` (nếu dùng) cũng đi qua `channel-publisher`, nên fix ở router là tự động hỗ trợ luôn cả lên lịch.

## Phạm vi thay đổi

### 1. `supabase/functions/channel-publisher/index.ts`
- Thêm `blogger: 'publish-blogger'` vào `PLATFORM_FUNCTION_MAP`.
- Thêm `blogger: 'website'` (hoặc `'blogger'` nếu dùng channel key riêng) vào `ACTION_TO_CHANNEL` để cập nhật `channel_statuses` đúng. Sẽ kiểm tra `Channel` type trước khi quyết định — nếu Blogger là channel độc lập trong UI thì giữ `blogger`.
- Thêm Blogger vào `SOCIAL_RESOLVE_MAP` (file `resolve-social-payload.ts`) với:
  - `dbPlatform: 'blogger'`
  - `contentColumn: 'blog_content'` (hoặc cột phù hợp — sẽ verify trong `multi_channel_contents`)
  - `channelKey: 'blogger'`
- Sau khi resolve, payload cần có thêm `title` (lấy từ heading đầu của content hoặc field `blog_title` nếu có), `featuredImageUrl` từ `mediaUrls[0]`, `labels` (optional, từ tags).

### 2. `supabase/functions/publish-blogger/index.ts`
- Hiện đã nhận `connectionId/title/content/labels/featuredImageUrl`. Bổ sung guard cho trường hợp `title` không có (auto-extract từ dòng đầu content), để tương thích với resolver tự động.

### 3. `src/hooks/useDirectPublish.ts`
- Thêm `publishToBlogger(options: PublishOptions & { blogData?: ... })` gửi `action: 'blogger'` qua `channel-publisher` với payload `{ connectionId, contentId, content, title, mediaUrls, labels }`.
- Export trong return object.

### 4. `src/components/social/DirectPublishButton.tsx`
- Thêm `'blogger'` vào mảng `isSupported`.
- Thêm case `blogger` trong `handlePublish` switch → gọi `publishToBlogger` với `blogData.title` lấy từ ô Title trong dialog (tái dùng UI Blog dialog hiện có hoặc dialog confirm tiêu chuẩn + ô title).
- Đổi nhãn nút khi platform là `blogger`: "Đăng Blogger".
- Icon: thay text-span `"B"` bằng `ChannelIcon channel="blogger"` nếu icon đã có; nếu chưa, giữ tạm chữ B.

### 5. `src/components/ui/channel-icon.tsx` (verify)
- Đảm bảo có icon cho `blogger`. Nếu chưa, thêm SVG đơn giản (chữ B màu cam Blogger #FF8000) — tuân thủ rule "SVG ChannelIcon thay vì emoji".

## Không thay đổi

- Schema DB / migrations (không cần).
- OAuth flow Blogger (đã hoàn tất ở message trước).
- Các edge function khác.

## Kiểm tra sau khi implement

1. Vào trang Multichannel → nội dung có kênh Blogger → bấm "Đăng ngay" → xuất bản thành công, nhận `postUrl` từ Blogger.
2. Lên lịch đăng Blogger qua nút Calendar → cron chạy thành công.
3. Kiểm tra `social_connections.last_used_at` được cập nhật, `last_error = null`.
4. Logs `publish-blogger` không có lỗi, response trả `success: true, postUrl`.
