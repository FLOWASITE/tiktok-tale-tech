// ============================================
// Compliance Rules Hash — Defense-in-Depth
// ============================================
// Hash the *actual* compliance rule content (not just a version string)
// so that an admin who edits rules but forgets to bump industry version
// still triggers a cache MISS. This protects against silent compliance
// violations (esp. medical/aesthetic-surgery vertical legal risk).
//
// Used together with `industry_templates.version` — both must match for
// a cache hit. Either one changing invalidates cache.

/**
 * Loose, structural shape of an Industry Memory used across edge functions.
 * Different `generate-*` functions define their own narrower IndustryMemory
 * interfaces — we duck-type here so this helper works with all of them.
 */
export interface ComplianceRulesSource {
  version?: string | null;
  compliance_rules?: unknown;        // string[] | { rule: string; ... }[]
  claim_restrictions?: unknown;      // string[] | { claim: string; ... }[]
  forbidden_terms?: unknown;         // string[]
  forbidden_words?: unknown;         // string[]
  preferred_words?: unknown;         // string[]
  system_rules?: unknown;            // string[]
  argument_patterns?: {
    valid_patterns?: unknown;
    forbidden_patterns?: unknown;
  } | null;
  brand_voice?: Record<string, unknown> | null;
}

/**
 * SHA-256 → hex.
 */
async function sha256Hex(message: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(message),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Sort an array of strings if it looks like one, otherwise return as-is.
 * Stable sort makes the hash insensitive to insertion order.
 */
function stableArr(v: unknown): unknown {
  if (!Array.isArray(v)) return v ?? [];
  // String arrays → sort. Object arrays → sort by JSON string repr.
  if (v.every((x) => typeof x === 'string')) {
    return [...v].sort();
  }
  return [...v]
    .map((x) => JSON.stringify(x))
    .sort()
    .map((s) => JSON.parse(s));
}

/**
 * Compute a short stable hash of all compliance-relevant rule fields.
 * Returns a 16-char hex prefix (64 bits — collision risk negligible at our scale).
 *
 * Returns 'no-industry' when no industry memory is provided so cache keys
 * remain stable for brands without an industry pack.
 */
export async function hashComplianceRules(
  industry: ComplianceRulesSource | null | undefined,
): Promise<string> {
  if (!industry) return 'no-industry';

  // Canonical serialization: explicit field order, sorted arrays.
  const canonical = JSON.stringify({
    v:  industry.version ?? null,
    cr: stableArr(industry.compliance_rules),
    cl: stableArr(industry.claim_restrictions),
    ft: stableArr(industry.forbidden_terms),
    fw: stableArr(industry.forbidden_words),
    pw: stableArr(industry.preferred_words),
    sr: stableArr(industry.system_rules),
    fp: stableArr(industry.argument_patterns?.forbidden_patterns),
    vp: stableArr(industry.argument_patterns?.valid_patterns),
    bv: industry.brand_voice ?? null,
  });

  const full = await sha256Hex(canonical);
  return full.slice(0, 16);
}
