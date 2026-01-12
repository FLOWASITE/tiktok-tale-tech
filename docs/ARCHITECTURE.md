# Industry Park v2.1 - Architecture Document

> **Version**: 2.1  
> **Last Updated**: 2026-01-12  
> **Status**: Production  
> **Authors**: Development Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Database Architecture](#2-database-architecture)
3. [Core Data Structures](#3-core-data-structures)
4. [System Architecture](#4-system-architecture)
5. [Data Flow: Rule Resolution](#5-data-flow-rule-resolution)
6. [Risk Scoring Engine](#6-risk-scoring-engine)
7. [Jurisdiction Support](#7-jurisdiction-support)
8. [Key Design Decisions](#8-key-design-decisions)
9. [Integration Points](#9-integration-points)
10. [File Structure](#10-file-structure)
11. [Performance Considerations](#11-performance-considerations)
12. [Migration Strategy](#12-migration-strategy)
13. [Testing Strategy](#13-testing-strategy)
14. [Monitoring & Error Handling](#14-monitoring--error-handling)
15. [Scalability & Cost Considerations](#15-scalability--cost-considerations)
16. [API/Endpoint Documentation](#16-apiendpoint-documentation)
17. [User Roles & Permissions](#17-user-roles--permissions)
18. [Sample Data](#18-sample-data)
19. [Roadmap & Future Enhancements](#19-roadmap--future-enhancements)
20. [Dependencies & Tech Stack](#20-dependencies--tech-stack)

---

## 1. Executive Summary

Industry Park v2.1 là hệ thống quản lý **compliance rules** và **brand voice guidelines** theo từng ngành nghề và khu vực pháp lý (jurisdiction). Hệ thống này đóng vai trò là "governance moat" của platform, đảm bảo nội dung AI-generated tuân thủ quy định pháp luật và phù hợp với từng thị trường.

### Key Features
- **Multi-jurisdiction support**: Hỗ trợ 6+ khu vực pháp lý (VN, US, EU, APAC, MENA, GLOBAL)
- **Pre-computed rules**: `resolved_rules` được tính toán trước để tối ưu performance
- **Real-time risk scoring**: Đánh giá compliance risk trong quá trình tạo content
- **Admin management**: Dashboard quản lý Global Packs và Jurisdiction Profiles

### Design Principles
1. **Immutability**: Industry rules không thể bị user override
2. **Pre-computation**: Rules được resolve sẵn, không tính toán runtime
3. **Graceful fallback**: GLOBAL jurisdiction làm fallback mặc định
4. **Audit trail**: Mọi thay đổi đều được log

---

## 2. Database Architecture

### 2.1 Entity Relationship Diagram

```
┌─────────────────────────────┐
│   industry_global_packs     │
│─────────────────────────────│
│ id (PK)                     │
│ industry_code (UNIQUE)      │
│ target_audience             │
│ global_brand_voice (JSONB)  │
│ global_terminology (JSONB)  │
│ global_compliance_rules     │
│ global_claim_restrictions   │
│ global_argument_patterns    │
│ risk_guidelines (JSONB)     │
│ related_industries          │
│ is_active                   │
│ created_at, updated_at      │
└──────────────┬──────────────┘
               │
               │ 1:N
               ▼
┌─────────────────────────────┐
│ industry_jurisdiction_      │
│        profiles             │
│─────────────────────────────│
│ id (PK)                     │
│ global_pack_id (FK)         │◄──────┐
│ jurisdiction_code           │       │
│ local_overrides (JSONB)     │       │
│ resolved_rules (JSONB)      │       │
│ key_regulations (JSONB)     │       │
│ disclaimer                  │       │
│ validity_status             │       │
│ created_at, updated_at      │       │
└─────────────────────────────┘       │
                                      │
┌─────────────────────────────┐       │
│ industry_pack_translations  │       │
│─────────────────────────────│       │
│ id (PK)                     │       │
│ global_pack_id (FK)         │───────┘
│ language_code               │
│ name                        │
│ description                 │
│ created_at, updated_at      │
└─────────────────────────────┘

┌─────────────────────────────┐
│     brand_templates         │
│─────────────────────────────│
│ id (PK)                     │
│ global_pack_id (FK)         │───────► References industry_global_packs
│ jurisdiction_code           │
│ industry_template_id (FK)   │───────► Legacy reference (deprecated)
│ ...                         │
└─────────────────────────────┘
```

### 2.2 Table Descriptions

| Table | Purpose | Row Count (Est.) |
|-------|---------|------------------|
| `industry_global_packs` | Centralized industry rules (source of truth) | 34 |
| `industry_jurisdiction_profiles` | Pre-computed rules per jurisdiction | 41 |
| `industry_pack_translations` | Localized names/descriptions | 68 |
| `brand_templates` | User brands linking to packs | 29 |

### 2.3 Key Indexes

```sql
-- Primary access patterns
CREATE INDEX idx_global_packs_code ON industry_global_packs(industry_code);
CREATE INDEX idx_profiles_pack_jurisdiction ON industry_jurisdiction_profiles(global_pack_id, jurisdiction_code);
CREATE INDEX idx_translations_pack_lang ON industry_pack_translations(global_pack_id, language_code);
CREATE INDEX idx_brand_templates_pack ON brand_templates(global_pack_id);
```

---

## 3. Core Data Structures

### 3.1 IndustryGlobalPack (Source of Truth)

```typescript
interface IndustryGlobalPack {
  id: string;
  industry_code: string;                    // e.g., "PHARMA", "FINTECH"
  target_audience: 'b2b' | 'b2c' | 'both';
  
  // Voice & Tone
  global_brand_voice: {
    tone_of_voice: string[];               // ["professional", "empathetic"]
    formality_level: 'formal' | 'casual' | 'neutral';
    language_style: string[];              // ["simple", "technical"]
    allow_emoji: boolean;
  };
  
  // Terminology Control
  global_terminology: {
    forbidden_terms_global: string[];      // Universal forbidden terms
    forbidden_words_by_lang: Record<string, string[]>;
    preferred_terms: string[];
  };
  
  // Compliance
  global_compliance_rules: ComplianceRule[];
  global_claim_restrictions: ClaimRestriction[];
  global_argument_patterns: ArgumentPattern[];
  
  // Risk Assessment
  risk_guidelines: {
    high_risk_keywords: string[];
    scoring_weights: Record<string, number>;
    risk_thresholds: { low: number; medium: number; high: number; blocked: number };
  };
  
  related_industries: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### 3.2 ResolvedRules (Pre-computed for AI)

```typescript
interface ResolvedRules {
  industry_code: string;
  jurisdiction_code: string;
  names: { vi: string; en: string };
  target_audience: string;
  
  // Merged from global + local
  brand_voice: BrandVoice;
  terminology: {
    forbidden_terms: string[];          // Global + jurisdiction-specific
    preferred_terms: string[];
    forbidden_words_local: string[];    // Language-specific
  };
  
  compliance_rules: ComplianceRule[];
  claim_restrictions: ClaimRestriction[];
  argument_patterns: ArgumentPattern[];
  
  // Jurisdiction-specific
  key_regulations: KeyRegulation[];
  disclaimer: string;
  
  // Risk scoring
  risk_guidelines: RiskGuidelines;
}
```

### 3.3 Supporting Types

```typescript
interface ComplianceRule {
  rule_id: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  applies_to: string[];                  // Channels: ["facebook", "tiktok"]
  effective_from?: string;
  effective_until?: string;
}

interface ClaimRestriction {
  claim_type: string;                    // "efficacy", "pricing", "testimonial"
  allowed_phrases: string[];
  blocked_phrases: string[];
  requires_evidence: boolean;
}

interface KeyRegulation {
  regulation_name: string;
  regulation_code: string;
  summary: string;
  effective_date: string;
  validity: 'current' | 'superseded' | 'pending';
}

interface RiskGuidelines {
  high_risk_keywords: string[];
  scoring_weights: {
    forbidden_term: number;              // e.g., 30 points
    blocked_claim: number;               // e.g., 25 points
    missing_disclaimer: number;          // e.g., 20 points
  };
  risk_thresholds: {
    low: number;                         // 0
    medium: number;                      // 30
    high: number;                        // 60
    blocked: number;                     // 80
  };
}
```

---

## 4. System Architecture

### 4.1 Layer Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  AdminIndustriesV2.tsx    │  GlobalPackForm.tsx                 │
│  JurisdictionProfilesPanel │  Content Generation UI             │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                      REACT HOOKS LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  useGlobalPack()          │  useJurisdictionProfile()           │
│  useRiskScoring()         │  useIndustryImportV2()              │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                   UTILITY/RESOLVER LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  jurisdictionResolver.ts  │  Types: industryParkV2.ts           │
│  calculateRiskScore()     │  resolveJurisdictionRules()         │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│               BACKEND LAYER (Edge Functions)                     │
├─────────────────────────────────────────────────────────────────┤
│  regenerate-profiles/     │  Triggers on pack update            │
│  index.ts                 │  Resolves rules for all jurisdictions│
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER (Supabase)                     │
├─────────────────────────────────────────────────────────────────┤
│  industry_global_packs    │  industry_jurisdiction_profiles     │
│  industry_pack_translations│  brand_templates (FK reference)    │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| `AdminIndustriesV2.tsx` | Admin dashboard for managing packs |
| `useGlobalPack()` | CRUD operations for global packs |
| `useJurisdictionProfile()` | Fetch resolved rules for content generation |
| `useRiskScoring()` | Real-time compliance risk assessment |
| `regenerate-profiles/` | Edge function to pre-compute resolved_rules |
| `jurisdictionResolver.ts` | Business logic for rule resolution |

---

## 5. Data Flow: Rule Resolution

### 5.1 Sequence Diagram

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Admin  │     │ GlobalPack  │     │ Edge Function│     │  Database   │
│   UI    │     │   Hook      │     │ regenerate-  │     │  (Supabase) │
└────┬────┘     └──────┬──────┘     │  profiles    │     └──────┬──────┘
     │                 │            └──────┬───────┘            │
     │ 1. Update Pack  │                   │                    │
     │────────────────►│                   │                    │
     │                 │                   │                    │
     │                 │ 2. Save to DB     │                    │
     │                 │───────────────────┼───────────────────►│
     │                 │                   │                    │
     │                 │ 3. Trigger regenerate                  │
     │                 │──────────────────►│                    │
     │                 │                   │                    │
     │                 │                   │ 4. Fetch pack      │
     │                 │                   │───────────────────►│
     │                 │                   │                    │
     │                 │                   │ 5. For each jurisdiction:
     │                 │                   │    - Merge global + local
     │                 │                   │    - Compute resolved_rules
     │                 │                   │                    │
     │                 │                   │ 6. Upsert profiles │
     │                 │                   │───────────────────►│
     │                 │                   │                    │
     │ 7. Success notification             │                    │
     │◄────────────────┼───────────────────┤                    │
     │                 │                   │                    │
```

### 5.2 Resolution Algorithm

```typescript
function resolveJurisdictionRules(
  globalPack: IndustryGlobalPack,
  jurisdictionCode: string,
  localOverrides?: LocalOverrides
): ResolvedRules {
  // 1. Start with global values
  const resolved: ResolvedRules = {
    industry_code: globalPack.industry_code,
    jurisdiction_code: jurisdictionCode,
    brand_voice: { ...globalPack.global_brand_voice },
    terminology: {
      forbidden_terms: [...globalPack.global_terminology.forbidden_terms_global],
      preferred_terms: [...globalPack.global_terminology.preferred_terms],
      forbidden_words_local: [],
    },
    compliance_rules: [...globalPack.global_compliance_rules],
    claim_restrictions: [...globalPack.global_claim_restrictions],
    // ...
  };

  // 2. Add language-specific forbidden words
  const langCode = getLanguageForJurisdiction(jurisdictionCode);
  if (globalPack.global_terminology.forbidden_words_by_lang?.[langCode]) {
    resolved.terminology.forbidden_words_local = 
      globalPack.global_terminology.forbidden_words_by_lang[langCode];
  }

  // 3. Apply local overrides (if any)
  if (localOverrides) {
    // Merge arrays, override primitives
    resolved.compliance_rules = mergeRules(
      resolved.compliance_rules,
      localOverrides.additional_rules
    );
    resolved.disclaimer = localOverrides.disclaimer || resolved.disclaimer;
  }

  // 4. Add jurisdiction-specific regulations
  resolved.key_regulations = getKeyRegulations(jurisdictionCode);

  return resolved;
}
```

---

## 6. Risk Scoring Engine

### 6.1 Algorithm Overview

```typescript
interface RiskCheckResult {
  score: number;                         // 0-100
  level: 'low' | 'medium' | 'high' | 'blocked';
  violations: RiskViolation[];
  suggestions: string[];
}

interface RiskViolation {
  type: 'forbidden_term' | 'blocked_claim' | 'missing_disclaimer' | 'pattern_violation';
  match: string;                         // The matched text
  severity: number;                      // Points added to score
  suggestion?: string;
}

function calculateRiskScore(
  content: string,
  resolvedRules: ResolvedRules
): RiskCheckResult {
  let score = 0;
  const violations: RiskViolation[] = [];
  const { terminology, claim_restrictions, risk_guidelines } = resolvedRules;
  
  // 1. Check forbidden terms (global + local)
  const allForbidden = [
    ...terminology.forbidden_terms,
    ...terminology.forbidden_words_local
  ];
  
  for (const term of allForbidden) {
    if (containsTerm(content, term)) {
      const severity = risk_guidelines.scoring_weights.forbidden_term;
      score += severity;
      violations.push({
        type: 'forbidden_term',
        match: term,
        severity,
        suggestion: getSuggestion(term, terminology.preferred_terms)
      });
    }
  }
  
  // 2. Check blocked claims
  for (const restriction of claim_restrictions) {
    for (const blocked of restriction.blocked_phrases) {
      if (containsTerm(content, blocked)) {
        const severity = risk_guidelines.scoring_weights.blocked_claim;
        score += severity;
        violations.push({
          type: 'blocked_claim',
          match: blocked,
          severity,
          suggestion: restriction.allowed_phrases[0]
        });
      }
    }
  }
  
  // 3. Determine risk level
  const { risk_thresholds } = risk_guidelines;
  let level: RiskLevel;
  if (score >= risk_thresholds.blocked) level = 'blocked';
  else if (score >= risk_thresholds.high) level = 'high';
  else if (score >= risk_thresholds.medium) level = 'medium';
  else level = 'low';
  
  return { score, level, violations, suggestions: violations.map(v => v.suggestion).filter(Boolean) };
}
```

### 6.2 Risk Thresholds (Configurable)

| Level | Score Range | Action |
|-------|-------------|--------|
| Low | 0-29 | Content approved |
| Medium | 30-59 | Warning displayed, user can proceed |
| High | 60-79 | Strong warning, requires confirmation |
| Blocked | 80+ | Content generation blocked |

### 6.3 Scoring Weights (Default)

| Violation Type | Points | Rationale |
|---------------|--------|-----------|
| Forbidden term | 30 | Direct policy violation |
| Blocked claim | 25 | Regulatory risk |
| Missing disclaimer | 20 | Compliance requirement |
| Pattern violation | 15 | Best practice deviation |
| High-risk keyword | 10 | Potential issue indicator |

---

## 7. Jurisdiction Support

### 7.1 Supported Jurisdictions

| Code | Name | Language | Currency | Special Rules |
|------|------|----------|----------|---------------|
| `VN` | Vietnam | vi | VND | Strict pharma/finance rules |
| `US` | United States | en | USD | FDA, FTC compliance |
| `EU` | European Union | en/local | EUR | GDPR, MDR requirements |
| `APAC` | Asia Pacific | en | Various | Regional variations |
| `MENA` | Middle East & North Africa | ar/en | Various | Cultural sensitivity |
| `GLOBAL` | Global (Fallback) | en | USD | Baseline rules |

### 7.2 Fallback Logic

```typescript
async function getProfileWithFallback(
  packId: string,
  requestedJurisdiction: string
): Promise<ResolvedRules> {
  // 1. Try requested jurisdiction
  const profile = await fetchProfile(packId, requestedJurisdiction);
  if (profile) return profile.resolved_rules;
  
  // 2. Fallback to GLOBAL
  const globalProfile = await fetchProfile(packId, 'GLOBAL');
  if (globalProfile) return globalProfile.resolved_rules;
  
  // 3. Return empty rules (should never happen)
  return EMPTY_RESOLVED_RULES;
}
```

---

## 8. Key Design Decisions

### 8.1 Why Pre-computed `resolved_rules`?

| Approach | Pros | Cons |
|----------|------|------|
| **Runtime resolution** | Always fresh | Slow (100-500ms), complex queries |
| **Pre-computed (chosen)** | Fast (< 10ms), simple queries | Requires regeneration on update |

**Decision**: Pre-compute because:
- Content generation needs sub-100ms latency
- Rules change infrequently (< 1x/week)
- Regeneration can be async/background

### 8.2 Why Immutable Industry Rules?

**Problem**: Users might want to override industry rules for their brand.

**Decision**: Disallow overrides because:
1. **Compliance risk**: Users could accidentally violate regulations
2. **Liability**: Platform needs to enforce compliance as "governance moat"
3. **Simplicity**: One source of truth per industry/jurisdiction

**Alternative considered**: Brand-level "soft overrides" that add rules but never remove (planned for v2.2).

### 8.3 Why Separate Tables for Profiles?

**Option A**: Store `resolved_rules` in `industry_global_packs` as JSONB array.

**Option B (chosen)**: Separate `industry_jurisdiction_profiles` table.

**Rationale**:
- Independent row-level caching
- Easier to query specific jurisdiction
- Supports different `validity_status` per jurisdiction
- Better for RLS (users only access relevant jurisdictions)

---

## 9. Integration Points

### 9.1 Brand Template Integration

```typescript
// When creating a brand, link to industry pack
interface BrandTemplate {
  id: string;
  name: string;
  
  // V2 references
  global_pack_id: string;              // FK to industry_global_packs
  jurisdiction_code: string;           // e.g., "VN"
  
  // Legacy (deprecated)
  industry_template_id?: string;       // Will be removed in v3
}

// Fetching rules for content generation
const { resolvedRules } = useJurisdictionProfile(
  brand.global_pack_id,
  brand.jurisdiction_code
);
```

### 9.2 Content Generation Integration

```typescript
// In AI content generation flow
async function generateContent(params: GenerationParams) {
  // 1. Get resolved rules for brand's industry/jurisdiction
  const rules = await getResolvedRules(
    params.brand.global_pack_id,
    params.brand.jurisdiction_code
  );
  
  // 2. Pre-check topic compliance
  const preCheck = preCheckCompliance(params.topic, rules);
  if (preCheck.riskLevel === 'blocked') {
    throw new ComplianceError(preCheck.violations);
  }
  
  // 3. Include rules in AI prompt
  const systemPrompt = buildSystemPrompt({
    ...params,
    industryRules: rules,
    disclaimer: rules.disclaimer,
  });
  
  // 4. Generate content
  const content = await callAI(systemPrompt, params.userPrompt);
  
  // 5. Post-check content compliance
  const postCheck = calculateRiskScore(content, rules);
  
  return {
    content,
    riskScore: postCheck.score,
    violations: postCheck.violations,
    disclaimer: rules.disclaimer,
  };
}
```

---

## 10. File Structure

```
src/
├── types/
│   └── industryParkV2.ts              # Core type definitions
├── utils/
│   └── jurisdictionResolver.ts        # Resolution logic
├── hooks/
│   ├── useGlobalPack.ts               # Global pack CRUD
│   ├── useJurisdictionProfile.ts      # Profile fetching
│   ├── useRiskScoring.ts              # Risk assessment
│   └── useIndustryImportV2.ts         # Bulk import
├── components/admin/
│   ├── GlobalPackForm.tsx             # Pack editor
│   ├── GlobalPackList.tsx             # Pack listing
│   ├── JurisdictionProfilesPanel.tsx  # Profile viewer
│   └── IndustryTabsV2.tsx             # Tab navigation
└── pages/
    └── AdminIndustriesV2.tsx          # Admin dashboard

supabase/
├── functions/
│   ├── regenerate-profiles/
│   │   └── index.ts                   # Profile regeneration
│   └── _shared/
│       └── types/
│           └── industry-v2-types.ts   # Shared types
└── migrations/
    └── [timestamp]_industry_park_v2.sql
```

---

## 11. Performance Considerations

### 11.1 Latency Targets

| Operation | Target | Actual |
|-----------|--------|--------|
| Fetch single profile | < 50ms | ~15ms |
| Fetch pack with translations | < 100ms | ~40ms |
| Risk score calculation | < 10ms | ~3ms |
| Profile regeneration (single) | < 5s | ~2s |
| Profile regeneration (all) | < 60s | ~30s |

### 11.2 Caching Strategy

```typescript
// React Query caching
const { data: profile } = useQuery({
  queryKey: ['jurisdiction-profile', packId, jurisdictionCode],
  queryFn: () => fetchProfile(packId, jurisdictionCode),
  staleTime: 5 * 60 * 1000,           // 5 minutes
  cacheTime: 30 * 60 * 1000,          // 30 minutes
  refetchOnWindowFocus: false,
});

// Invalidation on pack update
queryClient.invalidateQueries({
  queryKey: ['jurisdiction-profile', packId],
});
```

### 11.3 Database Optimization

```sql
-- Partial index for active packs only
CREATE INDEX idx_active_packs ON industry_global_packs(industry_code)
WHERE is_active = true;

-- JSONB GIN index for full-text search in resolved_rules
CREATE INDEX idx_resolved_rules_gin ON industry_jurisdiction_profiles
USING GIN (resolved_rules);
```

---

## 12. Migration Strategy: v1 → v2.1

### 12.1 Current State Analysis

| Metric | Count | Notes |
|--------|-------|-------|
| `industry_templates` (v1) | 42 | Legacy table |
| `industry_global_packs` (v2) | 34 | New structure |
| `brand_templates` cần migrate | 29 | FK update needed |

### 12.2 Migration Steps (Zero Downtime)

#### Phase 1: Schema Preparation ✅ (Completed)
- Created new tables: `industry_global_packs`, `industry_jurisdiction_profiles`, `industry_pack_translations`
- Added new columns to `brand_templates`: `global_pack_id`, `jurisdiction_code`
- Kept legacy column `industry_template_id` for backward compatibility

#### Phase 2: Data Migration (One-time Script)

```sql
-- Step 1: Migrate industry_templates → industry_global_packs
INSERT INTO industry_global_packs (
  industry_code, 
  target_audience, 
  global_brand_voice,
  global_terminology,
  global_compliance_rules,
  global_claim_restrictions,
  risk_guidelines,
  is_active
)
SELECT 
  code,
  target_audience,
  brand_voice,
  jsonb_build_object(
    'forbidden_terms_global', forbidden_terms,
    'preferred_terms', preferred_terms
  ),
  compliance_rules,
  claim_restrictions,
  jsonb_build_object(
    'high_risk_keywords', high_risk_keywords,
    'risk_thresholds', '{"low": 0, "medium": 30, "high": 60, "blocked": 80}'::jsonb
  ),
  is_active
FROM industry_templates 
WHERE is_active = true;

-- Step 2: Migrate translations
INSERT INTO industry_pack_translations (
  global_pack_id, 
  language_code, 
  name, 
  description
)
SELECT 
  gp.id, 
  itt.language_code, 
  itt.name, 
  itt.description
FROM industry_template_translations itt
JOIN industry_templates it ON it.id = itt.industry_template_id
JOIN industry_global_packs gp ON gp.industry_code = it.code;

-- Step 3: Generate initial jurisdiction profiles
-- (Call edge function regenerate-profiles with regenerate_all: true)

-- Step 4: Update brand_templates FK references
UPDATE brand_templates bt
SET 
  global_pack_id = gp.id,
  jurisdiction_code = 'VN'  -- Default jurisdiction
FROM industry_templates it
JOIN industry_global_packs gp ON gp.industry_code = it.code
WHERE bt.industry_template_id = it.id;
```

#### Phase 3: Code Migration (Gradual Rollout)

1. **Deploy v2 hooks alongside v1** (parallel operation)
2. **Feature flag** to toggle between v1/v2 hooks:
   ```typescript
   const useIndustryRules = FEATURE_FLAGS.USE_INDUSTRY_PARK_V2
     ? useJurisdictionProfile
     : useLegacyIndustryTemplate;
   ```
3. **Monitor for 1 week** → rollback if needed
4. **Deprecate v1 hooks** after 30 days

#### Phase 4: Cleanup (After 30 days)

```sql
-- Drop legacy column from brand_templates
ALTER TABLE brand_templates DROP COLUMN industry_template_id;

-- Archive legacy tables (don't delete immediately)
ALTER TABLE industry_templates RENAME TO industry_templates_archive;
ALTER TABLE industry_template_translations RENAME TO industry_template_translations_archive;
```

### 12.3 Rollback Plan

- **Keep `industry_template_id`** in `brand_templates` for 30 days
- **Fallback logic** in `useJurisdictionProfile`:
  ```typescript
  // If v2 profile not found, fall back to v1
  if (!profile && brandTemplate.industry_template_id) {
    return useLegacyIndustryTemplate(brandTemplate.industry_template_id);
  }
  ```
- **Feature flag** to instantly switch back to v1

---

## 13. Testing Strategy

### 13.1 Unit Tests (Vitest)

**Files to create:**

| File | Coverage Target | Priority |
|------|-----------------|----------|
| `src/utils/jurisdictionResolver.test.ts` | 90% | 🔥 High |
| `src/hooks/useRiskScoring.test.ts` | 85% | 🔥 High |
| `src/hooks/useGlobalPack.test.ts` | 80% | ⚡ Medium |
| `src/hooks/useJurisdictionProfile.test.ts` | 80% | ⚡ Medium |

**Sample Test Cases:**

```typescript
// src/utils/jurisdictionResolver.test.ts
import { describe, it, expect } from 'vitest';
import { calculateRiskScore, resolveJurisdictionRules } from './jurisdictionResolver';

describe('calculateRiskScore', () => {
  const mockRules = {
    terminology: {
      forbidden_terms: ['cam kết 100%', 'chữa khỏi'],
      preferred_terms: ['hỗ trợ', 'tham khảo ý kiến bác sĩ'],
      forbidden_words_local: ['thuốc tiên'],
    },
    risk_guidelines: {
      scoring_weights: { forbidden_term: 30, blocked_claim: 25 },
      risk_thresholds: { low: 0, medium: 30, high: 60, blocked: 80 },
    },
  };

  it('should return score 0 for clean content', () => {
    const result = calculateRiskScore('Sản phẩm hỗ trợ sức khỏe', mockRules);
    expect(result.score).toBe(0);
    expect(result.level).toBe('low');
    expect(result.violations).toHaveLength(0);
  });

  it('should detect forbidden terms and increase score', () => {
    const content = 'Sản phẩm này cam kết 100% chữa khỏi bệnh';
    const result = calculateRiskScore(content, mockRules);
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.level).toBe('high');
    expect(result.violations).toHaveLength(2);
  });

  it('should respect jurisdiction-specific forbidden words', () => {
    const content = 'Đây là thuốc tiên cho sức khỏe';
    const result = calculateRiskScore(content, mockRules);
    expect(result.violations.some(v => v.match === 'thuốc tiên')).toBe(true);
  });

  it('should provide suggestions for violations', () => {
    const content = 'Cam kết 100% hiệu quả';
    const result = calculateRiskScore(content, mockRules);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

describe('resolveJurisdictionRules', () => {
  it('should merge global and local terminology', () => {
    // Test implementation
  });

  it('should apply local overrides correctly', () => {
    // Test implementation
  });

  it('should include jurisdiction-specific disclaimer', () => {
    // Test implementation
  });
});
```

### 13.2 Integration Tests (Supabase Local)

**Setup:**

```bash
# Start local Supabase
supabase start

# Reset database with test data
supabase db reset

# Run integration tests
npm run test:integration
```

**Test Scenarios:**

```typescript
// supabase/functions/_shared/__tests__/regenerate-profiles.test.ts
describe('regenerate-profiles edge function', () => {
  it('should regenerate profiles for a specific pack', async () => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/regenerate-profiles`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ADMIN_JWT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ global_pack_id: TEST_PACK_ID }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.regenerated).toBeGreaterThan(0);
  });

  it('should fall back to GLOBAL when jurisdiction not found', async () => {
    // Test implementation
  });

  it('should invalidate cache after regeneration', async () => {
    // Test implementation
  });
});
```

### 13.3 E2E Tests (Playwright)

**Critical User Flows:**

```typescript
// e2e/admin-industries.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Admin Industries V2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/industries');
    await loginAsAdmin(page);
  });

  test('should create a new Global Pack', async ({ page }) => {
    await page.click('[data-testid="create-pack-button"]');
    await page.fill('[data-testid="industry-code"]', 'TEST_INDUSTRY');
    await page.fill('[data-testid="industry-name"]', 'Test Industry');
    await page.click('[data-testid="save-pack-button"]');
    
    await expect(page.locator('text=Test Industry')).toBeVisible();
  });

  test('should regenerate profiles after pack update', async ({ page }) => {
    await page.click('[data-testid="edit-pack-PHARMA"]');
    await page.fill('[data-testid="disclaimer"]', 'Updated disclaimer');
    await page.click('[data-testid="save-pack-button"]');
    
    // Check that profiles panel shows "pending" status briefly
    await expect(page.locator('text=Đang cập nhật')).toBeVisible();
    
    // Wait for regeneration
    await page.waitForSelector('text=Hiện hành', { timeout: 10000 });
  });

  test('should enforce compliance during content generation', async ({ page }) => {
    await page.goto('/content/create');
    await page.selectOption('[data-testid="brand-select"]', 'PHARMA_BRAND');
    await page.fill('[data-testid="topic"]', 'Thuốc tiên chữa khỏi 100%');
    
    // Risk warning should appear
    await expect(page.locator('[data-testid="risk-warning"]')).toBeVisible();
    await expect(page.locator('text=Mức độ rủi ro: Cao')).toBeVisible();
  });
});
```

### 13.4 Coverage Requirements

| Area | Minimum Coverage | Current |
|------|-----------------|---------|
| Risk Scoring Algorithm | 90% | TBD |
| Resolution Logic | 85% | TBD |
| Data Fetching Hooks | 80% | TBD |
| Admin UI Components | 70% | TBD |

---

## 14. Monitoring & Error Handling

### 14.1 Logging Structure (Edge Functions)

```typescript
// supabase/functions/_shared/logging.ts
interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  function_name: string;
  action: string;
  trace_id?: string;
  global_pack_id?: string;
  jurisdiction_code?: string;
  duration_ms?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export function log(entry: Omit<LogEntry, 'timestamp'>) {
  console.log(JSON.stringify({
    ...entry,
    timestamp: new Date().toISOString(),
  }));
}

// Usage in edge function
log({
  level: 'info',
  function_name: 'regenerate-profiles',
  action: 'profile_regenerated',
  global_pack_id: packId,
  jurisdiction_code: 'VN',
  duration_ms: 1250,
});
```

### 14.2 Error Tracking (Sentry Integration)

```typescript
// supabase/functions/_shared/monitoring.ts
import * as Sentry from 'https://deno.land/x/sentry/index.mjs';

Sentry.init({
  dsn: Deno.env.get('SENTRY_DSN'),
  environment: Deno.env.get('ENVIRONMENT') || 'development',
  tracesSampleRate: 0.1,
});

export function captureError(
  error: Error, 
  context: Record<string, unknown>
) {
  Sentry.captureException(error, {
    extra: context,
    tags: {
      function: context.function_name as string,
      pack_id: context.global_pack_id as string,
    },
  });
}

// Usage
try {
  await regenerateProfile(packId, jurisdiction);
} catch (error) {
  captureError(error, {
    function_name: 'regenerate-profiles',
    global_pack_id: packId,
    jurisdiction_code: jurisdiction,
  });
  throw error;
}
```

### 14.3 Health Checks & Alerts

**Database Health Query:**

```sql
-- Check for stale profiles (pending > 7 days)
SELECT 
  gp.industry_code,
  jp.jurisdiction_code,
  jp.validity_status,
  jp.updated_at,
  EXTRACT(DAY FROM NOW() - jp.updated_at) as days_stale
FROM industry_jurisdiction_profiles jp
JOIN industry_global_packs gp ON gp.id = jp.global_pack_id
WHERE jp.validity_status = 'pending'
  AND jp.updated_at < NOW() - INTERVAL '7 days'
ORDER BY jp.updated_at ASC;
```

**Alert Rules:**

| Condition | Severity | Channel | Action |
|-----------|----------|---------|--------|
| `validity_status = 'pending'` > 7 days | High | Slack #alerts | Manual investigation |
| Edge function error rate > 5% | Critical | PagerDuty | On-call response |
| Profile regeneration > 30s | Medium | Slack #monitoring | Performance review |
| Consecutive regeneration failures >= 3 | High | Slack #alerts | Check edge function logs |

### 14.4 Dashboard Metrics

**Key Metrics to Track:**

```typescript
// Metrics to expose via admin dashboard
interface IndustryParkMetrics {
  // Pack statistics
  total_packs: number;
  active_packs: number;
  packs_by_status: Record<string, number>;
  
  // Profile health
  total_profiles: number;
  profiles_by_validity: {
    current: number;
    superseded: number;
    pending: number;
  };
  stale_profiles_count: number;
  
  // Performance
  avg_regeneration_time_ms: number;
  p95_regeneration_time_ms: number;
  regeneration_error_rate: number;
  
  // Risk scoring
  avg_risk_score_by_industry: Record<string, number>;
  high_risk_content_count: number;
  blocked_content_count: number;
}
```

---

## 15. Scalability & Cost Considerations

### 15.1 Current Scale

| Resource | Current | 6-Month | 1-Year |
|----------|---------|---------|--------|
| Global Packs | 34 | 50 | 100+ |
| Jurisdictions | 6 | 10 | 20+ |
| Profiles (packs × jurisdictions) | 41 | 500 | 2,000+ |
| Brand Templates | 29 | 1,000 | 10,000+ |
| Content generations/day | 500 | 5,000 | 50,000+ |

### 15.2 Storage Estimation

**JSONB Size Analysis:**

| Field | Avg Size | Notes |
|-------|----------|-------|
| `resolved_rules` | 10-20 KB | Varies by industry complexity |
| `global_brand_voice` | 1-2 KB | Relatively static |
| `global_terminology` | 2-5 KB | Grows with forbidden terms |
| `global_compliance_rules` | 2-4 KB | ~10-20 rules per industry |

**Projected Storage:**

```
Current:
- 34 packs × 20KB avg = 680 KB (global_packs)
- 41 profiles × 15KB avg = 615 KB (profiles)
- Total: ~1.5 MB

1-Year Projection:
- 100 packs × 20 jurisdictions × 20KB = 40 MB (profiles only)
- With translations: ~60 MB total
- Supabase free tier: 500 MB → Safe for 2+ years
```

### 15.3 Query Performance

**Optimized Queries (< 10ms):**

```sql
-- Primary access pattern (uses composite index)
SELECT resolved_rules, validity_status, disclaimer
FROM industry_jurisdiction_profiles
WHERE global_pack_id = $1 AND jurisdiction_code = $2;

-- Execution plan: Index Scan using idx_profiles_pack_jurisdiction
```

**Potential Bottlenecks:**

| Operation | Current | At Scale (10K brands) | Mitigation |
|-----------|---------|----------------------|------------|
| Regenerate all profiles | 30s | 5+ min | Batch processing, job queue |
| Full pack list load | 100ms | 500ms | Pagination, virtual scrolling |
| Risk scoring (per request) | 3ms | 3ms | Already optimized |
| Admin dashboard load | 200ms | 2s+ | Lazy loading, caching |

### 15.4 Cost Optimization

**Supabase Costs (Free Tier Limits):**

| Resource | Limit | Current Usage | Headroom |
|----------|-------|---------------|----------|
| Database | 500 MB | ~2 MB | 99%+ |
| Edge function invocations | 500K/month | ~15K | 97% |
| Egress | 5 GB/month | ~100 MB | 98% |

**Optimization Strategies:**

1. **Minimize `resolved_rules` fetching**: Cache aggressively in React Query
2. **Batch regeneration**: Debounce multiple pack updates
3. **Compression**: Consider gzip for large JSONB payloads
4. **CDN caching**: For public/semi-public data at scale

**Future Scaling (> 10K brands):**

- Consider Redis/Upstash for `resolved_rules` caching
- Implement read replicas for heavy query loads
- Shard profiles by jurisdiction region

---

## 16. API/Endpoint Documentation

### 16.1 Edge Functions

| Endpoint | Method | Auth | Rate Limit | Description |
|----------|--------|------|------------|-------------|
| `/functions/v1/regenerate-profiles` | POST | Admin JWT | 10/min | Regenerate jurisdiction profiles |

#### POST /functions/v1/regenerate-profiles

**Request:**

```json
{
  "global_pack_id": "uuid",           // Optional: specific pack to regenerate
  "jurisdiction_code": "VN",          // Optional: specific jurisdiction
  "regenerate_all": false             // Optional: regenerate all profiles
}
```

**Validation Rules:**
- Either `global_pack_id` or `regenerate_all: true` must be provided
- `jurisdiction_code` without `global_pack_id` is invalid

**Response (Success):**

```json
{
  "success": true,
  "regenerated": 6,
  "duration_ms": 2500,
  "errors": []
}
```

**Response (Partial Failure):**

```json
{
  "success": false,
  "regenerated": 4,
  "duration_ms": 3200,
  "errors": [
    {
      "global_pack_id": "uuid",
      "jurisdiction_code": "EU",
      "error": "Missing required field: disclaimer"
    }
  ]
}
```

**Error Codes:**

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 401 | `UNAUTHORIZED` | Missing or invalid authorization header |
| 403 | `FORBIDDEN` | User is not an admin |
| 400 | `INVALID_REQUEST` | Missing required parameters |
| 404 | `PACK_NOT_FOUND` | Global pack ID does not exist |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

### 16.2 Database API (via Supabase Client)

#### Read Operations

```typescript
// Fetch profile for brand's industry/jurisdiction
const { data, error } = await supabase
  .from('industry_jurisdiction_profiles')
  .select(`
    id,
    jurisdiction_code,
    resolved_rules,
    validity_status,
    disclaimer,
    updated_at
  `)
  .eq('global_pack_id', packId)
  .eq('jurisdiction_code', jurisdictionCode)
  .single();

// List all profiles for a pack
const { data, error } = await supabase
  .from('industry_jurisdiction_profiles')
  .select('jurisdiction_code, validity_status, updated_at')
  .eq('global_pack_id', packId)
  .order('jurisdiction_code');

// Fetch pack with translations
const { data, error } = await supabase
  .from('industry_global_packs')
  .select(`
    *,
    translations:industry_pack_translations(*)
  `)
  .eq('id', packId)
  .single();
```

#### Write Operations (Admin only)

```typescript
// Update global pack
const { error } = await supabase
  .from('industry_global_packs')
  .update({
    global_brand_voice: newVoice,
    updated_at: new Date().toISOString(),
  })
  .eq('id', packId);

// Note: After updating, call regenerate-profiles edge function

// Create new pack
const { data, error } = await supabase
  .from('industry_global_packs')
  .insert({
    industry_code: 'NEW_INDUSTRY',
    target_audience: 'b2b',
    global_brand_voice: { /* ... */ },
    // ...
  })
  .select()
  .single();
```

---

## 17. User Roles & Permissions

### 17.1 Role Definitions

| Role | Description | Typical Users |
|------|-------------|---------------|
| `admin` | Platform administrators with full access | 2-5 internal staff |
| `user` (brand_owner) | Organization owners/members | Majority of users |
| `anonymous` | Unauthenticated users | Public visitors |

### 17.2 Permission Matrix

| Resource | Operation | admin | brand_owner | anonymous |
|----------|-----------|-------|-------------|-----------|
| **industry_global_packs** |
| | SELECT | ✅ All | ✅ Active only | ❌ |
| | INSERT | ✅ | ❌ | ❌ |
| | UPDATE | ✅ | ❌ | ❌ |
| | DELETE | ✅ | ❌ | ❌ |
| **industry_jurisdiction_profiles** |
| | SELECT | ✅ All | ✅ Via brand FK | ❌ |
| | INSERT | ✅ | ❌ | ❌ |
| | UPDATE | ✅ | ❌ | ❌ |
| | DELETE | ✅ | ❌ | ❌ |
| **industry_pack_translations** |
| | SELECT | ✅ | ✅ | ❌ |
| | INSERT/UPDATE/DELETE | ✅ | ❌ | ❌ |

### 17.3 RLS Policies (Implementation)

```sql
-- =============================================
-- industry_global_packs
-- =============================================

-- Anyone can read active packs (for dropdown selection)
CREATE POLICY "Anyone can read active global packs"
  ON industry_global_packs FOR SELECT
  USING (is_active = true);

-- Admins have full access
CREATE POLICY "Admins can manage global packs"
  ON industry_global_packs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- industry_jurisdiction_profiles
-- =============================================

-- Users can read profiles linked to their brands
CREATE POLICY "Users can read profiles for their brands"
  ON industry_jurisdiction_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brand_templates bt
      WHERE bt.global_pack_id = industry_jurisdiction_profiles.global_pack_id
        AND bt.organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid()
        )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- Only admins can modify profiles
CREATE POLICY "Admins can manage jurisdiction profiles"
  ON industry_jurisdiction_profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- industry_pack_translations
-- =============================================

-- Anyone can read translations
CREATE POLICY "Anyone can read translations"
  ON industry_pack_translations FOR SELECT
  USING (true);

-- Only admins can modify translations
CREATE POLICY "Admins can manage translations"
  ON industry_pack_translations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
```

### 17.4 Security Recommendations

1. **Audit Logging**: Log all admin actions on global packs
2. **Rate Limiting**: Limit profile regeneration to 10/minute per admin
3. **IP Allowlisting**: Consider restricting admin API access by IP
4. **Two-Factor Auth**: Require 2FA for admin accounts

---

## 18. Sample Data

### 18.1 Global Pack: PHARMA (Pharmaceuticals)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "industry_code": "PHARMA",
  "target_audience": "both",
  "is_active": true,
  
  "global_brand_voice": {
    "tone_of_voice": ["professional", "empathetic", "educational"],
    "formality_level": "formal",
    "language_style": ["simple", "scientific"],
    "allow_emoji": false
  },
  
  "global_terminology": {
    "forbidden_terms_global": [
      "chữa khỏi",
      "cam kết 100%",
      "không tác dụng phụ",
      "thay thế thuốc điều trị",
      "điều trị dứt điểm"
    ],
    "forbidden_words_by_lang": {
      "VN": ["thuốc tiên", "thần dược", "đặc trị", "bí quyết gia truyền"],
      "EN": ["miracle cure", "guaranteed results", "no side effects"]
    },
    "preferred_terms": [
      "hỗ trợ điều trị",
      "tham khảo ý kiến bác sĩ",
      "đọc kỹ hướng dẫn sử dụng",
      "thực phẩm bổ sung"
    ]
  },
  
  "global_compliance_rules": [
    {
      "rule_id": "PHARMA_001",
      "description": "Không được quảng cáo thuốc kê đơn trực tiếp đến người tiêu dùng",
      "severity": "critical",
      "applies_to": ["facebook", "instagram", "tiktok", "google_ads"]
    },
    {
      "rule_id": "PHARMA_002",
      "description": "Phải có cảnh báo về tác dụng phụ tiềm ẩn",
      "severity": "high",
      "applies_to": ["all"]
    },
    {
      "rule_id": "PHARMA_003",
      "description": "Không sử dụng hình ảnh nhân viên y tế khi chưa được phép",
      "severity": "medium",
      "applies_to": ["facebook", "instagram"]
    }
  ],
  
  "global_claim_restrictions": [
    {
      "claim_type": "efficacy",
      "allowed_phrases": [
        "hỗ trợ điều trị",
        "giúp giảm triệu chứng",
        "có thể cải thiện"
      ],
      "blocked_phrases": [
        "chữa khỏi hoàn toàn",
        "đảm bảo hiệu quả",
        "100% thành công"
      ],
      "requires_evidence": true
    },
    {
      "claim_type": "comparison",
      "allowed_phrases": [
        "một trong những sản phẩm hàng đầu"
      ],
      "blocked_phrases": [
        "tốt nhất thị trường",
        "hiệu quả hơn thuốc"
      ],
      "requires_evidence": true
    }
  ],
  
  "global_argument_patterns": {
    "valid_patterns": [
      "problem_solution",
      "testimonial_with_disclaimer",
      "educational"
    ],
    "forbidden_patterns": [
      "fear_mongering",
      "false_urgency",
      "unverified_celebrity"
    ]
  },
  
  "risk_guidelines": {
    "high_risk_keywords": [
      "chữa bệnh",
      "cam kết",
      "100%",
      "không tác dụng phụ",
      "thuốc tiên",
      "đặc trị"
    ],
    "scoring_weights": {
      "forbidden_term": 30,
      "blocked_claim": 25,
      "missing_disclaimer": 20,
      "pattern_violation": 15,
      "high_risk_keyword": 10
    },
    "risk_thresholds": {
      "low": 0,
      "medium": 30,
      "high": 60,
      "blocked": 80
    }
  },
  
  "related_industries": ["HEALTHCARE", "SUPPLEMENTS", "MEDICAL_DEVICES"],
  
  "created_at": "2024-01-15T08:00:00Z",
  "updated_at": "2026-01-10T14:30:00Z"
}
```

### 18.2 Resolved Rules: PHARMA × VN

```json
{
  "industry_code": "PHARMA",
  "jurisdiction_code": "VN",
  "names": {
    "vi": "Dược phẩm",
    "en": "Pharmaceuticals"
  },
  "target_audience": "both",
  
  "brand_voice": {
    "tone_of_voice": ["professional", "empathetic", "educational"],
    "formality_level": "formal",
    "language_style": ["simple", "scientific"],
    "allow_emoji": false
  },
  
  "terminology": {
    "forbidden_terms": [
      "chữa khỏi",
      "cam kết 100%",
      "không tác dụng phụ",
      "thay thế thuốc điều trị",
      "điều trị dứt điểm"
    ],
    "preferred_terms": [
      "hỗ trợ điều trị",
      "tham khảo ý kiến bác sĩ",
      "đọc kỹ hướng dẫn sử dụng",
      "thực phẩm bổ sung"
    ],
    "forbidden_words_local": [
      "thuốc tiên",
      "thần dược",
      "đặc trị",
      "bí quyết gia truyền"
    ]
  },
  
  "compliance_rules": [
    {
      "rule_id": "PHARMA_001",
      "description": "Không được quảng cáo thuốc kê đơn trực tiếp đến người tiêu dùng",
      "severity": "critical",
      "applies_to": ["facebook", "instagram", "tiktok", "google_ads"]
    },
    {
      "rule_id": "PHARMA_VN_001",
      "description": "Tuân thủ Nghị định 15/2018/NĐ-CP về quảng cáo thực phẩm chức năng",
      "severity": "critical",
      "applies_to": ["all"]
    }
  ],
  
  "claim_restrictions": [
    {
      "claim_type": "efficacy",
      "allowed_phrases": ["hỗ trợ điều trị", "giúp giảm triệu chứng"],
      "blocked_phrases": ["chữa khỏi hoàn toàn", "đảm bảo hiệu quả"],
      "requires_evidence": true
    }
  ],
  
  "argument_patterns": {
    "valid_patterns": ["problem_solution", "educational"],
    "forbidden_patterns": ["fear_mongering", "false_urgency"]
  },
  
  "key_regulations": [
    {
      "regulation_name": "Nghị định 15/2018/NĐ-CP",
      "regulation_code": "ND-15-2018",
      "summary": "Quy định chi tiết về an toàn thực phẩm và quảng cáo thực phẩm chức năng",
      "effective_date": "2018-02-02",
      "validity": "current"
    },
    {
      "regulation_name": "Luật Quảng cáo 2012",
      "regulation_code": "LAW-QC-2012",
      "summary": "Quy định chung về quảng cáo, bao gồm quảng cáo dược phẩm và thực phẩm",
      "effective_date": "2012-01-01",
      "validity": "current"
    }
  ],
  
  "disclaimer": "Thực phẩm này không phải là thuốc và không có tác dụng thay thế thuốc chữa bệnh. Đọc kỹ hướng dẫn sử dụng trước khi dùng. Không dùng cho người mẫn cảm với bất kỳ thành phần nào của sản phẩm.",
  
  "risk_guidelines": {
    "high_risk_keywords": ["chữa bệnh", "cam kết", "100%", "thuốc tiên"],
    "scoring_weights": {
      "forbidden_term": 30,
      "blocked_claim": 25,
      "missing_disclaimer": 20
    },
    "risk_thresholds": {
      "low": 0,
      "medium": 30,
      "high": 60,
      "blocked": 80
    }
  }
}
```

---

## 19. Roadmap & Future Enhancements

### v2.2 (Q2 2026) - Brand Customization

- [ ] **Brand-level soft overrides**: Cho phép brands thêm rules bổ sung (không xóa rules từ global pack)
- [ ] **Custom jurisdictions**: Cho phép tạo jurisdiction profiles tùy chỉnh cho thị trường đặc thù
- [ ] **Versioned profiles**: Lưu lịch sử thay đổi `resolved_rules` để audit

### v2.3 (Q3 2026) - Real-time & AI Assistance

- [ ] **Real-time compliance**: WebSocket notifications khi rules thay đổi
- [ ] **AI-assisted rule creation**: Suggest rules dựa trên industry trends và regulation updates
- [ ] **Multi-language content validation**: Validate content across multiple languages simultaneously
- [ ] **Compliance score prediction**: Dự đoán compliance score trước khi generate

### v2.4 (Q4 2026) - Advanced Analytics

- [ ] **Compliance dashboard**: Visualize compliance metrics across all brands
- [ ] **Trend analysis**: Track common violations over time
- [ ] **Benchmark reports**: Compare brand compliance vs industry average
- [ ] **Automated alerts**: Notify brands when regulations change

### v3.0 (Q1 2027) - Knowledge Graph

- [ ] **Graph database integration**: Apache AGE hoặc Neo4j để model industry relationships
- [ ] **Semantic rule matching**: Dùng embeddings để detect violations với ngữ cảnh
- [ ] **Cross-industry insights**: Recommend related industries cho brands đa ngành
- [ ] **Regulatory change propagation**: Tự động cập nhật profiles khi regulations thay đổi

### Technical Debt (Ongoing)

- [ ] Remove legacy `industry_template_id` FK from `brand_templates`
- [ ] Archive `industry_templates` and `industry_template_translations` tables
- [ ] Migrate remaining hooks to use v2 exclusively
- [ ] Add comprehensive unit test coverage (target: 80%+)

---

## 20. Dependencies & Tech Stack

### 20.1 Frontend

| Package | Version | Purpose |
|---------|---------|---------|
| React | ^18.3.1 | UI framework |
| TypeScript | ^5.8.3 | Type safety |
| @tanstack/react-query | ^5.83.0 | Data fetching & caching |
| @supabase/supabase-js | ^2.89.0 | Database client |
| Tailwind CSS | ^3.4.17 | Styling |
| lucide-react | ^0.462.0 | Icons |
| sonner | ^1.7.4 | Toast notifications |
| Vitest | ^4.0.16 | Unit testing |
| @testing-library/react | ^16.3.1 | Component testing |

### 20.2 Backend (Lovable Cloud)

| Component | Technology | Notes |
|-----------|------------|-------|
| Database | PostgreSQL 15 (Supabase) | JSONB for flexible schema |
| Auth | Supabase Auth (JWT) | Row Level Security |
| Edge Functions | Deno runtime | TypeScript support |
| Storage | Supabase Storage | For future file uploads |
| Realtime | Supabase Realtime | For live updates (planned) |

### 20.3 Infrastructure

| Component | Provider | Notes |
|-----------|----------|-------|
| Hosting | Lovable Cloud | Auto-deployed on push |
| CDN | Cloudflare (via Supabase) | Global edge caching |
| DNS | Lovable Cloud | Managed |
| SSL | Automatic | Let's Encrypt |

### 20.4 External Services (Current & Planned)

| Service | Purpose | Status |
|---------|---------|--------|
| Lovable AI | Content generation | ✅ Active |
| Sentry | Error tracking | 📋 Planned |
| Datadog/Grafana | Metrics dashboard | 📋 Planned |
| Redis/Upstash | Caching layer (at scale) | 📋 Future |
| Slack Webhooks | Alert notifications | 📋 Planned |

### 20.5 Development Tools

| Tool | Purpose |
|------|---------|
| pnpm | Package manager |
| Vite | Build tool |
| ESLint | Code linting |
| Prettier | Code formatting |
| Husky | Git hooks |
| Playwright | E2E testing (planned) |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Global Pack** | Centralized industry rules stored in `industry_global_packs` |
| **Jurisdiction Profile** | Pre-computed rules for a specific industry × jurisdiction combination |
| **Resolved Rules** | The final, merged ruleset used by AI during content generation |
| **Risk Score** | Numerical value (0-100) indicating compliance risk of content |
| **Validity Status** | State of a jurisdiction profile: `current`, `superseded`, or `pending` |
| **RLS** | Row Level Security - PostgreSQL feature for fine-grained access control |

---

## Appendix B: Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-12 | 2.1.0 | Added sections 12-20 for complete architecture documentation |
| 2026-01-10 | 2.0.0 | Initial Industry Park v2 architecture |
| 2025-06-15 | 1.5.0 | Added multi-jurisdiction support |
| 2025-01-01 | 1.0.0 | Initial Industry Memory system |

---

*Document maintained by the Development Team. For questions, contact the engineering lead.*
