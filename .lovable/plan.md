

# Fix: "Token không thuộc tổ chức của bot này"

## Root cause (verified bằng DB query)

Trong bảng `telegram_bot_configs` đang có **2 row dùng chung 1 bot vật lý `@Flowa123bot`**:

| ID | organization_id | is_default | webhook_secret |
|---|---|---|---|
| `22d97d3b…` | NULL (sentinel mặc định) | true | `d2ca60…` |
| `44fcece0…` | `bccfec38…` (Flowa nội bộ — BYOB) | false | `b9bbf8…` |

Telegram chỉ biết duy nhất 1 bot `@Flowa123bot` và webhook của nó hiện trỏ về path `…/b9bbf8…` (verified trong log: `path: "/telegram-webhook/b9bbf899..."`). Vì vậy mọi update đều rơi vào row BYOB của org `bccfec38`:

- `botConfig.organizationId = bccfec38`
- `isDefaultBot = false`
- User từ org `f28873d2` (CÔNG TY TAF) tạo token với `payload.org = f28873d2`
- Check `payload.org !== botConfig.organizationId` → reject với message "❌ Token không thuộc tổ chức của bot này"

→ Default bot **không bao giờ** được dùng vì BYOB row của Flowa nội bộ đang "chiếm" webhook.

## Fix

**Xóa row BYOB trùng lặp** `44fcece0-9355-4d53-8078-641ff01b4618`. Org Flowa nội bộ (`bccfec38`) sẽ chuyển sang dùng bot mặc định như mọi org khác — chính xác là intent ban đầu của hệ thống "default bot for everyone, BYOB for white-label customers riêng".

Sau đó **set lại webhook** trên Telegram cho `@Flowa123bot` về URL với secret default `d2ca600d…`:

```
https://rllyipiyuptkibqinotz.supabase.co/functions/v1/telegram-webhook/d2ca600d66328d395245fcf79eb6f689981a13f3ee017fa3
```

## Ngăn tái diễn

Thêm trigger DB chặn việc tạo BYOB row có `bot_username` trùng với default bot:

```sql
CREATE OR REPLACE FUNCTION prevent_byob_collision_with_default_bot()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.organization_id IS NOT NULL AND NEW.is_default = false THEN
    IF EXISTS (
      SELECT 1 FROM telegram_bot_configs
      WHERE organization_id IS NULL AND is_default = true
        AND bot_username = NEW.bot_username AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'BYOB bot username "%" trùng với default bot. Mỗi BYOB phải dùng bot riêng (tạo bot mới qua @BotFather).', NEW.bot_username;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_prevent_byob_default_collision
  BEFORE INSERT OR UPDATE ON telegram_bot_configs
  FOR EACH ROW EXECUTE FUNCTION prevent_byob_collision_with_default_bot();
```

## Files thay đổi

| File | Loại |
|---|---|
| `supabase/migrations/<ts>_remove_byob_collision_with_default_bot.sql` | mới — DELETE row + ADD trigger |

Sau migration cần manual: gọi Telegram `setWebhook` về URL secret default. Có thể làm bằng 1-shot exec hoặc admin panel.

## Test E2E

1. Apply migration → row `44fcece0…` bị xóa, trigger active
2. Set webhook qua curl: `curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" -d "url=https://rllyipiyuptkibqinotz.supabase.co/functions/v1/telegram-webhook/d2ca600d…"`
3. User org `f28873d2` (TAF) → `/agents/telegram` → "Mở Telegram" → bot welcome + nút "🔗 Link Account" (không còn lỗi)
4. Bấm Link Account → "✅ Đã kết nối thành công"
5. User org `bccfec38` (Flowa) → flow tương tự, dùng cùng bot mặc định
6. Thử insert lại BYOB với username `Flowa123bot` qua admin → trigger reject với message rõ ràng

## Ước tính
**5-10 phút** — 1 migration nhỏ + 1 lần gọi setWebhook thủ công.

## Rủi ro
- Org `bccfec38` đang có `telegram_chat_bindings` link với BYOB bot cũ → bindings vẫn còn nguyên (cùng `telegram_chat_id`, cùng `organization_id`), default bot resolve lại từ chat_id → vẫn hoạt động bình thường, không cần re-link.
- Nếu sau này Flowa thực sự muốn whitelabel cho 1 enterprise customer → tạo bot Telegram MỚI qua BotFather (tên bot khác), trigger sẽ cho phép vì `bot_username` khác.

