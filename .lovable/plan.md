

# Tích hợp GeminiGen.ai làm Provider tạo ảnh

## Tổng quan
Thêm GeminiGen.ai (https://geminigen.ai) vào hệ thống đa nhà cung cấp AI hiện tại, theo đúng mô hình async (submit → poll) giống KIE.ai và PoYo.ai.

## GeminiGen API
- **Endpoint**: `POST https://api.geminigen.ai/uapi/v1/generate_image` (multipart/form-data)
- **Auth**: Header `x-api-key`
- **Models**: `nano-banana-pro` (Gemini 3 Pro), `nano-banana-2` (Gemini 3.1 Flash), `imagen-4`
- **Poll**: `GET https://api.geminigen.ai/uapi/v1/history/{uuid}` — status: 1=processing, 2=completed, 3=failed
- **Styles**: None, 3D Render, Photorealistic, Anime General, Creative, Dynamic, Fashion, Illustration, v.v.
- **Aspect Ratios**: 1:1, 16:9, 9:16, 4:3, 3:4
- **Resolution**: 1K, 2K, 4K

## Các file cần sửa/tạo

### 1. Tạo `supabase/functions/_shared/geminigen-image-generator.ts` (MỚI)
- Helper async tương tự `kie-image-generator.ts` và `poyo-image-generator.ts`
- `submitGeminiGenTask()`: POST multipart/form-data đến API, nhận UUID
- `pollGeminiGenTask()`: GET history/{uuid}, poll đến khi status=2, trả URL từ `generate_result`
- Export: `generateImageViaGeminiGen()`, `isGeminiGenModel()`, `mapAspectRatioToGeminiGen()`
- Prefix model: `geminigen/` (ví dụ: `geminigen/nano-banana-pro`, `geminigen/imagen-4`)

### 2. Sửa `src/types/aiProvider.ts`
- Thêm `'geminigen'` vào union type `AIProviderType`
- Thêm entry mới vào mảng `AI_PROVIDERS`:
  - Models: `geminigen/nano-banana-pro`, `geminigen/nano-banana-2`, `geminigen/imagen-4`
  - Icon: `🌟`
  - getKeyUrl: `https://geminigen.ai/profile/integration/api-keys`

### 3. Sửa `supabase/functions/generate-brand-image/index.ts`
- Import `generateImageViaGeminiGen`, `isGeminiGenModel`, `mapAspectRatioToGeminiGen`
- Thêm branch `else if (isGeminiGenModel(primaryModel))` giống PoYo/KIE
- Đọc `GEMINIGEN_API_KEY` từ env, fallback sang Lovable AI nếu lỗi

### 4. Sửa `supabase/functions/test-ai-connection/index.ts`
- Thêm `case 'geminigen'`: gọi GET histories endpoint để kiểm tra API key hợp lệ

### 5. Migration SQL
- Cập nhật constraint `ai_provider_configs_provider_type_check` thêm `'geminigen'`

### 6. Deploy
- Deploy lại: `generate-brand-image`, `test-ai-connection`
- Yêu cầu user nhập secret `GEMINIGEN_API_KEY`

## Tổng: 1 file mới, 4 file sửa, 1 migration

