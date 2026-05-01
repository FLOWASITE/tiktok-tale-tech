## Vấn đề
Ảnh không upload được lên Bluesky khi đăng bài (text post vẫn OK). Logs hiện tại không có entry nào cho `publish-bluesky` nên cần bổ sung log chi tiết để chẩn đoán đồng thời sửa 3 nguyên nhân khả năng cao.

## Nguyên nhân nghi vấn

1. **Content-Type không hợp lệ với Bluesky**
   - Bluesky PDS chỉ nhận `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
   - Khi ảnh từ Supabase Storage transform (`?width=1200&quality=70`) trả về header `image/webp` hoặc thậm chí `application/octet-stream`, blob upload sẽ fail với 400 `InvalidMimeType`.

2. **DPoP nonce stale ở lần upload đầu tiên**
   - `ctx.dpopNonce` được load từ DB lúc resume session — thường đã hết hạn.
   - Lần upload đầu phải tốn 1 round-trip 401 để lấy nonce mới. Khi upload 4 ảnh carousel song song hoặc liên tiếp, attempt 0 luôn fail và attempt 1 mới đúng — nhưng body `ArrayBuffer` đã được fetch tiêu thụ một lần, không re-send được trong một số runtime Deno.

3. **Body binary bị consume khi retry**
   - `pdsFetch` retry với cùng `opts.body` reference. Với `ArrayBuffer` thường OK nhưng nếu Deno wrap thành `ReadableStream` nội bộ thì attempt 1 gửi body rỗng → 400.

## Thay đổi

### 1. `supabase/functions/publish-bluesky/index.ts`

**`downloadAndPrepareImage`** (lines 352-381):
- Sau khi fetch, **normalize content-type**: nếu không phải `image/jpeg|png|webp|gif`, mặc định về `image/jpeg`.
- Detect magic bytes 4 byte đầu (`FF D8 FF` = JPEG, `89 50 4E 47` = PNG, `52 49 46 46` = WEBP/RIFF, `47 49 46` = GIF) để set content-type chính xác thay vì tin header server trả.
- Log `[publish-bluesky] image prepared`: size + final contentType.

**`uploadBlob`** (lines 383-406):
- Log lỗi chi tiết khi blob upload fail: status + body response (đang có nhưng chỉ throw, cần `console.error` để hiện trong edge logs).
- Thêm log success: `[publish-bluesky] blob uploaded` với mime + size.

### 2. `supabase/functions/_shared/bluesky-oauth.ts` — `pdsFetch` (lines 544-583)

- **Warm nonce trước khi gửi binary body**: nếu `opts.nonce` không có và `opts.body` là `ArrayBuffer`/`Uint8Array`, gọi 1 HEAD/OPTIONS preflight nhẹ để lấy `DPoP-Nonce` trước, tránh wasting binary body ở attempt 0.
  - Implementation đơn giản hơn: nếu `opts.body` là binary VÀ không có nonce, thực hiện 1 preflight `POST` rỗng tới `/xrpc/_health` hoặc accept rằng attempt 0 sẽ fail rồi clone body trước khi retry.
- **Clone body trước retry**: trước fetch lần đầu, nếu body là `ArrayBuffer`, lưu reference; trước attempt 1 dùng `body.slice(0)` để chắc chắn không bị consume.
- Log warning khi nonce retry happen, kèm URL để dễ trace.

### 3. Cải thiện logging end-to-end
- Thêm `console.log` ở mỗi bước trong handler chính (download → prepare → upload → embed) để khi user thử lại, edge logs sẽ chỉ ra step nào fail.

## Validation sau khi deploy
1. Đăng bài Bluesky với 1 ảnh thường → logs hiện full pipeline + post thành công.
2. Đăng carousel 4 ảnh → cả 4 ảnh xuất hiện trên Bluesky.
3. Test ảnh từ Supabase Storage (đường dẫn `/storage/v1/`) — đảm bảo transform trả jpeg.
4. Nếu vẫn fail, log sẽ chỉ rõ status code Bluesky trả + 200 ký tự đầu của response để fix tiếp (có thể là rate limit 429 hoặc mime cụ thể).

## Lưu ý
- Không thay đổi schema DB hay auth flow.
- Không cần reconnect Bluesky.
- Chỉ ảnh hưởng `publish-bluesky` + helper `pdsFetch` (dùng chung nhưng thay đổi backward-compatible).
