
# Tich hop PoYo.ai -- Provider Toan dien

## Tong quan
Them PoYo.ai lam provider chinh thuc, tuong tu cach da tich hop KIE.ai. PoYo.ai la gateway cung cap nhieu model tao anh (GPT-4o Image, GPT Image 1.5, Z-Image, Flux 2, Seedream 4.5, Grok Imagine) voi API async thong nhat.

## So sanh API: KIE.ai vs PoYo.ai

| | KIE.ai | PoYo.ai |
|---|---|---|
| Base URL | `https://api.kie.ai` | `https://api.poyo.ai` |
| Submit | Endpoints rieng theo model | Thong nhat: `POST /api/generate/submit` |
| Poll | Endpoints rieng theo model | Thong nhat: `GET /api/generate/status/{task_id}` |
| Auth | Bearer token | Bearer token |
| Response | `data.taskId`, `successFlag` | `data.task_id`, `status: finished/failed` |
| Image URL | `resultImageUrl` hoac `result_urls` | `files[0].file_url` |

## Cac thay doi can thuc hien

### 1. Database (Migration)
- Mo rong CHECK constraint cua `ai_provider_configs.provider_type` them gia tri `'poyo'`
- INSERT row cho poyo vao `ai_provider_configs` voi `api_key_secret_name='POYO_API_KEY'`, `default_model='poyo/gpt-4o-image'`

### 2. Secret
- Yeu cau user nhap `POYO_API_KEY` (lay tai https://poyo.ai/dashboard/api-key)

### 3. Backend -- Edge Function Helper
Tao file `supabase/functions/_shared/poyo-image-generator.ts`:
- `generateImageViaPoyo(params, apiKey)`: submit task -> poll -> return URL
- Submit: `POST https://api.poyo.ai/api/generate/submit` voi body `{ model, input: { prompt, size }, callback_url? }`
- Poll: `GET https://api.poyo.ai/api/generate/status/{task_id}` -- check `status === 'finished'` -> lay `files[0].file_url`
- Helper: `isPoyoModel()`, `mapAspectRatioToPoyo()`
- Model prefix: `poyo/` (vd: `poyo/gpt-4o-image`, `poyo/gpt-image-1.5`, `poyo/z-image`, `poyo/flux-2-pro`, `poyo/seedream-4.5`, `poyo/grok-imagine`)

### 4. Backend -- Cap nhat Edge Functions
Cap nhat 3 Edge Functions de routing sang PoYo.ai:
- `generate-brand-image/index.ts`: them import poyo helper, them nhanh `if (isPoyoModel(primaryModel))` tuong tu KIE
- `generate-social-image/index.ts`: tuong tu
- `edit-image-background/index.ts`: tuong tu

### 5. Backend -- Test Connection
Cap nhat `test-ai-connection/index.ts`:
- Them case `'poyo'` goi `testPoyo(apiKey)` -- fetch `GET https://api.poyo.ai/api/generate/status/test` kiem tra auth

### 6. Frontend -- Type System
Cap nhat `src/types/aiProvider.ts`:
- Them `'poyo'` vao `AIProviderType`
- Them entry PoYo.ai vao `AI_PROVIDERS` array voi models va icon

### 7. Frontend -- useAIConfig.ts
- Them PoYo models vao `MODELS_BY_TYPE.image`: `poyo/gpt-4o-image`, `poyo/gpt-image-1.5`, `poyo/z-image`, `poyo/flux-2-pro`, `poyo/seedream-4.5`, `poyo/grok-imagine`
- Them `MODEL_INFO` cho tung model PoYo voi provider `'poyo'`
- Them `POYO_MODEL_PREFIXES = ['poyo/']` va `isPoyoModel()`
- Them `'poyo'` vao `MODELS_BY_PROVIDER`
- Them PoYo vao `AI_PROVIDERS` array
- Mo rong `ModelInfo.provider` type: `'lovable' | 'openrouter' | 'kie' | 'poyo'`
- Cap nhat `getModelInfo()` fallback cho poyo models

### 8. Frontend -- ModelSelector.tsx
- Them section "PoYo.ai" mau teal/cyan tuong tu KIE section mau violet
- Filter `poyoModels` tuong tu `kieModels`
- Hien thi badge "Yeu cau POYO_API_KEY"

### 9. Frontend -- ModelCard.tsx
- Them theme `poyo` voi mau teal: `border-l-teal-500`, badge, icon
- Them vao `PROVIDER_DOT_COLORS`

### 10. Frontend -- AIProviderManager.tsx
- Them icon cho `poyo` trong `PROVIDER_ICONS`
- Them URL cho `poyo` trong `PROVIDER_KEY_URLS`: `https://poyo.ai/dashboard/api-key`

## Models PoYo.ai se ho tro

| Model ID | Ten hien thi | Mo ta | Cost |
|---|---|---|---|
| `poyo/gpt-4o-image` | GPT-4o Image | OpenAI image gen qua PoYo | medium |
| `poyo/gpt-image-1.5` | GPT Image 1.5 | Moi nhat, nhanh 4x | medium |
| `poyo/z-image` | Z-Image | Alibaba, sub-second | low |
| `poyo/flux-2-pro` | Flux 2 Pro | Black Forest Labs | medium |
| `poyo/seedream-4.5` | Seedream 4.5 | ByteDance, 4K | medium |
| `poyo/grok-imagine` | Grok Imagine | xAI Aurora | medium |

## Thu tu thuc hien
1. Yeu cau secret `POYO_API_KEY`
2. Database migration (constraint + INSERT)
3. Tao `poyo-image-generator.ts` helper
4. Cap nhat 3 Edge Functions (brand-image, social-image, edit-background)
5. Cap nhat `test-ai-connection`
6. Cap nhat frontend (types, useAIConfig, ModelSelector, ModelCard, AIProviderManager)

## Chi tiet ky thuat

### poyo-image-generator.ts -- API Flow

```text
submitPoyoTask()
  POST https://api.poyo.ai/api/generate/submit
  Body: { model: "gpt-4o-image", input: { prompt, size } }
  Response: { code: 200, data: { task_id: "..." } }
       |
       v
pollPoyoTask()
  GET https://api.poyo.ai/api/generate/status/{task_id}
  Loop moi 3s, max 40 lan (120s)
  status === "finished" -> files[0].file_url
  status === "failed" -> throw error
```

### Model Prefix Convention
- Tat ca model PoYo dung prefix `poyo/` de phan biet voi KIE models
- `isPoyoModel(id)` check `id.startsWith('poyo/')`
- Khi gui API, strip prefix: `poyo/gpt-4o-image` -> `gpt-4o-image`
