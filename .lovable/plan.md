
## Vấn đề (đồng ý với chuyên gia)

Cache key hiện tại trong `generate-carousel` có lỗ hổng compliance nghiêm trọng:
- Cache key bao gồm `brandVoice` nhưng **KHÔNG bao gồm version/hash của Industry Memory rules** (compliance_rules, forbidden_terms, claim_restrictions, argument_patterns).
- Khi admin update `industry_templates.compliance_rules` mà không bump `promptSchemaVersion` thủ công → cache hit → bài cũ (có thể vi phạm rule mới) được trả về.
- Với ngành thẩm mỹ/y tế, 1 lần hit sai = vi phạm Luật Quảng cáo. **Rủi ro pháp lý, không chỉ chất lượng.**
- `promptSchemaVersion: 'carousel_v5'` là manual bump → dễ quên.

## Khảo sát cần làm
- `supabase/functions/generate-carousel/index.ts` — tìm chỗ build cache key, xác định fields hiện có.
- `supabase/functions/_shared/cache/redis-cache.ts` (đã thấy) — `generateCacheKey()` nhận `brandVersion` nhưng KHÔNG nhận `industryVersion`.
- `supabase/functions/_shared/data-fetchers/industry-fetcher.ts` (đã thấy) — `IndustryMemory` đã có field `version`. Tốt — chỉ cần truyền vào.
- Các edge functions khác có cache liên quan compliance: `generate-multichannel`, `generate-script`, `generate-carousel-image`, `score-ad-creative`. Cần audit cùng lúc để fix triệt để (cùng pattern).

## Giải pháp (3 lớp)

### Lớp 1 — Mở rộng `generateCacheKey()` shared util
**File:** `supabase/functions/_shared/cache/redis-cache.ts`

Thêm 2 params mới (optional để backward-compat):
- `industryVersion?: string` — version từ `industry_templates.version`
- `complianceRulesHash?: string` — SHA-256 của serialized merged compliance rules (gồm `compliance_rules`, `forbidden_terms`, `claim_restrictions`, `forbidden_patterns`, `claim_substitutions`)

Hash này được **inject vào payload trước khi tính SHA-256 cuối**, đảm bảo bất kỳ thay đổi rule nào → key đổi → cache miss.

### Lớp 2 — Thêm helper `hashComplianceRules()`
**File mới:** `supabase/functions/_shared/cache/compliance-hash.ts`

```typescript
export async function hashComplianceRules(industry: IndustryMemory | null): Promise<string> {
  if (!industry) return 'no-industry';
  // Canonical serialization: sort keys, include all rule fields
  const canonical = JSON.stringify({
    v: industry.version,
    cr: industry.compliance_rules ?? [],
    ft: (industry.forbidden_terms ?? []).slice().sort(),
    cl: industry.claim_restrictions ?? [],
    fp: industry.argument_patterns?.forbidden_patterns ?? [],
    sr: industry.system_rules ?? [],
    fw: (industry.forbidden_words ?? []).slice().sort(),
  });
  // SHA-256 → hex (16 chars)
  return sha256Hex(canonical).slice(0, 16);
}
```

Lý do dùng cả `version` + hash thực: nếu admin sửa rule mà **quên bump version**, hash vẫn đổi → vẫn miss cache. Defense-in-depth.

### Lớp 3 — Áp dụng vào `generate-carousel` (và các function compliance-sensitive khác)
**Files cần sửa:**
- `supabase/functions/generate-carousel/index.ts` (ưu tiên #1)
- `supabase/functions/generate-carousel-image/index.ts`
- `supabase/functions/generate-multichannel/index.ts`
- `supabase/functions/generate-script/index.ts`
- `supabase/functions/score-ad-creative/index.ts` (nếu có cache)

Pattern thay thế:
```typescript
// TRƯỚC
const cacheKey = await generateCacheKey(brandId, 'carousel', {...input, brandVoice}, 'carousel_v5', brandVersion);

// SAU
const complianceHash = await hashComplianceRules(industryMemory);
const cacheKey = await generateCacheKey(
  brandId,
  'carousel',
  {...input, brandVoice},
  'carousel_v5',
  brandVersion,
  industryMemory?.version,   // NEW
  complianceHash              // NEW
);
```

### Lớp 4 — Auto-invalidation trigger (DB)
**Migration:** Thêm trigger `invalidate_cache_on_industry_rules_update` trên `industry_templates` để **auto-bump `version`** khi bất kỳ rule field nào đổi (compliance_rules, forbidden_terms, claim_restrictions, argument_patterns, system_rules). Hiện đã có `invalidate_cache_on_industry_update` nhưng nó chỉ trigger khi `version` đổi — cần đảo ngược: rule đổi → version tự bump → cascade invalidation.

Đồng thời gọi `invalidateByPrefix(\`flowa:cache:*:${nodeType}:\`)` từ một edge function admin endpoint khi bump rule (best-effort, không blocking).

## Files dự kiến sửa
- `supabase/functions/_shared/cache/redis-cache.ts` (mở rộng signature)
- `supabase/functions/_shared/cache/compliance-hash.ts` (mới)
- `supabase/functions/generate-carousel/index.ts`
- `supabase/functions/generate-carousel-image/index.ts`
- `supabase/functions/generate-multichannel/index.ts`
- `supabase/functions/generate-script/index.ts`
- `supabase/functions/_shared/data-fetchers/industry-fetcher.ts` (đảm bảo trả về đủ field cho hash)
- Migration: trigger auto-bump `industry_templates.version` khi rule fields đổi

## Trade-off
- **Cache hit rate giảm nhẹ** sau mỗi lần admin update rule (đúng — đó là mục tiêu).
- **Latency mỗi request +1-2ms** do tính SHA-256 hash compliance rules (negligible).
- **Backward compat**: param mới optional → các function chưa migrate vẫn chạy bình thường, chỉ là chưa được bảo vệ.

## Sau khi user approve
Đọc các file trên rồi triển khai theo thứ tự: shared util → helper hash → áp dụng vào `generate-carousel` trước (vertical aesthetic surgery), sau đó cascade sang các function khác trong cùng commit.
