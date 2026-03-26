

# Redesign Step 5: Image Generation Mode Selection

## Problem
Currently Step 5 auto-triggers image generation immediately after content completes, with the manual button being just a fallback. Users have no choice — images are always auto-generated. The user wants **two clear options**:

1. **Tự động tạo ảnh** — Auto-generate immediately (current behavior)
2. **Tự chọn & tạo ảnh** — Navigate to a dedicated image creation interface after content is done

## Solution

### Phase 1: Add Image Mode Selector in Step 5

When `generationComplete === true` and `imagePhase === 'idle'`, instead of showing one button, show **two option cards**:

```text
┌─────────────────────────────────────────────────────┐
│  Step 5: Tạo ảnh AI cho các kênh                    │
│                                                     │
│  ┌─────────────────┐  ┌─────────────────────────┐   │
│  │ ⚡ Tự động       │  │ 🎨 Tự chọn & tạo ảnh   │   │
│  │ AI tạo ảnh ngay │  │ Vào trang chi tiết để   │   │
│  │ cho N kênh      │  │ tùy chỉnh từng kênh    │   │
│  └─────────────────┘  └─────────────────────────┘   │
│                                                     │
│  [Bỏ qua bước này →]                               │
└─────────────────────────────────────────────────────┘
```

### Phase 2: Disable Auto-trigger

The `useEffect` in `MultiChannelCreate.tsx` (line 199-219) currently auto-starts the pipeline. **Remove** this auto-trigger — let the user decide via the Step 5 UI.

### Phase 3: "Tự chọn & tạo ảnh" navigates to content detail

When user picks option 2, navigate to `/multichannel` (content list) where they can open the content and use the existing image management features there. Or if a detail route exists, navigate directly.

## Technical Changes — 2 files

### 1. `src/pages/MultiChannelCreate.tsx`
- **Remove** the auto-trigger `useEffect` (lines 196-219) that calls `imagePipeline.startPipeline` automatically
- Keep the `onStartImagePipeline` prop handler — it's used by the manual "Tự động" button

### 2. `src/components/multichannel/MultiChannelFormWizard.tsx` (~line 1988-2060)

Replace the current idle state UI block with two option cards:

**Option A — "Tự động tạo ảnh"**: Existing button logic calling `onStartImagePipeline` with all current params. Shows Sparkles icon, gradient style.

**Option B — "Tự chọn & tạo ảnh"**: A card that navigates to `/multichannel` (content list) so user can open the content and manually manage images per channel. Shows Palette/Image icon, outline style.

Both cards are presented side-by-side (grid-cols-2) with clear descriptions:
- Card A: "AI sẽ tự động tạo ảnh cho tất cả kênh cùng lúc"
- Card B: "Xem nội dung đã tạo và tạo ảnh từng kênh theo ý bạn"

Keep all other states (generating, complete, error) unchanged.

### Props
- Add `imageAutoMode` state (boolean) to track if user chose auto. Default: `undefined` (not yet chosen)
- When auto is chosen → trigger pipeline immediately
- When manual is chosen → navigate away with toast "Bạn có thể tạo ảnh sau trong trang chi tiết nội dung"

