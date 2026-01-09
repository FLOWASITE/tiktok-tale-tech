// ============================================
// Pre-generation Compliance Check
// Validates topic against forbidden terms and restrictions BEFORE content generation
// ============================================

export interface ComplianceIssue {
  type: 'forbidden_term' | 'claim_restriction' | 'category_prohibited' | 'tone_mismatch';
  term: string;
  reason: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

export interface PreCheckResult {
  passed: boolean;
  issues: ComplianceIssue[];
  suggestedTopic?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'blocked';
}

export interface IndustryMemoryRules {
  forbidden_terms: string[];
  compliance_rules: string[];
  claim_restrictions: string[];
  forbidden_words: string[];
  argument_patterns?: {
    valid_patterns: string[];
    forbidden_patterns: string[];
  };
}

export interface BrandRules {
  forbidden_words: string[];
  compliance_rules: string[];
}

// Vietnamese diacritics normalization for matching
function normalizeVietnamese(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// Check if topic contains forbidden term (with fuzzy matching)
function containsForbiddenTerm(topic: string, term: string): boolean {
  const normalizedTopic = normalizeVietnamese(topic);
  const normalizedTerm = normalizeVietnamese(term);
  
  // Exact word boundary match
  const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(normalizedTerm)}\\b`, 'i');
  if (wordBoundaryRegex.test(normalizedTopic)) {
    return true;
  }
  
  // Check original (with diacritics) as well
  const originalWordBoundaryRegex = new RegExp(`\\b${escapeRegex(term.toLowerCase())}\\b`, 'i');
  if (originalWordBoundaryRegex.test(topic.toLowerCase())) {
    return true;
  }
  
  return false;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Check if topic implies a restricted claim
function impliesRestrictedClaim(topic: string, restriction: string): boolean {
  const claimPatterns: Record<string, RegExp[]> = {
    'cam kết': [/cam kết/i, /đảm bảo 100%/i, /chắc chắn/i],
    'chữa khỏi': [/chữa khỏi/i, /điều trị dứt điểm/i, /khỏi bệnh/i],
    'số 1': [/số 1/i, /number 1/i, /hàng đầu/i, /tốt nhất/i],
    'giảm cân': [/giảm \d+ kg/i, /giảm cân nhanh/i, /giảm mỡ/i],
    'làm giàu': [/làm giàu nhanh/i, /thu nhập \d+/i, /kiếm tiền dễ/i],
  };
  
  const normalizedTopic = topic.toLowerCase();
  const normalizedRestriction = restriction.toLowerCase();
  
  // Check if the restriction keywords are in the topic
  const restrictionWords = normalizedRestriction.split(/\s+/).filter(w => w.length > 2);
  const matchCount = restrictionWords.filter(word => normalizedTopic.includes(word)).length;
  
  // If more than 50% of restriction words match, it's likely a violation
  if (restrictionWords.length > 0 && matchCount / restrictionWords.length > 0.5) {
    return true;
  }
  
  // Check known patterns
  for (const [key, patterns] of Object.entries(claimPatterns)) {
    if (normalizedRestriction.includes(key)) {
      for (const pattern of patterns) {
        if (pattern.test(normalizedTopic)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Pre-check topic compliance BEFORE content generation
 * 
 * @param topic - The topic to check
 * @param industryRules - Industry memory rules (from industry_templates)
 * @param brandRules - Brand-specific rules (from brand_templates)
 * @returns PreCheckResult with passed status and any issues found
 */
export function preCheckCompliance(
  topic: string,
  industryRules: IndustryMemoryRules | null,
  brandRules: BrandRules | null
): PreCheckResult {
  const issues: ComplianceIssue[] = [];
  
  if (!topic || topic.trim().length === 0) {
    return { passed: true, issues: [], riskLevel: 'low' };
  }

  // 1. Check industry forbidden terms (CRITICAL - blocked)
  if (industryRules?.forbidden_terms?.length) {
    for (const term of industryRules.forbidden_terms) {
      if (containsForbiddenTerm(topic, term)) {
        issues.push({
          type: 'forbidden_term',
          term,
          reason: `Từ "${term}" bị cấm trong ngành này`,
          severity: 'error',
          suggestion: `Thay thế "${term}" bằng từ ngữ an toàn hơn`,
        });
      }
    }
  }

  // 2. Check brand forbidden words
  if (brandRules?.forbidden_words?.length) {
    for (const term of brandRules.forbidden_words) {
      if (containsForbiddenTerm(topic, term)) {
        issues.push({
          type: 'forbidden_term',
          term,
          reason: `Từ "${term}" không phù hợp với brand voice`,
          severity: 'warning',
          suggestion: `Cân nhắc thay thế "${term}"`,
        });
      }
    }
  }

  // 3. Check claim restrictions (industry)
  if (industryRules?.claim_restrictions?.length) {
    for (const restriction of industryRules.claim_restrictions) {
      if (impliesRestrictedClaim(topic, restriction)) {
        issues.push({
          type: 'claim_restriction',
          term: restriction,
          reason: `Topic có thể vi phạm quy định: "${restriction}"`,
          severity: 'warning',
          suggestion: `Điều chỉnh topic để tránh claim quá mạnh`,
        });
      }
    }
  }

  // 4. Check forbidden argument patterns
  if (industryRules?.argument_patterns?.forbidden_patterns?.length) {
    for (const pattern of industryRules.argument_patterns.forbidden_patterns) {
      const patternLower = pattern.toLowerCase();
      if (topic.toLowerCase().includes(patternLower)) {
        issues.push({
          type: 'category_prohibited',
          term: pattern,
          reason: `Lập luận "${pattern}" bị cấm sử dụng`,
          severity: 'error',
          suggestion: `Thay đổi cách tiếp cận topic`,
        });
      }
    }
  }

  // Calculate risk level
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  
  let riskLevel: PreCheckResult['riskLevel'];
  if (errorCount > 0) {
    riskLevel = 'blocked';
  } else if (warningCount >= 2) {
    riskLevel = 'high';
  } else if (warningCount === 1) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  return {
    passed: errorCount === 0,
    issues,
    riskLevel,
  };
}

/**
 * Generate a compliant alternative topic using AI
 */
export async function suggestCompliantTopic(
  topic: string,
  issues: ComplianceIssue[],
  callAI: (options: any) => Promise<any>
): Promise<string | null> {
  if (issues.length === 0) return null;

  const issuesList = issues
    .map(i => `- ${i.type}: "${i.term}" - ${i.reason}`)
    .join('\n');

  const prompt = `Topic gốc: "${topic}"

Các vấn đề compliance:
${issuesList}

Viết lại topic này để:
1. Tránh tất cả các từ/claim bị cấm
2. Giữ nguyên ý tưởng chính
3. Tuân thủ quy định ngành

CHỈ TRẢ VỀ TOPIC MỚI, KHÔNG GIẢI THÍCH.`;

  try {
    const result = await callAI({
      functionName: 'compliance-suggest',
      messages: [
        { role: 'system', content: 'Bạn là chuyên gia compliance content. Viết lại topic để tuân thủ quy định.' },
        { role: 'user', content: prompt },
      ],
      modelOverride: 'google/gemini-2.5-flash-lite', // Fast, cheap
    });

    if (result.success && result.data?.choices?.[0]?.message?.content) {
      return result.data.choices[0].message.content.trim();
    }
  } catch (error) {
    console.error('Error suggesting compliant topic:', error);
  }

  return null;
}

/**
 * Quick check for high-risk keywords (no AI needed)
 * Use this for real-time validation in UI
 */
export function quickComplianceCheck(
  topic: string,
  forbiddenTerms: string[]
): { hasIssues: boolean; terms: string[] } {
  const foundTerms: string[] = [];
  
  for (const term of forbiddenTerms) {
    if (containsForbiddenTerm(topic, term)) {
      foundTerms.push(term);
    }
  }

  return {
    hasIssues: foundTerms.length > 0,
    terms: foundTerms,
  };
}
