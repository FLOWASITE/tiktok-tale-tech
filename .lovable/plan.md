
## Hiện trạng Telegram (đã hoàn chỉnh phần lớn)

**Backend:**
- ✅ DB: `telegram_bot_configs` (RLS admin-only), `telegram_chat_bindings` (RLS owner/admin)
- ✅ Edge functions: `telegram-bot-admin` (upsert/register_webhook), `telegram-link-token` (sign JWT), `telegram-webhook` (đa tenant qua path-secret, dedup update_id, /start /help /status /generate /link_group)
- ✅ Secrets: `TELEGRAM_LINK_SECRET`, `TELEGRAM_WEBHOOK_SECRET`, `AI_ENCRYPTION_KEY` đã có
- ✅ `verify_jwt=false` cho `telegram-webhook` trong config.toml

**Frontend:**
- ✅ Stepper UI 3 bước, BotFather guide, QR code, copy link, auto-register webhook lần đầu
- ✅ Empty state "chờ admin", group binding instructions

## Gaps cần hoàn thiện

### 1. Reuse webhook secret khi user upsert lại bot
Trong `handleSave` của `TelegramBotConfigCard`, sau khi save **lần đầu** mới auto-register webhook. Nhưng nếu admin đổi token (rotate bot), webhook URL không đổi nhưng Telegram vẫn cần `setWebhook` lại với token mới → hiện không tự gọi. Auto-register **mỗi lần** upsert thành công (ko chỉ lần đầu) để đảm bảo webhook luôn live với token mới.

### 2. `default_autonomy_level` mặc định không reflect giá trị đã lưu
Khi card load `config` đã có, state local `autonomy` vẫn `'human_in_loop'` thay vì giá trị từ DB → admin update sẽ vô tình reset autonomy. Init từ `config.default_autonomy_level` qua `useEffect`.

### 3. Webhook URL hiển thị empty khi `VITE_SUPABASE_URL` không có
`webhookUrl = '${VITE_SUPABASE_URL ?? ''}/functions/v1/telegram-webhook/${secret}'` — nếu env trống sẽ ra `/functions/...` không hợp lệ. Sửa fallback dùng `https://<project_id>.supabase.co` (lấy từ `VITE_SUPABASE_PROJECT_ID`).

### 4. Hiển thị link bot cho user link nhanh
Khi `botReady`, ngoài "Tạo link kết nối", hiển thị thêm direct link `https://t.me/<bot_username>` để user có thể mở chat bot trước (xem bio). Cần lift `config.bot_username` xuống `TelegramLinkCard`.

### 5. UX nhỏ
- Sau khi unlink, `deeplink` state cũ vẫn còn → reset về null khi re-render (dùng `key` hoặc clear trong unlink callback).
- Group binding hiện tại không cho phép unlink từ UI → thêm nút "Gỡ group".
- `helpText()` trong webhook thiếu lệnh `/start` — bổ sung.

### 6. Validation
- `bot_username` không validate format (`*_bot`) → toast warning nếu không khớp regex `^[a-zA-Z0-9_]{5,32}$`.
- `bot_token` không validate format `^\d+:[A-Za-z0-9_-]{30,}$` → toast warning.

## Files cần sửa

| File | Thay đổi |
|---|---|
| `src/components/agents/TelegramBotConfigCard.tsx` | (a) auto-register webhook **mọi lần** save (không chỉ first); (b) init `autonomy` từ `config.default_autonomy_level` qua `useEffect`; (c) fallback `webhookUrl` dùng `VITE_SUPABASE_PROJECT_ID`; (d) validate username/token format trước khi save |
| `src/components/agents/TelegramLinkCard.tsx` | (a) nhận thêm prop `botUsername`; hiển thị link `https://t.me/<botUsername>` trong empty/connected state; (b) reset `deeplink` state sau unlink; (c) thêm nút unlink group |
| `src/pages/AgentTelegramPage.tsx` | Truyền `config?.bot_username` vào `TelegramLinkCard` |
| `src/hooks/useTelegramBinding.ts` | Thêm `unlinkGroup()` |
| `supabase/functions/telegram-webhook/index.ts` | Bổ sung `/start` (no token) trong `helpText()` để guide user mới |

## Kết quả
- Admin rotate token → webhook tự re-register, không cần bấm 2 lần
- Autonomy không bị reset khi update
- Webhook URL luôn hiển thị đúng dù env có/không có `VITE_SUPABASE_URL`
- User link nhanh: click thẳng `t.me/<bot>` để xem bot trước
- Group có thể gỡ link từ UI
- Validation sớm tránh lưu config sai format
