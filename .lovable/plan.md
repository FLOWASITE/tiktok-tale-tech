
# Plan: Thêm 9Router làm AI Provider

## Bối cảnh
9Router (`9router.com`, OSS `github.com/decolua/9router`) là **local AI gateway** OpenAI-compatible chạy `localhost:20128`, route sang 60+ providers (Claude, OpenAI, Gemini, GLM, Kimi, MiniMax, Groq, xAI, DeepSeek, Qwen, iFlow…) với 3-tier fallback và bộ tiết kiệm token RTK/Caveman.

**Vì Flowa chạy edge function trên Lovable Cloud (không thể gọi `localhost`)**, để dùng 9Router làm provider backend, **user/admin phải tự host 9Router trên VPS public** và cung cấp:
- `NINE_ROUTER_BASE_URL` (vd `https://9router.mydomain.com/v1`)
- `NINE_ROUTER_API_KEY` (key bảo vệ endpoint do user tự đặt)

Pattern này giống hệt cách add OpenRouter/DashScope đã có sẵn — clone nguyên cấu trúc.

## Phạm vi
- ✅ Text/Chat (LLM) — endpoint `/chat/completions` OpenAI-compatible
- ✅ Embeddings — endpoint `/embeddings` (optional, phase 2)
- ❌ Image/Video/TTS/STT — để phase 2, hiện chỉ wire Chat (đủ phủ 90% use case)
- ❌ MITM Bridge / OAuth subscription intercept — không phù hợp server-side

## Files thay đổi

### Backend (Edge Functions)
1. **`supabase/functions/_shared/ai-provider.ts`**
   - Thêm `nineRouter: "<base-url>/chat/completions"` vào `PROVIDER_ENDPOINTS`
   - Thêm prefix routing `"9router/": "ninerouter"` vào provider map → models gọi dạng `9router/glm-4.6`, `9router/kimi-k2`, `9router/claude-sonnet-4.6`
   - Viết `callNineRouter()` clone từ `callOpenRouter()` (~30 LOC): header `Authorization: Bearer ${NINE_ROUTER_API_KEY}`, body OpenAI format, strip prefix `9router/` trước khi gửi
   - Thêm `case "ninerouter"` trong switch dispatcher (line ~850)
   - Circuit breaker: thêm `ninerouter` vào danh sách provider được track (cùng nhánh OpenRouter)

2. **`supabase/functions/_shared/ai-config.ts`**
   - Thêm `'9router/glm-4.6'`, `'9router/kimi-k2-0905'`, `'9router/minimax-m2'`, `'9router/qwen3-coder'` vào danh sách model hợp lệ cho `text` group
   - Cập nhật `getProviderFromModel()` để nhận diện prefix `9router/`

### Frontend
3. **`src/types/aiProvider.ts`**
   - Thêm `'9router'` vào `AIProviderType` union
   - Thêm entry vào `AI_PROVIDERS`:
     ```ts
     {
       id: '9router',
       name: '9Router (Self-hosted)',
       description: '60+ providers qua 1 endpoint: GLM, Kimi, MiniMax, Claude, GPT, Gemini, Qwen, DeepSeek, Groq, xAI…',
       getKeyUrl: 'https://9router.com/',
       models: [
         '9router/glm-4.6', '9router/glm-4.6-air',
         '9router/kimi-k2-0905', '9router/kimi-k2-thinking',
         '9router/minimax-m2', '9router/minimax-text-01',
         '9router/qwen3-coder-plus', '9router/qwen3-max',
         '9router/deepseek-v3.2', '9router/deepseek-r1',
         '9router/claude-sonnet-4.6', '9router/gpt-5.4', '9router/gemini-3-flash',
         '9router/iflow-pro', '9router/grok-4',
       ],
       icon: '🛰️',
     }
     ```

4. **`src/components/admin/ai/AIProviderManager.tsx`** (nếu có UI add/edit)
   - Hiển thị field `Base URL` + `API Key` cho provider `9router` (khác OpenRouter ở chỗ base URL custom)

### Secrets
5. Add 2 secret runtime qua `secrets--add_secret`:
   - `NINE_ROUTER_BASE_URL` — vd `https://router.mydomain.com/v1`
   - `NINE_ROUTER_API_KEY` — token do user self-host đặt

### Docs / Memory
6. Tạo `mem://ai-system/providers/9router-integration-vn.md`:
   - Self-hosted requirement + ENV vars
   - Prefix `9router/` routing
   - Khuyến nghị model rẻ: GLM-4.6 ($0.60/M), Kimi K2, MiniMax M2

## Out of scope (phase 2)
- Embeddings endpoint
- Image gen qua 9Router (Fal/Flux/Recraft)
- Quota/cost tracking riêng cho 9Router (tạm dùng circuit breaker chung)
- UI trong `/admin/ai → Providers` để admin nhập Base URL trực tiếp (hiện dùng secret env)

## Acceptance criteria
- [ ] Admin có thể chọn model `9router/glm-4.6` trong `/admin/ai → Functions` cho function `generate-multichannel`
- [ ] Edge function gọi thành công, log thấy `provider: "ninerouter"` trong `ai_metrics`
- [ ] Khi `NINE_ROUTER_BASE_URL` không set → graceful error "9Router chưa cấu hình", fallback về Lovable Gateway
- [ ] 429/402 từ 9Router được surface đúng (cùng cơ chế OpenRouter)

## Ước lượng
~150 LOC backend + 30 LOC frontend + 1 memory file. Tổng ~1 giờ implement nếu user đã có 9Router instance chạy public.
