

# Fix Manual Mode Image Generation (All Prompt Modes)

## Root Cause

The manual mode per-channel "Tạo ảnh" buttons call `onStartImagePipeline([singleChannel], ...)` which triggers the full pipeline — setting `imagePhase` from `'idle'` → `'preparing'` → `'generating_images'` → `'complete'`. 

Once `imagePhase` leaves `'idle'`, the manual UI (channel cards with individual buttons) disappears permanently because it only renders when `imagePhase === 'idle'`. After one channel completes, the user is stuck on the completion screen and cannot generate images for remaining channels.

This affects **all prompt modes** in manual mode, but is most noticeable with "Giữ Brand" and "Toàn quyền" since users choosing manual mode with these modes expect granular control.

## Solution — 2 files

### 1. `src/components/multichannel/MultiChannelFormWizard.tsx`

**Replace the manual mode idle-only UI with a persistent manual interface that works across all phases:**

- Change the manual mode rendering condition: instead of only showing when `imagePhase === 'idle'`, show the channel cards **whenever `imageMode === 'manual'`** regardless of phase
- Each channel card shows its individual status: idle → generating → complete/error
- Use `imageProgress` (per-channel status) to show inline spinners on channels being generated
- Use `generatedImages` to show completed channels with preview thumbnails and "Tạo lại" option
- Keep the "Tạo tất cả" button available at all times
- After generating a single channel, the pipeline completes but the manual UI stays visible — user can click another channel

**Key change:** The `imagePhase === 'idle'` guard on the manual UI block (line 2123) should be removed. Instead, render the manual channel grid as the primary view when `imageMode === 'manual'`, showing per-channel progress inline on each card.

### 2. `src/hooks/useAutoImagePipeline.ts`

**Make `startPipeline` additive — don't reset all progress when generating a single channel:**

- When `startPipeline` is called with a subset of channels (e.g., 1 channel in manual mode), preserve existing `generatedImages` for other channels instead of resetting everything
- Add a parameter or check: if `channels.length < totalChannels`, merge new results with existing ones instead of wiping
- After single-channel generation completes, set `phase` back to `'idle'` if we detect this was a manual single-channel request (based on channels.length === 1 or a new `isManualTrigger` flag)

### Summary of UI behavior after fix

```text
Manual mode, Step 5:
┌────────────────────────────────────────┐
│  [Tạo tất cả]                         │
│                                        │
│  ┌─ facebook ──────────┐  ✅ Done     │
│  │  Preview text...    │  [Tạo lại]   │
│  └─────────────────────┘              │
│  ┌─ instagram ─────────┐  ⏳ Generating│
│  │  Preview text...    │  [Spinner]    │
│  └─────────────────────┘              │
│  ┌─ tiktok ────────────┐  🔘 Idle     │
│  │  Preview text...    │  [Tạo ảnh]   │
│  └─────────────────────┘              │
└────────────────────────────────────────┘
```

Each channel operates independently. Completed channels show thumbnails. The UI never disappears.

