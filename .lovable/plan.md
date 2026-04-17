

## Goal
Add a "Tạo lại Caption & CTA" button in the empty space (red box) next to "Copy tất cả" in the Caption & CTA tab. Clicking it regenerates only the caption + CTA suggestions using AI based on the existing carousel topic + slides, without touching slides/images.

## Changes

### 1. New edge function: `supabase/functions/regenerate-carousel-caption/index.ts`
- Auth via JWT (service client pattern per project memory).
- Input: `{ carouselId }`.
- Loads carousel (title, topic, platform, slides_content, brand info, carousel_style, visual_preset).
- Calls Lovable AI (`google/gemini-2.5-flash`) with a focused prompt reusing the same HOOK-BODY-CTA-HASHTAG + multi-tier CTA formulas already used in `generate-carousel/index.ts` (extracted constants for caption/CTA only). Tool-calling with `captionSuggestion` + `ctaSuggestion` schema.
- Handles 402/429 with friendly errors per project resilience pattern.
- Updates `carousels.caption_suggestion` and `cta_suggestion`. Returns the new values.
- Verifies workspace ownership via `organization_id`.

### 2. `src/components/CarouselViewer.tsx`
- Add `regenerating` state + `handleRegenerateCaption` async handler that:
  - Calls `supabase.functions.invoke('regenerate-carousel-caption', { body: { carouselId: carousel.id } })`.
  - On success: refresh carousel data (reuse the existing refetch pattern — find via `onUpdate` / parent refresh callback; if not present, optimistically update local state with returned values).
  - Toast success/error.
- Add the button in the flex row at line 1163, placed to the LEFT of "Copy tất cả" (matches red-box position):
```tsx
<div className="flex justify-end gap-2">
  <Button variant="outline" size="sm" onClick={handleRegenerateCaption} disabled={regenerating} className="h-7 xs:h-8 text-xs">
    {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
    <span className="ml-1 xs:ml-1.5">Tạo lại</span>
  </Button>
  <Button variant="outline" size="sm" onClick={handleCopyCaptionAll} ...>Copy tất cả</Button>
</div>
```
- Show the row even when no caption exists yet (so user can generate first time too) — drop the `(carousel.caption_suggestion || carousel.cta_suggestion)` guard, but conditionally hide "Copy tất cả" when nothing to copy.

### 3. Refresh after regenerate
Check existing `CarouselViewer` props for an `onUpdate`/refetch callback. If present, call it after success. Otherwise update local `carousel` state via the parent's react-query invalidation (`queryClient.invalidateQueries(['carousels'])`).

## Result
- Người dùng có thể bấm "Tạo lại" để AI sinh lại Caption & CTA mới mà không phải tạo lại toàn bộ carousel.
- Loading spinner trong khi xử lý, toast feedback rõ ràng.
- Tận dụng đúng công thức HOOK-BODY-CTA-HASHTAG + multi-tier CTA đã có sẵn trong hệ thống.

