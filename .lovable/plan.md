

# Thêm GeminiGen.ai vào UI AI Management / Providers

## Vấn đề
Provider `geminigen` đã được tích hợp ở backend (edge functions, DB constraint, types) nhưng chưa được đăng ký trong UI quản trị — thiếu ở 3 chỗ khiến nó không hiển thị trên trang Providers.

## Sửa

### 1. `src/hooks/useAIConfig.ts`
- **`AI_PROVIDERS`** (dòng ~1033): Thêm entry `{ type: 'geminigen', name: 'GeminiGen.ai', description: 'Nano Banana Pro, Nano Banana 2, Imagen 4', hasKey: true, secretName: 'GEMINIGEN_API_KEY' }` trước `custom`
- **`MODELS_BY_PROVIDER`** (dòng ~1078): Thêm `geminigen: ['geminigen/nano-banana-pro', 'geminigen/nano-banana-2', 'geminigen/imagen-4']`

### 2. `src/components/admin/ai/AIProviderManager.tsx`
- **`PROVIDER_ICONS`** (dòng ~34): Thêm `geminigen: <Sparkles className="h-5 w-5 text-emerald-500" />`
- **`PROVIDER_KEY_URLS`** (dòng ~47): Thêm `geminigen: 'https://geminigen.ai/profile/integration/api-keys'`

Tổng: 2 file, 4 chỗ thêm dòng. Không cần migration hay deploy.

