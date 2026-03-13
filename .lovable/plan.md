

## Plan: Add "Sửa chữ" (Refine Text) button to SimpleImageGenerator

The user's screenshot shows the SimpleImageGenerator dialog — the refine text feature currently only exists in the MultiChannelViewer's lightbox and action bar, but NOT in the image generation dialog's streaming/preview grid.

### Changes needed:

**1. `src/components/multichannel/streaming/ImageStreamingCard.tsx`**
- Add `onRefineText?: () => void` prop
- Add a "Sửa chữ" button (with `Type` icon) next to the existing "Sửa nền" button in the action buttons area when image is done

**2. `src/components/multichannel/streaming/ImageStreamingGrid.tsx`**
- Add `onRefineText?: (channel: Channel) => void` prop
- Pass it down to each `ImageStreamingCard`
- Pass it to the `ImageLightbox` as `onRefineText`

**3. `src/components/multichannel/SimpleImageGenerator.tsx`**
- Import and use `useBackgroundEditor` hook for refine text functionality
- Add `handleRefineText(channel)` handler that calls `editBackground` with `editType: 'refine_text'` and updates the generated image on success
- Pass `onRefineText` to `ImageStreamingGrid`

This reuses the existing `edit-image-background` edge function which already supports the `refine_text` edit type.

