## Mục tiêu
Thêm **DeepSeek** như một AI provider trực tiếp (giống DashScope, không qua OpenRouter/9Router) — rẻ hơn, độ trễ thấp hơn, có thể dùng cho long-context cheap tasks và reasoning.

## Research — DeepSeek API (nguồn: api-docs.deepseek.com)

| Item | Value |
|---|---|
| Base URL | `https://api.deepseek.com` (OpenAI-compatible) hoặc `https://api.deepseek.com/anthropic` |
| Chat endpoint | `POST /v1/chat/completions` (OpenAI shape) |
| Auth | `Authorization: Bearer $DEEPSEEK_API_KEY` |
| API key | Tạo tại `https://platform.deepseek.com/api_keys` |
| Models hiện hành | `deepseek-chat` (V3-style, general), `deepseek-reasoner` (R1, chain-of-thought), `deepseek-v4-flash`, `deepseek-v4-pro` |
| Context | 128K |
| Pricing | rẻ nhất frontier — V4-Flash ~$0.07/$0.27 per 1M in/out; V4-Pro ~$0.27/$1.10 (cached input còn rẻ hơn) |
| Tính năng | function calling, JSON mode, streaming, prefix caching tự động (giảm 50–75% cost cho prompt lặp) |
| Trả về | giống OpenAI; `deepseek-reasoner` thêm field `reasoning_content` |

So sánh với cách hiện tại:
- `deepseek/*` đang được map qua **OpenRouter** (markup ~5%).
- `9router/deepseek-v3.2`, `9router/deepseek-r1` chạy qua 9Router self-host.
- Chưa có direct path → thêm provider `deepseek` cho phép user nhập key DeepSeek thẳng, tận dụng prompt caching native + giá gốc.

## Phạm vi thay đổi

### A. Backend — `supabase/functions/_shared/ai-provider.ts`
1. Thêm endpoint:
   ```
   PROVIDER_ENDPOINTS.deepseek = "https://api.deepseek.com/v1/chat/completions"
   ```
2. Thêm mapping prefix (đặt **trên** dòng `"deepseek/": "openrouter"`):
   ```
   "deepseek-chat": "deepseek"
   "deepseek-reasoner": "deepseek"
   "deepseek-v4": "deepseek"        // bắt deepseek-v4-flash, deepseek-v4-pro
   "deepseek/native/": "deepseek"   // explicit override để force direct
   ```
   Giữ `deepseek/*` (vd `deepseek/deepseek-chat`) tiếp tục qua OpenRouter để không phá legacy override.
3. Thêm `callDeepSeek()` — clone từ `callDashScope()`:
   - Đọc API key: `apiKeyOverride || Deno.env.get("DEEPSEEK_API_KEY")`.
   - Strip prefix `deepseek/native/` nếu có.
   - Body OpenAI shape: `model`, `messages`, `max_tokens`, `temperature`, `tools`, `tool_choice`, `stream`.
   - Map lỗi 401 → "Invalid API key", 402 → Payment required, 429 → rate-limited, 5xx → retryable.
   - Hỗ trợ `stream` (trả `response.body`).
4. Thêm `case "deepseek":` trong switch dispatch (line ~950) và trong fallback tier logic.
5. Circuit breaker registration: thêm `"deepseek"` vào danh sách provider tracked.

### B. Provider catalog — `src/types/aiProvider.ts`
1. Mở rộng `AIProviderType`:
   ```ts
   export type AIProviderType = ... | 'deepseek';
   ```
2. Thêm entry vào `PROVIDER_PRESETS` (giữa `dashscope` và `ninerouter`):
   ```ts
   {
     id: 'deepseek',
     name: 'DeepSeek',
     description: 'API trực tiếp từ DeepSeek (deepseek-chat, deepseek-reasoner, deepseek-v4-*). Giá rẻ nhất + prompt caching tự động.',
     getKeyUrl: 'https://platform.deepseek.com/api_keys',
     models: [
       'deepseek-chat',
       'deepseek-reasoner',
       'deepseek-v4-flash',
       'deepseek-v4-pro',
     ],
   }
   ```
3. Thêm helper `isDeepSeekModel(id)` tương tự `isDashScopeModel`.

### C. Admin UI
1. `src/components/admin/ai/AIProviderManager.tsx`
   - Icon map: `deepseek: <Bot className="h-5 w-5 text-blue-600" />` (hoặc Sparkles).
   - URL map: thêm key URL.
2. `src/components/admin/ai/ModelSelector.tsx`
   - `ProviderFilter` thêm `'deepseek'`.
   - Filter & count tương tự dashscope.
3. `src/hooks/useAIConfig.ts` (nếu có whitelist) — thêm `deepseek-*` models vào `AI_MODELS_AVAILABLE` để Admin Functions tab chọn được.

### D. Secret
- Thêm secret runtime: **`DEEPSEEK_API_KEY`** (user nhập qua add_secret).
- Không bắt buộc nếu org tự cấu hình key qua `ai_provider_configs` (đã có infra).

### E. Cost tracking — `supabase/functions/_shared/cost-estimator.ts`
- Thêm entries pricing (USD per 1M tokens):
  - `deepseek-chat`: in 0.27 / out 1.10
  - `deepseek-reasoner`: in 0.55 / out 2.19
  - `deepseek-v4-flash`: in 0.07 / out 0.27
  - `deepseek-v4-pro`: in 0.27 / out 1.10
  *(Sẽ verify lại số chính xác khi implement — bảng pricing thay đổi theo tháng.)*

### F. Docs/Memory
- Update `mem://ai-system/providers/...` thêm dòng "DeepSeek direct".
- README provider table.

## Không làm trong scope này
- Không refactor route các edge function đang gọi cụ thể (chúng tự dùng `callAI` → routing tự kích hoạt khi Admin chọn model `deepseek-*`).
- Không bật Anthropic-compatible endpoint của DeepSeek (chỉ OpenAI shape).
- Không xử lý `reasoning_content` field riêng cho `deepseek-reasoner` ở vòng này — chỉ pass-through text (có thể bổ sung sau nếu cần show chain-of-thought).
- Không sửa runtime DashScope 400 hiện có (issue riêng).

## Acceptance
1. Admin → AI Provider Manager thấy card "DeepSeek", nhập key DeepSeek thật, status = healthy.
2. Admin → Functions chọn model `deepseek-chat` cho 1 function → call → log `ai_metrics.provider='deepseek'`, response OK.
3. Circuit breaker fail-fast khi key sai.
4. Stream mode hoạt động (test với `generate-script` hoặc `chat-topics`).

## Sau khi approve
Thực thi tuần tự: ai-provider.ts → aiProvider.ts → 2 component admin → cost-estimator → request secret `DEEPSEEK_API_KEY`.