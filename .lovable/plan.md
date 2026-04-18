
## Bối cảnh

User đã review audit lần 1 và đưa ra verdict + priority list rất rõ. Cần triển khai 4 fix theo thứ tự, **đồng thời trả lời 4 câu hỏi cuối** để confirm scope của Risk 1 (P0 hay không).

## Phase 0 — Investigation (trả lời 4 câu hỏi trước khi code)

Đọc files để confirm trước khi fix:
1. `supabase/functions/_shared/cache/compliance-hash.ts` → đã có sẵn (xem Core context). Confirm: hash bao gồm `forbidden_words`, `preferred_words`, `system_rules`, `forbidden_patterns`, `valid_patterns`, `brand_voice` object. **`language_style` & `allow_emoji` không có** → cần verify chúng nằm trong `brand_voice` object hay không.
2. `supabase/functions/_shared/compliance/compliance-postcheck.ts` → đã có (vừa tạo). Confirm scan `fullPrompt` field hay không.
3. `supabase/functions/generate-carousel-image/index.ts` → tìm logic chọn provider (`getAIConfig` / model selection). Xác định **default provider production**.
4. Search `sceneDescription = null` / warning log.

## Phase 1 — CRITICAL: Populate `sceneDescription` cho mọi provider (1-2 ngày work, scope nhỏ)

**File**: `supabase/functions/generate-carousel-image/index.ts`

**Approach**: Sau khi PoYo/KIE/GeminiGen trả về `imageUrl`, gọi Gemini Flash describe call (~$0.001/slide) để extract scene description.

```typescript
async function describeImageForContinuity(imageUrl: string, lovableApiKey: string): Promise<string> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Describe this image's visual style, color palette, lighting, composition, and key subjects in 2-3 sentences. No markdown, no JSON, plain prose only." },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      }],
    }),
  });
  const data = await resp.json();
  let desc = data?.choices?.[0]?.message?.content || "";
  // Strip markdown/JSON artifacts
  desc = desc.replace(/```[\s\S]*?```/g, "").replace(/[*_#`]/g, "").replace(/\s+/g, " ").trim();
  return desc.slice(0, 300);
}
```

Apply cho **tất cả** provider branches (PoYo, KIE, GeminiGen) — không chỉ Lovable Gateway. Cũng strip markdown trên Lovable Gateway path (fix bug raw slice).

**Persist vào DB** — migration thêm column:
```sql
ALTER TABLE carousel_images 
  ADD COLUMN IF NOT EXISTS scene_description text;
```
Save `sceneDescription` vào row khi insert. Frontend `useCarouselImages` đọc lại khi single-slide regenerate.

## Phase 2 — HIGH: Fix cache-store-before-validate (30 phút)

**File**: `supabase/functions/generate-carousel/index.ts`

Move `validateRepairedSlides()` **vào trong** `withCache` generateFn, trước khi return. Nếu fail → throw → cache không store invalid payload.

```typescript
const result = await withCache(cacheKey, async () => {
  const generated = await generateAIContent(...);
  const normalized = normalizeAndRepair(generated);
  const validation = validateRepairedSlides(normalized.slides, slideCount);
  if (!validation.valid) {
    throw new Error(`SLIDE_VALIDATION_FAIL: ${validation.errors.join("; ")}`);
  }
  return normalized;
});
```

## Phase 3 — HIGH: Logo cho mọi slide (Option A + C hybrid)

**Option A (immediate)**: Trong `generate-carousel-image/index.ts`, đổi logic provider selection:
```typescript
// Nếu brand có logo + includeLogo=true → force Lovable Gateway
if (includeLogo && resolvedLogoUrl && imageProvider !== "lovable-gateway") {
  console.log("[provider] Switching to Lovable Gateway: brand has logo (multi-image required)");
  imageProvider = "lovable-gateway";
}
```

**Option C deferred** (composite overlay với sharp/canvas) — out of scope task này, ghi note tạo task riêng.

## Phase 4 — MEDIUM: Admin cache invalidation endpoint (4 giờ)

**New edge function**: `supabase/functions/admin-cache-invalidate/index.ts`

```typescript
// POST /admin-cache-invalidate
// Body: { organization_id?: uuid, industry_template_id?: uuid, brand_template_id?: uuid }
// Auth: require admin role via has_role(uid, 'admin')
```

Implementation:
- Verify caller is admin (`user_roles` table).
- Build prefix: `flowa:cache:{brandId}:*` hoặc query `ai_response_cache` table by `industry_memory_version`.
- Call `invalidateByPrefix()` (Redis) + `DELETE FROM ai_response_cache WHERE ...` (Postgres fallback).
- Return `{ deleted_redis: N, deleted_pg: M }`.

UI button (later task): Settings → Brand → "Flush AI cache".

## Phase 5 — LOW: Confirm `hashComplianceRules` coverage

**File audit only**: `supabase/functions/_shared/cache/compliance-hash.ts` đã shown trong context.

Confirm hash includes: `version`, `compliance_rules`, `claim_restrictions`, `forbidden_terms`, `forbidden_words`, `preferred_words`, `system_rules`, `forbidden_patterns`, `valid_patterns`, **`brand_voice` (full object)**.

`language_style`, `allow_emoji`, `formality_level` thường nằm trong `brand_voice` JSON → đã được cover qua `bv: industry.brand_voice`. **Không cần fix**, chỉ document rõ trong memory.

## Files dự kiến sửa

- **Edit**: `supabase/functions/generate-carousel-image/index.ts` (describe call + provider switch + markdown strip)
- **Edit**: `supabase/functions/generate-carousel/index.ts` (move validate vào withCache)
- **Edit**: `src/hooks/useCarouselImages.ts` (đọc + lưu `scene_description`)
- **New**: `supabase/functions/admin-cache-invalidate/index.ts`
- **Migration**: ADD COLUMN `carousel_images.scene_description text`
- **Memory update**: `mem://features/carousel/sequential-v2-seamless-vn` — add note "scene_description giờ persist + populate cho mọi provider"

## Trade-off

- **Cost**: +$0.001/slide cho describe call (Gemini Flash Lite). Acceptable.
- **Latency**: +1-2s/slide. Có thể fire-and-forget (lưu DB async, slide kế tiếp đợi 1s nếu chưa có).
- **Backward compat**: Existing carousels không có `scene_description` → fallback to `null` → behavior cũ giữ.

## Out of scope (task riêng)

- Option C composite overlay (sharp/canvas) — Phase 2.
- Admin UI button cho cache flush — Phase 2.
- Vision-based logo verification — Phase 3.

## Sau khi approve

Triển khai theo thứ tự: Phase 0 (read files để xác định default provider) → Phase 2 (quick win 30 phút) → Phase 1 (sceneDescription + migration) → Phase 3 (provider switch) → Phase 4 (admin endpoint) → update memory.
