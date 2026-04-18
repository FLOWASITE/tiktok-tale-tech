// ============================================
// Layer 2 — Post-Generation Compliance Scan
// ============================================
// Runs AFTER content generation, on every text field that will be
// shown to end-users OR rendered into images (fullPrompt). Catches
// violations that pre-check missed because the topic was clean but
// the model still produced forbidden claims (e.g. "hiệu quả 100%",
// "chữa khỏi hoàn toàn"). Critical for regulated verticals (aesthetic
// surgery — Nghị định 38, medical, financial).
//
// Decision matrix:
//   low      → pass
//   medium   → pass + flag needs_review
//   high     → caller should auto-regenerate ONCE with feedback
//   blocked  → caller MUST refuse to serve, require manual override
//
// Pure regex (no AI calls) → ~5ms per carousel, deterministic, $0.

// Loose, structural shape — works with both v1 IndustryMemory and
// v2 ResolvedRules / local MergedRules. We only read the fields below.
export interface PostCheckRulesSource {
  forbidden_terms?: string[] | null;
  forbidden_words?: string[] | null;
  claim_restrictions?: Array<string | { claim: string; alternative?: string }> | null;
  forbidden_patterns?: string[] | null;
  high_risk_keywords?: string[] | null;
}

export interface PostCheckSlide {
  slideNumber?: number;
  objective?: string;
  textContent?: string | {
    headline?: string;
    subtitle?: string;
    caption?: string;
    body?: string;
  };
  fullPrompt?: string;
}

export interface PostCheckViolation {
  slideNumber: number;
  field: 'headline' | 'subtitle' | 'caption' | 'body' | 'fullPrompt' | 'objective';
  type: 'forbidden_term' | 'claim_restriction' | 'forbidden_pattern' | 'high_risk_keyword';
  match: string;
  severity: 'error' | 'warning';
}

export interface PostCheckResult {
  passed: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'blocked';
  riskScore: number;
  violations: PostCheckViolation[];
  scannedFields: number;
  requiresManualOverride: boolean;
}

// ============== Vietnamese normalization (port of frontend logic) ==============

function normalizeVN(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Match `term` inside `text` with word boundaries, accent-insensitive.
 * Handles both original and Vietnamese-normalized forms.
 */
function termMatches(text: string, term: string): boolean {
  if (!text || !term) return false;
  const t = term.trim();
  if (t.length < 2) return false;

  const haystack = text.toLowerCase();
  const haystackNorm = normalizeVN(text);
  const needle = t.toLowerCase();
  const needleNorm = normalizeVN(t);

  try {
    // Word-boundary on original
    if (new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegex(needle)}(?:[^\\p{L}\\p{N}]|$)`, 'iu').test(haystack)) {
      return true;
    }
    // Word-boundary on normalized (catches "hieu qua" matching "hiệu quả")
    if (new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegex(needleNorm)}(?:[^\\p{L}\\p{N}]|$)`, 'iu').test(haystackNorm)) {
      return true;
    }
  } catch {
    return haystackNorm.includes(needleNorm);
  }
  return false;
}

// ============== Scoring ==============

const WEIGHTS = {
  forbidden_term: 50,        // hard ban → drives "blocked"
  forbidden_pattern: 30,
  claim_restriction: 20,
  high_risk_keyword: 15,
};

const THRESHOLDS = {
  medium: 20,
  high: 50,
  blocked: 80,
};

function levelFor(score: number, hasError: boolean): PostCheckResult['riskLevel'] {
  // Per plan: ANY error-severity violation → blocked (manual override required).
  // Forbidden terms / patterns in regulated verticals are non-negotiable.
  if (hasError) return 'blocked';
  if (score >= THRESHOLDS.high) return 'high';
  if (score >= THRESHOLDS.medium) return 'medium';
  return 'low';
}

// ============== Field extraction ==============

interface ScannableField {
  slideNumber: number;
  field: PostCheckViolation['field'];
  text: string;
}

function extractScannableFields(slides: PostCheckSlide[]): ScannableField[] {
  const out: ScannableField[] = [];
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const num = s.slideNumber ?? i + 1;

    if (s.objective && s.objective.trim()) {
      out.push({ slideNumber: num, field: 'objective', text: s.objective });
    }

    const tc = s.textContent;
    if (typeof tc === 'string') {
      if (tc.trim()) out.push({ slideNumber: num, field: 'body', text: tc });
    } else if (tc && typeof tc === 'object') {
      if (tc.headline?.trim()) out.push({ slideNumber: num, field: 'headline', text: tc.headline });
      if (tc.subtitle?.trim()) out.push({ slideNumber: num, field: 'subtitle', text: tc.subtitle });
      if (tc.caption?.trim()) out.push({ slideNumber: num, field: 'caption', text: tc.caption });
      if (tc.body?.trim()) out.push({ slideNumber: num, field: 'body', text: tc.body });
    }

    // CRITICAL: fullPrompt is rendered into the image via text-in-prompt.
    // Skipping this would let "hiệu quả 100%" land directly on the visual.
    if (s.fullPrompt && s.fullPrompt.trim()) {
      out.push({ slideNumber: num, field: 'fullPrompt', text: s.fullPrompt });
    }
  }
  return out;
}

// ============== Main scan ==============

export function postCheckCarouselCompliance(
  slides: PostCheckSlide[] | null | undefined,
  rules: PostCheckRulesSource | null | undefined,
  extraTexts?: { caption?: string | null; cta?: string | null },
): PostCheckResult {
  // No rules → cannot scan; treat as low risk (backward-compat for brands w/o industry pack).
  if (!rules || !slides || slides.length === 0) {
    return {
      passed: true,
      riskLevel: 'low',
      riskScore: 0,
      violations: [],
      scannedFields: 0,
      requiresManualOverride: false,
    };
  }

  const fields = extractScannableFields(slides);

  // Add carousel-level caption/cta as virtual "slide 0" entries
  if (extraTexts?.caption?.trim()) {
    fields.push({ slideNumber: 0, field: 'caption', text: extraTexts.caption });
  }
  if (extraTexts?.cta?.trim()) {
    fields.push({ slideNumber: 0, field: 'caption', text: extraTexts.cta });
  }

  const violations: PostCheckViolation[] = [];
  let score = 0;

  const forbiddenTerms = [
    ...(rules.forbidden_terms || []),
    ...(rules.forbidden_words || []),
  ].filter(Boolean);

  const claimList = (rules.claim_restrictions || [])
    .map((c) => (typeof c === 'string' ? c : c?.claim))
    .filter((s): s is string => !!s && s.trim().length > 0);

  const forbiddenPatterns = (rules.forbidden_patterns || []).filter(Boolean);
  const highRiskKw = (rules.high_risk_keywords || []).filter(Boolean);

  for (const f of fields) {
    // 1. Forbidden terms — ERROR (drives blocking)
    for (const term of forbiddenTerms) {
      if (termMatches(f.text, term)) {
        violations.push({
          slideNumber: f.slideNumber,
          field: f.field,
          type: 'forbidden_term',
          match: term,
          severity: 'error',
        });
        score += WEIGHTS.forbidden_term;
      }
    }

    // 2. Claim restrictions — WARNING (auto-regen at high)
    for (const claim of claimList) {
      // Substring match (claims are often phrases, not single words)
      const cn = normalizeVN(claim);
      const tn = normalizeVN(f.text);
      if (cn.length >= 4 && tn.includes(cn)) {
        violations.push({
          slideNumber: f.slideNumber,
          field: f.field,
          type: 'claim_restriction',
          match: claim,
          severity: 'warning',
        });
        score += WEIGHTS.claim_restriction;
      }
    }

    // 3. Forbidden patterns — ERROR
    for (const pat of forbiddenPatterns) {
      const clean = pat.replace(/\[.*?\]/g, '').trim();
      if (clean.length >= 4 && normalizeVN(f.text).includes(normalizeVN(clean))) {
        violations.push({
          slideNumber: f.slideNumber,
          field: f.field,
          type: 'forbidden_pattern',
          match: pat,
          severity: 'error',
        });
        score += WEIGHTS.forbidden_pattern;
      }
    }

    // 4. High-risk keywords — WARNING
    for (const kw of highRiskKw) {
      if (termMatches(f.text, kw)) {
        violations.push({
          slideNumber: f.slideNumber,
          field: f.field,
          type: 'high_risk_keyword',
          match: kw,
          severity: 'warning',
        });
        score += WEIGHTS.high_risk_keyword;
      }
    }
  }

  const hasError = violations.some((v) => v.severity === 'error');
  const riskLevel = levelFor(score, hasError);

  return {
    passed: !hasError && riskLevel !== 'blocked',
    riskLevel,
    riskScore: score,
    violations,
    scannedFields: fields.length,
    requiresManualOverride: riskLevel === 'blocked',
  };
}

/**
 * Build a feedback prompt fragment to inject into a regeneration request.
 * Lists the violations as explicit "AVOID" instructions.
 */
export function buildComplianceFeedback(violations: PostCheckViolation[]): string {
  if (violations.length === 0) return '';
  const grouped = new Map<string, Set<string>>();
  for (const v of violations) {
    if (!grouped.has(v.type)) grouped.set(v.type, new Set());
    grouped.get(v.type)!.add(v.match);
  }
  const lines: string[] = [
    '',
    '## ⛔ COMPLIANCE FEEDBACK — REGENERATION REQUIRED',
    'The previous output contained the following compliance violations.',
    'You MUST avoid all of them in this regeneration:',
    '',
  ];
  for (const [type, terms] of grouped) {
    lines.push(`### ${type.replace(/_/g, ' ').toUpperCase()}`);
    for (const t of terms) lines.push(`- DO NOT use: "${t}"`);
    lines.push('');
  }
  lines.push('Rewrite ALL slides — including fullPrompt fields — without any of the above terms or claims.');
  return lines.join('\n');
}
