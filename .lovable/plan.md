# P2 — Telegram Bot ↔ GoalWizard Parity (UX & Lifecycle)

Sau P0 (multi-objective + AI channel pick) và P1 (topic pool + persona + approval_mode), P2 đóng nốt các gap về **brand selection, scheduling, lifecycle notification, regenerate** — để user dùng Telegram chạy campaign gần như đầy đủ như web.

## Scope

### P2.1 — Brand selector (multi-brand)
GoalWizard cho user chọn `brand_template_id`. Telegram hiện chỉ lấy brand mặc định của org → user có 3 brand không chọn được brand B/C qua bot.

- **Lệnh mới:** `/brands` list brands của org (call `brand_templates` filter `organization_id`), inline keyboard `🎨 {name}` → callback `brand:set:<id>`
- **Persist:** lưu `active_brand_id` vào `telegram_bindings.metadata.active_brand_id` (cột JSONB đã có)
- **Auto-resolve trong `/generate`:** `getBrandContextById(metadata.active_brand_id ?? defaultBrand)`
- **UI feedback:** sau khi pick, reply "✅ Brand hiện tại: {name}" + show domain/industry

### P2.2 — Schedule picker
GoalWizard có `start_date` + `time_of_day`. Telegram hiện hardcode `start_date = now()`.

- **2-step flow trong `/generate` (sau khi pick approval_mode):**
  - Hỏi "Bắt đầu khi nào?" → inline keyboard: `🚀 Ngay`, `📅 Hôm nay 9h`, `📅 Mai 9h`, `⚙️ Tự nhập`
  - Callback `gen:when:now|today9|tmr9|custom`; nếu `custom` → reply `📝 Gửi giờ dạng "2025-05-20 14:30"` + đợi text message tiếp theo, parse bằng `Date.parse` + validate `> now()`
- **Persist:** lưu vào `agent_goals.start_date` + `clarification_context.time_of_day`

### P2.3 — Pipeline lifecycle notifications
Hiện bot chỉ phản hồi tại `/generate`. Khi pipeline chạy 5-15 phút, user không biết gì.

- **Trigger:** `agent-pipeline` (sync + async branch) sau khi update `agent_goals.status` → check `goal.clarification_context.telegram_notify` (set sẵn khi tạo từ Telegram), nếu có thì gọi `supabase.functions.invoke("telegram-notify", { chatId, goalId, event })`
- **Event types:** `started`, `strategy_ready`, `content_ready`, `awaiting_approval`, `published`, `failed`
- **New edge function `telegram-notify`:** load `telegram_bindings` theo `chatId`, format message theo event, gửi qua connector gateway. Inline buttons cho `awaiting_approval`: `✅ Approve`, `📝 Xem chi tiết` (deep-link `app.flowa.one/agents?goal=<id>`)
- **Idempotent:** insert log row `telegram_notifications(goal_id, event, sent_at)` UNIQUE `(goal_id, event)` để tránh double-send khi pipeline retry

### P2.4 — Regenerate / cancel / status
GoalWizard có nút regenerate + cancel goal. Telegram chỉ có `/generate`.

- **`/status [goal_id?]`:** show `agent_goals` gần nhất của user (limit 5) — title + status badge + progress % + link
- **`/cancel <goal_id>`:** update `agent_goals.status = 'cancelled'`, abort pipeline (đã có abort signal trong agent-pipeline)
- **`/regenerate <goal_id>`:** clone `clarification_context` của goal cũ → tạo goal mới với cùng objectives/topic_pool/channels, reset `start_date = now()`

## Files
- **Edit:** `supabase/functions/telegram-webhook/index.ts` (lệnh mới + callback handlers + schedule flow)
- **Edit:** `supabase/functions/agent-pipeline/index.ts` (fire telegram-notify ở các transition điểm)
- **New:** `supabase/functions/telegram-notify/index.ts` (notify dispatcher, verify_jwt=false, dùng service role + connector gateway)
- **New migration:** `telegram_notifications` table (goal_id uuid, event text, sent_at timestamptz, PK composite); add column `telegram_bindings.metadata` nếu chưa có (đã có theo P1)
- **Update `supabase/config.toml`:** `[functions.telegram-notify] verify_jwt = false`

## Technical notes
- **Schedule timezone:** parse theo `Asia/Ho_Chi_Minh` (default), store UTC trong `start_date`
- **Brand list pagination:** nếu >10 brands chia 2 keyboard rows; >20 thì page navigation (`brand:page:2`)
- **Custom-time text capture:** dùng in-memory `Map<chatId, {waitingFor: 'custom_time', draftId}>` TTL 5min (giống P1 draft pattern); cleanup khi nhận message hoặc timeout
- **Notification dedup:** `INSERT ... ON CONFLICT DO NOTHING RETURNING id`, chỉ send Telegram nếu trả về row
- **Cancel race:** `cancel` check `status IN ('pending','running')` trước update; trả lỗi nếu đã `completed`/`failed`
- **Regenerate quota:** vẫn check `tier_limits` trước khi tạo goal mới (tận dụng helper sẵn có)

## Out of scope (defer to P3)
- Image preview inline trong Telegram (cần upload qua `sendPhoto` + signed URL)
- Voice command (Telegram voice → Whisper STT)
- Multi-user collab (assign goal cho teammate qua bot)
- Inline editing approved content trước publish
