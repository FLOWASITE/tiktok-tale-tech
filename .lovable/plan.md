# Vì sao "Gợi ý chủ đề" báo hết token dù đã set DeepSeek

## Root cause

`supabase/functions/topic-ai/index.ts` có **whitelist cứng** `TOPIC_AI_ALLOWED_MODELS` (dòng 119–140) chỉ chứa Lovable Gateway + Qwen/DashScope. **Không có DeepSeek**.

Khi bạn cấu hình model `deepseek-chat` / `deepseek-reasoner` cho function `topic-ai` (hoặc agent override), `sanitizeTopicAIModel()` coi nó là "unsupported" và **silently fallback** sang `google/gemini-2.5-flash` (xem `pickFallbackForModel`, dòng 156–161 — chỉ check prefix `qwen` / `openai/`).

Lỗi `DashScope error: 400` bạn thấy trong console là từ một lần request khác (model cũ vẫn là `qwen-*` và DashScope đang lỗi quota/payload) — không liên quan trực tiếp tới DeepSeek. Nhưng kết quả thực tế là: **request DeepSeek của bạn không bao giờ tới DeepSeek**, mà bị chuyển sang Gemini hoặc Qwen tùy override.

## Fix (3 chỗ, đều trong `topic-ai/index.ts`)

### 1. Thêm DeepSeek vào `TOPIC_AI_ALLOWED_MODELS`
```ts
// DeepSeek - direct
'deepseek-chat',
'deepseek-reasoner',
'deepseek-v4-flash',
'deepseek-v4-pro',
```

### 2. Thêm family fallback DeepSeek trong `pickFallbackForModel`
```ts
if (m.startsWith('deepseek')) return 'deepseek-chat';
```
→ Tránh trường hợp user chọn alias DeepSeek lạ bị đẩy về Gemini.

### 3. (Optional) Alias map cho tên cũ
Nếu trong UI có hiển thị `deepseek/deepseek-v3.2` (route OpenRouter cũ), không cần map — vẫn để OpenRouter handle. Chỉ cần whitelist prefix `deepseek-*` cho direct.

## Verify sau khi sửa

1. Mở `/multichannel/new` → trigger "Gợi ý chủ đề"
2. Check edge logs `topic-ai`: log dòng `[topic-ai] Remapped...` hoặc `Unsupported model...` phải **biến mất**
3. `ai_metrics` row mới nhất cho `function_name='topic-ai'` phải có `provider='deepseek'` và `model='deepseek-chat'`

## Không đụng tới

- `_shared/ai-provider.ts` — DeepSeek routing đã hoạt động ổn
- DB schema, RLS
- Lỗi DashScope 400 song song (sẽ tự hết khi user chuyển sang DeepSeek; nếu vẫn lỗi sau đó sẽ debug riêng)

## Scope

1 file, ~6 dòng. Không cần migration, không cần deploy thủ công (auto qua Lovable Cloud khi commit).
