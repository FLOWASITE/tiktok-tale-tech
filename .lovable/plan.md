
# Phương án A: Admin-Controlled Model cho Tạo ảnh

## Phân tích hiện trạng

### Vấn đề cốt lõi
Trong `generate-brand-image/index.ts` (line 48-51), model bị hardcode hoàn toàn:

```typescript
const IMAGE_MODELS = {
  primary: "google/gemini-3-pro-image-preview",
  fallback: "google/gemini-2.5-flash-image",
}
```

Hệ quả:
- Admin có thể cấu hình `generate-brand-image` trong Admin Panel → lưu vào `ai_function_configs`
- Nhưng Edge Function **không bao giờ đọc** config đó — luôn dùng constant hardcode
- `edit-image-background` cũng hardcode `gemini-2.5-flash-image` ở line 116

### Kiến trúc `_shared/ai-config.ts` đã có sẵn
File này đã có function `getAIConfig(functionName)` hoàn chỉnh:
- Đọc từ `ai_function_configs` table
- In-memory cache 5 phút
- Fallback về default nếu DB không có record
- Default cho `generate-brand-image` = `google/gemini-3-pro-image-preview` (đã đúng)
- Default cho `generate-social-image` = `google/gemini-3-pro-image-preview`

### Admin Panel đã có UI
`AIFunctionConfigComponent` + `useAIConfig` hook đã hỗ trợ update `generate-brand-image` trong Admin Panel → đường dẫn `/admin/ai` tab Functions.

---

## Phạm vi thay đổi (Phương án A)

Chỉ cần sửa **2 Edge Functions** để đọc config từ DB thay vì hardcode. Không thay đổi:
- Database schema
- Admin Panel UI
- Frontend hooks (`useAutoImageGeneration`, `useSocialImageGeneration`)
- `_shared/ai-config.ts` (đã hoàn chỉnh)

---

## Chi tiết thực hiện

### File 1: `supabase/functions/generate-brand-image/index.ts`

**Thay đổi:**

1. Import `getAIConfig` từ `_shared/ai-config.ts`

2. Xóa constant hardcode `IMAGE_MODELS`:
```typescript
// XÓA:
const IMAGE_MODELS = {
  primary: "google/gemini-3-pro-image-preview",
  fallback: "google/gemini-2.5-flash-image",
}
```

3. Trong hàm `generateImageWithRetry`, thay vì dùng `[IMAGE_MODELS.primary, IMAGE_MODELS.fallback]`, nhận models như param:
```typescript
async function generateImageWithRetry(
  prompt: string,
  apiKey: string,
  models: { primary: string; fallback: string },  // thêm param này
  maxRetries: number = QUALITY_THRESHOLDS.maxRetries
)
```

4. Trước khi gọi `generateImageWithRetry`, gọi `getAIConfig` để lấy model:
```typescript
// Đọc config từ Admin Panel (DB)
const aiConfig = await getAIConfig('generate-brand-image', brandTemplate.organization_id);

// Xác định model dùng: Admin config → default hierarchy
const primaryModel = aiConfig.model;  // từ DB hoặc default
const fallbackModel = primaryModel === 'google/gemini-3-pro-image-preview'
  ? 'google/gemini-2.5-flash-image'   // fallback khi dùng pro
  : 'google/gemini-3-pro-image-preview'; // fallback khi dùng flash

const result = await generateImageWithRetry(
  enhancedPrompt,
  LOVABLE_API_KEY,
  { primary: primaryModel, fallback: fallbackModel }
);
```

5. Log model đang dùng để dễ debug:
```typescript
console.log(`[generate-brand-image] Using model from config: ${primaryModel} (source: ${aiConfig.function_name})`);
```

---

### File 2: `supabase/functions/edit-image-background/index.ts`

**Thay đổi:**

1. Import `getAIConfig`

2. Thay hardcode `"google/gemini-2.5-flash-image"` (line 116) bằng model từ config:
```typescript
const aiConfig = await getAIConfig('edit-image-background');
const modelToUse = aiConfig.model;
```

3. Thêm default config trong `_shared/ai-config.ts` cho `edit-image-background`:
```typescript
'edit-image-background': {
  model: 'google/gemini-2.5-flash-image',  // model hiện tại là default
  temperature: 0.7,
  max_tokens: 1024,
  cache_ttl_seconds: 0,
  is_enabled: true,
  priority_level: 'normal',
},
```

---

### File 3: `supabase/functions/_shared/ai-config.ts`

Thêm 2 default config còn thiếu:
- `edit-image-background` với default `gemini-2.5-flash-image`
- `generate-carousel-image` nếu có (kiểm tra)

---

### File 4: `src/hooks/useAIConfig.ts`

Thêm `edit-image-background` vào `AI_FUNCTIONS` array để Admin Panel có thể cấu hình nó:
```typescript
{ name: 'edit-image-background', description: 'Chỉnh sửa nền ảnh', category: 'image', type: 'image' as AIFunctionType, currentModel: 'google/gemini-2.5-flash-image' },
```

---

## Luồng hoạt động sau khi triển khai

```text
Admin Panel (/admin/ai → Functions tab)
  → Chọn "generate-brand-image"
  → Đổi model thành "gemini-2.5-flash-image" (tiết kiệm)
  → Lưu → ghi vào ai_function_configs table

generate-brand-image Edge Function
  → Gọi getAIConfig('generate-brand-image', orgId)
  → Đọc từ DB: model = "gemini-2.5-flash-image"
  → Cache 5 phút (không gọi DB liên tục)
  → Dùng flash làm primary, pro làm fallback
```

---

## Thứ tự thực hiện

1. Sửa `_shared/ai-config.ts` — thêm defaults cho `edit-image-background`
2. Sửa `generate-brand-image/index.ts` — thay hardcode bằng `getAIConfig`
3. Sửa `edit-image-background/index.ts` — thay hardcode bằng `getAIConfig`
4. Sửa `src/hooks/useAIConfig.ts` — thêm `edit-image-background` vào UI list
5. Deploy và kiểm tra

---

## Rủi ro & Giải pháp

| Rủi ro | Giải pháp |
|--------|-----------|
| `getAIConfig` bị lỗi (DB không trả về) | `ai-config.ts` đã có fallback về default — an toàn |
| Admin chọn model không hỗ trợ image generation | Log warning, fallback về `gemini-3-pro-image-preview` |
| Cache 5 phút gây delay khi Admin đổi model | Chấp nhận được — Admin đổi model không phải real-time critical |

---

## Kết quả kỳ vọng

Sau khi triển khai, Admin có thể:
- Vào `/admin/ai` → tab Functions
- Tìm `generate-brand-image`
- Đổi model sang `gemini-2.5-flash-image` (nhanh/rẻ hơn) hoặc giữ `gemini-3-pro-image-preview` (chất lượng cao)
- Lưu → có hiệu lực trong tối đa 5 phút (sau khi cache hết hạn)
- Tương tự với `edit-image-background`

