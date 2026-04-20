

## Mục tiêu
Cho phép user **chat tự nhiên** trên Telegram (không cần gõ `/generate ...`). Bot tự hiểu intent → trả lời / tạo campaign / báo quota.

## Cách tiếp cận

Khi nhận tin text **không bắt đầu bằng `/`** trong DM với binding hợp lệ:

1. **Intent classification** bằng 1 lần gọi Lovable AI Gateway (`google/gemini-2.5-flash` — rẻ, nhanh):
   - `chitchat` → reply tự nhiên (giải đáp về Flowa, hỏi đáp marketing)
   - `generate_campaign` → trích `prompt`, tự gọi luồng `/generate` hiện có
   - `status` → tự gọi `handleStatus`
   - `help` → reply danh sách lệnh (vẫn giữ ngôn ngữ tự nhiên)

2. **Conversation memory** ngắn: lấy 6 message gần nhất từ bảng mới `telegram_messages_log` (chat_id + role + content + created_at) để feed vào system prompt → bot có context multi-turn.

3. **Typing indicator**: gửi `sendChatAction(typing)` trước khi gọi AI để UX mượt.

4. **Fallback**: nếu intent classifier fail → reply chitchat mặc định, không bao giờ im lặng.

## Files thay đổi

| File | Thay đổi |
|---|---|
| `supabase/migrations/<new>` | Tạo bảng `telegram_messages_log` (id, organization_id, chat_id, user_id nullable, role: 'user'\|'assistant', content, created_at) + index + RLS service-role only |
| `supabase/functions/_shared/telegram-client.ts` | Thêm helper `sendChatAction()` |
| `supabase/functions/_shared/telegram-intent.ts` (mới) | `classifyIntent(text, history)` gọi Lovable AI → `{ intent, prompt?, reply? }` |
| `supabase/functions/telegram-webhook/index.ts` | Trong `default:` branch của switch (DM only): gọi `handleFreeChat()` thay vì reply "Lệnh không hợp lệ". Hàm mới: log message → classify → route → log assistant reply |
| `src/components/agents/TelegramLinkCard.tsx` | Cập nhật helper text: "Đã link xong, bạn có thể chat tự nhiên với bot — không cần gõ lệnh." |
| `src/pages/AgentTelegramPage.tsx` | Đổi 1 dòng tagline: "Chat tự nhiên với AI Agent từ Telegram." |

## Luồng kỹ thuật

```text
User text (DM, no /) → log user msg
    → fetch last 6 msgs (history)
    → sendChatAction("typing")
    → classifyIntent(text, history) [Gemini Flash, ~500ms]
        ├─ chitchat   → reply.text → sendMessage + log assistant
        ├─ generate   → handleGenerate(prompt) (reuse existing)
        ├─ status     → handleStatus (reuse)
        └─ unknown    → fallback chitchat
```

## Bảo vệ
- **Group chat**: không bật free chat (giữ command-only, tránh spam quota nhiều người trong group).
- **Rate limit**: tận dụng `assertCanCreateGoal` đã có cho intent `generate_campaign`. Chitchat không tốn quota pipeline nhưng count vào AI gateway tự nhiên.
- **Prompt injection**: system prompt clamp role bot, refuse khi user yêu cầu lộ token/secret.

## Kết quả
- User gõ "tạo cho tôi campaign về spa làm đẹp" → bot hiểu, chạy pipeline ngay.
- User gõ "quota tháng này còn bao nhiêu?" → bot trả status.
- User gõ "Flowa làm gì?" → bot chitchat giải thích.
- Không cần học lệnh `/`. Lệnh `/` vẫn hoạt động cho power user.

