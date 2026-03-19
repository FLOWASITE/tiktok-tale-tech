

## Plan: Add In-Memory Font Cache to `overlay-text-canvas`

### Problem
Each `overlay-text-canvas` invocation fetches fonts from Google Fonts API. A 7-slide carousel with 3-4 weights = 21-28 HTTP requests adding 200-500ms each.

### Changes (1 file: `supabase/functions/overlay-text-canvas/index.ts`)

**Step 1 — Add cache infrastructure after line 8 (after `corsHeaders`)**

Insert global `fontCache` Map, `FONT_CACHE_TTL` (10 min), `FONT_CACHE_MAX_SIZE` (50), `getCachedFont()`, and `setCachedFont()` helpers. These persist across invocations within the same Deno isolate.

**Step 2 — Wrap `loadGoogleFont` (lines 350-391) with cache**

At function start (after line 352, once `fontFamily` is computed):
- Build `cacheKey = ${family}-${weight}` (using original `family` param, not URL-encoded)
- Check `getCachedFont(cacheKey)`, return on HIT with log
- On MISS, log and continue existing fetch logic
- After `fontData = await fontResponse.arrayBuffer()` (line 384), call `setCachedFont(cacheKey, fontData)` before returning

**Step 3 — Add cache stats log in serve handler**

After the response is built (before the final return around line 2028), add:
```
console.log(`[Font Cache] Size: ${fontCache.size} entries`);
```

### What stays unchanged
- Font family/weight selection, theme config, `loadMultipleFontWeights` signature
- All Satori render logic (JSX, positioning, layers, decorations)
- Everything else in the 2041-line file

### Expected impact
- First carousel slide: same speed (cold cache)
- Slides 2-7: near-zero font loading time (cache HITs)
- Net saving: ~15-20 fewer HTTP requests per carousel, ~4-8 seconds total

