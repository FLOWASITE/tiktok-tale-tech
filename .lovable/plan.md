

## Vấn đề
Free chat Telegram không hoạt động vì **Lovable AI Gateway hết credits (402)**. Khi `classifyIntent` fail, hàm `fallback()` trả `chitchat` + reply mặc định — nhưng có 2 vấn đề:

1. **Không có route reply chitchat trong webhook** → cần verify `handleFreeChat` thật sự gọi `sendMessage` với `result.reply` khi gateway lỗi
2. **Không có fallback provider**: Khi Lovable Gateway 402, bot im lặng hoàn toàn với user (chỉ có log lỗi). User không biết tại sao bot không trả lời.
3. **Không tận dụng DashScope user key**: Org này có `qwen-plus` qua DashScope key riêng (không tốn Lovable credits) — nhưng `telegram-intent.ts` hardcode gọi Lovable Gateway only.

## Giải pháp (3 layer)

### Layer 1 — Dùng `ai-provider` shared module
Thay vì hardcode `fetch("https://ai.gateway.lovable.dev/...")`, refactor `telegram-intent.ts` để dùng shared `ai-provider.ts` — tự động:
- Ưu tiên DashScope (qwen-plus) nếu org có key → **không tốn Lovable credit**
- Fallback Lovable Gateway nếu DashScope fail
- Fallback model rẻ hơn nếu primary 402

### Layer 2 — User-facing error message khi AI fail
Trong `handleFreeChat`, nếu `classifyIntent` trả intent `chitchat` + reply mặc định **DO error**, gửi message rõ ràng:
> "🤖 Bot tạm thời quá tải, thử lại sau ít phút nhé. Hoặc dùng lệnh `/generate <mô tả>` / `/status` để tránh delay."

Phân biệt 2 trường hợp:
- Classify OK + intent=chitchat → reply tự nhiên như cũ
- Classify FAIL (gateway error) → reply error message + gợi ý dùng `/` command

### Layer 3 — Cảnh báo admin
Log structured warning `[telegram-intent] CREDITS_EXHAUSTED org=<id>` để dashboard analytics có thể alert.

## Files thay đổi

| File | Thay đổi |
|---|---|
| `supabase/functions/_shared/telegram-intent.ts` | Refactor `classifyIntent()` dùng `getAIProvider()` từ `ai-provider.ts` thay vì hardcode fetch. Thêm `organizationId` param. Trả thêm field `error: 'credits_exhausted' \| 'unknown'` khi fail. |
| `supabase/functions/telegram-webhook/index.ts` | Trong `handleFreeChat`: pass `org_id` vào `classifyIntent`. Khi `result.error === 'credits_exhausted'` → gửi message thân thiện gợi ý dùng `/` command thay vì im lặng. |

## Kết quả
- Org có DashScope key (như org hiện tại) → bot dùng qwen-plus, **không tốn Lovable credit**, chat tự nhiên hoạt động ngay
- Org không có key + Lovable hết credit → bot báo rõ "tạm quá tải, dùng lệnh /" thay vì im lặng
- Lệnh `/generate`, `/status`, `/help` vẫn luôn hoạt động (không qua intent classifier)

