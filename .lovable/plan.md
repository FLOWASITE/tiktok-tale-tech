

# Fix nút "🚀 Đăng FB" trên Telegram → 400 "connectionId and content are required"

## Nguyên nhân

`telegram-webhook` gọi `channel-publisher` chỉ với `{ action: 'facebook', contentId, channel }`. Block resolve payload trong `channel-publisher/index.ts` (lines 71-133) **chỉ chạy cho `website/blog/flowa_blog`** → với `facebook` (và mọi social khác) function forward thẳng payload thiếu xuống `publish-facebook` → `publish-facebook` throw `connectionId and content are required` → 400.

Log xác nhận:
```
[channel-publisher] routing action="facebook" → publish-facebook
publish-facebook: accepted internal service-role invocation
Facebook publish error: Error: connectionId and content are required
```

## Fix

### `supabase/functions/channel-publisher/index.ts`

Mở rộng block resolve payload cho **tất cả social channels** (`facebook`, `instagram`, `linkedin`, `twitter`, `threads`, `tiktok`, `zalo`, `google-business`), không chỉ website/blog.

**Logic resolve cho social channel:**
1. Nếu thiếu `connectionId` HOẶC `content` VÀ có `contentId`:
   - Query `multi_channel_contents` lấy column tương ứng (`facebook_content`, `instagram_content`, …) + `organization_id` + `brand_template_id` + `media_urls`/`channel_images`.
   - Map `action` → DB platform (`facebook`→`facebook`, `zalo`→`zalo_oa`, `google-business`→`google_business`, `twitter`→`twitter`, …) + content column.
   - Query `social_connections` filter `platform` + `is_active=true` + `organization_id` (+ `brand_template_id` nếu có) → lấy `id`.
   - Inject vào `finalPayload`: `connectionId`, `content`, optionally `mediaUrls` (parse từ `channel_images[channel]`).
2. Nếu không tìm thấy connection → trả về error đặc biệt để Telegram hiện nút "🔗 Kết nối lại" (đã có sẵn pattern `pubIsTokenExpiredError` — dùng message `"Chưa kết nối <platform>. Vui lòng kết nối lại."` để bot match heuristic, hoặc thêm `errorCode: 'NO_CONNECTION'`).
3. Nếu không tìm thấy `<channel>_content` → fallback dùng cột chung (vd `facebook_content` rỗng → thử dùng `content` field gốc của `multi_channel_contents` nếu tồn tại, hoặc trả lỗi rõ ràng "Bài chưa có nội dung cho FB").

### Bảng mapping mới (trong `channel-publisher`)

| action | DB platform | Content column |
|---|---|---|
| facebook | facebook | facebook_content |
| instagram | instagram | instagram_content |
| linkedin | linkedin | linkedin_content |
| twitter | twitter | twitter_content |
| threads | threads | threads_content |
| tiktok | tiktok | tiktok_content |
| zalo | zalo_oa | zalo_content |
| google-business | google_business | google_business_content (fallback `content`) |

### Cập nhật heuristic token-expired ở Telegram (optional, nhỏ)

`pubIsTokenExpiredError` (trong `telegram-webhook`) hiện đã match `"chưa kết nối"` / `"please reconnect"` (đối chiếu `useRetryPublish.ts`). Đảm bảo error message từ `channel-publisher` chứa `"chưa kết nối"` để bot tự hiện nút Kết nối lại.

## Files sửa

| File | Thay đổi |
|---|---|
| `supabase/functions/channel-publisher/index.ts` | Mở rộng resolve block cho tất cả social actions; thêm channel→column map; lookup `social_connections` theo platform+org+brand; inject `connectionId` + `content` (+ `mediaUrls` nếu có); error rõ ràng khi thiếu connection / content. |

## Sau fix
Redeploy `channel-publisher` → test lại trên Telegram nút "🚀 Đăng ngay" cho FB/IG/LinkedIn/Threads/Twitter/Zalo/GBP.

## Rủi ro
Thấp. Chỉ thêm logic resolve, không động vào auth/forward path. Các caller cũ (UI web, scheduler) đã gửi đầy đủ `connectionId`+`content` → block resolve sẽ skip.

