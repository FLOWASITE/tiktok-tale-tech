

# Fix: Brand switching không hoạt động

## 🎯 Root cause

**`setWebhook` chỉ whitelist `["message"]`** trong `allowed_updates` → Telegram không bao giờ gửi `callback_query` events cho bot → user bấm nút đổi brand, webhook không nhận được gì, không có log.

Bằng chứng: logs lúc 15:33 chỉ thấy `/brand` (message), không có callback_query nào sau đó dù UI có gửi inline keyboard.

## 🔧 Fix

### 1. Thêm `callback_query` vào `allowed_updates`

**File**: `supabase/functions/_shared/telegram-client.ts` (dòng 63)

```ts
allowed_updates: ["message", "callback_query"],
```

### 2. Re-register webhook cho tất cả bot đang active

Gọi `telegram-bot-admin` với action `register_webhook` kèm `drop_pending_updates: true` để Telegram áp dụng config mới. Nếu có >1 bot, loop qua từng bot trong bảng `telegram_bot_configs`.

Có 2 cách:
- **A (tự động)**: Tạo 1 script chạy trong migration gọi edge function `telegram-bot-admin` cho mỗi config đang bật. 
- **B (thủ công)**: User bấm nút "Đăng ký lại webhook" trong UI admin Telegram sau khi deploy.

→ Chọn **A** để fix ngay, không bắt user thao tác.

### 3. Bổ sung RLS policy INSERT/UPDATE cho `telegram_chat_bindings` (defense-in-depth)

Hiện thiếu policy INSERT/UPDATE. Webhook dùng service role nên không ảnh hưởng, nhưng Mini App frontend đang `UPDATE active_brand_template_id` bằng anon key → sẽ bị RLS chặn silently. Thêm:

```sql
CREATE POLICY "Users update own bindings"
ON telegram_chat_bindings FOR UPDATE
USING (auth.uid() = user_id OR is_org_admin(auth.uid(), organization_id))
WITH CHECK (auth.uid() = user_id OR is_org_admin(auth.uid(), organization_id));
```

(INSERT không cần vì binding tạo qua webhook service role).

## 📦 Files thay đổi

| File | Thay đổi |
|---|---|
| `supabase/functions/_shared/telegram-client.ts` | `allowed_updates` thêm `"callback_query"` |
| `supabase/migrations/*_telegram_rls_fix.sql` | Policy UPDATE cho `telegram_chat_bindings` |
| Script re-register | Gọi `telegram-bot-admin` → `register_webhook` cho mọi bot active (1 lần, không cần commit) |

## 🧪 Test sau fix

1. Deploy → chạy re-register webhook → check `getWebhookInfo` thấy `allowed_updates` có `callback_query`
2. `/brand` trong Telegram → thấy inline keyboard → bấm brand khác
3. Xem logs `telegram-webhook` → thấy log `[telegram-webhook] callback_query: { data: "brand:switch:...", ... }`
4. UI Telegram → check mark `✓` chuyển sang brand mới **không gửi message mới**
5. Query DB: `SELECT active_brand_template_id FROM telegram_chat_bindings WHERE telegram_chat_id = 501332455` → thấy ID mới
6. Mini App `/telegram-app/brands` → tap brand khác → sync DB thành công (không bị RLS chặn nữa)

## ⏱ Ước tính
**15 phút** — fix 1 dòng + 1 migration + re-register webhook.

