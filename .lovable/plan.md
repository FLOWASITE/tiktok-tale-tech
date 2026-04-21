
# Fix cuối cùng: auth đang fail ở bước `verifyOtp`, không phải ở `telegram-webapp-auth`

## Nguyên nhân đã xác nhận

Log xác thực cho thấy chuỗi sự kiện này:

1. `telegram-webapp-auth` gọi `generate_link` thành công (`200`)
2. ngay sau đó frontend gọi `/verify`
3. `/verify` trả `400: Only the token_hash and type should be provided`

Điều này khớp với code hiện tại trong `src/hooks/useTelegramWebApp.ts`:

```ts
await supabase.auth.verifyOtp({
  type: 'magiclink',
  token_hash: payload.token_hash,
  email: payload.email,
});
```

Với flow `token_hash` hiện tại, backend auth chỉ chấp nhận:
- `token_hash`
- `type`

`email` làm request bị reject, nên Mini App vẫn hiện “Không xác thực được” dù `telegram-webapp-auth` đã chạy xong.

## Cần sửa

### 1) Sửa bước verify OTP trong `useTelegramWebApp`
File: `src/hooks/useTelegramWebApp.ts`

Đổi từ:

```ts
await supabase.auth.verifyOtp({
  type: 'magiclink',
  token_hash: payload.token_hash,
  email: payload.email,
});
```

thành payload tối thiểu:

```ts
await supabase.auth.verifyOtp({
  type: 'magiclink',
  token_hash: payload.token_hash,
});
```

Mục tiêu:
- giữ nguyên flow resolve `organization_id`
- chỉ bỏ field gây lỗi ở bước đăng nhập thật sự
- không verify lại khi đã có session sẵn

### 2) Giữ invariant “existing session + missing org vẫn phải gọi backend”
Không đổi hướng hiện tại ở hook:
- có session + có org candidate → fast path
- có session + thiếu org → vẫn invoke `telegram-webapp-auth`
- chưa có session → invoke `telegram-webapp-auth` rồi `verifyOtp`

Chỉ cần chắc rằng sau fix:
- `verifyOtp` chỉ chạy khi chưa có session
- `organization_id` từ response vẫn là source of truth

### 3) Nâng checklist để thấy cả lỗi function và lỗi sign-in
File: `src/pages/AdminTelegramAuthCheck.tsx`

Trang checklist hiện mới đo:
- status/body của `telegram-webapp-auth`
- session probe

Nhưng bug thật nằm ở bước sau đó. Cần thêm bài test mới:

#### Test mới — Verify token_hash with auth
Khi test 5 nhận được:
- `token_hash`
- `organization_id`

thì gọi thêm `supabase.auth.verifyOtp({ type: 'magiclink', token_hash })`

Hiển thị:
- pass/fail
- exact error message nếu fail
- note rõ nếu lỗi do payload verify không hợp lệ

Như vậy checklist sẽ tách rõ:
```text
telegram-webapp-auth: PASS
verifyOtp: FAIL
```

thay vì nhìn như toàn bộ flow bị lỗi Telegram.

### 4) Cập nhật UI lỗi trong `TelegramApp`
File: `src/pages/TelegramApp.tsx`

Giữ card lỗi hiện tại, nhưng thêm nhánh message thân thiện hơn nếu hook trả lỗi từ bước verify:
- ví dụ `Đã resolve được Telegram nhưng không tạo được phiên đăng nhập`
- ưu tiên hiện `error` gốc từ hook
- tiếp tục show diagnostic mini line:
  - auth
  - user
  - org
  - code

Mục tiêu là phân biệt:
- lỗi initData/HMAC
- lỗi not_linked/ambiguous_org
- lỗi verifyOtp sau khi function đã thành công

## Files sẽ sửa

- `src/hooks/useTelegramWebApp.ts`
- `src/pages/AdminTelegramAuthCheck.tsx`
- `src/pages/TelegramApp.tsx`

## Cách verify sau khi implement

### Case 1 — bug hiện tại
- mở Mini App từ Telegram
- user chưa có session web
- expected:
  - `telegram-webapp-auth` trả `200`
  - `verifyOtp` không còn trả `400`
  - user đăng nhập thành công
  - vào Mini App bình thường

### Case 2 — existing session
- user đã đăng nhập sẵn
- mở Mini App không có `org`
- expected:
  - hook vẫn gọi backend để resolve `organization_id`
  - không gọi verify lại
  - không còn hiện lỗi

### Case 3 — checklist admin
- `/admin/telegram-auth-check`
- expected hiển thị riêng:
  - raw function status/body
  - verifyOtp status/error
  - existing-session simulation pass/fail

## Rủi ro

Rất thấp. Không đụng schema, không đụng RLS, không đổi logic bot binding. Đây là sửa đúng tham số auth client ở bước cuối.

## Kết quả mong đợi

Sau fix này:
- `telegram-webapp-auth` vẫn resolve bot/org đúng như hiện tại
- bước đăng nhập thật sự không còn fail ở `/verify`
- Mini App hết lỗi “Không xác thực được”
- checklist sẽ chỉ ra chính xác nếu lỗi nằm ở function hay ở verify sign-in
