# Cho phép Admin chọn model cho Keyframe Synthesis

## Vấn đề
`keyframe-synthesizer.ts` hardcode `google/gemini-3.1-flash-image-preview` (primary) + `google/gemini-2.5-flash-image` (fallback). Không qua `getAIConfig()` → Admin AI page (`/admin/ai`) không thấy entry này, không thể đổi model (vd sang `google/gemini-3-pro-image-preview` để chất lượng cao hơn).

## Giải pháp
Đăng ký Keyframe Synthesis vào `ai_function_configs` như một "virtual function" (giống pattern SEO functions), category=`video`, để hiện trong Admin AI và cho phép override model.

## Các thay đổi

### 1. Migration: seed entry vào `ai_function_configs`
```sql
INSERT INTO ai_function_configs (function_name, category, default_model, model_override, description, is_enabled)
VALUES (
  'keyframe-synthesizer',
  'video',
  'google/gemini-3.1-flash-image-preview',
  NULL,
  'Dựng keyframe (ảnh tĩnh) từ ảnh nhân vật + product để Veo i2v giữ identity',
  true
)
ON CONFLICT (function_name) DO NOTHING;
```

### 2. `supabase/functions/_shared/keyframe-synthesizer.ts`
- Import `getAIConfig` từ `_shared/ai-config.ts`
- Trong `synthesizeKeyframe()`, gọi `getAIConfig('keyframe-synthesizer', supabaseClient)` để lấy `model_override` → dùng làm `PRIMARY_MODEL` runtime
- Giữ `FALLBACK_MODEL = 'google/gemini-2.5-flash-image'` hardcode (an toàn nhất)
- Cần truyền `supabaseClient` vào `synthesizeKeyframe()` (hiện đã có sẵn từ caller `generate-video/index.ts`)

### 3. `supabase/functions/generate-video/index.ts`
- Truyền `supabase` client vào call `synthesizeKeyframe({...})`

### 4. UI Admin (`src/pages/AdminAIManagement.tsx` hoặc hook tương đương)
- Filter list image-edit models cho category=`video` function name `keyframe-synthesizer`: chỉ show `google/gemini-3.1-flash-image-preview`, `google/gemini-3-pro-image-preview`, `google/gemini-2.5-flash-image` (3 model image-edit hợp lệ)
- Có thể tận dụng existing image-edit allowlist nếu đã có

### 5. Memory update
Cập nhật `.lovable/memory/features/video/multi-character-identity-lock-vn.md`: ghi rõ keyframe model giờ có thể override qua Admin AI (function_name=`keyframe-synthesizer`).

## Files sẽ sửa
- `supabase/migrations/<timestamp>_seed_keyframe_ai_config.sql` (mới)
- `supabase/functions/_shared/keyframe-synthesizer.ts`
- `supabase/functions/generate-video/index.ts` (truyền client)
- `src/pages/AdminAIManagement.tsx` hoặc model picker hook (mở allowlist nếu cần)
- `.lovable/memory/features/video/multi-character-identity-lock-vn.md`

## Test sau khi deploy
1. Vào `/admin/ai` → thấy entry "keyframe-synthesizer" trong group `video`
2. Đổi sang `google/gemini-3-pro-image-preview` → render scene có character
3. Log edge function `generate-video` phải show `[keyframe-synth] ✅ keyframe built model=google/gemini-3-pro-image-preview`
4. Bỏ override → tự động về `gemini-3.1-flash-image-preview` default
