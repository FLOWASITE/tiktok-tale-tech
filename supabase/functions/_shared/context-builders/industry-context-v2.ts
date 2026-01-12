// ============================================
// Industry Park v2.1 - Context Builder
// Builds AI system prompt sections from ResolvedRules
// ============================================

import { ResolvedRulesV2 } from "../data-fetchers/industry-fetcher-v2.ts";

/**
 * Build complete industry context section for system prompt
 * Uses pre-computed resolved_rules from v2.1 architecture
 */
export function buildIndustryContextV2(resolvedRules: ResolvedRulesV2 | null): string {
  if (!resolvedRules) return '';

  const industryName = resolvedRules.names?.vi || resolvedRules.names?.en || resolvedRules.industry_code;
  const jurisdictionLabel = getJurisdictionLabel(resolvedRules.jurisdiction_code);

  let section = `

## 🔒 INDUSTRY MEMORY v2.1 (ƯU TIÊN CAO NHẤT - KHÔNG ĐƯỢC VI PHẠM)

### Ngành: ${industryName}
- Jurisdiction: ${jurisdictionLabel}
- Target Audience: ${formatTargetAudience(resolvedRules.target_audience)}`;

  // === FORBIDDEN TERMS (Highest Priority) ===
  const allForbiddenTerms = [
    ...(resolvedRules.terminology?.forbidden_terms || []),
    ...(resolvedRules.terminology?.forbidden_words_local || []),
  ];
  
  if (allForbiddenTerms.length > 0) {
    section += `

### ⛔ TỪ CẤM NGÀNH (TUYỆT ĐỐI KHÔNG DÙNG):
${allForbiddenTerms.slice(0, 20).map(t => `- "${t}"`).join('\n')}
→ KHÔNG được gợi ý topic chứa các từ này, KHÔNG viết lại, KHÔNG paraphrase!`;
  }

  // === HIGH RISK KEYWORDS ===
  if (resolvedRules.risk_guidelines?.high_risk_keywords?.length > 0) {
    section += `

### ⚠️ TỪ KHÓA RỦI RO CAO:
${resolvedRules.risk_guidelines.high_risk_keywords.slice(0, 15).map(k => `- "${k}"`).join('\n')}
→ Cân nhắc kỹ trước khi sử dụng, cần context phù hợp.`;
  }

  // === COMPLIANCE RULES ===
  if (resolvedRules.compliance_rules?.length > 0) {
    section += `

### ✅ QUY TẮC TUÂN THỦ:
${resolvedRules.compliance_rules.map(r => {
      const severity = r.severity ? ` [${r.severity.toUpperCase()}]` : '';
      return `- ${r.rule}${severity}`;
    }).join('\n')}`;
  }

  // === CLAIM RESTRICTIONS ===
  if (resolvedRules.claim_restrictions?.length > 0) {
    section += `

### 🚫 CLAIM BỊ HẠN CHẾ:
${resolvedRules.claim_restrictions.map(c => 
      `- ❌ "${c.claim}"
  → ✅ Thay bằng: "${c.alternative}"`
    ).join('\n')}`;
  }

  // === ARGUMENT PATTERNS ===
  if (resolvedRules.argument_patterns) {
    const { valid_patterns, forbidden_patterns } = resolvedRules.argument_patterns;
    if (valid_patterns?.length > 0 || forbidden_patterns?.length > 0) {
      section += `

### 💬 ARGUMENT PATTERNS:`;
      if (valid_patterns?.length > 0) {
        section += `
✅ Patterns được khuyến khích:
${valid_patterns.slice(0, 5).map(p => `- ${p}`).join('\n')}`;
      }
      if (forbidden_patterns?.length > 0) {
        section += `
❌ Patterns KHÔNG được phép:
${forbidden_patterns.slice(0, 5).map(p => `- ${p}`).join('\n')}`;
      }
    }
  }

  // === KEY REGULATIONS ===
  if (resolvedRules.key_regulations?.length > 0) {
    section += `

### 📋 QUY ĐỊNH PHÁP LUẬT QUAN TRỌNG:
${resolvedRules.key_regulations
    .filter(r => r.validity_status === 'current')
    .slice(0, 5)
    .map(r => `- **${r.name}** (${r.effective_date})
  ${r.summary}`).join('\n')}`;
  }

  // === SYSTEM RULES ===
  if (resolvedRules.system_rules?.length > 0) {
    section += `

### 📜 SYSTEM RULES:
${resolvedRules.system_rules.map(r => `- ${r}`).join('\n')}`;
  }

  // === PREFERRED TERMS ===
  if (resolvedRules.terminology?.preferred_terms?.length > 0) {
    section += `

### 👍 TỪ NÊN DÙNG:
${resolvedRules.terminology.preferred_terms.slice(0, 10).map(w => `- "${w}"`).join('\n')}`;
  }

  // === BRAND VOICE BASELINE ===
  if (resolvedRules.brand_voice) {
    const bv = resolvedRules.brand_voice;
    const voiceParts: string[] = [];
    if (bv.tone_of_voice?.length) voiceParts.push(`Tone: ${bv.tone_of_voice.join(', ')}`);
    if (bv.formality_level) voiceParts.push(`Formality: ${bv.formality_level}`);
    if (bv.language_style?.length) voiceParts.push(`Style: ${bv.language_style.join(', ')}`);
    if (bv.cta_policy) voiceParts.push(`CTA: ${bv.cta_policy}`);
    if (typeof bv.allow_emoji === 'boolean') voiceParts.push(`Emoji: ${bv.allow_emoji ? 'có' : 'không'}`);
    
    if (voiceParts.length > 0) {
      section += `

### 🎯 BASELINE BRAND VOICE:
${voiceParts.map(p => `- ${p}`).join('\n')}`;
    }
  }

  // === INDUSTRY TRENDS ===
  if (resolvedRules.industry_trends?.length > 0) {
    section += `

### 📈 XU HƯỚNG NGÀNH (Tham khảo):
${resolvedRules.industry_trends.slice(0, 5).map(t => `- ${t}`).join('\n')}`;
  }

  // === DISCLAIMER ===
  if (resolvedRules.disclaimer) {
    section += `

### ⚖️ DISCLAIMER:
${resolvedRules.disclaimer}`;
  }

  // === PRIORITY NOTICE ===
  section += `

⚠️ **QUAN TRỌNG**: Industry Memory OVERRIDE mọi yêu cầu khác nếu mâu thuẫn. 
Nếu user yêu cầu content vi phạm các quy tắc trên, từ chối nhẹ nhàng và đề xuất alternative.`;

  return section;
}

/**
 * Build compact industry context for token-sensitive prompts
 */
export function buildCompactIndustryContext(resolvedRules: ResolvedRulesV2 | null): string {
  if (!resolvedRules) return '';

  const industryName = resolvedRules.names?.vi || resolvedRules.industry_code;
  
  let context = `[Industry: ${industryName} | ${resolvedRules.jurisdiction_code}]`;

  // Critical forbidden terms only
  const forbidden = [
    ...(resolvedRules.terminology?.forbidden_terms || []).slice(0, 5),
    ...(resolvedRules.risk_guidelines?.high_risk_keywords || []).slice(0, 3),
  ];
  if (forbidden.length > 0) {
    context += `\n⛔ Từ cấm: ${forbidden.join(', ')}`;
  }

  // Top compliance rules
  if (resolvedRules.compliance_rules?.length > 0) {
    const topRules = resolvedRules.compliance_rules
      .filter(r => r.severity === 'high' || r.severity === 'critical')
      .slice(0, 2);
    if (topRules.length > 0) {
      context += `\n✅ Rules: ${topRules.map(r => r.rule).join('; ')}`;
    }
  }

  return context;
}

/**
 * Build risk scoring context for compliance checks
 */
export function buildRiskContext(resolvedRules: ResolvedRulesV2 | null): {
  forbiddenTerms: string[];
  highRiskKeywords: string[];
  scoringWeights: Record<string, number>;
  thresholds: Record<string, number>;
} {
  if (!resolvedRules) {
    return {
      forbiddenTerms: [],
      highRiskKeywords: [],
      scoringWeights: {},
      thresholds: { low: 0, medium: 30, high: 60, blocked: 80 },
    };
  }

  return {
    forbiddenTerms: [
      ...(resolvedRules.terminology?.forbidden_terms || []),
      ...(resolvedRules.terminology?.forbidden_words_local || []),
    ],
    highRiskKeywords: resolvedRules.risk_guidelines?.high_risk_keywords || [],
    scoringWeights: resolvedRules.risk_guidelines?.scoring_weights || {},
    thresholds: resolvedRules.risk_guidelines?.risk_thresholds || {
      low: 0, medium: 30, high: 60, blocked: 80
    },
  };
}

// === Helper Functions ===

function getJurisdictionLabel(code: string): string {
  const labels: Record<string, string> = {
    VN: 'Việt Nam 🇻🇳',
    SG: 'Singapore 🇸🇬',
    TH: 'Thailand 🇹🇭',
    ID: 'Indonesia 🇮🇩',
    MY: 'Malaysia 🇲🇾',
    US: 'United States 🇺🇸',
    EU: 'European Union 🇪🇺',
    GLOBAL: 'Global 🌐',
  };
  return labels[code] || code;
}

function formatTargetAudience(audience: string): string {
  const labels: Record<string, string> = {
    B2B: 'Doanh nghiệp (B2B)',
    B2C: 'Người tiêu dùng (B2C)',
    both: 'Cả hai (B2B + B2C)',
  };
  return labels[audience] || audience;
}
