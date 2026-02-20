
# Thêm KIE.ai vào danh sách Providers trong Admin Panel

## Tổng quan
Thêm KIE.ai làm một provider chính thức trong trang quản lý Providers (Admin > AI Management > Providers tab), cho phép Admin cấu hình API key, test connection, và quản lý models KIE.ai từ giao diện quản trị.

## Các thay đổi

### 1. `src/hooks/useAIConfig.ts` - Thêm KIE vào AI_PROVIDERS và MODELS_BY_PROVIDER

- Thêm entry mới trong `AI_PROVIDERS`:
  - type: `kie`, name: `KIE.ai`, description: `Flux Kontext, GPT-Image (gateway)`, hasKey: true, secretName: `KIE_API_KEY`
- Thêm models vào `MODELS_BY_PROVIDER`:
  - `flux-kontext-pro`, `flux-kontext-max`, `gpt-image-1`, `gpt-image-1.5`

### 2. `src/components/admin/ai/AIProviderManager.tsx` - Thêm icon và key URL cho KIE

- `PROVIDER_ICONS`: Thêm entry `kie` với icon violet (Wand2 hoac Sparkles)
- `PROVIDER_KEY_URLS`: Thêm `kie: 'https://kie.ai'` (trang chính KIE.ai)

### 3. `supabase/functions/test-ai-connection/index.ts` - Thêm test handler cho KIE

- Thêm case `'kie'` trong switch statement
- Gọi `https://api.kie.ai/api/v1/record-info?taskId=test` với header `Authorization: Bearer {apiKey}`
- Nếu response 401 -> key sai, nếu 200/404 -> key hợp lệ (vì endpoint trả lỗi task not found nhưng auth pass)

### 4. `src/types/aiProvider.ts` - Thêm KIE type (optional sync)

- Thêm `'kie'` vào `AIProviderType` union type
- Thêm entry mới vào mảng `AI_PROVIDERS`

## Kết quả

Sau khi hoàn thiện, Admin sẽ thấy card **KIE.ai** (màu violet) trong tab Providers với:
- Nút "Cấu hình" để nhập API key
- "Test Connection" để xác minh key
- Dropdown chọn default model (Flux Kontext Pro, Max, GPT-Image-1, 1.5)
- Link "Lấy API Key" trỏ đến trang KIE.ai

## Files cần thay đổi

| File | Thay đổi |
|------|----------|
| `src/hooks/useAIConfig.ts` | Thêm KIE vào AI_PROVIDERS + MODELS_BY_PROVIDER |
| `src/components/admin/ai/AIProviderManager.tsx` | Thêm icon + key URL cho KIE |
| `supabase/functions/test-ai-connection/index.ts` | Thêm testKie() handler |
| `src/types/aiProvider.ts` | Thêm 'kie' type + provider info |
