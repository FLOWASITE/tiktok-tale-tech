// ============================================
// Self-Critique Loop for AI Content Generation
// Evaluates and refines AI-generated content with Enhanced Scoring
// ============================================

// Critique Configuration with Enhanced Weights
export const CRITIQUE_CONFIG = {
  PASS_THRESHOLD: 80,           // Score >= 80 = không cần refine
  MIN_ACCEPTABLE: 60,           // Score < 60 = flag warning
  MAX_REFINEMENTS: 1,           // Tối đa 1 lần refine
  COMPLIANCE_WEIGHT: 2.0,       // Compliance quan trọng gấp đôi
  TIMEOUT_MS: 15000,            // Timeout cho mỗi critique call
  
  // Enhanced category weights (must sum to 100)
  CATEGORY_WEIGHTS: {
    brand_voice: 20,
    compliance: 25,
    hook_strength: 15,
    content_structure: 15,
    engagement_potential: 15,
    channel_fit: 10,
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

// Type definitions
export interface CritiqueIssue {
  category: CritiqueCategory;
  severity: 'error' | 'warning' | 'info';
  description: string;
  location?: string; // Which channel or slide
  suggestion?: string; // Direct fix suggestion
}

export type CritiqueCategory = 
  | 'brand_voice'
  | 'compliance' 
  | 'hook' 
  | 'structure'
  | 'engagement'
  | 'channel_fit'
  | 'forbidden';

// Enhanced Critique Scores with 6 categories
export interface CritiqueScores {
  brand_voice: number;          // 0-20: Tone, style, formality
  compliance: number;           // 0-25: Rules, forbidden terms
  hook_strength: number;        // 0-15: Opening impact
  content_structure: number;    // 0-15: Flow, CTA, format
  engagement_potential: number; // 0-15: Virality, shareability
  channel_fit: number;          // 0-10: Platform optimization
}

export interface CritiqueResult {
  overall_score: number; // 0-100
  passed: boolean;
  quality_tier: keyof typeof CRITIQUE_CONFIG.QUALITY_TIERS;
  scores: CritiqueScores;
  issues: CritiqueIssue[];
  suggestions: string[];
  strengths: string[]; // What's working well
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

// Helper to determine quality tier
export function getQualityTier(score: number): keyof typeof CRITIQUE_CONFIG.QUALITY_TIERS {
  const tiers = CRITIQUE_CONFIG.QUALITY_TIERS;
  if (score >= tiers.EXCELLENT.min) return 'EXCELLENT';
  if (score >= tiers.GOOD.min) return 'GOOD';
  if (score >= tiers.ACCEPTABLE.min) return 'ACCEPTABLE';
  if (score >= tiers.NEEDS_WORK.min) return 'NEEDS_WORK';
  return 'POOR';
}

// Build critique prompt based on content type
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
    // Extract all channel content
    const channels = Object.keys(content).filter(k => k.endsWith('_content') || ['title', 'facebook', 'instagram', 'twitter', 'website', 'linkedin', 'google_maps', 'email', 'zalo_oa', 'telegram', 'youtube'].includes(k));
    contentText = channels.map(ch => `[${ch}]: ${content[ch] || content[ch + '_content'] || ''}`).join('\n\n');
  } else if (contentType === 'script') {
    contentText = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  } else if (contentType === 'carousel') {
    contentText = content.slides?.map((s: any) => 
      `[Slide ${s.slideNumber}]: ${s.textContent}\n[Prompt]: ${s.fullPrompt}`
    ).join('\n\n') || JSON.stringify(content, null, 2);
  }

  return `Bạn là Content Quality Analyst chuyên nghiệp. ĐÁNH GIÁ NGHIÊM KHẮC nội dung sau.

## NỘI DUNG CẦN ĐÁNH GIÁ (${contentType.toUpperCase()})
${contentText}

## TIÊU CHÍ ĐÁNH GIÁ (Tổng 100 điểm - 6 Categories)

### 1. BRAND VOICE (20 điểm)
- Tone of Voice yêu cầu: ${toneOfVoice.join(', ') || 'N/A'}
- Formality Level: ${formalityLevel}
- Kiểm tra: Giọng văn nhất quán? Đúng tone? Đúng style?
- Trừ điểm: Giọng văn không nhất quán, sai formality level

### 2. COMPLIANCE (25 điểm) ⚠️ QUAN TRỌNG NHẤT
${forbiddenTerms.length > 0 ? `- TỪ CẤM TUYỆT ĐỐI: ${forbiddenTerms.join(', ')}` : ''}
${forbiddenWords.length > 0 ? `- Từ cấm brand: ${forbiddenWords.join(', ')}` : ''}
${complianceRules.length > 0 ? `- Quy tắc:\n  ${complianceRules.slice(0, 5).join('\n  ')}` : ''}
- ⚠️ VI PHẠM → compliance = 0, overall_score tối đa 50

### 3. HOOK STRENGTH (15 điểm)
- Câu mở đầu gây tò mò/shock?
- Có số liệu, câu hỏi, statement mạnh?
- Trừ: Hook generic "Xin chào", "Hôm nay..."

### 4. CONTENT STRUCTURE (15 điểm)
- Cấu trúc logic, flow tốt?
- CTA rõ ràng và phù hợp?
- Format đúng (markdown, paragraphs)?
${preferredWords.length > 0 ? `- Từ nên dùng: ${preferredWords.slice(0, 10).join(', ')}` : ''}

### 5. ENGAGEMENT POTENTIAL (15 điểm)
- Nội dung có viral potential?
- Có yếu tố share-worthy?
- Gây emotion/reaction?

### 6. CHANNEL FIT (10 điểm)
- Đúng độ dài kênh?
- Emoji policy đúng (${mergedRules?.allow_emoji || brandVoice?.allow_emoji ? 'Cho phép' : 'Không dùng'})?
- Hashtags phù hợp?
${additionalContext || ''}

## OUTPUT FORMAT (JSON ONLY)
{
  "overall_score": 0-100,
  "passed": true/false,
  "scores": {
    "brand_voice": 0-20,
    "compliance": 0-25,
    "hook_strength": 0-15,
    "content_structure": 0-15,
    "engagement_potential": 0-15,
    "channel_fit": 0-10
  },
  "issues": [
    {
      "category": "brand_voice|compliance|hook|structure|engagement|channel_fit|forbidden",
      "severity": "error|warning|info",
      "description": "Mô tả cụ thể vấn đề",
      "location": "tên kênh/slide (optional)",
      "suggestion": "Gợi ý sửa trực tiếp (optional)"
    }
  ],
  "suggestions": ["Gợi ý cải thiện 1", "Gợi ý 2"],
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"]
}

## NGUYÊN TẮC
1. NGHIÊM KHẮC - Đánh giá như reviewer chuyên nghiệp
2. CỤ THỂ - Chỉ rõ vị trí lỗi
3. ACTIONABLE - Mỗi issue có gợi ý sửa
4. COMPLIANCE ƯU TIÊN #1
5. passed = true NẾU overall_score >= ${CRITIQUE_CONFIG.PASS_THRESHOLD}
6. NHẬN DIỆN ĐIỂM MẠNH - Ghi nhận những gì làm tốt

CHỈ TRẢ VỀ JSON, KHÔNG CÓ TEXT KHÁC.`;
}

// Build refinement prompt
export function buildRefinePrompt(
  originalContent: any,
  critiqueResult: CritiqueResult,
  contentType: ContentType,
  brandVoice?: BrandVoice,
  mergedRules?: MergedRules
): string {
  const issuesList = critiqueResult.issues
    .map(i => `- [${i.severity.toUpperCase()}] ${i.category}: ${i.description}${i.location ? ` (${i.location})` : ''}`)
    .join('\n');
  
  const suggestionsList = critiqueResult.suggestions.join('\n- ');

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

## QUY TẮC QUAN TRỌNG
${mergedRules?.forbidden_terms?.length ? `- KHÔNG DÙNG các từ: ${mergedRules.forbidden_terms.join(', ')}` : ''}
${mergedRules?.forbidden_words?.length ? `- TRÁNH các từ: ${mergedRules.forbidden_words.join(', ')}` : ''}
${mergedRules?.preferred_words?.length ? `- NÊN DÙNG: ${mergedRules.preferred_words.slice(0, 10).join(', ')}` : ''}
${brandVoice?.tone_of_voice?.length ? `- TONE: ${brandVoice.tone_of_voice.join(', ')}` : ''}

## YÊU CẦU
1. SỬA TẤT CẢ các issues được liệt kê
2. GIỮ NGUYÊN cấu trúc và format output gốc
3. KHÔNG thay đổi ý nghĩa chính của nội dung
4. TRẢ VỀ CÙNG FORMAT JSON/TEXT như input

CHỈ TRẢ VỀ NỘI DUNG ĐÃ SỬA, KHÔNG CÓ GIẢI THÍCH.`;
}

// Parse critique result from AI response
export function parseCritiqueResult(aiResponse: string): CritiqueResult {
  try {
    // Try to extract JSON from response
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
    
    // Validate and normalize with new 6-category scores
    const scores: CritiqueScores = {
      brand_voice: Math.max(0, Math.min(20, parseInt(parsed.scores?.brand_voice) || 0)),
      compliance: Math.max(0, Math.min(25, parseInt(parsed.scores?.compliance) || 0)),
      hook_strength: Math.max(0, Math.min(15, parseInt(parsed.scores?.hook_strength) || 0)),
      content_structure: Math.max(0, Math.min(15, parseInt(parsed.scores?.content_structure) || 0)),
      engagement_potential: Math.max(0, Math.min(15, parseInt(parsed.scores?.engagement_potential) || 0)),
      channel_fit: Math.max(0, Math.min(10, parseInt(parsed.scores?.channel_fit) || 0)),
    };
    
    // Recalculate overall score from individual scores
    const calculatedScore = Object.values(scores).reduce((a, b) => a + b, 0);
    
    const result: CritiqueResult = {
      overall_score: calculatedScore,
      passed: calculatedScore >= CRITIQUE_CONFIG.PASS_THRESHOLD,
      quality_tier: getQualityTier(calculatedScore),
      scores,
      issues: (parsed.issues || []).map((i: any) => ({
        category: mapCategory(i.category) || 'structure',
        severity: i.severity || 'warning',
        description: i.description || 'Unknown issue',
        location: i.location,
        suggestion: i.suggestion,
      })),
      suggestions: parsed.suggestions || [],
      strengths: parsed.strengths || [],
    };
    
    return result;
  } catch (err) {
    console.error('Failed to parse critique result:', err);
    // Return a default "needs review" result
    return createDefaultCritiqueResult(50, false);
  }
}

// Helper to map old category names to new ones
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
    'forbidden': 'forbidden',
  };
  return mapping[category] || 'structure';
}

// Helper to create default critique result
function createDefaultCritiqueResult(score: number, passed: boolean): CritiqueResult {
  const tier = getQualityTier(score);
  return {
    overall_score: score,
    passed,
    quality_tier: tier,
    scores: {
      brand_voice: Math.round(score * 0.2),
      compliance: Math.round(score * 0.25),
      hook_strength: Math.round(score * 0.15),
      content_structure: Math.round(score * 0.15),
      engagement_potential: Math.round(score * 0.15),
      channel_fit: Math.round(score * 0.1),
    },
    issues: [{
      category: 'structure',
      severity: 'warning',
      description: 'Không thể phân tích chi tiết - cần review thủ công',
    }],
    suggestions: ['Kiểm tra lại nội dung trước khi đăng'],
    strengths: [],
  };
}

// Check if content should be refined
export function shouldRefine(critiqueResult: CritiqueResult): boolean {
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

// Main critique function - calls AI to evaluate content
export async function critiqueContent(options: {
  content: any;
  contentType: ContentType;
  brandVoice?: BrandVoice;
  mergedRules?: MergedRules;
  additionalContext?: string;
  apiKey: string;
}): Promise<CritiqueResult> {
  const { content, contentType, brandVoice, mergedRules, additionalContext, apiKey } = options;
  
  const critiquePrompt = buildCritiquePrompt(content, contentType, brandVoice, mergedRules, additionalContext);
  
  console.log(`[Self-Critique] Starting critique for ${contentType}...`);
  
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite", // Use faster model for critique
        messages: [
          { 
            role: "system", 
            content: "You are a strict content quality analyst. Always respond with valid JSON only." 
          },
          { role: "user", content: critiquePrompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error(`[Self-Critique] AI error: ${response.status}`);
      // Return neutral result on error
      return createDefaultCritiqueResult(75, false);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || '';
    
    const result = parseCritiqueResult(aiContent);
    console.log(`[Self-Critique] Score: ${result.overall_score}/100, Tier: ${result.quality_tier}, Passed: ${result.passed}, Issues: ${result.issues.length}`);
    
    return result;
  } catch (err) {
    console.error('[Self-Critique] Error:', err);
    return createDefaultCritiqueResult(75, false);
  }
}

// Main refinement function - calls AI to fix content
export async function refineContent(options: {
  originalContent: any;
  critiqueResult: CritiqueResult;
  contentType: ContentType;
  brandVoice?: BrandVoice;
  mergedRules?: MergedRules;
  apiKey: string;
}): Promise<any> {
  const { originalContent, critiqueResult, contentType, brandVoice, mergedRules, apiKey } = options;
  
  const refinePrompt = buildRefinePrompt(originalContent, critiqueResult, contentType, brandVoice, mergedRules);
  
  console.log(`[Self-Critique] Starting refinement for ${contentType}...`);
  
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash", // Use standard model for refinement
        messages: [
          { 
            role: "system", 
            content: "You are a professional content editor. Fix the issues while maintaining the original structure and format." 
          },
          { role: "user", content: refinePrompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error(`[Self-Critique] Refinement error: ${response.status}`);
      return originalContent; // Return original on error
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || '';
    
    // Parse based on content type
    if (contentType === 'script') {
      // Script is just text
      return aiContent.trim();
    } else {
      // Multichannel and carousel are JSON
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
  } catch (err) {
    console.error('[Self-Critique] Refinement error:', err);
    return originalContent;
  }
}

// Complete self-critique loop
export async function runSelfCritiqueLoop(options: {
  content: any;
  contentType: ContentType;
  brandVoice?: BrandVoice;
  mergedRules?: MergedRules;
  additionalContext?: string;
  apiKey: string;
}): Promise<{
  finalContent: any;
  critiqueResult: CritiqueResult;
  wasRefined: boolean;
  refinementCount: number;
}> {
  const { content, contentType, brandVoice, mergedRules, additionalContext, apiKey } = options;
  
  let currentContent = content;
  let refinementCount = 0;
  let wasRefined = false;
  
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
  
  // Refine if needed (max 1 time as per config)
  if (shouldRefine(critiqueResult) && refinementCount < CRITIQUE_CONFIG.MAX_REFINEMENTS) {
    console.log(`[Self-Critique] Content needs refinement, score: ${critiqueResult.overall_score}`);
    
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
      
      console.log(`[Self-Critique] After refinement: ${critiqueResult.overall_score} (improved by ${critiqueResult.overall_score - initialScore})`);
    }
  }
  
  return {
    finalContent: currentContent,
    critiqueResult,
    wasRefined,
    refinementCount,
  };
}
