
# Fix dứt điểm lỗi “Only the token_hash and type should be provided”

## Chẩn đoán mới từ screenshot

Screenshot vẫn hiện lỗi:

```text
Only the token_hash and type should be provided
```

và phần hint cũ:

```text
Nếu bạn chưa link tài khoản: gõ /start trong DM với bot trước.
```

Trong source hiện tại, UI lỗi đã đổi wording khác. Điều này cho thấy Telegram đang mở **bundle cũ/cached hoặc published `app.flowa.one` chưa chạy code mới**.

Vì bundle cũ vẫn gọi:

```ts
supabase.auth.verifyOtp({
  type: 'magiclink',
  token_hash: payload.token_hash,
  email: payload.email,
})
```

nên chỉ cần backend còn trả `email`, client cũ sẽ tiếp tục gửi payload sai lên `/verify`.

## Fix chính: backend tương thích với cả bundle cũ

### 1) Không trả `email` từ `telegram-webapp-auth`
File: `supabase/functions/telegram-webapp-auth/index.ts`

Đổi response thành:

```ts
return json({
  ok: true,
  user_id: userId,
  token_hash: link.properties?.hashed_token,
  organization_id: orgId,
});
```

Bỏ field:

```ts
email
```

Lý do:
- Frontend không cần email để verify `token_hash`.
- Bundle mới đã dùng direct verify.
- Bundle cũ nếu `payload.email` là `undefined` thì request `/verify` sẽ chỉ còn `type + token_hash`, không còn bị 400.
- Đây là server-side compatibility patch, không phụ thuộc Telegram đã refresh bundle hay chưa.

### 2) Giữ lookup email nội bộ
Vẫn giữ đoạn query `profiles.email` trong edge function để gọi `generateLink`, nhưng email chỉ dùng nội bộ, không trả về client.

## Fix phụ: giảm cache Telegram

### 3) Thêm cache-busting query vào Mini App URL
File: `supabase/functions/telegram-webhook/index.ts`

Cập nhật `buildMiniAppUrl()` để luôn thêm version query:

```text
?v=tg-auth-v2
```

và vẫn giữ:

```text
?org=<organization_id>
#/multichannel/<contentId>
```

Ví dụ URL mới:

```text
https://app.flowa.one/telegram-app?org=<orgId>&v=tg-auth-v2#/multichannel/<contentId>
```

Mục tiêu:
- các nút “Xem & duyệt” mới buộc Telegram mở URL mới hơn
- giảm khả năng Telegram WebView dùng bundle cũ

### 4) Đồng bộ cache-busting cho menu button
File: `supabase/functions/telegram-bot-admin/index.ts`

Khi set menu button, cũng thêm:

```text
v=tg-auth-v2
```

để menu “Mở Flowa” không giữ URL cũ.

## Cập nhật diagnostic checklist

### 5) Sửa checklist không còn expect `email`
File: `src/pages/AdminTelegramAuthCheck.tsx`

Hiện test 5 đang coi pass khi có cả:

```ts
token_hash && email
```

Sửa thành pass khi có:

```ts
token_hash && organization_id
```

Thêm hiển thị:

```text
has_email: false
```

để xác nhận backend đã chạy bản an toàn.

### 6) Thêm test “old bundle compatibility”
Trong checklist thêm case:

```text
telegram-webapp-auth response must NOT include email
```

Pass khi:
- status 200
- có `token_hash`
- không có `email`

Ý nghĩa:
- nếu pass, cả bundle cũ lẫn bundle mới đều không còn trigger lỗi `/verify` payload sai.

## Cập nhật UI lỗi hiện tại

### 7) Làm message rõ hơn nếu vẫn gặp lỗi cũ
File: `src/pages/TelegramApp.tsx`

Nếu error chứa:

```text
Only the token_hash and type should be provided
```

hiện rõ:

```text
Bạn đang mở Mini App từ cache cũ của Telegram. Backend đã được vá để tương thích; hãy đóng hẳn Mini App rồi bấm lại nút mới.
```

Nhưng sau fix backend không trả `email`, lỗi này không còn xảy ra với nút mới.

## Files sẽ sửa

- `supabase/functions/telegram-webapp-auth/index.ts`
- `supabase/functions/telegram-webhook/index.ts`
- `supabase/functions/telegram-bot-admin/index.ts`
- `src/pages/AdminTelegramAuthCheck.tsx`
- `src/pages/TelegramApp.tsx`

## Verify sau khi implement

### Case 1 — bundle cũ trong Telegram
- mở lại nút “Xem & duyệt”
- backend không trả `email`
- client cũ gửi `/verify` chỉ với `type + token_hash`
- expected: không còn 400

### Case 2 — bundle mới
- direct verify vẫn hoạt động bình thường
- expected: vào Mini App thành công

### Case 3 — checklist
- `/admin/telegram-auth-check`
- test real init_data phải cho thấy:
  - `telegram-webapp-auth`: 200
  - `token_hash`: có
  - `organization_id`: có
  - `email`: không có
  - verify token_hash: pass

### Case 4 — nút “Xem & duyệt” mới
- bot gửi URL có `v=tg-auth-v2`
- expected: Telegram WebView load URL mới, giảm cache cũ

## Rủi ro

Thấp.
- Không đổi schema.
- Không đổi RLS.
- Không đổi HMAC Telegram.
- Chỉ bỏ dữ liệu không cần thiết khỏi response public và thêm cache-busting URL.
- Tăng bảo mật vì không expose email ra frontend Mini App.
