// ============================================
// Industry Park v2.1 - Pre-generation Compliance Check
// Validates topics against resolved rules BEFORE content generation
// ============================================

import { ResolvedRulesV2 } from "../types/industry-v2-types.ts";

// ============== TYPES ==============

export interface ComplianceIssueV2 {
  type: 'forbidden_term' | 'claim_restriction' | 'forbidden_pattern' | 'high_risk_keyword';
  term: string;
  reason: string;
  severity: 'error' | 'warning';
  suggestion?: string;
  alternative?: string;
}

export interface PreCheckResultV2 {
  passed: boolean;
  issues: ComplianceIssueV2[];
  suggestedTopic?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'blocked';
  riskScore: number;
}

// ============== HELPERS ==============

function normalizeVietnamese(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsForbiddenTerm(topic: string, term: string): boolean {
  const normalizedTopic = normalizeVietnamese(topic);
  const normalizedTerm = normalizeVietnamese(term);
  
  try {
    const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(normalizedTerm)}\\b`, 'i');
    if (wordBoundaryRegex.test(normalizedTopic)) return true;
    
    const originalRegex = new RegExp(`\\b${escapeRegex(term.toLowerCase())}\\b`, 'i');
    if (originalRegex.test(topic.toLowerCase())) return true;
  } catch {
    return normalizedTopic.includes(normalizedTerm);
  }
  
  return false;
}

// ============== SCORING ==============

const DEFAULT_WEIGHTS = {
  forbidden_term_match: 50,
  forbidden_pattern_match: 30,
  claim_restriction_match: 20,
  high_risk_keyword_match: 15,
};

const DEFAULT_THRESHOLDS = {
  low: 0,
  medium: 30,
  high: 60,
  blocked: 80,
};

type RiskLevel = 'low' | 'medium' | 'high' | 'blocked';

function calculateRiskLevel(score: number, thresholds: typeof DEFAULT_THRESHOLDS): RiskLevel {
  if (score >= thresholds.blocked) return 'blocked';
  if (score >= thresholds.high) return 'high';
  if (score >= thresholds.medium) return 'medium';
  return 'low';
}

// ============== MAIN FUNCTION ==============

/**
 * Pre-check topic compliance BEFORE content generation
 * 
 * @param topic - The topic to check
 * @param resolvedRules - Pre-computed resolved rules from jurisdiction profile
 * @returns PreCheckResultV2 with passed status and any issues found
 */
export function preCheckComplianceV2(
  topic: string,
  resolvedRules: ResolvedRulesV2
): PreCheckResultV2 {
  const issues: ComplianceIssueV2[] = [];
  let riskScore = 0;
  
  const weights = {
    ...DEFAULT_WEIGHTS,
    ...(resolvedRules.risk_guidelines?.scoring_weights || {}),
  };
  
  const thresholds = {
    ...DEFAULT_THRESHOLDS,
    ...(resolvedRules.risk_guidelines?.risk_thresholds || {}),
  };

  if (!topic || topic.trim().length === 0) {
    return { passed: true, issues: [], riskLevel: 'low', riskScore: 0 };
  }

  // 1. Check forbidden terms (CRITICAL - blocked)
  for (const term of resolvedRules.terminology?.forbidden_terms || []) {
    if (containsForbiddenTerm(topic, term)) {
      issues.push({
        type: 'forbidden_term',
        term,
        reason: `Từ "${term}" bị cấm trong ngành ${resolvedRules.names?.vi || resolvedRules.industry_code}`,
        severity: 'error',
        suggestion: `Thay thế "${term}" bằng từ ngữ an toàn hơn`,
      });
      riskScore += weights.forbidden_term_match;
    }
  }

  // 2. Check local forbidden words (CRITICAL - blocked)
  for (const word of resolvedRules.terminology?.forbidden_words_local || []) {
    if (containsForbiddenTerm(topic, word)) {
      issues.push({
        type: 'forbidden_term',
        term: word,
        reason: `Từ "${word}" không được sử dụng tại ${resolvedRules.jurisdiction_code}`,
        severity: 'error',
        suggestion: `Loại bỏ hoặc thay thế "${word}"`,
      });
      riskScore += weights.forbidden_term_match;
    }
  }

  // 3. Check forbidden patterns (CRITICAL - blocked)
  for (const pattern of resolvedRules.argument_patterns?.forbidden_patterns || []) {
    const patternClean = pattern.replace(/\[.*?\]/g, '');
    if (patternClean && topic.toLowerCase().includes(patternClean.toLowerCase())) {
      issues.push({
        type: 'forbidden_pattern',
        term: pattern,
        reason: `Lập luận "${pattern}" bị cấm sử dụng`,
        severity: 'error',
        suggestion: 'Thay đổi cách tiếp cận topic',
      });
      riskScore += weights.forbidden_pattern_match;
    }
  }

  // 4. Check claim restrictions (warnings with alternatives)
  for (const restriction of resolvedRules.claim_restrictions || []) {
    const claimLower = restriction.claim.toLowerCase();
    const claimWords = claimLower.split(/\s+/).filter(w => w.length > 2);
    const topicLower = topic.toLowerCase();
    
    // Check for exact match or significant word overlap
    if (topicLower.includes(claimLower) || 
        (claimWords.length > 0 && 
         claimWords.filter(word => topicLower.includes(word)).length / claimWords.length > 0.5)) {
      issues.push({
        type: 'claim_restriction',
        term: restriction.claim,
        reason: `Topic có thể vi phạm quy định: "${restriction.claim}"`,
        severity: 'warning',
        suggestion: `Điều chỉnh để tránh claim quá mạnh`,
        alternative: restriction.alternative,
      });
      riskScore += weights.claim_restriction_match;
    }
  }

  // 5. Check high-risk keywords (warnings)
  for (const keyword of resolvedRules.risk_guidelines?.high_risk_keywords || []) {
    if (containsForbiddenTerm(topic, keyword)) {
      issues.push({
        type: 'high_risk_keyword',
        term: keyword,
        reason: `Từ khóa "${keyword}" có rủi ro cao`,
        severity: 'warning',
        suggestion: `Cân nhắc thay thế "${keyword}" để giảm rủi ro`,
      });
      riskScore += weights.high_risk_keyword_match;
    }
  }

  const riskLevel = calculateRiskLevel(riskScore, thresholds);
  const errorCount = issues.filter(i => i.severity === 'error').length;

  return {
    passed: errorCount === 0,
    issues,
    riskLevel,
    riskScore,
  };
}

/**
 * Quick check for high-risk forbidden terms (no scoring, just term matching)
 * Use for real-time validation in UI
 */
export function quickComplianceCheckV2(
  topic: string,
  resolvedRules: ResolvedRulesV2
): { hasIssues: boolean; terms: string[] } {
  const foundTerms: string[] = [];
  
  const allForbidden = [
    ...(resolvedRules.terminology?.forbidden_terms || []),
    ...(resolvedRules.terminology?.forbidden_words_local || []),
  ];
  
  for (const term of allForbidden) {
    if (containsForbiddenTerm(topic, term)) {
      foundTerms.push(term);
    }
  }

  return {
    hasIssues: foundTerms.length > 0,
    terms: foundTerms,
  };
}

/**
 * Check if content has any blocking violations
 */
export function hasBlockingViolationsV2(
  topic: string,
  resolvedRules: ResolvedRulesV2
): boolean {
  const result = preCheckComplianceV2(topic, resolvedRules);
  return result.riskLevel === 'blocked';
}

/**
 * Generate a compliant alternative topic using AI
 */
export async function suggestCompliantTopicV2(
  topic: string,
  issues: ComplianceIssueV2[],
  callAI: (options: any) => Promise<any>
): Promise<string | null> {
  if (issues.length === 0) return null;

  const issuesList = issues
    .map(i => `- ${i.type}: "${i.term}" - ${i.reason}${i.alternative ? ` (Thay thế: ${i.alternative})` : ''}`)
    .join('\n');

  const prompt = `Topic gốc: "${topic}"

Các vấn đề compliance:
${issuesList}

Viết lại topic này để:
1. Tránh tất cả các từ/claim bị cấm
2. Giữ nguyên ý tưởng chính
3. Tuân thủ quy định ngành
4. Sử dụng các từ thay thế được đề xuất (nếu có)

CHỈ TRẢ VỀ TOPIC MỚI, KHÔNG GIẢI THÍCH.`;

  try {
    const result = await callAI({
      functionName: 'compliance-suggest-v2',
      messages: [
        { role: 'system', content: 'Bạn là chuyên gia compliance content. Viết lại topic để tuân thủ quy định ngành.' },
        { role: 'user', content: prompt },
      ],
      modelOverride: 'google/gemini-2.5-flash-lite',
    });

    if (result.success && result.data?.choices?.[0]?.message?.content) {
      return result.data.choices[0].message.content.trim();
    }
  } catch (error) {
    console.error('Error suggesting compliant topic:', error);
  }

  return null;
}
