
## Vấn đề
User nhắn tin Telegram không phản hồi. Log webhook chỉ có 1 request lúc 05:29:39 (200 OK, 648ms) — sau đó im lặng → **Telegram không gửi update tiếp** đến webhook của ta.

## Nguyên nhân khả nghi (xếp theo xác suất)

### 1. Webhook URL bị "pending updates" hoặc `last_error` (cao nhất)
Telegram lưu `last_error_message` trong webhook info. Nếu trước đó webhook trả lỗi (như khi `TELEGRAM_WEBHOOK_SECRET` chưa cấu hình → 500), Telegram có thể đã backoff. Cần gọi `getWebhookInfo` để xem trạng thái thực tế.

### 2. `verify_jwt` cho path động
`telegram-webhook/<secret>` là sub-path. Nếu Supabase routing không match function khi có path segment phía sau, request sẽ bị reject 401 ở edge gateway TRƯỚC khi vào code. Nhưng log cho thấy 1 request đã vào được → routing OK lần đó. Cần verify với `getWebhookInfo` xem `pending_update_count` có > 0 không.

### 3. Default handler chỉ reply khi `chatType === "private"`
Trường hợp user nhắn trong group → bot im lặng theo design. Nhưng user đang ở DM (đã link thành công) → không phải case này.

## Hành động (theo thứ tự)

### Bước 1: Thêm action `webhook_info` vào `telegram-bot-admin` để debug
Gọi `getWebhookInfo` từ Telegram, trả về:
- `url` hiện tại
- `pending_update_count`
- `last_error_date` + `last_error_message`
- `max_connections`
- `allowed_updates`

Hiển thị info này trong UI accordion "Cài đặt nâng cao" — giúp user tự thấy vấn đề.

### Bước 2: Auto-clear pending updates khi re-register
Khi gọi `setWebhook`, thêm flag `drop_pending_updates: true` (chỉ khi user chủ động bấm "Đăng ký lại") để clear backlog gây kẹt.

### Bước 3: Cải thiện logging trong webhook handler
- Log mỗi update_id + chatType + command để debug được luồng "tới mà không phản hồi".
- Log warning rõ ràng khi message không phải text (sticker, photo) → user gửi sticker không hiểu sao bot im.

### Bước 4: Fallback message thân thiện hơn
- Khi message không phải text (photo/sticker/voice) trong DM: reply hướng dẫn "Hiện bot chỉ hiểu tin nhắn text. Gõ /help".
- Khi command lạ trong group: im lặng (giữ nguyên, đúng design).

## Files sửa

| File | Thay đổi |
|---|---|
| `supabase/functions/telegram-bot-admin/index.ts` | Thêm action `webhook_info` (gọi `getWebhookInfo`) + `drop_pending_updates` khi register |
| `supabase/functions/_shared/telegram-client.ts` | Thêm helper `getWebhookInfo()` + sửa `setWebhook` nhận `dropPending` param |
| `supabase/functions/telegram-webhook/index.ts` | Log chi tiết hơn (chatType, command, hasText); reply khi nhận non-text trong DM |
| `src/hooks/useTelegramBotConfig.ts` | Thêm `getWebhookInfo()` callback |
| `src/components/agents/TelegramBotConfigCard.tsx` | Trong accordion "Cài đặt nâng cao": nút "Kiểm tra trạng thái webhook" hiển thị URL + pending count + last error |

## Kết quả
- User tự debug được: nếu thấy `pending_update_count > 0` hoặc `last_error_message` → biết phải bấm "Đăng ký lại"
- Re-register sẽ tự clear backlog kẹt
- Log webhook giúp em debug nhanh khi user report tiếp
- Bot không "im lặng bí ẩn" khi nhận sticker/photo
