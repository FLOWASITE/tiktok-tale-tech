

# Fix đăng bài X (Twitter): Hỗ trợ ảnh + Thread + Sửa lỗi 403

## Vấn đề hiện tại (3 lỗi)

1. **Hard limit 280 ký tự** (dòng 289): Reject mọi content > 280 chars → thread content (150-350 từ) luôn bị chặn
2. **Không upload media**: `mediaUrls` được nhận nhưng bị bỏ qua hoàn toàn — chỉ gửi `{ text }` 
3. **Không hỗ trợ thread**: Content dạng thread (1/, 2/...) được gửi nguyên khối thay vì tách thành từng tweet

## Kiến trúc X API hiện tại (2025-2026)

- **Media upload**: v1.1 `https://upload.twitter.com/1.1/media/upload.json` (simple upload, OAuth 1.0a) — vẫn hoạt động, dùng `media_data` (base64) hoặc `media` (binary). v2 endpoint cũng có nhưng v1.1 simple upload ổn định hơn cho ảnh < 5MB
- **Post tweet**: v2 `https://api.x.com/2/tweets` với `{ text, media: { media_ids: [...] } }`
- **Thread**: Post tweet đầu → lấy tweet ID → post reply với `reply: { in_reply_to_tweet_id }`
- **Giới hạn**: Max 4 ảnh/tweet, mỗi ảnh ≤ 5MB

## Giải pháp

### Sửa `supabase/functions/publish-twitter/index.ts`

**A. Thêm hàm `uploadMediaToTwitter`:**
- Fetch ảnh từ URL → lấy binary
- Upload qua v1.1 simple upload endpoint (`upload.twitter.com/1.1/media/upload.json`) dùng multipart/form-data với `media_data` (base64)
- OAuth 1.0a header (dùng `buildOAuth1Header` có sẵn) — **QUAN TRỌNG**: Không include body params vào OAuth signature (multipart form không tham gia signature)
- Return `media_id_string`

**B. Thêm hàm `splitThreadContent`:**
- Tách content theo pattern `1/`, `2/`, `3/`... thành mảng tweets
- Nếu không có pattern thread → coi là single tweet

**C. Sửa `postTweetV2` để hỗ trợ `media_ids` và `reply`:**
```typescript
async function postTweetV2(
  tweetText: string,
  consumerKey, consumerSecret, accessToken, accessTokenSecret,
  mediaIds?: string[],
  replyToTweetId?: string
): Promise<{ id: string; text: string }>
```
Body: `{ text, media?: { media_ids }, reply?: { in_reply_to_tweet_id } }`

**D. Xóa hard limit 280 chars (dòng 289-291):**
- Xóa hoàn toàn block `if (content.length > 280) throw...`
- Validation đã được xử lý ở tầng content generation

**E. Sửa flow chính (dòng 288-356):**
```text
1. Nhận content + mediaUrls
2. Nếu có mediaUrls → upload từng ảnh (max 4) → lấy media_ids
3. Tách content thành tweets (splitThreadContent)
4. Nếu single tweet → postTweetV2(text, mediaIds)
5. Nếu thread → post tweet đầu (kèm ảnh nếu có) → loop post replies
6. Return tweet ID + URL của tweet đầu
```

**F. Base64 encoding an toàn cho ảnh lớn:**
- Dùng chunk-based base64 encoding thay vì `btoa(String.fromCharCode(...))` để tránh stack overflow với ảnh lớn

### File thay đổi
- **Edit**: `supabase/functions/publish-twitter/index.ts`
- **Deploy**: `publish-twitter`

### Lưu ý kỹ thuật
- OAuth 1.0a cho media upload: signature chỉ gồm OAuth params, KHÔNG include multipart body params
- v1.1 simple upload giới hạn 5MB/ảnh — phù hợp cho hầu hết use case social media
- Thread: ảnh chỉ attach vào tweet đầu tiên (best practice của X)
- Lỗi 403 hiện tại có thể do content > 280 chars bị chặn trước → sau khi fix thread logic, cần test lại

