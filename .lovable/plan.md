

## Root cause
Có **2 vấn đề độc lập**:

### 1. UI hiển thị "Qwen Plus" nhưng DB không có row
Query DB (`SELECT … FROM ai_function_configs WHERE function_name='regenerate-carousel-caption'`) trả về **0 rows**. Logs edge function cũng xác nhận `source=default`. Nghĩa là user đã chọn Qwen Plus trên UI nhưng **chưa save thực sự** (hoặc save thất bại silently). Có thể user chỉ chọn dropdown rồi rời tab mà không nhấn nút "Lưu".

### 2. Edge function không hỗ trợ DashScope (kể cả khi save thành công)
`supabase/functions/regenerate-carousel-caption/index.ts` đang **hardcode** gọi `https://ai.gateway.lovable.dev` — gateway này CHỈ hỗ trợ `google/gemini-*`, `openai/gpt-5*`, `sonar`. Khi gọi với `qwen-plus`, sẽ bị reject (hoặc trả 402/400).

→ Phải refactor để dùng helper `callAI()` chung trong `_shared/ai-provider.ts`, helper này tự route sang `dashscope` endpoint khi model là `qwen-*` hoặc khi `force_provider='dashscope'`.

## Changes

### File: `supabase/functions/regenerate-carousel-caption/index.ts`
- Thay đoạn `fetch("https://ai.gateway.lovable.dev/...")` bằng `callAI()` từ `_shared/ai-provider.ts`.
- `callAI` tự động:
  - Đọc config (model + force_provider) từ DB.
  - Route đúng endpoint (lovable / dashscope / openrouter).
  - Đọc đúng API key (`DASHSCOPE_API_KEY` cho Qwen).
  - Xử lý 402/429 + circuit breaker.

```ts
import { callAI } from "../_shared/ai-provider.ts";

const result = await callAI({
  functionName: "regenerate-carousel-caption",
  organizationId: carousel.organization_id,
  messages: [
    { role: "system", content: "Bạn là chuyên gia copywriting…" },
    { role: "user", content: prompt },
  ],
  tools: [{ type: "function", function: { name: "regenerate_caption_cta", … } }],
  toolChoice: { type: "function", function: { name: "regenerate_caption_cta" } },
});

if (!result.success) {
  // map result.errorCode → 402/429/500 response
}
const toolCall = result.data?.choices?.[0]?.message?.tool_calls?.[0];
```

### Hướng dẫn user (sau khi fix code)
1. Vào `/admin/ai` → **Functions** → tìm `regenerate-carousel-caption`.
2. Click chọn model **Qwen Plus** → **bấm nút "Lưu"** (quan trọng!).
3. Chờ toast "Đã lưu cấu hình function" hiện lên.
4. Đợi ~60s (cache TTL) hoặc reload edge function.
5. Bấm "Tạo lại" trong carousel → log sẽ hiện `source=individual model=qwen-plus` và call sang DashScope.

⚠️ **Lưu ý:** cần đảm bảo `DASHSCOPE_API_KEY` đã có trong Supabase Secrets (memory đã ghi nhận tích hợp DashScope, nên thường có sẵn).

## Result
- Function chạy đúng provider user chọn (DashScope, OpenRouter, Lovable…).
- 402 "hết credits AI" sẽ không xảy ra nữa khi dùng Qwen vì gọi thẳng DashScope, không tốn credits Lovable.
- Tận dụng đầy đủ circuit breaker + retry + metrics tracking của `callAI`.

