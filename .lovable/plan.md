

# Tại sao "Chờ admin cấu hình bot"?

## Root cause (verified)

Bảng `telegram_bot_configs` **không có column `is_default`**. Code khắp nơi (telegram-link-token, telegram-send-test, telegram-bot-admin) đang query `.eq("is_default", true)` → query luôn fail/empty → `defaultBot = null` → `botReady = false` → hiển thị "Chờ admin cấu hình".

Hiện DB chỉ có 1 bot duy nhất `@Flowa123bot` thuộc org `bccfec38…`. User của org bạn đang xem **không phải org đó** → không có org bot, cũng không có default bot → bị chặn.

Có 2 vấn đề chồng nhau:
1. **Migration thiếu**: column `is_default` chưa được tạo + chưa có row sentinel `(organization_id=NULL, is_default=true)` cho default bot Flowa.
2. **View `telegram_default_bot_public`** mà FE query để biết default bot → cũng không tồn tại hoặc rỗng.

## Fix: 3 việc tuần tự

### 1. Migration: thêm `is_default` + sentinel + view public

```sql
-- Add column
ALTER TABLE telegram_bot_configs
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- Unique index: chỉ 1 default global (org NULL + is_default true)
CREATE UNIQUE INDEX IF NOT EXISTS telegram_bot_configs_one_default
  ON telegram_bot_configs (is_default)
  WHERE organization_id IS NULL AND is_default = true;

-- Promote existing Flowa123bot thành default global:
-- Copy bot_token_encrypted của Flowa123bot vào row sentinel mới (org=NULL)
INSERT INTO telegram_bot_configs (
  organization_id, is_default, bot_username, bot_token_encrypted, is_active
)
SELECT NULL, true, bot_username, bot_token_encrypted, true
FROM telegram_bot_configs
WHERE bot_username = 'Flowa123bot'
ON CONFLICT DO NOTHING;

-- Public view: ai cũng đọc được tên bot default (không expose token)
CREATE OR REPLACE VIEW telegram_default_bot_public AS
SELECT bot_username, is_active
FROM telegram_bot_configs
WHERE organization_id IS NULL AND is_default = true AND is_active = true;

GRANT SELECT ON telegram_default_bot_public TO anon, authenticated;
```

### 2. RLS: cho authenticated user đọc cấu hình default
Hiện chỉ org admin được SELECT. Sau migration, view public bypass được, nhưng `telegram-link-token` (service role) vẫn query bảng gốc → OK do dùng service key. Không cần đổi RLS gốc.

### 3. UI fallback nhẹ trong lúc chờ config (optional)
Khi `botReady=false` nhưng user là **member thường (không admin)** → hiển thị message rõ hơn:
> "Tổ chức bạn chưa có bot Telegram. Flowa đang setup bot mặc định — thử lại sau ít phút, hoặc liên hệ admin nếu muốn dùng bot riêng."

Không thay đổi component logic, chỉ refine copy trong `TelegramLinkCard` line 195-200.

## Files thay đổi

| File | Loại |
|---|---|
| `supabase/migrations/<timestamp>_telegram_default_bot.sql` | mới — add column, sentinel, view |
| `src/components/agents/TelegramLinkCard.tsx` | tweak copy line 195-200 (optional) |

Không cần đụng:
- Edge functions `telegram-link-token` / `telegram-send-test` / `telegram-bot-admin` — code đã query đúng `.eq("is_default", true)`, chỉ chờ column tồn tại
- Hook `useDefaultTelegramBot` — đã query view public sẵn

## Test E2E

1. Chạy migration → check `SELECT * FROM telegram_default_bot_public` ra 1 row `Flowa123bot, true`
2. Vào `/agents` ở org KHÔNG phải `bccfec38…` (user thường) → banner "Đang dùng bot mặc định của Flowa @Flowa123bot" hiện
3. Card link Telegram hiện nút "Mở Telegram → Start bot" (không còn "Chờ admin")
4. Click → `?start=<token>` mở Telegram → Start → realtime morph sang "AI Agent đang lắng nghe" < 3s
5. Click `Test ping` → nhận "🟢 Test từ Flowa..." trong DM
6. Org `bccfec38…` (có bot riêng): vẫn dùng `Flowa123bot` của org, KHÔNG fallback default (priority đúng)

## Ước tính
**15–20 phút** — 1 migration nhỏ, optional copy tweak. Không động edge functions.

## Rủi ro
- **Token bot Flowa123bot phải hợp lệ để dùng làm default** — nếu org `bccfec38…` xoá bot này, sentinel global cũng mất token. → migration copy snapshot vào row sentinel riêng, nên độc lập với row org. An toàn.
- Nếu Flowa muốn dùng bot KHÁC làm default (không phải Flowa123bot) → admin platform vào DB update `bot_token_encrypted` của row sentinel sau, không ảnh hưởng user.

