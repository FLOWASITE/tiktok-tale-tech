
# Plan: Bổ sung 9Router vào UI Admin Provider Manager

## Bối cảnh
Backend đã wire 9Router (provider id `ninerouter`, prefix `9router/`, ENV `NINE_ROUTER_BASE_URL` + `NINE_ROUTER_API_KEY`). Nhưng admin UI tại `/admin/ai → Providers` (`AIProviderManager.tsx`) chưa thấy 9Router → không thể bật/lưu/test/chọn model qua UI. Cần expose 4 chỗ.

## Files thay đổi

### 1. `src/hooks/useAIConfig.ts`
- **`AIProviderConfig.providerType` union** (line 370): thêm `'ninerouter'`
- **`AI_PROVIDERS` array** (line 1601, trước `custom`):
  ```ts
  { type: 'ninerouter', name: '9Router (Self-hosted)', description: '60+ providers qua 1 endpoint: GLM, Kimi, MiniMax, Claude, GPT, Gemini, Qwen, DeepSeek, Groq…', hasKey: true, secretName: 'NINE_ROUTER_API_KEY' }
  ```
- **`MODELS_BY_PROVIDER`**: thêm key `ninerouter` với ~16 model (GLM-4.6, Kimi K2, MiniMax M2, Qwen3 Coder/Max, DeepSeek V3.2/R1, Claude Sonnet 4.6, GPT-5.4, Gemini 3 Flash, Grok-4, iFlow Pro)
- **`getModelInfo()`** (line 1515): thêm branch nhận diện prefix `9router/` → trả `provider: 'ninerouter'`, description "9Router (self-hosted) model"
- **`MODEL_INFO`** (optional): thêm 3-4 entry chính (`9router/glm-4.6`, `9router/kimi-k2-0905`, `9router/minimax-m2`) với shortName/speed/quality/cost để hiển thị badge đẹp

### 2. `src/components/admin/ai/AIProviderManager.tsx`
- **`PROVIDER_ICONS`** (line 23-37): thêm `ninerouter: <Workflow className="h-5 w-5 text-indigo-500" />` (hoặc `Router` icon từ lucide)
- **`PROVIDER_KEY_URLS`** (line 39-49): thêm `ninerouter: 'https://9router.com/'`
- **Dialog Base URL field** (line 516): mở rộng condition từ `=== 'custom'` thành `=== 'custom' || === 'ninerouter'` + thêm helper text *"Endpoint self-hosted của 9Router, vd https://router.mydomain.com/v1"*
- **Helper note** trong dialog khi chọn `ninerouter`: hiển thị 1 alert "Cần tự host 9Router (npm install -g 9router) trên VPS public và mở endpoint bằng API key"

### 3. `supabase/functions/test-ai-connection/index.ts`
- Thêm `case 'ninerouter'` trong switch → gọi `testNineRouter(apiKey, baseUrl)`
- Viết `testNineRouter()`: GET `${baseUrl}/models` (OpenAI-compatible) với `Authorization: Bearer ${apiKey}`; 401 → invalid, 200 → đếm models
- **Bổ sung**: body request cần truyền thêm `baseUrl` (frontend đã có `editingProvider.baseUrl`). Sửa client-side `handleTestConnection` để gửi `baseUrl: editingProvider.baseUrl` trong body
- **Sửa lỗi sẵn có**: function `testGeminiGen` hiện bị nest sai (line 263 `}` đóng test-poyo, làm testGeminiGen trở thành nested) — không touch trừ khi test fail. Skip nếu không phát sinh lỗi build.

## Tóm tắt UX sau khi xong
Admin vào `/admin/ai → Providers` thấy card **9Router (Self-hosted)** → bấm "Thêm" → nhập Base URL + API Key → "Test kết nối" → "Lưu" → từ giờ có thể chọn `9router/glm-4.6` trong tab Functions/Channels/Agents.

## Out of scope
- Quota/cost panel riêng cho 9Router
- Realtime model list từ 9Router `/models` endpoint (giờ hard-code 16 model)
- Sửa nested function `testGeminiGen` (bug có sẵn, không liên quan)

## Acceptance
- [ ] `AIProviderManager` hiển thị card 9Router với icon + description
- [ ] Dialog cho phép nhập Base URL khi chọn 9Router (giống Custom)
- [ ] Test kết nối thành công với endpoint self-hosted hợp lệ
- [ ] Lưu thành công vào `ai_provider_configs` (provider_type='ninerouter', base_url, encrypted_api_key)
- [ ] Tab Functions cho phép chọn `9router/glm-4.6` từ ModelSelector
