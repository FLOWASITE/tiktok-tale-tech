

# Thêm model GeminiGen vào danh sách chọn trong Function Config

## Vấn đề
Model của GeminiGen.ai đã được đăng ký trong `MODELS_BY_PROVIDER` nhưng **chưa được thêm vào `MODELS_BY_TYPE`** — đây là danh sách mà `ModelSelector` dùng để hiển thị model khi chọn cho từng Function. Ngoài ra, thiếu `MODEL_INFO` cho các model GeminiGen nên UI không hiển thị được thông tin chi tiết.

## Sửa: 1 file `src/hooks/useAIConfig.ts`

### 1. Thêm vào `MODELS_BY_TYPE.image` (dòng ~183)
```
'geminigen/nano-banana-pro',
'geminigen/nano-banana-2',
'geminigen/imagen-4',
```

### 2. Thêm `'geminigen'` vào union type `ModelInfo.provider` (dòng ~206)
```
provider: 'lovable' | 'openrouter' | 'kie' | 'poyo' | 'dashscope' | 'geminigen';
```

### 3. Thêm `MODEL_INFO` entries cho 3 model (sau block poyo, trước dashscope ~dòng 580)
- `geminigen/nano-banana-pro`: Gemini 3 Pro image gen, premium quality
- `geminigen/nano-banana-2`: Gemini 3.1 Flash image gen, fast
- `geminigen/imagen-4`: Google Imagen 4, high quality

### 4. Cập nhật `getModelInfo()` fallback (dòng ~988)
Thêm logic nhận diện prefix `geminigen/` để trả provider đúng.

Tổng: 1 file, 4 chỗ sửa.

