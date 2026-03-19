

# Carousel Image: Lấy model từ cài đặt Function AI

## Vấn đề hiện tại

Edge function `generate-carousel-image` **hardcode** model `google/gemini-3-pro-image-preview` (dòng 53) thay vì đọc từ hệ thống cấu hình AI (`ai-config.ts` → bảng `ai_function_configs`).

Các edge function khác (generate-multichannel, generate-hooks, v.v.) đều dùng `getAIConfig()` để lấy model động từ Admin Panel, nhưng carousel image thì không.

## Giải pháp

Sửa `supabase/functions/generate-carousel-image/index.ts`:

1. **Import `getAIConfig`** từ `../_shared/ai-config.ts`
2. **Gọi `getAIConfig('generate-carousel-image')`** để lấy model đã cấu hình
3. **Thay thế hardcoded model** bằng `aiConfig.model`
4. **Thêm default config** cho `generate-carousel-image` trong `ai-config.ts` (hiện chưa có) với model mặc định `google/gemini-3-pro-image-preview`

### File sửa

1. **`supabase/functions/_shared/ai-config.ts`** — Thêm default config:
   ```typescript
   'generate-carousel-image': {
     model: 'google/gemini-3-pro-image-preview',
     temperature: 0.7,
     max_tokens: 1024,
     cache_ttl_seconds: 0,
     is_enabled: true,
     priority_level: 'normal',
   },
   ```

2. **`supabase/functions/generate-carousel-image/index.ts`** — Đọc config động:
   ```typescript
   import { getAIConfig } from "../_shared/ai-config.ts";
   
   // Thay vì hardcode:
   const aiConfig = await getAIConfig('generate-carousel-image');
   const imageModel = aiConfig.model;
   
   // Dùng imageModel trong API call
   body: JSON.stringify({
     model: imageModel,  // thay vì 'google/gemini-3-pro-image-preview'
     ...
   })
   ```

Sau khi sửa, admin có thể đổi model carousel image trong trang **Cài đặt AI → Function Config** mà không cần sửa code.

