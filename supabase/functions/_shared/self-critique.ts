// ============================================
// Self-Critique Loop for AI Content Generation
// Enhanced with 8 Categories & Professional Criteria
// ============================================

import {
  HOOK_CRITERIA,
  CTA_CRITERIA,
  READABILITY_CRITERIA,
  MULTICHANNEL_CRITERIA,
  SCRIPT_CRITERIA,
  CAROUSEL_CRITERIA,
  REFINEMENT_STRATEGY,
  getFocusedRefinePrompt,
  getRefinementStrategy,
} from './critique-criteria.ts';
import { getAIConfig } from './ai-config.ts';
import { callAI as callAIProvider } from './ai-provider.ts';
import { evaluateHook, type HookEvaluation } from './ai-hook-evaluator.ts';

// ================== CONFIGURATION ==================
export const CRITIQUE_CONFIG = {
  PASS_THRESHOLD: 75,           // Score >= 75 = không cần refine (giảm từ 80 để tăng tốc)
  MIN_ACCEPTABLE: 65,           // Score < 65 = flag warning
  MAX_REFINEMENTS: 1,           // Tối đa 1 lần refine (giảm từ 2 để tránh timeout)
  COMPLIANCE_WEIGHT: 2.0,       // Compliance quan trọng gấp đôi
  CRITIQUE_TIMEOUT_MS: 30000,   // Timeout cho mỗi critique call (30s)
  REFINE_TIMEOUT_MS: 25000,     // Timeout cho mỗi refine call (25s)
  
  // Enhanced category weights (8 categories, sum = 100)
  CATEGORY_WEIGHTS: {
    brand_voice: 15,        // Giảm từ 20 → 15
    compliance: 25,         // Giữ nguyên - ưu tiên cao nhất
    hook_strength: 18,      // Tăng từ 15 → 18
    content_structure: 12,  // Giảm từ 15 → 12
    engagement_potential: 10, // Giảm từ 15 → 10
    channel_fit: 15,        // Tăng từ 10 → 15
    cta_quality: 8,         // MỚI
    readability: 7,         // MỚI
  } as const,
  
  // Quality tiers for display
  QUALITY_TIERS: {
    EXCELLENT: { min: 90, label: 'Xuất sắc', color: 'emerald' },
    GOOD: { min: 80, label: 'Tốt', color: 'green' },
    ACCEPTABLE: { min: 70, label: 'Chấp nhận', color: 'yellow' },
    NEEDS_WORK: { min: 60, label: 'Cần cải thiện', color: 'orange' },
    POOR: { min: 0, label: 'Yếu', color: 'red' },
  } as const,
};

// ================== TYPE DEFINITIONS ==================
export interface CritiqueIssue {
  category: CritiqueCategory;
  severity: 'error' | 'warning' | 'info';
  description: string;
  location?: string;
  suggestion?: string;
}

export type CritiqueCategory = 
  | 'brand_voice'
  | 'compliance' 
  | 'hook' 
  | 'structure'
  | 'engagement'
  | 'channel_fit'
  | 'cta'
  | 'readability'
  | 'forbidden';

// Enhanced Critique Scores with 8 categories
export interface CritiqueScores {
  brand_voice: number;          // 0-15: Tone, style, formality
  compliance: number;           // 0-25: Rules, forbidden terms
  hook_strength: number;        // 0-18: Opening impact
  content_structure: number;    // 0-12: Flow, format
  engagement_potential: number; // 0-10: Virality, shareability
  channel_fit: number;          // 0-15: Platform optimization
  cta_quality: number;          // 0-8: CTA effectiveness (MỚI)
  readability: number;          // 0-7: Mobile-first reading (MỚI)
}

export interface CritiqueResult {
  overall_score: number;
  passed: boolean;
  quality_tier: keyof typeof CRITIQUE_CONFIG.QUALITY_TIERS;
  scores: CritiqueScores;
  issues: CritiqueIssue[];
  suggestions: string[];
  strengths: string[];
  needs_manual_review?: boolean; // Flag for failed critiques
}

export interface MergedRules {
  forbidden_terms: string[];
  compliance_rules: string[];
  claim_restrictions: string[];
  forbidden_words: string[];
  preferred_words: string[];
  tone_of_voice: string[];
  formality_level: string;
  language_style: string[];
  allow_emoji: boolean;
}

export interface BrandVoice {
  brand_positioning: string | null;
  tone_of_voice: string[] | null;
  formality_level: string | null;
  language_style: string[] | null;
  preferred_words: string[] | null;
  forbidden_words: string[] | null;
  allow_emoji: boolean;
  compliance_rules: string[] | null;
}

export type ContentType = 'multichannel' | 'script' | 'carousel';

// ================== HELPER FUNCTIONS ==================
export function getQualityTier(score: number): keyof typeof CRITIQUE_CONFIG.QUALITY_TIERS {
  const tiers = CRITIQUE_CONFIG.QUALITY_TIERS;
  if (score >= tiers.EXCELLENT.min) return 'EXCELLENT';
  if (score >= tiers.GOOD.min) return 'GOOD';
  if (score >= tiers.ACCEPTABLE.min) return 'ACCEPTABLE';
  if (score >= tiers.NEEDS_WORK.min) return 'NEEDS_WORK';
  return 'POOR';
}

// Map old category names to new ones
function mapCategory(category: string): CritiqueCategory {
  const mapping: Record<string, CritiqueCategory> = {
    'brand_voice': 'brand_voice',
    'brand_voice_consistency': 'brand_voice',
    'compliance': 'compliance',
    'hook': 'hook',
    'hook_strength': 'hook',
    'quality': 'structure',
    'content_quality': 'structure',
    'structure': 'structure',
    'content_structure': 'structure',
    'engagement': 'engagement',
    'engagement_potential': 'engagement',
    'channel_fit': 'channel_fit',
    'cta': 'cta',
    'cta_quality': 'cta',
    'readability': 'readability',
    'forbidden': 'forbidden',
  };
  return mapping[category] || 'structure';
}

// Create default critique result (used on errors)
function createDefaultCritiqueResult(isError: boolean = false): CritiqueResult {
  // On error: return low score with manual review flag
  // This prevents false positives from being published
  const score = isError ? 50 : 75;
  const tier = getQualityTier(score);
  
  return {
    overall_score: score,
    passed: !isError && score >= CRITIQUE_CONFIG.PASS_THRESHOLD,
    quality_tier: tier,
    needs_manual_review: isError, // Flag for manual review
    scores: {
      brand_voice: Math.round(score * 0.15),
      compliance: Math.round(score * 0.25),
      hook_strength: Math.round(score * 0.18),
      content_structure: Math.round(score * 0.12),
      engagement_potential: Math.round(score * 0.10),
      channel_fit: Math.round(score * 0.15),
      cta_quality: Math.round(score * 0.08),
      readability: Math.round(score * 0.07),
    },
    issues: isError ? [{
      category: 'structure',
      severity: 'error',
      description: 'Không thể phân tích tự động - BẮT BUỘC review thủ công',
    }] : [{
      category: 'structure',
      severity: 'warning',
      description: 'Không thể phân tích chi tiết - cần review thủ công',
    }],
    suggestions: ['Kiểm tra lại nội dung trước khi đăng'],
    strengths: [],
  };
}

// ================== PROMPT BUILDERS ==================
export function buildCritiquePrompt(
  content: any,
  contentType: ContentType,
  brandVoice?: BrandVoice,
  mergedRules?: MergedRules,
  additionalContext?: string
): string {
  const forbiddenTerms = mergedRules?.forbidden_terms || [];
  const forbiddenWords = mergedRules?.forbidden_words || brandVoice?.forbidden_words || [];
  const preferredWords = mergedRules?.preferred_words || brandVoice?.preferred_words || [];
  const toneOfVoice = mergedRules?.tone_of_voice || brandVoice?.tone_of_voice || [];
  const complianceRules = mergedRules?.compliance_rules || brandVoice?.compliance_rules || [];
  const formalityLevel = mergedRules?.formality_level || brandVoice?.formality_level || 'professional';

  let contentText = '';
  
  if (contentType === 'multichannel') {
    const channels = Object.keys(content).filter(k => 
      k.endsWith('_content') || 
      ['title', 'facebook', 'instagram', 'twitter', 'website', 'linkedin', 'google_maps', 'email', 'zalo_oa', 'telegram', 'youtube', 'tiktok'].includes(k)
    );
    contentText = channels.map(ch => `[${ch}]: ${content[ch] || content[ch + '_content'] || ''}`).join('\n\n');
  } else if (contentType === 'script') {
    contentText = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  } else if (contentType === 'carousel') {
    contentText = content.slides?.map((s: any) => 
      `[Slide ${s.slideNumber}]: ${s.textContent}\n[Prompt]: ${s.fullPrompt}`
    ).join('\n\n') || JSON.stringify(content, null, 2);
  }

  // Build hook anti-patterns list
  const hookAntiPatterns = HOOK_CRITERIA.antiPatterns.map(ap => `"${ap.pattern.source}"`).slice(0, 5).join(', ');

  return `Bạn là Content Quality Analyst chuyên nghiệp với 10+ năm kinh nghiệm. ĐÁNH GIÁ NGHIÊM KHẮC nội dung sau.

## NỘI DUNG CẦN ĐÁNH GIÁ (${contentType.toUpperCase()})
${contentText}

## TIÊU CHÍ ĐÁNH GIÁ (Tổng 100 điểm - 8 Categories)

### 1. BRAND VOICE (15 điểm)
- Tone of Voice yêu cầu: ${toneOfVoice.join(', ') || 'N/A'}
- Formality Level: ${formalityLevel}
- Kiểm tra: Giọng văn nhất quán? Đúng tone? Đúng style?
- Trừ điểm: Giọng văn không nhất quán, sai formality level

### 2. COMPLIANCE (25 điểm) ⚠️ QUAN TRỌNG NHẤT
${forbiddenTerms.length > 0 ? `- TỪ CẤM TUYỆT ĐỐI: ${forbiddenTerms.join(', ')}` : ''}
${forbiddenWords.length > 0 ? `- Từ cấm brand: ${forbiddenWords.join(', ')}` : ''}
${complianceRules.length > 0 ? `- Quy tắc:\n  ${complianceRules.slice(0, 5).join('\n  ')}` : ''}
- ⚠️ VI PHẠM TỪ CẤM → compliance = 0, overall_score TỐI ĐA 50

### 3. HOOK STRENGTH (18 điểm) 🎯 CRITICAL
- Câu mở đầu PHẢI gây tò mò/shock trong 3 giây đầu
- Patterns tốt: Số liệu, Câu hỏi, Story hook, Pain point, Curiosity gap
- ❌ ANTI-PATTERNS (trừ điểm nặng): ${hookAntiPatterns}
- Hook generic = tối đa 5/18 điểm

### 4. CONTENT STRUCTURE (12 điểm)
- Cấu trúc logic, flow tốt?
- Format đúng (markdown, paragraphs)?
${preferredWords.length > 0 ? `- Từ nên dùng: ${preferredWords.slice(0, 10).join(', ')}` : ''}

### 5. ENGAGEMENT POTENTIAL (10 điểm)
- Nội dung có viral potential?
- Có yếu tố share-worthy?
- Gây emotion/reaction?

### 6. CHANNEL FIT (15 điểm) 🎯 CRITICAL cho multichannel
- Đúng độ dài kênh? (FB: 100-500, IG: 50-300, LI: 150-700, TW: 20-280)
- Emoji policy đúng (${mergedRules?.allow_emoji || brandVoice?.allow_emoji ? 'Cho phép' : 'Không dùng'})?
- Hashtags phù hợp?
- Content có adapt theo từng kênh hay copy y nguyên?

### 7. CTA QUALITY (8 điểm) - MỚI
- CTA có cụ thể không? (generic = 2đ, specific = 6đ, compelling = 8đ)
- CTA có action verb + benefit?
- CTA có urgency element?
- ❌ CTA generic như "Liên hệ ngay", "Xem thêm" = tối đa 2 điểm

### 8. READABILITY (7 điểm) - MỚI
- Câu có ngắn gọn? (max 25 từ/câu)
- Paragraph có được chia nhỏ? (max 3-4 dòng)
- Có bullet points, numbered list?
- Có bold keywords?
- Mobile-friendly?
${additionalContext || ''}

## OUTPUT FORMAT (JSON ONLY)
{
  "overall_score": 0-100,
  "passed": true/false,
  "scores": {
    "brand_voice": 0-15,
    "compliance": 0-25,
    "hook_strength": 0-18,
    "content_structure": 0-12,
    "engagement_potential": 0-10,
    "channel_fit": 0-15,
    "cta_quality": 0-8,
    "readability": 0-7
  },
  "issues": [
    {
      "category": "brand_voice|compliance|hook|structure|engagement|channel_fit|cta|readability|forbidden",
      "severity": "error|warning|info",
      "description": "Mô tả cụ thể vấn đề",
      "location": "tên kênh/slide (optional)",
      "suggestion": "Gợi ý sửa trực tiếp (optional)"
    }
  ],
  "suggestions": ["Gợi ý cải thiện 1", "Gợi ý 2"],
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"]
}

## NGUYÊN TẮC ĐÁNH GIÁ NGHIÊM KHẮC
1. COMPLIANCE ƯU TIÊN #1 - Vi phạm = 0 điểm compliance, max 50 overall
2. HOOK PHẢI MẠNH - Generic hook = max 5/18 điểm
3. CTA PHẢI CỤ THỂ - "Liên hệ ngay" = max 2/8 điểm
4. ĐÁNH GIÁ THỰC TẾ - Không cho điểm cao nếu content trung bình
5. passed = true NẾU VÀ CHỈ NẾU overall_score >= ${CRITIQUE_CONFIG.PASS_THRESHOLD}
6. NHẬN DIỆN ĐIỂM MẠNH - Ghi nhận những gì làm tốt trong "strengths"

CHỈ TRẢ VỀ JSON, KHÔNG CÓ TEXT KHÁC.`;
}

// Build focused refinement prompt
export function buildRefinePrompt(
  originalContent: any,
  critiqueResult: CritiqueResult,
  contentType: ContentType,
  brandVoice?: BrandVoice,
  mergedRules?: MergedRules
): string {
  const issuesList = critiqueResult.issues
    .map(i => `- [${i.severity.toUpperCase()}] ${i.category}: ${i.description}${i.location ? ` (${i.location})` : ''}${i.suggestion ? `\n  → ${i.suggestion}` : ''}`)
    .join('\n');
  
  const suggestionsList = critiqueResult.suggestions.join('\n- ');

  // Get focused refinement prompt based on lowest category
  const maxScores = {
    brand_voice: 15,
    compliance: 25,
    hook_strength: 18,
    content_structure: 12,
    engagement_potential: 10,
    channel_fit: 15,
    cta_quality: 8,
    readability: 7,
  };
  const focusPrompt = getFocusedRefinePrompt(critiqueResult.scores as unknown as Record<string, number>, maxScores);

  let contentText = '';
  if (contentType === 'multichannel') {
    contentText = JSON.stringify(originalContent, null, 2);
  } else if (contentType === 'script') {
    contentText = typeof originalContent === 'string' ? originalContent : JSON.stringify(originalContent, null, 2);
  } else if (contentType === 'carousel') {
    contentText = JSON.stringify(originalContent, null, 2);
  }

  return `Bạn là Content Editor chuyên nghiệp. SỬA LỖI nội dung sau dựa trên feedback.

## NỘI DUNG GỐC (${contentType.toUpperCase()})
${contentText}

## CRITIQUE SCORE: ${critiqueResult.overall_score}/100 (CẦN >= ${CRITIQUE_CONFIG.PASS_THRESHOLD})

## VẤN ĐỀ CẦN SỬA
${issuesList}

## GỢI Ý SỬA
- ${suggestionsList}

## FOCUS ƯU TIÊN
${focusPrompt}

## QUY TẮC QUAN TRỌNG
${mergedRules?.forbidden_terms?.length ? `- KHÔNG DÙNG các từ CẤM: ${mergedRules.forbidden_terms.join(', ')}` : ''}
${mergedRules?.forbidden_words?.length ? `- TRÁNH các từ: ${mergedRules.forbidden_words.join(', ')}` : ''}
${mergedRules?.preferred_words?.length ? `- NÊN DÙNG: ${mergedRules.preferred_words.slice(0, 10).join(', ')}` : ''}
${brandVoice?.tone_of_voice?.length ? `- TONE: ${brandVoice.tone_of_voice.join(', ')}` : ''}

## YÊU CẦU
1. SỬA TẤT CẢ các issues được liệt kê, ƯU TIÊN theo FOCUS
2. GIỮ NGUYÊN cấu trúc và format output gốc
3. KHÔNG thay đổi ý nghĩa chính của nội dung
4. TRẢ VỀ CÙNG FORMAT JSON/TEXT như input
5. HOOK PHẢI MẠNH - Không bắt đầu bằng "Xin chào", "Hôm nay"
6. CTA PHẢI CỤ THỂ - Có action verb + benefit + urgency

CHỈ TRẢ VỀ NỘI DUNG ĐÃ SỬA, KHÔNG CÓ GIẢI THÍCH.`;
}

// ================== PARSE CRITIQUE RESULT ==================
export function parseCritiqueResult(aiResponse: string): CritiqueResult {
  try {
    let jsonStr = aiResponse.trim();
    
    // Handle markdown code blocks
    if (jsonStr.includes('```json')) {
      const match = jsonStr.match(/```json\s*([\s\S]*?)```/);
      if (match) jsonStr = match[1].trim();
    } else if (jsonStr.includes('```')) {
      const match = jsonStr.match(/```\s*([\s\S]*?)```/);
      if (match) jsonStr = match[1].trim();
    }
    
    const parsed = JSON.parse(jsonStr);
    
    // Validate and normalize with new 8-category scores
    const scores: CritiqueScores = {
      brand_voice: Math.max(0, Math.min(15, parseInt(parsed.scores?.brand_voice) || 0)),
      compliance: Math.max(0, Math.min(25, parseInt(parsed.scores?.compliance) || 0)),
      hook_strength: Math.max(0, Math.min(18, parseInt(parsed.scores?.hook_strength) || 0)),
      content_structure: Math.max(0, Math.min(12, parseInt(parsed.scores?.content_structure) || 0)),
      engagement_potential: Math.max(0, Math.min(10, parseInt(parsed.scores?.engagement_potential) || 0)),
      channel_fit: Math.max(0, Math.min(15, parseInt(parsed.scores?.channel_fit) || 0)),
      cta_quality: Math.max(0, Math.min(8, parseInt(parsed.scores?.cta_quality) || 0)),
      readability: Math.max(0, Math.min(7, parseInt(parsed.scores?.readability) || 0)),
    };
    
    // Recalculate overall score from individual scores
    const calculatedScore = Object.values(scores).reduce((a, b) => a + b, 0);
    
    const passed = calculatedScore >= CRITIQUE_CONFIG.PASS_THRESHOLD;

    // Severity normalization:
    // `severity: error` should be reserved for true compliance/forbidden-word violations.
    // Quality nits (weak CTA, generic hook, structure) are suggestions — not errors —
    // especially when the content has already passed (>= PASS_THRESHOLD).
    const HARD_ERROR_CATEGORIES = new Set(['compliance', 'forbidden']);
    const normalizedIssues = (parsed.issues || []).map((i: any) => {
      const category = mapCategory(i.category) || 'structure';
      const rawSeverity = i.severity || 'warning';
      const severity = rawSeverity === 'error' && passed && !HARD_ERROR_CATEGORIES.has(category)
        ? 'warning'
        : rawSeverity;
      return {
        category,
        severity,
        description: i.description || 'Unknown issue',
        location: i.location,
        suggestion: i.suggestion,
      };
    });

    const result: CritiqueResult = {
      overall_score: calculatedScore,
      passed,
      quality_tier: getQualityTier(calculatedScore),
      scores,
      issues: normalizedIssues,
      suggestions: parsed.suggestions || [],
      strengths: parsed.strengths || [],
      needs_manual_review: false,
    };
    
    return result;
  } catch (err) {
    console.error('Failed to parse critique result:', err);
    return createDefaultCritiqueResult(true); // Mark as needs review
  }
}

// ================== SHOULD REFINE ==================
export function shouldRefine(critiqueResult: CritiqueResult): boolean {
  // Check refinement strategy based on score
  const strategy = getRefinementStrategy(critiqueResult.overall_score);
  if (strategy.maxTries === 0) return false;
  
  // Refine if score < threshold
  if (critiqueResult.overall_score < CRITIQUE_CONFIG.PASS_THRESHOLD) {
    return true;
  }
  
  // Also refine if there are any error-severity issues
  if (critiqueResult.issues.some(i => i.severity === 'error')) {
    return true;
  }
  
  return false;
}

// ================== TIMEOUT WRAPPER ==================
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
  label: string
): Promise<{ result: T; timedOut: boolean }> {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  const timeoutPromise = new Promise<{ result: T; timedOut: boolean }>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[Self-Critique] ${label} timeout after ${timeoutMs}ms, using fallback`);
      resolve({ result: fallback, timedOut: true });
    }, timeoutMs);
  });
  
  const wrappedPromise = promise.then(result => {
    clearTimeout(timeoutId);
    return { result, timedOut: false };
  }).catch(err => {
    clearTimeout(timeoutId);
    console.error(`[Self-Critique] ${label} error:`, err);
    return { result: fallback, timedOut: false };
  });
  
  return Promise.race([wrappedPromise, timeoutPromise]);
}

// ================== MAIN CRITIQUE FUNCTION ==================
export async function critiqueContent(options: {
  content: any;
  contentType: ContentType;
  brandVoice?: BrandVoice;
  mergedRules?: MergedRules;
  additionalContext?: string;
  apiKey: string;
  organizationId?: string;
}): Promise<CritiqueResult> {
  const { content, contentType, brandVoice, mergedRules, additionalContext, apiKey, organizationId } = options;
  
  const critiquePrompt = buildCritiquePrompt(content, contentType, brandVoice, mergedRules, additionalContext);
  
  console.log(`[Self-Critique] Starting critique for ${contentType}...`);
  
  // Fetch AI config for critique function
  const aiConfig = await getAIConfig('critique-content', organizationId);
  console.log(`[Self-Critique] Using model: ${aiConfig.model}, temp: ${aiConfig.temperature}`);
  
  const doFetch = async (): Promise<CritiqueResult> => {
    const aiResult = await callAIProvider({
      functionName: 'critique-content',
      organizationId,
      messages: [
        { 
          role: "system", 
          content: "You are a strict content quality analyst with 10+ years experience in content marketing. Always respond with valid JSON only. Be critical and honest in your scoring." 
        },
        { role: "user", content: critiquePrompt }
      ],
      modelOverride: aiConfig.model || undefined,
      temperatureOverride: aiConfig.temperature,
    });

    if (!aiResult.success) {
      console.error(`[Self-Critique] AI error: ${aiResult.error}`);
      return createDefaultCritiqueResult(true);
    }

    const aiContent = aiResult.data?.choices?.[0]?.message?.content || '';
    
    const result = parseCritiqueResult(aiContent);
    console.log(`[Self-Critique] Score: ${result.overall_score}/100, Tier: ${result.quality_tier}, Passed: ${result.passed}, Issues: ${result.issues.length}`);
    
    return result;
  };

  const { result, timedOut } = await withTimeout(
    doFetch(),
    CRITIQUE_CONFIG.CRITIQUE_TIMEOUT_MS,
    createDefaultCritiqueResult(true),
    'Critique'
  );
  
  if (timedOut) {
    result.needs_manual_review = true;
  }
  
  return result;
}

// ================== MAIN REFINEMENT FUNCTION ==================
export async function refineContent(options: {
  originalContent: any;
  critiqueResult: CritiqueResult;
  contentType: ContentType;
  brandVoice?: BrandVoice;
  mergedRules?: MergedRules;
  apiKey: string;
  organizationId?: string;
}): Promise<any> {
  const { originalContent, critiqueResult, contentType, brandVoice, mergedRules, apiKey, organizationId } = options;
  
  const refinePrompt = buildRefinePrompt(originalContent, critiqueResult, contentType, brandVoice, mergedRules);
  
  console.log(`[Self-Critique] Starting refinement for ${contentType}...`);
  
  // Fetch AI config for refine function
  const aiConfig = await getAIConfig('refine-content', organizationId);
  console.log(`[Self-Critique] Using model: ${aiConfig.model}, temp: ${aiConfig.temperature}`);
  
  const doFetch = async (): Promise<any> => {
    const aiResult = await callAIProvider({
      functionName: 'refine-content',
      organizationId,
      messages: [
        { 
          role: "system", 
          content: "You are a professional content editor. Fix the issues while maintaining the original structure and format. Focus on making hooks compelling and CTAs specific." 
        },
        { role: "user", content: refinePrompt }
      ],
      modelOverride: aiConfig.model || undefined,
      temperatureOverride: aiConfig.temperature,
    });

    if (!aiResult.success) {
      console.error(`[Self-Critique] Refinement error: ${aiResult.error}`);
      return originalContent;
    }

    const aiContent = aiResult.data?.choices?.[0]?.message?.content || '';
    
    // Parse based on content type
    if (contentType === 'script') {
      return aiContent.trim();
    } else {
      try {
        let jsonStr = aiContent.trim();
        if (jsonStr.includes('```json')) {
          const match = jsonStr.match(/```json\s*([\s\S]*?)```/);
          if (match) jsonStr = match[1].trim();
        } else if (jsonStr.includes('```')) {
          const match = jsonStr.match(/```\s*([\s\S]*?)```/);
          if (match) jsonStr = match[1].trim();
        }
        return JSON.parse(jsonStr);
      } catch {
        console.error('[Self-Critique] Failed to parse refined content as JSON');
        return originalContent;
      }
    }
  };

  const { result } = await withTimeout(
    doFetch(),
    CRITIQUE_CONFIG.REFINE_TIMEOUT_MS,
    originalContent,
    'Refinement'
  );
  
  return result;
}

// ================== COMPLETE SELF-CRITIQUE LOOP ==================
export async function runSelfCritiqueLoop(options: {
  content: any;
  contentType: ContentType;
  brandVoice?: BrandVoice;
  mergedRules?: MergedRules;
  additionalContext?: string;
  apiKey: string;
  maxRefinements?: number; // NEW: Override max refinements (for quality modes)
  organizationId?: string; // For AI hook evaluator
}): Promise<{
  finalContent: any;
  critiqueResult: CritiqueResult;
  wasRefined: boolean;
  refinementCount: number;
  needsManualReview: boolean;
  hookEvaluations?: Record<string, HookEvaluation>;
}> {
  const { content, contentType, brandVoice, mergedRules, additionalContext, apiKey, maxRefinements: maxRefinementsOverride, organizationId } = options;
  
  let currentContent = content;
  let refinementCount = 0;
  let wasRefined = false;
  let needsManualReview = false;
  let hookEvaluations: Record<string, HookEvaluation> = {};
  
  // First critique
  let critiqueResult = await critiqueContent({
    content: currentContent,
    contentType,
    brandVoice,
    mergedRules,
    additionalContext,
    apiKey,
  });
  
  const initialScore = critiqueResult.overall_score;
  console.log(`[Self-Critique] Initial score: ${initialScore}`);
  
  // Enhanced Hook Evaluation using AI Hook Evaluator (for multichannel content)
  if (contentType === 'multichannel' && critiqueResult.scores.hook_strength < 14) {
    console.log(`[Self-Critique] Hook score low (${critiqueResult.scores.hook_strength}/18), running AI hook evaluation...`);
    try {
      // Extract hooks from channel content
      const channels = Object.keys(currentContent).filter(k => 
        k.endsWith('_content') && currentContent[k]
      );
      
      // Evaluate hooks in parallel (limit to first 4 channels for performance)
      const evalPromises = channels.slice(0, 4).map(async (channelKey) => {
        const channelName = channelKey.replace('_content', '');
        const channelContent = currentContent[channelKey];
        // Extract first line/sentence as hook
        const hook = channelContent?.split(/[\n.!?]/)[0]?.trim() || '';
        if (hook.length > 10) {
          const evaluation = await evaluateHook(hook, channelName, {
            brandVoice: brandVoice?.tone_of_voice?.join(', '),
            organizationId,
          });
          return [channelName, evaluation] as const;
        }
        return null;
      });
      
      const results = await Promise.all(evalPromises);
      results.forEach(result => {
        if (result) {
          hookEvaluations[result[0]] = result[1];
        }
      });
      
      // Adjust hook_strength score based on AI evaluation average
      const avgHookScore = Object.values(hookEvaluations).reduce((sum, e) => sum + e.combinedScore, 0) / 
        Math.max(Object.values(hookEvaluations).length, 1);
      if (avgHookScore > 0) {
        // Blend regex score with AI score (AI has more weight for low scores)
        const aiWeight = critiqueResult.scores.hook_strength < 10 ? 0.6 : 0.4;
        const blendedHookScore = Math.round(
          critiqueResult.scores.hook_strength * (1 - aiWeight) + 
          (avgHookScore / 100 * 18) * aiWeight
        );
        console.log(`[Self-Critique] Hook score adjusted: ${critiqueResult.scores.hook_strength} → ${blendedHookScore} (AI avg: ${avgHookScore.toFixed(1)})`);
        
        // Update scores
        const oldOverall = critiqueResult.overall_score;
        critiqueResult.scores.hook_strength = Math.min(18, blendedHookScore);
        critiqueResult.overall_score = Object.values(critiqueResult.scores).reduce((a, b) => a + b, 0);
        critiqueResult.passed = critiqueResult.overall_score >= CRITIQUE_CONFIG.PASS_THRESHOLD;
        critiqueResult.quality_tier = getQualityTier(critiqueResult.overall_score);
        
        // Add hook-specific issues from AI evaluation
        Object.entries(hookEvaluations).forEach(([channel, evaluation]) => {
          evaluation.issues.forEach(issue => {
            if (!critiqueResult.issues.some(i => i.description.includes(issue))) {
              critiqueResult.issues.push({
                category: 'hook',
                severity: 'warning',
                description: `[${channel}] ${issue}`,
              });
            }
          });
        });
        
        console.log(`[Self-Critique] Overall score adjusted: ${oldOverall} → ${critiqueResult.overall_score}`);
      }
    } catch (hookEvalError) {
      console.warn('[Self-Critique] AI hook evaluation failed, continuing with regex score:', hookEvalError);
    }
  }
  
  // Get refinement strategy based on score
  const strategy = getRefinementStrategy(critiqueResult.overall_score);
  // Use override if provided, otherwise use strategy limit capped by config
  const maxRefinements = maxRefinementsOverride !== undefined 
    ? maxRefinementsOverride 
    : Math.min(strategy.maxTries, CRITIQUE_CONFIG.MAX_REFINEMENTS);
  
  // Refine loop (up to maxRefinements times)
  while (shouldRefine(critiqueResult) && refinementCount < maxRefinements) {
    console.log(`[Self-Critique] Content needs refinement (attempt ${refinementCount + 1}/${maxRefinements}), score: ${critiqueResult.overall_score}, focus: ${strategy.focus}`);
    
    const refinedContent = await refineContent({
      originalContent: currentContent,
      critiqueResult,
      contentType,
      brandVoice,
      mergedRules,
      apiKey,
    });
    
    if (refinedContent !== currentContent) {
      currentContent = refinedContent;
      wasRefined = true;
      refinementCount++;
      
      // Re-critique refined content
      critiqueResult = await critiqueContent({
        content: currentContent,
        contentType,
        brandVoice,
        mergedRules,
        additionalContext,
        apiKey,
      });
      
      console.log(`[Self-Critique] After refinement ${refinementCount}: ${critiqueResult.overall_score} (improved by ${critiqueResult.overall_score - initialScore})`);
    } else {
      // No change from refinement, break loop
      break;
    }
  }
  
  // Determine if manual review is needed
  // Criteria: score < MIN_ACCEPTABLE after all refinements OR critique had errors
  if (critiqueResult.overall_score < CRITIQUE_CONFIG.MIN_ACCEPTABLE) {
    needsManualReview = true;
    critiqueResult.needs_manual_review = true;
    console.log(`[Self-Critique] ⚠️ MANUAL REVIEW NEEDED: score ${critiqueResult.overall_score} < ${CRITIQUE_CONFIG.MIN_ACCEPTABLE}`);
  }
  
  // Also flag if critique itself errored (already flagged in createDefaultCritiqueResult)
  if (critiqueResult.needs_manual_review) {
    needsManualReview = true;
  }
  
  // Log final results
  console.log(`[Self-Critique] COMPLETE: score=${critiqueResult.overall_score}, tier=${critiqueResult.quality_tier}, refined=${wasRefined} (x${refinementCount}), needsReview=${needsManualReview}`);
  
  return {
    finalContent: currentContent,
    critiqueResult,
    wasRefined,
    refinementCount,
    needsManualReview,
    hookEvaluations: Object.keys(hookEvaluations).length > 0 ? hookEvaluations : undefined,
  };
}
