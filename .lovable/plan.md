
## Bối cảnh
User muốn verify "Layer 2 compliance scan" — nhưng từ history conversation, ta chưa thực sự build layer này. Các work đã làm là:
1. Cache compliance hash (defense-in-depth cho cache invalidation)
2. JSON repair validation (fullPrompt ≥ 30 từ, headline non-empty, slideNumber liên tục)
3. Multi-image logo input cho generate-carousel-image
4. Sequential V2 seamless carousel

**Chưa có**: post-generation compliance scan trên output text của carousel (caption, headline, CTA, fullPrompt) để bắt violation thực tế (VD "hiệu quả 100%", "chữa khỏi hoàn toàn").

Có sẵn `useCompliancePrecheck` (frontend, pre-generation) và `compliance-precheck-v2.ts` + `compliance-node.ts` (backend, pre-generation). **Không có** post-generation scan trên carousel output.

## Khảo sát cần làm
1. `supabase/functions/_shared/compliance/compliance-precheck-v2.ts` — xem logic scan hiện có để tái sử dụng
2. `supabase/functions/generate-carousel/index.ts` — xác định integration point sau khi parse JSON, trước khi cache + return
3. `industry_templates` schema — confirm có đủ field: forbidden_terms, claim_restrictions, forbidden_patterns, high_risk_keywords cho ngành aesthetic (Nghị định 38)
4. `ai_metrics` table — xem có cột nào log compliance event chưa, hoặc cần migration thêm

## Giải pháp — Layer 2 Post-Generation Compliance Scan

### A. Kiến trúc (trả lời câu hỏi then chốt)

**Decision matrix theo `riskLevel`:**

| Risk Level | Action | Retry |
|---|---|---|
| `low` (0 issue) | Pass → cache + return | — |
| `medium` (1 warning) | Pass + log warning + flag `needs_review=true` | — |
| `high` (≥2 warning) | **Auto-regenerate 1 lần** với "compliance feedback" inject vào prompt | Max 1 |
| `blocked` (≥1 error, VD forbidden_terms ngành y tế) | **BLOCK return** → trả `{ status: 'blocked', violations, requires_manual_override: true }` | 0 |

**Aesthetic vertical = block + manual override + audit trail**, đúng như user yêu cầu.

### B. Files & implementation

**1. New: `supabase/functions/_shared/compliance/compliance-postcheck.ts`**
```typescript
export interface PostCheckResult {
  passed: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'blocked';
  violations: Array<{
    slideNumber: number;
    field: 'headline' | 'body' | 'cta' | 'fullPrompt';
    type: 'forbidden_term' | 'claim_restriction' | 'forbidden_pattern';
    match: string;
    severity: 'error' | 'warning';
  }>;
  scannedFields: number;
  requiresManualOverride: boolean;
}

export function postCheckCarouselCompliance(
  slides: Slide[],
  resolvedRules: ResolvedRulesV2
): PostCheckResult
```

Scan **mỗi slide × mỗi field** (`headline`, `body`, `cta`, **`fullPrompt`** — vì fullPrompt là text rendered vào image qua text-in-prompt → CRITICAL cho aesthetic vertical).

Tái sử dụng logic regex word-boundary + Vietnamese normalization từ `useCompliancePrecheck.ts` (port sang Deno).

**2. Edit: `supabase/functions/generate-carousel/index.ts`**

Integration point: **sau** `validateRepairedSlides`, **trước** `withCache` save:
```typescript
// 1. Parse + normalize + validate (existing)
// 2. NEW: Post-generation compliance scan
const postCheck = postCheckCarouselCompliance(slides, resolvedRules);

if (postCheck.riskLevel === 'blocked') {
  // Log + return without caching
  await logComplianceEvent(supabase, { type: 'blocked', ... });
  return new Response(JSON.stringify({
    status: 'compliance_blocked',
    violations: postCheck.violations,
    requires_manual_override: true,
    audit_id: auditId,
  }), { status: 422, headers: corsHeaders });
}

if (postCheck.riskLevel === 'high' && retryCount === 0) {
  // Inject violations as "AVOID" instructions, regenerate ONCE
  const feedbackPrompt = buildComplianceFeedback(postCheck.violations);
  return await regenerateWithFeedback(feedbackPrompt, retryCount + 1);
}

// medium/low → continue, log + flag
```

**3. Migration: thêm cột vào `ai_metrics` (nếu chưa có)**
```sql
ALTER TABLE ai_metrics 
  ADD COLUMN IF NOT EXISTS compliance_risk_level text,
  ADD COLUMN IF NOT EXISTS compliance_violations jsonb,
  ADD COLUMN IF NOT EXISTS compliance_action text; -- 'pass' | 'regenerated' | 'blocked'
```

Hoặc tạo bảng mới `compliance_audit_log` riêng để query nhanh dashboard "X% aesthetic bị flag".

**4. Test fixtures: `supabase/functions/_shared/compliance/__tests__/postcheck-cases.ts`**

10 violation cases (aesthetic + medical):
- "Hiệu quả 100%" → forbidden_pattern
- "Chữa khỏi hoàn toàn" → claim_restriction (Nghị định 38)
- "Không tác dụng phụ" → forbidden_term
- "Cam kết kết quả" → claim_restriction
- "Đẹp như sao Hàn ngay sau 1 buổi" → forbidden_pattern
- "FDA chứng nhận" (sai sự thật) → high_risk_keyword
- "Giảm 10kg trong 7 ngày" → forbidden_pattern
- "An toàn tuyệt đối" → forbidden_term
- "Bác sĩ #1 Việt Nam" → unverifiable_claim
- "Trẻ ra 10 tuổi" → forbidden_pattern

5 clean cases để check false positive rate.

### C. Trả lời checklist của user

| Câu hỏi | Trả lời |
|---|---|
| Code scan ở đâu | `compliance-postcheck.ts` (shared) + integration trong `generate-carousel/index.ts` post-validate |
| Schema output | `PostCheckResult { passed, riskLevel, violations[], requiresManualOverride }` |
| Trigger | Sau parse+validate, trước cache save (sync, blocking) |
| Regex / LLM / Hybrid | **Regex-first** (fast, deterministic, $0 cost). LLM judge chỉ dùng cho `medium` cases ở Phase 2 |
| Action on violation | `blocked`→block; `high`→auto-regen 1 lần; `medium`→pass+flag; `low`→pass |
| Retry limit | **Max 1 regen** → tránh cost bomb |
| Rules source | DB: `industry_jurisdiction_profiles.resolved_rules` (đã có) — không hardcode |
| Coverage Nghị định 38 | Cần verify aesthetic industry trong DB có đủ `claim_restrictions` cho NĐ 38 — check riêng |
| Observability | `ai_metrics.compliance_*` cột mới + edge function log `[Compliance] BLOCKED slide=2 term="hiệu quả 100%"` |
| Scan text-in-image | **CÓ** — scan `fullPrompt` field (đây là text được render vào image) |

### D. Out of scope (phase 2)
- LLM judge cho semantic claim (VD "trông trẻ hơn" — hợp pháp, "trẻ ra 10 tuổi" — không)
- Vision-based OCR scan trên ảnh đã generate (verify text rendered đúng)
- Manual override UI + audit trail viewer

## Files dự kiến sửa
- **New**: `supabase/functions/_shared/compliance/compliance-postcheck.ts`
- **New**: `supabase/functions/_shared/compliance/__tests__/postcheck-cases.ts` (test fixtures)
- **Edit**: `supabase/functions/generate-carousel/index.ts` (integration + regen logic)
- **Migration**: `ai_metrics` thêm 3 cột compliance OR tạo `compliance_audit_log` mới
- **Apply same pattern (audit only)**: `generate-script`, `generate-multichannel` — task riêng

## Trade-off
- **Latency**: +50-200ms per generation (regex scan ~5ms + DB log ~50ms). Negligible.
- **Cost**: Auto-regen tăng cost ~1.5-2x cho `high` cases (~5-10% requests theo industry). Acceptable cho aesthetic.
- **False positive risk**: Regex word-boundary có thể bắt nhầm context (VD "không phải 100% an toàn"). Mitigate: severity `warning` cho ambiguous, `error` chỉ cho exact forbidden phrases.
- **Backward compat**: Brand không có `industry_template_id` → skip scan, behavior cũ giữ nguyên.

## Sau khi approve
Triển khai theo thứ tự: (1) shared postcheck util + test fixtures, (2) migration ai_metrics, (3) integrate vào generate-carousel với block/regen logic, (4) smoke test bằng 10 violation cases qua `supabase--test_edge_functions`, (5) verify aesthetic industry rules coverage trong DB.
