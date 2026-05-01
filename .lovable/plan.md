Mình đã trace lỗi hiện tại. Có 2 vấn đề chính còn sót:

1. Backend vẫn nhận handle sai/khó nhập từ `window.prompt` (`flowaone.bi ký.social`) nên `resolveHandle` không tìm được DID.
2. OAuth metadata đang đăng ký redirect URI là `/oauth/bluesky/callback`, nhưng app route hiện chỉ có `/auth/bluesky/callback`. URL `/oauth/bluesky/callback` trên `app.flowa.one` đang trả 404, nên kể cả start thành công thì callback vẫn có thể lỗi.

Kế hoạch sửa:

1. Thay `window.prompt` bằng dialog kết nối Bluesky chuẩn trong `BrandViewConnectionsTab.tsx`
   - Thêm state `blueskyDialogOpen`, `blueskyHandle`, `isBlueskyConnecting`.
   - Khi bấm Kết nối Bluesky: mở dialog có `DialogTitle`/`DialogDescription` đầy đủ, tránh cảnh báo Radix hiện tại.
   - Input có placeholder `yourname.bsky.social`, tự strip `@`, trim, lowercase.
   - Validate client-side chặt hơn: không dấu cách, chỉ ký tự ASCII hợp lệ cho domain/handle, có dấu chấm, length hợp lý.
   - Hiển thị lỗi rõ: “Handle có dấu cách/ký tự tiếng Việt, hãy nhập đúng handle như trên Bluesky”.

2. Sửa request gọi `bluesky-oauth-start`
   - Gửi body thống nhất: `{ handle, brandTemplateId: template.id }`.
   - Parse lỗi từ response body của Edge Function nếu có, không chỉ dùng `FunctionsHttpError.message`, để toast hiện đúng lỗi backend.
   - Giữ polling sau popup nhưng kiểm tra lại bằng query trực tiếp thay vì closure `getConnectionForPlatform` có thể stale.

3. Cải thiện validation server-side trong `bluesky-oauth-start`
   - Normalize handle: strip `@`, trim, lowercase.
   - Return `400` cho handle không hợp lệ trước khi gọi network: chứa whitespace, ký tự non-ASCII, không có dot, quá dài, hoặc label rỗng.
   - Return `400` cho lỗi resolve handle thay vì `500`, để UI không báo lỗi hệ thống.
   - Error message sẽ gợi ý cụ thể: ví dụ `flowaone.bsky.social`, không nhập tên hiển thị.

4. Fix callback route mismatch
   - Thêm route `/oauth/bluesky/callback` trỏ tới `BlueskyCallback` để khớp `client-metadata.json` và `BLUESKY_REDIRECT_URI`.
   - Giữ `/auth/bluesky/callback` như alias backward-compatible.

5. Sửa `BlueskyCallback.tsx` để thực sự exchange code
   - Hiện tại page chỉ đọc `success=true/error`, chưa gọi backend khi Bluesky redirect về với `code` + `state`.
   - Khi URL có `code` + `state`, gọi `supabase.functions.invoke('bluesky-oauth-callback', { body: { code, state, iss } })`.
   - Sau khi thành công, show success + redirect về brand.
   - Nếu lỗi, map message rõ và không để blank screen.

6. QA nhanh sau sửa
   - Kiểm tra `https://app.flowa.one/oauth/bluesky/callback?...` không còn 404 sau deploy.
   - Kiểm tra dialog accessibility không còn thiếu `DialogTitle`.
   - Nếu handle sai: lỗi dừng ngay ở client hoặc server 400 rõ ràng.
   - Nếu handle đúng: mở authorization URL thay vì báo thiếu/resolve handle.