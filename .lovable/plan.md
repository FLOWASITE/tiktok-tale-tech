

# Hoàn thiện Telegram Bot — P0 (hardening) + P1 (UX polish)

## P0 — Production hardening

### 1. Idempotency cho `update_id`
- Tạo bảng `telegram_processed_updates(update_id BIGINT PK, chat_id, processed_at)` với TTL 24h (cron cleanup mỗi giờ).
- Trong `telegram-webhook/index.ts`: ngay đầu handler, check `update_id` đã xử lý chưa → nếu có → return 200 "duplicate skipped" (không chạy AI lại).
- Insert bản ghi mới ngay sau khi authenticate webhook secret thành công.
- Lý do: Telegram retry webhook nếu response >10s → tránh tạo campaign trùng + đốt quota.

### 2. Error UX chuẩn hóa
- Tạo helper `safeReply(chatId, traceId, fn)` trong `telegram-webhook/index.ts`:
  - Wrap mọi command handler trong `try/catch`
  - Catch error → `sendMessage(chatId, "⚠️ Có lỗi rồi, thử lại sau nhé. (mã: <traceId.slice(0,8)>)")`
  - Log full error + traceId vào console
- Áp dụng cho: `/generate`, `/status`, `/campaigns`, `/brand`, free-chat handler.

### 3. ~~Rate limit~~ — **bỏ** 
Per system policy, backend chưa có primitive cho rate limiting. Skip mục này, sẽ làm sau khi infrastructure sẵn sàng.

## P1 — UX polish

### 4. Push notification khi pipeline xong
- Tạo edge function mới `notify-telegram` (verify_jwt=false, gọi từ pipeline service-role):
  - Input: `{ user_id, organization_id, campaign_id, status: 'completed'|'failed', summary }`
  - Query `telegram_chat_bindings` lấy `chat_id` → `sendMessage` với inline button "Xem chi tiết" / "Duyệt"
- Hook vào nơi pipeline complete (tìm trong `agent-orchestrator` / `agent-pipeline-runner` — gọi sau khi update status='completed').
- Message format: "✅ Campaign **<title>** đã hoàn thành — [Xem](app.flowa.one/campaigns/<id>)"

### 5. Group mention handling
- Trong `telegram-webhook`: detect `message.chat.type` = `group`/`supergroup`
- Nếu group → chỉ respond khi:
  - `message.entities` có `mention` với `@<bot_username>`, HOẶC
  - `message.reply_to_message.from.username` = bot
  - HOẶC là command (`/...`)
- Còn lại → return 200 không reply (tránh noisy).

### 6. `/cancel` command
- Bot thêm command `/cancel` vào `BOT_COMMANDS` (sync menu)
- Handler: tìm `agent_pipelines` của user có `status IN ('pending','running')` trong 1h gần nhất → update `status='cancelled'`
- Reply: "🚫 Đã hủy <N> pipeline đang chạy." (hoặc "Không có pipeline nào đang chạy.")

### 7. Inline button cho `/campaigns`
- Sửa `/campaigns` handler: thay vì list text plain, gửi message với `reply_markup.inline_keyboard`
- Mỗi campaign 1 row 2 nút: `[👁 Xem chi tiết]` (callback `view_campaign:<id>`) + `[✓ Duyệt]` (chỉ hiện nếu `status='pending_approval'`, callback `approve:<id>`)
- Reuse callback handler đã có cho approve/reject.

## Files thay đổi

| File | Thay đổi |
|---|---|
| **Migration mới** | `telegram_processed_updates` table + cleanup cron |
| `supabase/functions/telegram-webhook/index.ts` | Idempotency check, `safeReply` wrapper, group mention filter, `/cancel` handler, inline buttons cho `/campaigns` |
| `supabase/functions/_shared/telegram-client.ts` | Update `BOT_COMMANDS` thêm `/cancel`; helper `buildCampaignInlineKeyboard` |
| `supabase/functions/notify-telegram/index.ts` | **NEW** — edge function nhận trigger từ pipeline, gửi push tới Telegram |
| `supabase/functions/agent-orchestrator/*` (or pipeline runner) | Hook gọi `notify-telegram` sau khi pipeline complete/fail |
| `supabase/config.toml` | Khai báo `notify-telegram` (verify_jwt=false, gọi qua service role) |

## Test sau khi triển khai
1. **Idempotency**: gửi cùng `update_id` 2 lần (curl giả lập) → chỉ xử lý 1 lần
2. **Error UX**: làm `/generate` fail (gõ prompt rỗng) → nhận message "⚠️ Có lỗi rồi…" thay vì silence
3. **Push notification**: tạo campaign từ Telegram → đợi pipeline xong → nhận push "✅ Campaign X đã hoàn thành"
4. **Group**: thêm bot vào 1 group → gửi msg thường (không mention) → bot không reply; mention `@bot` → bot reply
5. **/cancel**: chạy `/generate`, ngay sau gõ `/cancel` → pipeline status = cancelled
6. **/campaigns**: gõ `/campaigns` → thấy list kèm nút bấm; click "Duyệt" → approve thành công

## Ước tính
- P0: ~1h (idempotency + error wrapper)
- P1: ~3h (notify hook là phần phức tạp nhất, cần tìm đúng entry point trong pipeline)
- **Tổng: ~4h**, deploy 1 lần cuối.

