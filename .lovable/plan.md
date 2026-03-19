

## Problem

When clicking "Tạo Prompt + Ảnh", line 173 in `Carousel.tsx` runs `setFormSheetOpen(false)` **immediately** — before `generateCarousel()` finishes (which takes 20-40 seconds). The user is thrown back to the carousel list page with **zero feedback** about what's happening. The CarouselViewer only opens after the API returns.

```text
Current flow:
  Click button → Form closes instantly → Blank list (20-40s) → Viewer opens
  
Desired flow:
  Click button → Form stays open with loading → API returns → Viewer opens
  OR
  Click button → Form closes → Floating progress indicator visible → Viewer opens
```

## Plan

### Option chosen: Keep form open during generation

This is the simplest fix with maximum UX benefit. The CarouselForm already has a beautiful loading state with phases — the problem is that the parent closes the form before the loading state is ever shown.

### Changes

**File: `src/pages/Carousel.tsx`** (~5 lines changed)

Move `setFormSheetOpen(false)` to AFTER `generateCarousel` completes, not before:

```typescript
const handleGenerateCarousel = async (formData) => {
  // REMOVED: setFormSheetOpen(false) — don't close form yet
  const newCarousel = await generateCarousel(formData);
  if (newCarousel) {
    // ... topic link logic (unchanged) ...
    
    setFormSheetOpen(false);          // Close form AFTER success
    setSelectedCarousel(newCarousel);
    setAutoGenerateImages(formData.autoGenerateImages || false);
    setViewerOpen(true);
  }
  // If generation failed, form stays open so user can retry
};
```

This single change means:
1. The form stays visible during generation
2. The existing loading animation (4-phase progress bar) is shown to the user
3. On success, form closes and viewer opens seamlessly
4. On failure, the user stays on the form and can retry

No new components needed. No UI changes. Just moving one line.

