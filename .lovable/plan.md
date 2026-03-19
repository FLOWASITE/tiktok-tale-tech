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

---

## Feature: Facebook Webhooks — Nhận engagement realtime — đã sửa

### Vấn đề
Hệ thống chưa có cách nhận realtime engagement (comment, reaction, share) từ Facebook khi user tương tác trên bài đã đăng qua Flowa.

### Đã sửa (4 files + 1 migration + 1 secret)
1. **Migration SQL** — Tạo bảng `social_post_engagements` (post_id, event_type, event_data, sender_id, sender_name, facebook_event_id unique) + RLS (org members read, service_role insert)
2. **`supabase/functions/facebook-webhook/index.ts`** — **Mới**: GET verification (hub.verify_token), POST nhận feed changes → match page_id → social_connections → upsert engagement
3. **`supabase/functions/connect-social/index.ts`** — Thêm `pages_manage_metadata` vào OAuth scope
4. **`supabase/functions/facebook-oauth-callback/index.ts`** — Thêm scope + auto-subscribe page tới webhook (`POST /{page_id}/subscribed_apps?subscribed_fields=feed`)
5. **`supabase/config.toml`** — Thêm `[functions.facebook-webhook]` verify_jwt=false
6. **Secret** — `FACEBOOK_WEBHOOK_VERIFY_TOKEN` đã được tạo

### Lưu ý
- Cần cấu hình Webhook URL trên Facebook Developer Console: `https://rllyipiyuptkibqinotz.supabase.co/functions/v1/facebook-webhook`
- User cần kết nối lại Facebook để cấp thêm permission `pages_manage_metadata`

---

## Feature: 6 Design Style System cho Image Generation Engine — đã triển khai

### Vấn đề
Hệ thống dùng font `Be Vietnam Pro` cứng cho mọi style, padding đồng nhất, AI decompose không biết style để chọn layout phù hợp.

### Đã sửa (4 files)
1. **`supabase/functions/overlay-text-canvas/index.ts`** — Mở rộng `OverlayStyleTheme` thêm `fontFamily`, `headingFontFamily`, `spacingMultiplier`, `preferredLayout`, `ctaBorderRadius`, `cardBoxShadow`, `bannerLetterSpacing`. Cập nhật 6 theme chính (minimalist→Inter, flat_design→Montserrat, gradient→Plus Jakarta Sans, geometric→Open Sans+Playfair Display, illustration→Nunito, product_only→Be Vietnam Pro). Dynamic font loading per style. Spacing multiplier cho padding/gap.
2. **`supabase/functions/_shared/image-prompt-data.ts`** — Cập nhật keywords 6 presets chính xác hơn theo Design System docs (minimalist→negative space, flat_design→blocky+data-driven, gradient→neon+glow, geometric→corporate+navy, illustration→warm, product_only→studio)
3. **`supabase/functions/decompose-image-request/index.ts`** — Nhận `imageStyle` param, inject style→layout preference hint vào AI prompt (minimalist→hero_text, flat_design→banner_cards, geometric→split...)
4. **`src/lib/hybridImageGenerator.ts`** + **`src/components/multichannel/SimpleImageGenerator.tsx`** — Truyền `imageStyle` qua pipeline decompose

---

## Phase 0-3: Carousel Design Token System — đã triển khai

### Phase 0: DB Foundation
- Tạo bảng `carousel_style_presets` + seed 6 presets (minimalist, flat_design, gradient, geometric, illustration, product_only)
- RLS: authenticated READ, service_role WRITE
- Frontend helper `src/lib/carouselStylePresets.ts` với in-memory cache 5 phút

### Phase 1: Frontend Parameter Expansion
- `useImageGeneration.ts` mở rộng options: carouselStyle, totalSlides, slideObjective, visualPreset, seamlessContext
- `CarouselViewer.tsx` truyền context đầy đủ khi generate

### Phase 2: Upgrade Text Overlay System
- `generate-carousel-image`: detectSlideRole() + getOverlayConfig() matrix per preset×role
- `overlay-text-canvas`: 8 vị trí mới, glass/solid-block/cta-button treatments, dynamic font scaling
- Gallery visual slides skip overlay hoàn toàn

### Phase 3: Seamless Continuity + Style Presets + Gallery Optimization
1. **`supabase/functions/generate-carousel-image/index.ts`** — Fetch `carousel_style_presets` từ DB (parallel với getAIConfig), inject design tokens (colors/effects/typography) vào prompt, seamlessContext (colorPalette + previousSceneDescription) cho visual continuity, gallery 4:5 aspect ratio cho Facebook
2. **`src/components/CarouselViewer.tsx`** — extractColorPalette() từ slide colorLayout, truyền seamlessContext tuần tự qua các slide khi Generate All, previousSceneDescription chain

---

## Carousel Visual Engine — 6 Gap Fixes — đã triển khai

### Phase A: Gallery Hook Dark Gradient
- **`generate-carousel-image/index.ts`** — Detect `gallery + hook` → gửi `bottomGradient: true` xuống overlay
- **`overlay-text-canvas/index.ts`** — Render gradient div (transparent → rgba(0,0,0,0.65)) ở bottom 40% dưới text

### Phase B: Multi-layer Text Hierarchy
- **`generate-carousel-image/index.ts`** — `parseTextLayers()` parse textContent thành headline/subtitle/body/accent theo slideRole
- **`overlay-text-canvas/index.ts`** — Render mỗi layer với fontSize/fontWeight/opacity khác nhau, fallback single-text khi chỉ 1 line

### Phase C: Brand Color Blending
- **`generate-carousel-image/index.ts`** — Inject `brandColors` vào background prompt ("Brand identity colors...") + truyền xuống overlay
- **`overlay-text-canvas/index.ts`** — Dùng brand color cho solid-block bg và glass tint thay vì hardcoded rgba

### Phase D: Content-aware Text Fitting
- **`generate-carousel-image/index.ts`** — `adjustOverlayForTextDensity()`: text >120 chars → shrink font + widen maxWidth; text <20 chars → enlarge font + narrow maxWidth

### Phase E: Listicle Decorative Elements
- **`generate-carousel-image/index.ts`** — Khi listicle + body: gửi `decorations.slideNumberBadge` + `decorations.progressDots`
- **`overlay-text-canvas/index.ts`** — Render numbered circle badge (top-left) + progress dots (bottom center)

### Phase F: Seamless Quality Validation
- **`generate-carousel-image/index.ts`** — Extract `sceneDescription` từ AI response text, return trong response
- **`src/hooks/useImageGeneration.ts`** — Return type mở rộng thành `GenerateImageResult { imageUrl, sceneDescription }`
- **`src/components/CarouselViewer.tsx`** — Dùng `result.sceneDescription` cho `previousSceneDescription` thay vì `slide.objective`
