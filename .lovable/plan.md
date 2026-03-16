

## Plan: Thêm Logo Safe-Area vào AI Render Prompt

### Nguyên nhân gốc
Khi "Để AI lo" (full mode), hệ thống dùng `ai_render` mode — AI tạo ảnh kèm text/cards/banner trực tiếp. Sau đó logo được overlay lên. Nhưng AI **không biết** logo sẽ nằm ở đâu, nên nó render nội dung đè lên vùng logo.

Safe-area logic hiện tại trong `overlay-text-canvas` (Step 4 - Satori) **không được chạy** trong `ai_render` mode vì Step 4 bị skip.

### Giải pháp
Thêm chỉ dẫn logo safe-area vào prompt gửi cho AI trong `structuredElementsToPromptText()`, để AI biết **chừa vùng trống** cho logo.

### Thay đổi — 1 file

**`supabase/functions/generate-brand-image/index.ts`**

1. Thêm `logoPosition` và `logoSizePercent` vào `GenerateImageRequest` interface
2. Truyền thêm logo info vào `structuredElementsToPromptText()`
3. Trong hàm `structuredElementsToPromptText()`, thêm đoạn prompt:

```text
## LOGO SAFE ZONE (CRITICAL — DO NOT place any text/cards/elements here):
- A logo will be overlaid at the TOP-LEFT corner
- Keep the top-left area (~15% width, ~12% height) COMPLETELY CLEAR
- No banner text, cards, hero text, or CTA should overlap this zone
```

**`src/hooks/useAutoImageGeneration.ts`**

4. Truyền `logoPosition` và `logoSizePercent` vào request body của `generate-brand-image` khi `isAiRenderMode` và logo được bật:

```typescript
// In Step 1 body:
logoSafeZone: isAiRenderMode && includeLogo && logoUrl ? {
  position: logoPosition || 'bottom-right',
  sizePercent: logoSizePercent || 15,
} : undefined,
```

### Logic chi tiết

Hàm `structuredElementsToPromptText()` sẽ nhận thêm param `logoSafeZone`:

```typescript
function structuredElementsToPromptText(
  elements, colors, templateId,
  logoSafeZone?: { position: string; sizePercent: number }
): string {
  // ... existing code ...
  
  if (logoSafeZone) {
    const posLabels = {
      'top-left': 'top-left corner',
      'top-right': 'top-right corner',
      'bottom-left': 'bottom-left corner',
      'bottom-right': 'bottom-right corner',
      'top-center': 'top-center edge',
      'bottom-center': 'bottom-center edge',
      'center-left': 'center-left edge',
      'center-right': 'center-right edge',
      'center': 'center of the image',
    };
    parts.push(`\n## LOGO SAFE ZONE (CRITICAL):
- A brand logo will be placed at the ${posLabels[logoSafeZone.position]} after generation
- Keep that area (~${logoSafeZone.sizePercent}% of image width) COMPLETELY CLEAR of text, cards, banners
- Shift overlapping elements away from the logo zone`);
  }
}
```

### Scope
- 2 files sửa:
  - `supabase/functions/generate-brand-image/index.ts` (~20 dòng)
  - `src/hooks/useAutoImageGeneration.ts` (~5 dòng)
- Không thay đổi overlay-text-canvas (Satori safe-area vẫn giữ nguyên cho non-ai_render mode)
- AI prompt-based approach — không đảm bảo 100% nhưng cải thiện đáng kể so với hiện tại (0% awareness)

