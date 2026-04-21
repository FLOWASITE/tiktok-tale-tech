

# Fix: Mini App "Không xác thực được" với bot mặc định Flowa

## Nguyên nhân thực sự (đã xác nhận từ code)

File `supabase/functions/telegram-webapp-auth/index.ts` (file hiện tại trong repo, lines 27–43):

```ts
const orgId = String(body.organization_id || "").trim();
if (!orgId) return json({ error: "organization_id is required" }, 400);

const { data: cfg } = await supabase
  .from("telegram_bot_configs")
  .select("bot_token_encrypted, is_active")
  .eq("organization_id", orgId)            // ← chỉ tìm BYOB row
  .maybeSingle();
if (!cfg || !cfg.is_active) {
  return json({ error: "Bot chưa được cấu hình cho tổ chức này" }, 404);
}
```

Bạn đang dùng **bot mặc định của Flowa**. Bot mặc định là **sentinel row** với `organization_id IS NULL` + `is_default = true`. Tổ chức của bạn không có BYOB row → query trả null → trả về 404 → Mini App hiển thị "Không xác thực được" (dù `?org=` đã được nhúng đúng vào URL từ lần fix trước).

Đây cũng là lý do các fix trước (truyền `?org=`, fallback `start_param`) không giải quyết được: vấn đề nằm ở chỗ edge function `telegram-webapp-auth` chưa biết cách dùng default bot, trong khi 2 edge khác (`telegram-link-token`, `telegram-send-test`) đều đã có fallback default bot.

Note thêm: tóm tắt loop trước nói là đã "make `organization_id` optional và infer từ bindings" — nhưng file hiện tại trong repo không có những thay đổi đó. Có thể edit cũ chưa được lưu, hoặc đã bị overwrite. Lần này phải verify code thực tế sau khi sửa.

## Giải pháp

Sửa **một file** duy nhất: `supabase/functions/telegram-webapp-auth/index.ts`. Thêm logic giống `telegram-link-token`:

### 1) Cho phép `organization_id` optional (infer từ Telegram user)

- Nếu body có `organization_id` → dùng nó.
- Nếu không → parse Telegram user từ `init_data` trước, sau đó tra `telegram_chat_bindings` theo `telegram_user_id` + `chat_type='private'` + `is_active=true` để suy ra org. Nếu user chỉ có 1 binding → dùng org đó. Nếu nhiều binding → trả lỗi yêu cầu mở từ menu bot có gắn `?org=`.

### 2) Fallback bot config: BYOB → default sentinel

Thay block tra cứu bot bằng pattern:
```ts
let { data: cfg } = await supabase
  .from("telegram_bot_configs")
  .select("bot_token_encrypted, is_active")
  .eq("organization_id", orgId)
  .maybeSingle();

if (!cfg || !cfg.is_active) {
  const { data: defaultBot } = await supabase
    .from("telegram_bot_configs")
    .select("bot_token_encrypted, is_active")
    .is("organization_id", null)
    .eq("is_default", true)
    .eq("is_active", true)
    .maybeSingle();
  cfg = defaultBot ?? null;
}

if (!cfg) {
  return json({ error: "Không tìm thấy bot khả dụng cho tổ chức này" }, 404);
}
```

→ Khi tổ chức dùng bot mặc định, HMAC sẽ được verify bằng token của bot mặc định (đúng bot phát ra `init_data`).

### 3) Thứ tự xử lý mới

Để có thể infer org từ `telegram_user_id`, cần parse user **trước** khi lookup bot:

1. Parse `init_data` → lấy `hash`, `auth_date`, `user.id`.
2. Nếu có `organization_id` từ body → dùng nó. Nếu không → query `telegram_chat_bindings` theo `telegram_user_id` (private + active). 1 kết quả → dùng. 0 → 404. >1 → 409 yêu cầu chỉ định.
3. Lookup bot config (BYOB → fallback default).
4. Validate HMAC bằng token đã resolve.
5. Check `auth_date` freshness (<24h).
6. Lookup binding theo `(organization_id, telegram_user_id)` để lấy `user_id` → generate magic link → trả `token_hash` + `email` + `organization_id` về client.

### 4) Frontend hook nhỏ

Trong `src/hooks/useTelegramWebApp.ts`:

- Bỏ early-return `"Thiếu organization id"` (cho phép gọi backend mà không có org).
- Truyền `organization_id` chỉ khi có (URL hoặc localStorage).
- Sau khi backend trả về, dùng `organization_id` từ response làm source-of-truth, lưu lại vào `localStorage` cho lần sau.

### 5) Sau khi sửa: deploy + verify

- Deploy `telegram-webapp-auth`.
- Mở Telegram → bấm "Xem & duyệt" → Mini App phải xác thực thành công.
- Kiểm tra log `telegram-webapp-auth` để xác nhận không còn 404 "Bot chưa được cấu hình".

## Files thay đổi

| File | Thay đổi |
|---|---|
| `supabase/functions/telegram-webapp-auth/index.ts` | Thêm fallback default bot, infer org từ `telegram_user_id`, đảo thứ tự parse user trước lookup bot |
| `src/hooks/useTelegramWebApp.ts` | Bỏ hard-block khi thiếu org; dùng org từ response làm sự thật |

## Test

1. Default bot (case của bạn): bấm "Xem & duyệt" → Mini App vào thẳng đúng bài, không lỗi.
2. BYOB bot: vẫn hoạt động (BYOB row vẫn được match trước khi fallback).
3. User chưa link bot trong DM: trả lỗi rõ ràng yêu cầu `/start` trước.

## Rủi ro

Thấp. Mọi thay đổi additive: thêm fallback path mà không phá BYOB hiện có. HMAC vẫn được verify nghiêm bằng đúng token bot phát hành `init_data`.

## Ước tính

5–10 phút.

