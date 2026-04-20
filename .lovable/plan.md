
## Kết luận nhanh

Bot Telegram vẫn báo "Hệ thống quá tải" vì free-chat hiện đang rơi vào fallback `credits_exhausted`, và em đã xác định được 2 nguyên nhân rõ ràng từ code + logs:

1. **Function đang chạy ngoài production chưa nhận bản fix model mới**
   - Log mới nhất của `telegram-webhook` cho thấy:
     - `telegram-intent: resolved model=google/gemini-2.5-flash source=default`
     - `Primary provider: lovable`
     - `Lovable Gateway error: 402`
   - Trong code hiện tại, `telegram-intent` đã có config riêng và đã được thêm vào nhóm text override.
   - Việc log vẫn ra `source=default` cho thấy **bundle đang deploy là bản cũ / deploy trước đó bị kẹt timeout**, nên chưa dùng `qwen-plus`.

2. **Ngay cả khi deploy bản mới, nhánh DashScope vẫn đang có bug**
   - `callAI()` có decrypt được API key từ `ai_provider_configs`.
   - Nhưng khi vào case `dashscope`, code lại gọi `callDashScope(...)` mà hàm này **không dùng API key đã decrypt**, nó chỉ đọc `Deno.env.get("DASHSCOPE_API_KEY")`.
   - DB hiện có `ai_provider_configs` cho `dashscope` với `has_encrypted_key=true`, nên key nằm trong DB chứ không chắc có trong env.
   - Kết quả: provider DashScope có thể vẫn không chạy đúng dù model đã route sang `qwen-plus`.

## Plan fix

### Bước 1 — Fix đúng nhánh DashScope trong shared AI provider
Sửa `supabase/functions/_shared/ai-provider.ts` để:
- `callDashScope()` nhận `apiKey` như OpenAI/OpenRouter path
- Khi có `providerConfig` + decrypt được key, dùng **chính key đó** để gọi DashScope
- Chỉ fallback sang `DASHSCOPE_API_KEY` env nếu không có key trong DB

### Bước 2 — Đảm bảo `telegram-intent` thật sự được xếp vào text group override
Rà lại và giữ nhất quán trong `supabase/functions/_shared/ai-config.ts`:
- `telegram-intent` phải nằm trong `DEFAULT_CONFIGS`
- `telegram-intent` phải nằm trong `textFunctions`
- Log phải ra dạng:
  - `using group override model=qwen-plus`
  - `resolved model=qwen-plus source=group`

### Bước 3 — Triển khai lại edge function theo hướng tránh stale bundle
Vì trước đó đã có lỗi `Bundle generation timed out`, em sẽ:
- deploy lại function sau khi sửa
- nếu còn timeout, tách phần Telegram free-chat hoặc giảm dependency nặng để bundle `telegram-webhook` build ổn định hơn
- ưu tiên giữ logic Telegram chạy được trước, không để phụ thuộc vào bundle cũ

### Bước 4 — Verify end-to-end bằng logs thực tế
Sau deploy cần kiểm tra lại log `telegram-webhook`:
- mong đợi:
  - `resolved model=qwen-plus source=group`
  - `Primary provider: dashscope`
  - `Using user's dashscope API key`
- không còn:
  - `Primary provider: lovable`
  - `Lovable Gateway error: 402`

### Bước 5 — Test hành vi user
Test 3 case trong DM Telegram:
- `"hello flowa"` → bot chitchat bình thường
- `"quota tháng này còn bao nhiêu"` → route `status`
- `"tạo campaign cho spa trẻ hóa da"` → route `generate_campaign`

## Files sẽ đụng tới

- `supabase/functions/_shared/ai-provider.ts`
- `supabase/functions/_shared/ai-config.ts` (chỉ nếu cần đồng bộ thêm)
- có thể thêm 1 test nhỏ cho route DashScope nếu repo đã có pattern test edge/shared

## Technical details

```text
Current runtime behavior
telegram-intent
  -> model=google/gemini-2.5-flash
  -> provider=lovable
  -> 402 not enough credits
  -> bot sends overload message

Expected fixed behavior
telegram-intent
  -> model=qwen-plus
  -> provider=dashscope
  -> uses org encrypted API key from ai_provider_configs
  -> normal Telegram free-chat response
```

## Mức độ ưu tiên

- Đây là **bug backend/provider-routing**, không phải lỗi prompt.
- Ưu tiên fix **ai-provider DashScope key path** trước, vì đó là root cause bền vững.
- Sau đó redeploy và xác minh logs để chắc bot không còn bám vào Lovable AI credits nữa.
