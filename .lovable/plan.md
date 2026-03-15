

## Plan: Style-Adaptive Overlay for Hybrid Mode

### Problem
Overlay elements (banner, cards, hero text) use a fixed corporate style (solid white cards, hard borders, opaque backgrounds) regardless of the background's artistic style. A watercolor background with flat UI cards looks visually jarring.

### Approach
Define a **style theme map** that maps each `ImageStylePreset` to overlay visual parameters. Pass `imageStyle` through to the structured overlay edge function, which applies the appropriate theme.

### Changes

**1. `supabase/functions/overlay-text-canvas/index.ts` — Add style theme system**

Add a `OVERLAY_STYLE_THEMES` map keyed by image style preset:

```text
                    │ banner bg      │ card bg              │ border-radius │ font-weight │ text-shadow         │ hero effect
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
photorealistic      │ rgba(0,0,0,0.7)│ rgba(255,255,255,0.85)│ 8             │ 600         │ subtle              │ sharp
cinematic           │ rgba(0,0,0,0.8)│ rgba(0,0,0,0.6)      │ 4             │ 700         │ strong glow         │ cinematic glow
watercolor          │ rgba(p,0.6)    │ rgba(255,255,255,0.5) │ 16            │ 500         │ soft                │ watercolor wash
minimalist          │ primary solid  │ rgba(255,255,255,0.95)│ 2             │ 400         │ none                │ clean
illustration        │ primary solid  │ rgba(255,255,255,0.9) │ 12            │ 600         │ subtle              │ gradient
3d_render           │ rgba(0,0,0,0.7)│ rgba(255,255,255,0.8) │ 12            │ 700         │ strong              │ 3d depth
flat_design         │ primary solid  │ secondary solid       │ 0             │ 700         │ none                │ flat
```

Update `StructuredOverlayRequest` interface to accept optional `imageStyle?: string`.

Update `buildStructuredElement()` to look up the theme and apply it to banner, cards, hero text, headline, and CTA styles. ~50 lines.

**2. `src/hooks/useAutoImageGeneration.ts` — Pass imageStyle to overlay**

In the Step 4 structured overlay invocation (~line 280), add `imageStyle` to the request body from the existing `imageStylePreset` option. ~1 line.

**3. `src/lib/hybridImageGenerator.ts` — No changes needed**

The decomposition layer doesn't need style info — it's purely a rendering concern handled by the edge function.

### Total: ~60 lines changed across 2 files. No new files. No breaking changes. Backward-compatible (missing `imageStyle` defaults to current corporate style).

