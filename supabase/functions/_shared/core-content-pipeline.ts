// ============================================
// CORE CONTENT MULTI-STEP PIPELINE
// Optimized generation with outline-first approach
// ============================================

import { BrandContext, IndustryMemory } from './types/chat-types.ts';

// ============================================
// TYPES
// ============================================

export type CoreContentQualityMode = 'fast' | 'balanced' | 'quality';
export type CoreContentRole = 'seed' | 'sprout' | 'harvest';

export interface CoreContentConfig {
  topic: string;
  contentGoal: string;
  contentAngle?: string;
  role?: CoreContentRole;
  qualityMode: CoreContentQualityMode;
  brandContext: BrandContext | null;
  personas?: CustomerPersonaContext[];
  products?: BrandProductContext[];
  targetAudience?: string;
  additionalContext?: string;
}

export interface CustomerPersonaContext {
  name: string;
  description?: string;
  pain_points?: string[];
  triggers?: string[];
  communication_style?: string;
}

export interface BrandProductContext {
  name: string;
  description?: string;
  unique_selling_points?: string[];
  benefits?: string[];
  content_angles?: string[];
}

export interface OutlineSection {
  title: string;
  bulletPoints: string[];
  wordBudget: number;
}

export interface GeneratedOutline {
  sections: OutlineSection[];
  totalWordBudget: number;
  estimatedTokens: number;
}

export interface GeneratedSection {
  index: number;
  title: string;
  content: string;
  wordCount: number;
}

export interface PipelineResult {
  outline: GeneratedOutline;
  sections: GeneratedSection[];
  compiledContent: string;
  metadata: {
    qualityMode: CoreContentQualityMode;
    stepsCompleted: string[];
    totalTokensUsed: number;
    modelsUsed: string[];
    generationTimeMs: number;
  };
}

// ============================================
// MODEL SELECTION
// ============================================

interface ModelConfig {
  outline: string;
  section: string;
  compile: string;
}

const MODEL_CONFIGS: Record<CoreContentQualityMode, ModelConfig> = {
  fast: {
    outline: 'google/gemini-2.5-flash-lite',
    section: 'google/gemini-2.5-flash', // Used for single-pass in fast mode
    compile: 'google/gemini-2.5-flash',
  },
  balanced: {
    outline: 'google/gemini-2.5-flash-lite',
    section: 'google/gemini-2.5-flash',
    compile: 'google/gemini-2.5-flash',
  },
  quality: {
    outline: 'google/gemini-2.5-flash',
    section: 'google/gemini-2.5-flash',
    compile: 'google/gemini-2.5-pro',
  },
};

export function getModelsForMode(mode: CoreContentQualityMode): ModelConfig {
  return MODEL_CONFIGS[mode];
}

// ============================================
// WORD BUDGET CALCULATION
// ============================================

interface WordBudget {
  total: number;
  intro: number;
  analysis: number;
  impact: number;
  solution: number;
  conclusion: number;
}

const WORD_BUDGETS: Record<CoreContentQualityMode, WordBudget> = {
  fast: {
    total: 800,
    intro: 120,
    analysis: 250,
    impact: 120,
    solution: 220,
    conclusion: 90,
  },
  balanced: {
    total: 1200,
    intro: 180,
    analysis: 380,
    impact: 180,
    solution: 340,
    conclusion: 120,
  },
  quality: {
    total: 1500,
    intro: 220,
    analysis: 480,
    impact: 220,
    solution: 420,
    conclusion: 160,
  },
};

export function getWordBudget(mode: CoreContentQualityMode): WordBudget {
  return WORD_BUDGETS[mode];
}

// ============================================
// PROMPT BUILDERS
// ============================================

export function buildBrandContextBlock(brandContext: BrandContext | null): string {
  if (!brandContext) return '';
  
  let block = `\n## BRAND CONTEXT`;
  block += `\n- Thương hiệu: ${brandContext.brandName || 'N/A'}`;
  
  if (brandContext.brandPositioning) {
    block += `\n- Định vị: ${brandContext.brandPositioning}`;
  }
  if (brandContext.toneOfVoice?.length) {
    block += `\n- Tone of voice: ${brandContext.toneOfVoice.join(', ')}`;
  }
  if (brandContext.uniqueValueProposition) {
    block += `\n- USP: ${brandContext.uniqueValueProposition}`;
  }
  if (brandContext.contentPillars?.length) {
    block += `\n- Content pillars: ${brandContext.contentPillars.map(p => p.name).join(', ')}`;
  }
  if (brandContext.evergreenThemes?.length) {
    block += `\n- Chủ đề thường xuyên: ${brandContext.evergreenThemes.join(', ')}`;
  }
  
  return block;
}

export function buildPersonaContextBlock(personas?: CustomerPersonaContext[]): string {
  if (!personas?.length) return '';
  
  let block = `\n## TARGET PERSONAS`;
  personas.slice(0, 3).forEach((p, i) => {
    block += `\n### Persona ${i + 1}: ${p.name}`;
    if (p.description) block += `\n- Mô tả: ${p.description}`;
    if (p.pain_points?.length) block += `\n- Pain points: ${p.pain_points.join('; ')}`;
    if (p.triggers?.length) block += `\n- Triggers: ${p.triggers.join('; ')}`;
    if (p.communication_style) block += `\n- Phong cách giao tiếp: ${p.communication_style}`;
  });
  
  return block;
}

export function buildProductContextBlock(products?: BrandProductContext[]): string {
  if (!products?.length) return '';
  
  let block = `\n## SẢN PHẨM/DỊCH VỤ CHÍNH`;
  products.slice(0, 3).forEach((p, i) => {
    block += `\n### ${i + 1}. ${p.name}`;
    if (p.description) block += `\n- Mô tả: ${p.description}`;
    if (p.unique_selling_points?.length) block += `\n- USPs: ${p.unique_selling_points.join('; ')}`;
    if (p.benefits?.length) block += `\n- Lợi ích: ${p.benefits.join('; ')}`;
    if (p.content_angles?.length) block += `\n- Góc content: ${p.content_angles.join(', ')}`;
  });
  
  return block;
}

export function buildRoleContext(role?: CoreContentRole): string {
  if (!role) return '';
  
  const roleDescriptions: Record<CoreContentRole, string> = {
    seed: `
## CONTENT ROLE: SEED (Awareness)
- Mục tiêu: Tạo nhận thức, thu hút sự chú ý
- Focus: Insight hữu ích, thông tin giá trị, giáo dục
- Tone: Thân thiện, dễ tiếp cận, không bán hàng trực tiếp
- CTA: Nhẹ nhàng (đọc thêm, tìm hiểu, theo dõi)`,
    sprout: `
## CONTENT ROLE: SPROUT (Trust Building)
- Mục tiêu: Xây dựng lòng tin, chứng minh chuyên môn
- Focus: Case study, phân tích sâu, giải pháp cụ thể
- Tone: Chuyên gia, đáng tin cậy, có số liệu
- CTA: Trung bình (đăng ký, liên hệ tư vấn)`,
    harvest: `
## CONTENT ROLE: HARVEST (Conversion)
- Mục tiêu: Chuyển đổi, thúc đẩy hành động
- Focus: Giá trị sản phẩm, ưu đãi, urgency
- Tone: Thuyết phục, rõ ràng, tạo FOMO phù hợp
- CTA: Mạnh mẽ (mua ngay, đăng ký ngay, liên hệ ngay)`,
  };
  
  return roleDescriptions[role] || '';
}

// ============================================
// OUTLINE GENERATION PROMPT
// ============================================

export function buildOutlinePrompt(config: CoreContentConfig): string {
  const wordBudget = getWordBudget(config.qualityMode);
  
  let prompt = `Bạn là content strategist chuyên nghiệp.

## NHIỆM VỤ
Tạo Outline chi tiết cho Core Content (nội dung gốc) về chủ đề sau.

## CHỦ ĐỀ
${config.topic}

## MỤC TIÊU NỘI DUNG
${getGoalDescription(config.contentGoal)}
${config.contentAngle ? `\nGóc tiếp cận: ${getAngleDescription(config.contentAngle)}` : ''}
${buildRoleContext(config.role)}
${buildBrandContextBlock(config.brandContext)}
${buildPersonaContextBlock(config.personas)}
${buildProductContextBlock(config.products)}
${config.targetAudience ? `\n## ĐỐI TƯỢNG MỤC TIÊU\n${config.targetAudience}` : ''}
${config.additionalContext ? `\n## BỐI CẢNH BỔ SUNG\n${config.additionalContext}` : ''}

## CẤU TRÚC BẮT BUỘC (5 phần)
1. Giới thiệu/Context (~${wordBudget.intro} từ): Hook + bối cảnh vấn đề
2. Phân tích nguyên nhân (~${wordBudget.analysis} từ): 4-7 điểm chính với ví dụ
3. Tác động/Hậu quả (~${wordBudget.impact} từ): Ảnh hưởng đến đối tượng mục tiêu
4. Giải pháp/Case study (~${wordBudget.solution} từ): Cách giải quyết, lồng ghép sản phẩm nếu phù hợp
5. Kết luận (~${wordBudget.conclusion} từ): Insight chính + CTA

## OUTPUT FORMAT (JSON)
Trả về JSON với cấu trúc sau:
{
  "sections": [
    {
      "title": "Tên phần",
      "bulletPoints": ["Điểm 1 cần viết", "Điểm 2 cần viết", ...],
      "wordBudget": 200
    }
  ],
  "totalWordBudget": ${wordBudget.total}
}

CHỈ TRẢ VỀ JSON, KHÔNG THÊM TEXT KHÁC.`;

  return prompt;
}

// ============================================
// SECTION GENERATION PROMPT
// ============================================

export function buildSectionPrompt(
  config: CoreContentConfig,
  outline: GeneratedOutline,
  sectionIndex: number
): string {
  const section = outline.sections[sectionIndex];
  if (!section) throw new Error(`Section ${sectionIndex} not found in outline`);
  
  const outlinePreview = outline.sections
    .map((s, i) => `${i + 1}. ${s.title} (${s.wordBudget} từ)`)
    .join('\n');
  
  return `Bạn là content writer chuyên nghiệp. Viết một phần của Core Content.

## OUTLINE TỔNG THỂ
${outlinePreview}

## NHIỆM VỤ
Viết phần ${sectionIndex + 1}: "${section.title}"
- Word budget: ${section.wordBudget} từ (±10%)
- Bullet points cần cover:
${section.bulletPoints.map(bp => `  - ${bp}`).join('\n')}
${buildBrandContextBlock(config.brandContext)}
${buildRoleContext(config.role)}

## QUY TẮC
- Tone: Trung lập, chuyên gia
- Giữ nhất quán brand voice
- Viết mạch lạc, tự nhiên
- Sử dụng ví dụ cụ thể khi cần
- KHÔNG thêm hook mạnh hoặc emoji

## OUTPUT
Viết trực tiếp nội dung phần này dạng Markdown.
BẮT ĐẦU BẰNG HEADING: ## ${section.title}`;
}

// ============================================
// COMPILE & REFINE PROMPT
// ============================================

export function buildCompilePrompt(
  config: CoreContentConfig,
  sections: GeneratedSection[],
  wordBudget: WordBudget
): string {
  const allContent = sections
    .sort((a, b) => a.index - b.index)
    .map(s => s.content)
    .join('\n\n');
  
  return `Bạn là senior editor. Ghép và polish các phần sau thành Core Content hoàn chỉnh.

## NỘI DUNG CÁC PHẦN
${allContent}
${buildBrandContextBlock(config.brandContext)}
${buildRoleContext(config.role)}

## YÊU CẦU
1. Đảm bảo logic chảy mượt giữa các phần
2. Nhất quán tone và brand voice toàn bài
3. KHÔNG thêm hook mạnh, emoji quá mức
4. Giữ độ dài tổng: ${wordBudget.total - 100} - ${wordBudget.total + 100} từ
5. Sử dụng Markdown (## heading, **bold**, bullet points)
6. Đảm bảo có ít nhất 5 điểm chính được highlight

## OUTPUT
Full Core Content dạng Markdown.
KHÔNG thêm tiêu đề "Core Content" hay metadata.`;
}

// ============================================
// FAST MODE: SINGLE-PASS PROMPT
// ============================================

export function buildSinglePassPrompt(config: CoreContentConfig): string {
  const wordBudget = getWordBudget(config.qualityMode);
  
  return `Bạn là content writer chuyên nghiệp. Viết Core Content (nội dung gốc) hoàn chỉnh.

## CHỦ ĐỀ
${config.topic}

## MỤC TIÊU NỘI DUNG
${getGoalDescription(config.contentGoal)}
${config.contentAngle ? `\nGóc tiếp cận: ${getAngleDescription(config.contentAngle)}` : ''}
${buildRoleContext(config.role)}
${buildBrandContextBlock(config.brandContext)}
${buildPersonaContextBlock(config.personas)}
${buildProductContextBlock(config.products)}
${config.targetAudience ? `\n## ĐỐI TƯỢNG MỤC TIÊU\n${config.targetAudience}` : ''}
${config.additionalContext ? `\n## BỐI CẢNH BỔ SUNG\n${config.additionalContext}` : ''}

## YÊU CẦU BẮT BUỘC
1. Độ dài: ${wordBudget.total - 100} - ${wordBudget.total + 100} từ
2. Cấu trúc 5 phần:
   - Giới thiệu/Context (hook + bối cảnh)
   - Phân tích nguyên nhân/Tác động
   - Hậu quả đối với đối tượng mục tiêu
   - Giải pháp/Case study
   - Kết luận + CTA
3. Tone: Chuyên nghiệp, chuyên gia
4. Có ít nhất 5 điểm chính (bullet hoặc bold)
5. Sử dụng Markdown (## heading, **bold**, - bullet)

## OUTPUT
Viết trực tiếp nội dung Core Content.
KHÔNG thêm tiêu đề "Core Content" hay metadata.`;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getGoalDescription(goal?: string): string {
  const descriptions: Record<string, string> = {
    education: 'Giáo dục - Chia sẻ kiến thức hữu ích, hướng dẫn chi tiết',
    awareness: 'Nhận diện - Tăng nhận biết về vấn đề/giải pháp',
    engagement: 'Tương tác - Khuyến khích suy nghĩ, thảo luận',
    expertise: 'Xây dựng chuyên gia - Thể hiện chuyên môn sâu',
    conversion: 'Chuyển đổi - Thúc đẩy hành động, quyết định',
  };
  return descriptions[goal || 'education'] || descriptions.education;
}

function getAngleDescription(angle?: string): string {
  const descriptions: Record<string, string> = {
    educational: 'Tips, hướng dẫn, thông tin hữu ích',
    storytelling: 'Narrative flow, câu chuyện thực, cảm xúc',
    promotional: 'CTA mạnh, urgency, ưu đãi rõ ràng',
    social_proof: 'Đánh giá, testimonial, case study',
    behind_the_scenes: 'Quy trình, đội ngũ, hậu trường',
    qa_faq: 'Giải đáp thắc mắc, FAQ phổ biến',
  };
  return descriptions[angle || 'educational'] || '';
}

// ============================================
// JSON PARSING HELPER
// ============================================

export function parseOutlineJSON(text: string): GeneratedOutline {
  // Strip markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();
  
  // Find JSON object
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('No valid JSON found in outline response');
  }
  
  const jsonStr = cleaned.slice(jsonStart, jsonEnd + 1);
  const parsed = JSON.parse(jsonStr);
  
  // Validate structure
  if (!Array.isArray(parsed.sections)) {
    throw new Error('Invalid outline structure: missing sections array');
  }
  
  const sections: OutlineSection[] = parsed.sections.map((s: any) => ({
    title: s.title || 'Untitled',
    bulletPoints: Array.isArray(s.bulletPoints) ? s.bulletPoints : [],
    wordBudget: typeof s.wordBudget === 'number' ? s.wordBudget : 200,
  }));
  
  return {
    sections,
    totalWordBudget: parsed.totalWordBudget || sections.reduce((sum, s) => sum + s.wordBudget, 0),
    estimatedTokens: Math.round((parsed.totalWordBudget || 1000) * 1.5),
  };
}

// ============================================
// TOKEN ESTIMATION
// ============================================

export function estimateTokens(mode: CoreContentQualityMode): {
  outline: number;
  sections: number;
  compile: number;
  total: number;
} {
  const estimates: Record<CoreContentQualityMode, { outline: number; sections: number; compile: number }> = {
    fast: { outline: 1500, sections: 0, compile: 3000 },
    balanced: { outline: 1500, sections: 8000, compile: 3500 },
    quality: { outline: 2000, sections: 12000, compile: 4500 },
  };
  
  const e = estimates[mode];
  return {
    ...e,
    total: e.outline + e.sections + e.compile,
  };
}
