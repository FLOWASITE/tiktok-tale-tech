

# Fix "Tự chọn & tạo sau" — Show Image Creator Instead of Navigating Away

## Problem
Currently when user selects "Tự chọn & tạo sau", the system navigates to `/multichannel` after content completes. This is wrong — user should stay on the wizard and see the image creation interface where they can manually trigger image generation.

## Changes — 1 file

### `src/components/multichannel/MultiChannelFormWizard.tsx`

**1. Fix auto-advance logic (line ~894-905)**

Change the `manual` branch: instead of `navigate('/multichannel')`, advance to Step 5 just like auto mode, but without auto-triggering the pipeline.

```tsx
useEffect(() => {
  if (generationComplete && currentStep === 4) {
    setCompletedSteps(prev => [...prev.filter(s => s !== 4), 4]);
    // Both modes advance to Step 5 — the difference is whether pipeline auto-starts
    setCurrentStep(5);
  }
}, [generationComplete, currentStep]);
```

**2. Update Step 5 idle state UI (line ~2073-2100)**

When `imageMode === 'manual'` and `generationComplete`, show a per-channel image creation interface with individual trigger buttons instead of the single "Tạo ảnh AI cho N kênh" bulk button:

- Show each channel as a card with its generated text preview
- Each card has a "Tạo ảnh" button to trigger image generation for that specific channel
- Add a "Tạo tất cả" button at the top as convenience

When `imageMode === 'auto'`, auto-trigger the pipeline immediately upon entering Step 5 (restore auto-trigger behavior but only for auto mode).

**3. Add auto-trigger for auto mode only (new useEffect)**

```tsx
useEffect(() => {
  if (currentStep === 5 && imageMode === 'auto' && imagePhase === 'idle' && generationComplete) {
    // Auto-start pipeline
    if (getChannelText && onStartImagePipeline) {
      const channelTexts = {};
      formData.channels.forEach(ch => channelTexts[ch] = getChannelText(ch));
      onStartImagePipeline(formData.channels, channelTexts, { ... });
    }
  }
}, [currentStep, imageMode, imagePhase, generationComplete]);
```

This way:
- **Auto mode**: enters Step 5 → pipeline starts automatically
- **Manual mode**: enters Step 5 → shows channel cards with individual "Tạo ảnh" buttons, user controls the pace

