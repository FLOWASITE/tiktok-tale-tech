

# Điều tra "Telegram báo mất kết nối nhưng UI vẫn xanh"

## Tình trạng DB (đã verify)

```
profiles:                 flowasite@gmail.com → user c618b2dc...
organization_members:     2 orgs (Flowa owner, cTY zxx owner)
telegram_chat_bindings:   1 row, is_active=true, org=Flowa,
                          chat_id=8002956073, last_command_at=06:51 hôm nay
telegram_bot_configs:     1 default bot Flowa123bot, is_active=true
```

→ **DB nói: Đã kết nối.** UI hiển thị "Đã kết nối" là **đúng dữ liệu**.

→ Mismatch nằm ở phía **bot Telegram trả lời sai** ("Chưa kết nối") chứ không phải UI sai.

## Các nguyên nhân có thể (theo xác suất)

### 1. Rate limit free chat bị nhầm với "mất kết nối" (cao)
`telegram-webhook` line 1940-1949: nếu user vượt `FREE_CHAT_LIMIT` tin/giờ, bot trả: `⏳ Bạn đã đạt giới hạn… Thử lại sau ~N phút`. User có thể hiểu nhầm = "mất kết nối".

### 2. Default-bot rehydrate chọn nhầm org (thấp nhưng có rủi ro)
`telegram-webhook` line 271-288: khi `organizationId=NULL` (default bot), code lookup binding theo `telegram_user_id`, `.order(linked_at desc).limit(1)`. Hiện user chỉ có 1 binding nên OK. Nhưng nếu user **/start lại từ org khác** (cTY zxx) trong tương lai, binding mới sẽ override binding Flowa → bot route về cTY zxx, web đang chọn Flowa → mismatch.

### 3. `lookupUserBinding` không filter `chat_type='private'` (thấp)
Line 1863-1869: query `telegram_chat_id = chatId AND organization_id = X AND is_active=true` — nếu chatId trùng giữa private DM và group, có thể trả nhầm row. Hiện DB không có conflict nhưng là rủi ro thiết kế.

### 4. Token Telegram bot bị rotate / Flowa123bot offline (rất thấp)
Cần check edge function logs — nếu bot không nhận webhook update nào suốt session đó.

## Cần xác nhận từ user

Trước khi fix, tôi cần biết **bot trả lời chính xác câu gì** trong Telegram:

- (a) `👋 Chưa kết nối. Mở https://app.flowa.one/agents/telegram…` → nguyên nhân #2 hoặc #3 (rehydrate/lookup miss)
- (b) `⏳ Bạn đã đạt giới hạn N tin chat AI/giờ…` → nguyên nhân #1 (rate limit, không phải kết nối)
- (c) `Chưa kết nối. /start trong DM trước.` → nguyên nhân #3 (lookupUserBinding miss trên 1 handler cụ thể)
- (d) Bot không trả lời gì cả → token / webhook delivery issue

## Hành động kế tiếp

**Bước 1 (ngay):** Hỏi user screenshot/nội dung chính xác bot trả về.

**Bước 2 (sau khi xác định):** Tùy nguyên nhân:

| Nguyên nhân | Fix |
|---|---|
| (a) Rehydrate org mismatch | Trong rehydrate (line 271-288), prefer binding của org user **đang active trên web** (lưu `last_active_org` vào `telegram_chat_bindings` hoặc query `organization_members` ưu tiên owner role + most recent activity). Hoặc đơn giản: nếu chỉ có 1 active binding cho `telegram_user_id` thì dùng nó (đã đúng); nếu nhiều thì gửi inline keyboard cho user chọn org. |
| (b) Rate limit | Đổi message rate-limit cho rõ ràng hơn (đã rõ rồi), hoặc tăng limit cho user free. Confirm với user. |
| (c) `lookupUserBinding` miss | Thêm filter `.eq('chat_type','private')` cho DM lookup; thêm fallback lookup theo `telegram_user_id` nếu chat_id miss (group chat case). |
| (d) Webhook delivery | Check `edge_function_logs` cho `telegram-webhook` trong khung giờ user test. |

**Bước 3:** Thêm diagnostic logging chi tiết: log `binding lookup result` (organization_id, found?, resolved_by) ở mỗi handler để tracing tương lai.

## Files có thể sửa (sau khi xác định nguyên nhân)

| File | Thay đổi tiềm năng |
|---|---|
| `supabase/functions/telegram-webhook/index.ts` | Sửa rehydrate logic / lookupUserBinding filter / log chi tiết hơn |
| `src/pages/AgentChannelHubPage.tsx` | (Nếu cần) thêm tooltip giải thích "Đã kết nối nghĩa là binding DB còn — nếu bot không phản hồi đúng, dùng /start lại" |

## Rủi ro
Trung bình. Sửa rehydrate / lookup logic có thể ảnh hưởng tất cả user dùng default bot — phải test kỹ multi-org case.

