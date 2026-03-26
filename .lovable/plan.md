

# Fix Agent Image Generation — Match Manual Quality

## Problem
Agent images lack text and logos because of 3 small but critical gaps in `agent-creator-v2/index.ts`. The `generate-brand-image` edge function already handles all brand data internally — **no extra DB fetch needed**.

## Root Cause (line 179-187 of agent-creator-v2)

```typescript
// CURRENT — hardcoded, no logo overlay
callFunction(supabaseUrl, serviceKey, "generate-brand-image", {
  contentId,
  channel,
  brandTemplateId,
  imageContentType: "background_only",  // ← always no text
  contentSummary: channelText.slice(0, 500),
  contentRole, contentAngle,
  // missing: logoSafeZone
});
// missing: overlay-logo-canvas call after
```

## Solution — 3 changes, 1 file

### File: `supabase/functions/agent-creator-v2/index.ts`

**Change 1: Smart `imageContentType`** (line ~183)
Instead of hardcoding `"background_only"`, derive from channel text length:
- Text ≤ 120 chars → `"with_text"` (AI renders text directly)
- Text > 120 chars → `"background_only"` (too long for in-image text)

Also pass `textToInclude` when using `with_text` mode.

**Change 2: Pass `logoSafeZone`** (line ~187)
The brand brief already has `include_logo` and `logo_url` (fetched at line 100-144). Use them:
```typescript
logoSafeZone: brief.include_logo && brief.logo_url
  ? { position: 'bottom-right', sizePercent: 12 }
  : undefined,
```

**Change 3: Call `overlay-logo-canvas` after image generation** (after line ~197)
When `brief.include_logo && brief.logo_url`, call `overlay-logo-canvas` with the generated image URL:
```typescript
if (brief.include_logo && brief.logo_url && result.imageUrl) {
  const overlayResult = await callFunction(supabaseUrl, serviceKey, "overlay-logo-canvas", {
    baseImageUrl: result.imageUrl,
    logoUrl: brief.logo_url,
    position: 'bottom-right',
    logoStyle: 'shadow',
    logoSizePercent: 12,
    contentId,
    channel,
  });
  if (overlayResult.success) {
    result.imageUrl = overlayResult.imageUrl;
  }
}
```

### Why this works
- `generate-brand-image` already fetches brand colors, style, persona, hooks internally from `brandTemplateId` + `contentId`
- `overlay-logo-canvas` uses ImageScript (pixel-level canvas) — deterministic, fast (~2-3s)
- The brand brief is already fetched at line 93-144 — we just use `brief.include_logo` and `brief.logo_url` that are already available
- No new DB queries, no new dependencies

### Scope: 1 file
- `supabase/functions/agent-creator-v2/index.ts` — modify `generateImagesForChannels` function (~20 lines changed)

