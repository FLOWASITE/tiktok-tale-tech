

## Plan: Add `seamlessContext` to Single-Slide Regeneration

### Problem
`handleGenerateImage` (single slide) doesn't pass `seamlessContext`, causing regenerated slides in seamless carousels to break visual continuity.

### Change (1 file)

**`src/components/CarouselViewer.tsx` — lines 307-318**

Before calling `generateImage`, add seamless context building (only when `carousel_style === 'seamless'`):

1. Extract `colorPalette` from first slide using existing `extractColorPalette` function
2. Get `previousSceneDescription` from the previous slide's objective/headline
3. Pass `seamlessContext` object with `sequencePosition` and `totalInSequence`
4. Add `seamlessContext` to the options object passed to `generateImage`

No other functions or files are modified. `handleGenerateAllImages`, `useImageGeneration`, and `extractColorPalette` remain untouched.

### Note
`extractColorPalette` is defined at line 409, which is **after** `handleGenerateImage` at line 307. Both are inside the same component scope, so JavaScript hoisting of `const` means we need to verify this doesn't cause a runtime error. Since `handleGenerateImage` is only called asynchronously (on button click), `extractColorPalette` will always be defined by then — no issue.

