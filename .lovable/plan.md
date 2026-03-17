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

---

## Feature: Regenerate sử dụng Core Content — đã sửa

### Vấn đề
Regenerate chỉ dùng `topic` (vài từ) để viết lại → nội dung bị generic, mất key messages, mất góc nhìn chiến lược.

### Đã sửa (1 file)
1. **`supabase/functions/generate-multichannel/index.ts`** — Fetch core content khi regenerate (content + key_messages + content_role), inject vào system prompt + user prompt, fallback về logic cũ khi không có core content

---

## Fix: Layout ảnh chỉ có 1 kiểu (infographic) do thiếu content_role + prompt ép 4 cards — đã sửa

### Vấn đề
1. `content_role` luôn NULL trong DB → AI decompose không có context chiến lược
2. System prompt ép "LUÔN tạo đúng 4 thẻ" → autoSelectTemplate luôn chọn infographic
3. TypeScript interface thiếu `content_role` và `content_angle` → phải dùng `(content as any)`

### Đã sửa (4 files)
1. **`src/types/multichannel.ts`** — Thêm `content_role: string | null` và `content_angle: string | null` vào `MultiChannelContent`
2. **`src/hooks/useMultiChannelContents.ts`** — Map `content_role` và `content_angle` từ DB vào interface
3. **`supabase/functions/decompose-image-request/index.ts`** — Sửa prompt: cards chỉ tạo khi nội dung giáo dục/liệt kê, KHÔNG tạo cho storytelling/quote/awareness
4. **`src/components/multichannel/SimpleImageGenerator.tsx`** — Bỏ `(content as any)`, thêm fallback fetch `content_role` từ `core_contents` khi bản ghi chính thiếu

---

## Feature: Education Infographic template với numbered cards + summary ribbon — đã sửa

### Vấn đề
Hệ thống chưa hỗ trợ tạo ảnh infographic phức tạp dạng "banner + numbered cards + ribbon tóm tắt + CTA + footer liên hệ" giống ảnh mẫu giáo dục.

### Đã sửa (6 files + 2 edge functions)
1. **`src/lib/hybridImageUtils.ts`** — Thêm `number?: number` vào `OverlayCardItem`, thêm `OverlaySummaryRibbon` interface, thêm `summaryRibbon` vào `StructuredOverlayConfig`
2. **`src/lib/hybridImageGenerator.ts`** — Tương tự hybridImageUtils + thêm `education_infographic` vào `suggestedLayout` enum, `autoSelectTemplate` detect contact+cards→education_infographic, `applyTemplate` handle numbered cards + summaryRibbon
3. **`src/config/overlayTemplates.ts`** — Thêm template `education_infographic` (layout stack, requiredSlots: banner+cards+summaryRibbon+cta+footer, cards numbered=true)
4. **`src/hooks/useAutoImageGeneration.ts`** — Thêm `number` vào card items type, thêm `summaryRibbon` vào structuredOverlay
5. **`src/components/multichannel/SimpleImageGenerator.tsx`** — Pass `summaryRibbon` qua overlay elements
6. **`supabase/functions/decompose-image-request/index.ts`** — Thêm `education_infographic` vào enum + strategy, thêm `summaryRibbon` vào tool schema + validation, thêm `number` vào card items schema
7. **`supabase/functions/overlay-text-canvas/index.ts`** — Render numbered circles (primary color bg) cho cards có `number`, render summary ribbon (gradient bg), update Smart Density cho summaryRibbon
