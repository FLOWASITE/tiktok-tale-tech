// ============================================
// Self-Critique Loop for AI Content Generation
// Evaluates and refines AI-generated content
// ============================================

// Critique Configuration
export const CRITIQUE_CONFIG = {
  PASS_THRESHOLD: 80,           // Score >= 80 = không cần refine
  MIN_ACCEPTABLE: 60,           // Score < 60 = flag warning
  MAX_REFINEMENTS: 1,           // Tối đa 1 lần refine
  COMPLIANCE_WEIGHT: 2.0,       // Compliance quan trọng gấp đôi
  TIMEOUT_MS: 15000,            // Timeout cho mỗi critique call
};

// Type definitions
export interface CritiqueIssue {
  category: 'brand_voice' | 'compliance' | 'hook' | 'quality' | 'forbidden';
  severity: 'error' | 'warning';
  description: string;
  location?: string; // Which channel or slide
}

export interface CritiqueScores {
  brand_voice_consistency: number;    // 0-25
  compliance: number;                  // 0-25
  hook_strength: number;               // 0-25
  content_quality: number;             // 0-25
}

export interface CritiqueResult {
  overall_score: number; // 0-100
  passed: boolean;
  scores: CritiqueScores;
  issues: CritiqueIssue[];
  suggestions: string[];
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

## TIÊU CHÍ ĐÁNH GIÁ (Tổng 100 điểm)

### 1. BRAND VOICE CONSISTENCY (25 điểm)
- Tone of Voice yêu cầu: ${toneOfVoice.join(', ') || 'N/A'}
- Formality Level: ${formalityLevel}
- Kiểm tra: Giọng văn có nhất quán xuyên suốt? Có đúng tone?
- Trừ điểm: Giọng văn không nhất quán, sai formality level

### 2. COMPLIANCE CHECK (25 điểm)
${forbiddenTerms.length > 0 ? `- TỪ CẤM TUYỆT ĐỐI (Industry-level): ${forbiddenTerms.join(', ')}` : ''}
${forbiddenWords.length > 0 ? `- Từ cấm (Brand-level): ${forbiddenWords.join(', ')}` : ''}
${complianceRules.length > 0 ? `- Quy tắc tuân thủ:\n  ${complianceRules.slice(0, 5).join('\n  ')}` : ''}
- ⚠️ VI PHẠM TỪ CẤM → COMPLIANCE = 0, overall_score tối đa 50

### 3. HOOK STRENGTH (25 điểm)
- Câu mở đầu có gây tò mò/sốc không?
- Có số liệu, câu hỏi, hoặc statement mạnh không?
- Trừ điểm: Hook generic như "Xin chào", "Hôm nay...", câu mở đầu nhạt

### 4. CONTENT QUALITY (25 điểm)
${preferredWords.length > 0 ? `- Từ nên dùng: ${preferredWords.slice(0, 10).join(', ')}` : ''}
- Đủ độ dài theo quy định kênh?
- CTA phù hợp với mục tiêu?
- Format đúng (markdown, emoji policy, hashtags)?
${additionalContext || ''}

## OUTPUT FORMAT (JSON ONLY)
{
  "overall_score": 0-100,
  "passed": true/false,
  "scores": {
    "brand_voice_consistency": 0-25,
    "compliance": 0-25,
    "hook_strength": 0-25,
    "content_quality": 0-25
  },
  "issues": [
    {
      "category": "compliance|brand_voice|hook|quality|forbidden",
      "severity": "error|warning",
      "description": "Mô tả cụ thể vấn đề",
      "location": "tên kênh hoặc slide (optional)"
    }
  ],
  "suggestions": [
    "Gợi ý sửa cụ thể 1",
    "Gợi ý sửa cụ thể 2"
  ]
}

## NGUYÊN TẮC ĐÁNH GIÁ
1. NGHIÊM KHẮC - Không nể nang, đánh giá như reviewer chuyên nghiệp
2. CỤ THỂ - Chỉ rõ vị trí lỗi (kênh nào, slide nào)
3. ACTIONABLE - Mỗi issue phải có gợi ý sửa được
4. COMPLIANCE LÀ ƯU TIÊN #1 - Vi phạm Industry Memory → FAIL
5. passed = true NẾU VÀ CHỈ NẾU overall_score >= ${CRITIQUE_CONFIG.PASS_THRESHOLD}

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
    
    // Validate and normalize
    const result: CritiqueResult = {
      overall_score: Math.max(0, Math.min(100, parseInt(parsed.overall_score) || 0)),
      passed: parsed.overall_score >= CRITIQUE_CONFIG.PASS_THRESHOLD,
      scores: {
        brand_voice_consistency: Math.max(0, Math.min(25, parseInt(parsed.scores?.brand_voice_consistency) || 0)),
        compliance: Math.max(0, Math.min(25, parseInt(parsed.scores?.compliance) || 0)),
        hook_strength: Math.max(0, Math.min(25, parseInt(parsed.scores?.hook_strength) || 0)),
        content_quality: Math.max(0, Math.min(25, parseInt(parsed.scores?.content_quality) || 0)),
      },
      issues: (parsed.issues || []).map((i: any) => ({
        category: i.category || 'quality',
        severity: i.severity || 'warning',
        description: i.description || 'Unknown issue',
        location: i.location,
      })),
      suggestions: parsed.suggestions || [],
    };
    
    // Recalculate overall score from individual scores
    const calculatedScore = Object.values(result.scores).reduce((a, b) => a + b, 0);
    result.overall_score = calculatedScore;
    result.passed = calculatedScore >= CRITIQUE_CONFIG.PASS_THRESHOLD;
    
    return result;
  } catch (err) {
    console.error('Failed to parse critique result:', err);
    // Return a default "needs review" result
    return {
      overall_score: 50,
      passed: false,
      scores: {
        brand_voice_consistency: 12,
        compliance: 12,
        hook_strength: 12,
        content_quality: 14,
      },
      issues: [{
        category: 'quality',
        severity: 'warning',
        description: 'Không thể phân tích critique result - cần review thủ công',
      }],
      suggestions: ['Kiểm tra lại nội dung trước khi đăng'],
    };
  }
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
      return {
        overall_score: 75,
        passed: false,
        scores: {
          brand_voice_consistency: 18,
          compliance: 19,
          hook_strength: 19,
          content_quality: 19,
        },
        issues: [],
        suggestions: ['API error - manual review recommended'],
      };
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || '';
    
    const result = parseCritiqueResult(aiContent);
    console.log(`[Self-Critique] Score: ${result.overall_score}/100, Passed: ${result.passed}, Issues: ${result.issues.length}`);
    
    return result;
  } catch (err) {
    console.error('[Self-Critique] Error:', err);
    return {
      overall_score: 75,
      passed: false,
      scores: {
        brand_voice_consistency: 18,
        compliance: 19,
        hook_strength: 19,
        content_quality: 19,
      },
      issues: [],
      suggestions: ['Critique failed - manual review recommended'],
    };
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
