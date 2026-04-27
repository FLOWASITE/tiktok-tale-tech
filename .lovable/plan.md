# Migrate 30 Edge Functions từ Lovable Gateway → DashScope

## 🎯 Mục tiêu
Loại bỏ hardcode `https://ai.gateway.lovable.dev/v1/chat/completions` ở 30 edge functions, chuyển sang gọi qua `callAI()` từ `_shared/ai-provider.ts` với **DashScope (qwen-flash/qwen-plus) làm provider chính**.

Lý do: Hiện UI "AI Function Config" cho phép user chọn DashScope, nhưng nhiều function phụ trợ vẫn đập thẳng Lovable Gateway → khi hết credit thì 402 → log lỗi "lovable.dev" mặc dù UI hiển thị DashScope.

## 📋 Phân loại 30 functions

### Nhóm A — Text generation/analysis (16 functions) → `qwen-flash` (rẻ, nhanh)
Gọi Lovable Gateway cho text completion thuần túy. Đổi sang DashScope dễ dàng (cùng OpenAI-compatible API).

1. `suggest-usp/index.ts` — gợi ý USP (đã thấy trong context)
2. `validate-seamless-consistency/index.ts` — vision: cần giữ Gemini (DashScope qwen3-vl-plus thay thế được)
3. `clarify-campaign-intent/index.ts`
4. `analyze-regulation-impact/index.ts`
5. `ai-edit-channel/index.ts`
6. `agent-quality/index.ts` — self-critique (đã có shared util, có thể đã dùng callAI rồi — verify lại)
7. `optimize-social-text/index.ts`
8. `suggest-ad-fix/index.ts`
9. `score-ad-creative/index.ts`
10. `improve-script/index.ts`
11. `generate-sample-text/index.ts`
12. `extract-broll-keywords/index.ts`
13. `generate-storyboard/index.ts`
14. `geo-scan-brand/index.ts`
15. `geo-generate-prompts/index.ts`
16. `extract-regulation-content/index.ts` + `parse-regulation-document/index.ts` + `enrich-industry-profiles/index.ts`

### Nhóm B — Vision/Multimodal (3 functions) → `qwen3-vl-plus` (DashScope vision)
1. `validate-seamless-consistency/index.ts` — phân tích nhiều ảnh
2. `score-ad-creative/index.ts` (nếu có vision)
3. `telegram-miniapp-chat/index.ts`, `telegram-webhook/index.ts` — chat có thể có ảnh

### Nhóm C — Image generation (5 functions) → **GIỮ NGUYÊN** Lovable Gateway
DashScope không có model image generation tương đương `gemini-2.5-flash-image`/`nano-banana`. Các function này cần fallback sang **PoYo/KIE/GeminiGen** thay vì DashScope:
1. `generate-carousel-image/index.ts`
2. `generate-brand-image/index.ts`
3. `edit-image-background/index.ts`
4. `overlay-brand-logo/index.ts`
5. `generate-scene-thumbnail/index.ts`
6. `generate-video/index.ts`

### Nhóm D — Embeddings (2 functions) → **GIỮ NGUYÊN** Supabase native
1. `generate-embedding/index.ts`
2. `_shared/conversation-embedder.ts`
DashScope không cùng dimension với `gte-small` 384-dim đang dùng cho pgvector. **KHÔNG đổi** — sẽ làm hỏng Knowledge Graph.

### Nhóm E — Shared modules (2 files)
1. `_shared/ai-provider.ts` — đã hỗ trợ DashScope, **chỉ cần verify default fallback chain ưu tiên DashScope khi Lovable 402**
2. `_shared/graph/orchestrator.ts` — dùng cho agentic loop, đổi text calls sang DashScope

## 🔧 Implementation Pattern

### Trước (hardcode):
```ts
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
  body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, ... }),
});
```

### Sau (qua callAI):
```ts
import { callAI } from "../_shared/ai-provider.ts";

const result = await callAI({
  model: "qwen-flash",                    // DashScope primary
  fallbackModels: ["qwen-plus", "google/gemini-2.5-flash"],  // fallback chain
  messages,
  temperature: 0.8,
  functionName: "suggest-usp",            // for metrics/cost tracking
});

if (!result.success) {
  // 402/429 handling
  return new Response(JSON.stringify({ error: result.error }), { status: 503 });
}
const content = result.data.choices?.[0]?.message?.content;
```

### Lợi ích:
- **Auto fallback**: DashScope down → Lovable Gateway → OpenRouter
- **Cost tracking**: tự động log vào `ai_metrics` table
- **Cache compatible**: hoạt động với `withCache()`
- **Circuit breaker**: nếu provider liên tục fail sẽ tự skip

## 📦 Phạm vi thay đổi

### Files sẽ edit:
- 16 functions Nhóm A (text) — refactor fetch → callAI
- 3 functions Nhóm B (vision) — đổi model sang `qwen3-vl-plus` qua callAI
- 6 functions Nhóm C (image) — **chỉ thêm fallback chain ưu tiên external providers** (PoYo/KIE), giữ Lovable Gateway làm last resort
- 1 file `_shared/graph/orchestrator.ts` — refactor text calls
- **KHÔNG đụng**: `generate-embedding`, `_shared/conversation-embedder.ts` (embeddings)

### Files KHÔNG đổi:
- `_shared/ai-provider.ts` (đã ổn, chỉ verify config)
- `_shared/ai-hook-evaluator.ts` (đã sửa kill-switch lần trước)
- `_shared/topic-utils.ts` (đã sửa kill-switch lần trước)

## ⚠️ Rủi ro & Mitigation

| Rủi ro | Mitigation |
|--------|------------|
| DashScope chất lượng khác Gemini ở 1 số task | Giữ `google/gemini-2.5-flash` làm fallback secondary |
| Vision quality `qwen3-vl-plus` < `gemini-2.5-flash` | Test riêng `validate-seamless-consistency`, có thể giữ Gemini cho function này |
| Image gen không có model DashScope tương đương | Nhóm C giữ nguyên, chỉ điều chỉnh thứ tự fallback |
| Embeddings dimension mismatch | Tuyệt đối không đổi Nhóm D |
| Hardcoded prompts/model names trong response parsing | Refactor cẩn thận từng file, giữ logic parse `choices[0].message.content` |

## 🧪 Testing
- Sau khi refactor: chạy `npx vitest run supabase/functions` để check tests hiện có
- Test thủ công 3 functions key: `suggest-usp`, `validate-seamless-consistency`, `clarify-campaign-intent`
- Monitor `ai_metrics` table 24h sau deploy để confirm DashScope serving traffic

## 📊 Expected outcome
- ✅ Khi Lovable Gateway hết credit → user **không thấy lỗi** vì DashScope serve trước
- ✅ UI "AI Function Config" hiển thị DashScope = thực tế DashScope đang chạy
- ✅ Cost giảm ~50-70% (qwen-flash rẻ hơn gemini-2.5-flash)
- ✅ Latency tương đương hoặc tốt hơn (DashScope edge ở Singapore)

## 🚧 Out of scope
- Không refactor cách quản lý DASHSCOPE_API_KEY (đã có trong DB qua `ai_provider_credentials`)
- Không thêm UI mới cho admin
- Không đổi pricing/quota logic
