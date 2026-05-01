## Vấn đề

Khi gen ảnh /multichannel với mode `ai_render` (mặc định), pipeline chạy 4 bước:

1. **STEP 1** — `generate-brand-image` với `structuredElements` (banner/headline/cards/CTA/footer) → AI (Gemini/Seedream) **đã bake** toàn bộ text + footer vào ảnh, rất đẹp và đúng chỗ.
2. **STEP 2** — overlay logo (OK).
3. **STEP 3** — canvas overlay text (skip nếu có structured).
4. **STEP 4** — `overlay-text-canvas` vẽ lại banner/headline/cards/CTA/**footer** bằng Satori/Resvg lên trên ảnh AI.

Bug ở **STEP 4**: trong `useAutoImageGeneration.ts` (line 572) cờ `frontendForcedStructuredFallback` được set thành `true` mỗi khi `isAiRenderMode && (footer || text hoặc structured)` — tức gần như **mọi lần gen**. Hậu quả: canvas vẽ đè footer/CTA/headline lần thứ hai lên footer/CTA/headline mà AI đã render → text trùng, footer chồng nhau, layout xấu (đúng triệu chứng user mô tả).

Backend `generate-brand-image` đã có cơ chế `recommendedOverlayMode` + `fallbackRecommended` để báo khi nào AI render thất bại và CẦN canvas fallback. Cần tin cờ này thay vì frontend tự ép.

## Giải pháp

Sửa logic fallback trong `src/hooks/useAutoImageGeneration.ts` để:

1. **Chỉ chạy STEP 4 (structured canvas overlay) khi backend thực sự yêu cầu fallback** (`fallbackRecommended === true` hoặc `recommendedOverlayMode !== 'ai_render'`). Bỏ `frontendForcedStructuredFallback` (xoá ép buộc khi AI render đã thành công).
2. **Tương tự cho STEP 3 (text canvas overlay)** — chỉ chạy khi backend báo fallback. Ảnh AI render `with_text` đã có headline rồi.
3. **Giữ STEP 2 logo overlay** như cũ (logo luôn cần canvas vì AI không bake-in logo file).
4. **Vẫn cho phép user ép Satori** qua `options.overlayMode='satori'` — chỉ thay đổi default `ai_render` flow.
5. **Thêm log rõ ràng** "STEP 4 SKIPPED — AI accepted, no double-render" để debug sau này.

### Files thay đổi

- `src/hooks/useAutoImageGeneration.ts`
  - Line ~572-575: bỏ `frontendForcedStructuredFallback` & `frontendForcedTextFallback`, chỉ giữ điều kiện `!isAiRenderMode || backendRequestedFallback`.
  - Cập nhật `fallbackReasons` log để phản ánh.
  - Cập nhật `requiredBranding` log để debug-only (không driving logic).

### Edge cases

- Nếu provider/model không bake text tốt → backend trả `recommendedOverlayMode='satori'` → STEP 3/4 vẫn chạy như cũ.
- Nếu user manual chọn `overlayMode='satori'` → flow cũ giữ nguyên.
- Telegram pipeline (`branded-image-composer.ts`) không bị ảnh hưởng — nó vốn đã chỉ overlay logo, không có STEP 3/4.

### QA

- Test gen 1 bài Facebook + 1 bài Instagram có brand footer đầy đủ → ảnh chỉ có 1 lớp footer/CTA/headline (do AI render), không bị đè.
- Console log `[Pipeline:facebook] ⏭ STEP 4 SKIPPED — ai_render accepted by backend`.
- Mở DevTools Network → không còn POST tới `overlay-text-canvas` ở STEP 4 trong happy path.
- Test 1 case ép `overlayMode='satori'` → STEP 4 vẫn chạy (regression check).

## Risk

Thấp. Đây là **bỏ một bước double-render thừa**. Nếu một channel cụ thể nào đó AI render kém, backend đã có cơ chế trả `fallbackRecommended=true` để bật lại canvas — không mất khả năng phục hồi.
