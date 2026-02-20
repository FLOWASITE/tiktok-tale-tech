

# Thêm KIE.ai vào Providers trong Admin Panel

## Tổng quan
Thêm KIE.ai làm provider chính thức trong tab Providers (Admin > AI Management), cho phép Admin cấu hình API key, test connection, và chọn default model.

## Thay đổi chi tiết

### 1. `src/hooks/useAIConfig.ts`
- **AI_PROVIDERS** (line 475-485): Thêm entry `{ type: 'kie', name: 'KIE.ai', description: 'Flux Kontext, GPT-Image (gateway)', hasKey: true, secretName: 'KIE_API_KEY' }`
- **MODELS_BY_PROVIDER** (line 488-516): Thêm `kie: ['flux-kontext-pro', 'flux-kontext-max', 'gpt-image-1', 'gpt-image-1.5']`

### 2. `src/components/admin/ai/AIProviderManager.tsx`
- **PROVIDER_ICONS** (line 20-30): Thêm `kie: <Wand2 className="h-5 w-5 text-violet-500" />`
- **PROVIDER_KEY_URLS** (line 32-38): Thêm `kie: 'https://kie.ai'`

### 3. `supabase/functions/test-ai-connection/index.ts`
- Thêm case `'kie'` trong switch (line 28-42)
- Thêm function `testKie(apiKey)`: gọi `https://api.kie.ai/api/v1/record-info?taskId=test` với Bearer token
  - 401 -> key sai
  - 200/404/khac -> key hop le (endpoint tra loi nhung auth pass)

### 4. `src/types/aiProvider.ts`
- Thêm `'kie'` vào union type `AIProviderType` (line 1)
- Thêm entry KIE.ai vào mang `AI_PROVIDERS` (line 28-75)

## Ket qua
Admin se thay card **KIE.ai** (violet) trong tab Providers voi:
- Nut "Cau hinh" de nhap API key
- "Test Connection" de xac minh key
- Dropdown chon default model (4 models)
- Link "Lay API Key" tro den kie.ai

## Files can thay doi

| File | Thay doi |
|------|----------|
| `src/hooks/useAIConfig.ts` | Them KIE vao AI_PROVIDERS + MODELS_BY_PROVIDER |
| `src/components/admin/ai/AIProviderManager.tsx` | Them icon + key URL |
| `supabase/functions/test-ai-connection/index.ts` | Them testKie() handler |
| `src/types/aiProvider.ts` | Them 'kie' type + provider info |

