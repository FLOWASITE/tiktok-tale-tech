

## Plan: Hybrid Mode End-to-End Fix

### Problem
The Hybrid Mode pipeline has a critical gap: `decomposeRequest()` splits the description into `backgroundPrompt` (clean visual) and `overlayConfig` (structured text), but **the background prompt is never passed to the AI generation step**. The `generate-brand-image` call still receives the full `contentSummaries[channel]` with all text/structured content, defeating the purpose of decomposition.

### Current Flow (Broken)
```text
User description → decomposeRequest()
  ├─ backgroundPrompt  → ❌ UNUSED (discarded)
  └─ overlayConfig     → ✅ Passed as structuredOverlay → overlay-text-canvas
                          
generate-brand-image receives: contentSummaries[channel] (full text, not cleaned)
```

### Target Flow (Fixed)
```text
User description → decomposeRequest()
  ├─ backgroundPrompt  → ✅ Replaces contentSummary for AI generation
  └─ overlayConfig     → ✅ Passed as structuredOverlay → overlay-text-canvas
                          
generate-brand-image receives: "Clean background: city skyline, red-white tones, no text"
```

### Changes

**1. `SimpleImageGenerator.tsx` — Pass background prompt to batch options**

Expand `hybridOverlay` memo to also produce a `hybridBackgroundPrompts` map (per-channel override of `contentSummaries`). When hybrid mode is active, replace each channel's content summary with the decomposed background description.

```typescript
// In hybridOverlay useMemo, also return backgroundDescription
const { backgroundPrompt, overlayConfig } = decomposeRequest(summaryText, primaryColor);

// In batchOptions, add:
contentSummaries: useHybridMode && hybridBackgroundPrompt 
  ? Object.fromEntries(selectedChannels.map(ch => [ch, hybridBackgroundPrompt]))
  : contentSummaries,
```

~15 lines changed.

**2. `useAutoImageGeneration.ts` — Force background_only when structured overlay is present**

When `structuredOverlay` is provided, force `imageContentType` to `background_only` regardless of user setting, since all text will come from the overlay step.

```typescript
// Before Step 1:
const effectiveContentType = structuredOverlay 
  ? 'background_only' 
  : (useCanvasFallback ? 'background_only' : imageContentType);
```

~3 lines changed.

**3. `hybridImageGenerator.ts` — Improve background prompt output**

Current `backgroundPrompt.description` is just raw visual lines joined. Enhance it to produce a proper AI-generation-ready prompt string that explicitly says "no text, no UI elements, clean background".

~10 lines changed.

### Total: ~28 lines across 3 files. No new files. No breaking changes.

