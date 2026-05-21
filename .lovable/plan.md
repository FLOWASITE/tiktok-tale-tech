## Mục tiêu
Đảm bảo **mọi edge function dùng đúng model do user/admin cài đặt** — không bị silent fallback sang Lovable Gateway gemini, không bị whitelist chặn provider mới, không bị stale deploy do syntax bug.

## Phát hiện sau khi rà soát

### A. Bug ngay trước đó (đã fix turn vừa rồi)
`generate-multichannel/index.ts` line 80-81 có import bị chèn lồng → function không deploy được bản mới suốt nhiều ngày → mapping `deepseek-v4` không có hiệu lực ở runtime → mọi DeepSeek model bị route sang Lovable Gateway → "invalid model 400".

### B. 3 lỗ hổng hệ thống chưa fix

**B1. Circuit-breaker fallback bỏ provider family** (`_shared/circuit-breaker.ts` line 46-67, 70)
- `FALLBACK_MODELS` chỉ có entries cho `qwen/*`, `deepseek/*` (OpenRouter), `anthropic/*`, `google/gemini-*`, `openai/gpt-*`.
- **Thiếu**: `deepseek-chat`, `deepseek-reasoner`, `deepseek-v4-flash`, `deepseek-v4-pro`, `qwen-plus`, `qwen-max`, `qwen-turbo`, `qwen-flash`, `qwen-long`, `qwen-vl-*`, `9router/*`.
- `DEFAULT_FALLBACK = 'google/gemini-2.5-flash'` → khi circuit OPEN cho model DeepSeek direct → silent switch sang Lovable Gateway, hỏng intent của user (đã thấy trong logs: `[circuit-breaker] deepseek-v4-flash circuit OPEN, using fallback: google/gemini-2.5-flash`).

**B2. ai-provider sau khi fallback không cập nhật provider**
Khi circuit-breaker đổi model → `effectiveModel` đổi nhưng `primaryProvider` đã được tính từ `forceProvider || getProviderFromModel(effectiveModel)`. Nếu fallback từ `deepseek-v4-flash` → `google/gemini-2.5-flash`, sau đó dòng `getProviderFromModel(effectiveModel)` resolve thành `lovable` → OK. Nhưng vẫn không tôn trọng family.

**B3. topic-ai whitelist không sync với master MODEL_TO_PROVIDER**
`topic-ai/index.ts` có set riêng `TOPIC_AI_ALLOWED_MODELS`. Mỗi khi thêm model mới (vd `google/gemini-3.5-flash`, `9router/*`) phải update 2 chỗ. Hiện thiếu: `google/gemini-3.1-flash-lite-preview` (chỉ là alias map), `google/gemini-3.5-flash`, `openai/gpt-5.4*`, `openai/gpt-5.5*`, `9router/*`. → user set model mới trong Admin → topic-ai âm thầm chuyển về fallback.

### C. Nguy cơ stale deploy ẩn
Không tìm thấy nested-import nào khác (đã scan 251 functions). Nhưng để chắc, plan có 1 bước "deploy probe" gọi 1 endpoint nhẹ trên mỗi nhóm function quan trọng để verify chúng đang chạy bản mới.

## Plan triển khai

### Bước 1 — Family-aware circuit-breaker fallback
File: `_shared/circuit-breaker.ts`
- Bổ sung entries vào `FALLBACK_MODELS`:
  - DeepSeek direct: `deepseek-v4-flash → deepseek-chat`, `deepseek-v4-pro → deepseek-reasoner`, `deepseek-reasoner → deepseek-chat`, `deepseek-chat → google/gemini-2.5-flash` (chỉ khi DeepSeek hoàn toàn down).
  - DashScope: `qwen-max → qwen-plus`, `qwen-plus → qwen-flash`, `qwen-turbo → qwen-flash`, `qwen-flash → google/gemini-2.5-flash`.
- Đổi `getFallbackModel`: nếu model match prefix `deepseek-` hoặc `qwen-` mà không có entry → trả về sibling cùng family (`deepseek-chat`/`qwen-plus`) thay vì `DEFAULT_FALLBACK`.

### Bước 2 — Đồng bộ topic-ai whitelist với MODEL_TO_PROVIDER
File: `topic-ai/index.ts`
- Bổ sung: `google/gemini-3.5-flash`, `google/gemini-3.1-pro-preview`, `google/gemini-3.1-flash-lite-preview`, `openai/gpt-5.4`, `openai/gpt-5.4-mini`, `openai/gpt-5.4-nano`, `openai/gpt-5.4-pro`, `openai/gpt-5.5`, `openai/gpt-5.5-pro`, `9router/*` (allow-by-prefix check).
- Thêm guard: nếu model bắt đầu `9router/` hoặc `deepseek/` → cho qua (không cần liệt kê hết).

### Bước 3 — Hardening ai-provider khi Lovable Gateway 402
File: `_shared/ai-provider.ts`
- Trong Self-Critique / refine tier-2 fallback: nếu fallback gặp 402 → return success=false **mà không throw**, để caller mark "needs_review" thay vì kill toàn job.
- Thêm log `[ai-provider] BLOCKED: model X routed to lovable but not Lovable-compatible — check MODEL_TO_PROVIDER` để dễ debug lần sau.

### Bước 4 — Deploy probe + verify
- Redeploy 1 lượt nhóm function "AI-heavy" để đảm bảo không có function nào còn stale: `generate-multichannel`, `generate-script`, `generate-carousel`, `generate-ad-copy`, `generate-hooks`, `topic-ai`, `critique-content`, `refine-content`, `chat-conversations`, `enrich-industry-profiles`, `keyword-research-v2`.
- Sau khi deploy xong, curl test `topic-ai` với DeepSeek model và check logs phải có `Primary provider: deepseek`.

### Bước 5 — UX banner khi content rỗng (đã đề xuất turn trước, vẫn cần)
File: viewer multichannel result
- Nếu `multi_channel_contents` row có tất cả channel = NULL → hiển thị banner đỏ "Tạo thất bại — model `<X>` không khả dụng. Đổi model trong Admin > AI Models hoặc Retry" + nút Retry trigger lại generation cùng input.

## Files đụng tới
- `supabase/functions/_shared/circuit-breaker.ts` (Bước 1)
- `supabase/functions/topic-ai/index.ts` (Bước 2)
- `supabase/functions/_shared/ai-provider.ts` (Bước 3)
- 1 component multichannel result viewer (Bước 5)
- Redeploy 11 functions (Bước 4)

## Không làm
- Không sửa MODEL_TO_PROVIDER map (đã đúng từ commit DeepSeek Direct).
- Không touch DB schema/RLS.
- Không sửa client.ts / types.ts.
- Không loại bỏ Lovable Gateway last-resort fallback (cần để hệ thống vẫn chạy khi user key chết hoàn toàn) — chỉ làm cho nó family-aware trước.

## Verify sau implement
1. `[circuit-breaker] deepseek-v4-flash circuit OPEN, using fallback: deepseek-chat` (không phải gemini).
2. `topic-ai` chạy với model `9router/glm-4.6` không bị log "Unsupported model".
3. `generate-multichannel` 0/3 channels lỗi → frontend hiện banner đỏ, không phải màn trắng.

Approve để mình triển khai theo thứ tự 1 → 2 → 3 → 4 → 5.
