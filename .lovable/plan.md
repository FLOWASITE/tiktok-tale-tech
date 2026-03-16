
## Fix: Layout luôn chỉ có 1 kiểu — đã sửa

### Vấn đề
Frontend dùng ternary cứng thay vì lấy layout từ template, khiến tất cả ảnh đều render cùng 1 layout.

### Đã sửa (3 files)
1. **`src/hooks/useAutoImageGeneration.ts`** — Mở rộng type union thêm `'split' | 'stack'`
2. **`src/lib/hybridImageGenerator.ts`** — `DecomposedRequest` thêm field `layout?`, `applyTemplate` trả về `layout` từ template
3. **`src/components/multichannel/SimpleImageGenerator.tsx`** — Dùng `applyResult.layout` thay vì ternary cứng, fallback vẫn giữ logic cũ cho template 'auto'

---

## Feature: AI hiểu sâu nội dung để chọn Layout & Text phù hợp — đã sửa

### Vấn đề
AI decompose chỉ nhận ~600 ký tự summary chung chung, không biết content_role/goal/angle → layout và text overlay luôn generic.

### Đã sửa (3 files)
1. **`supabase/functions/decompose-image-request/index.ts`** — Nhận `context` (contentRole/Goal/Angle/topic), thêm chiến lược chọn layout trong system prompt, trả `suggestedLayout` trong response
2. **`src/lib/hybridImageGenerator.ts`** — Thêm `DecomposeContext` interface, `decomposeRequestWithAI` nhận context param, trả `suggestedLayout`
3. **`src/components/multichannel/SimpleImageGenerator.tsx`** — Thêm `getFullChannelContent` (2000 chars), truyền full content + strategic context, ưu tiên `suggestedLayout` khi auto mode
