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

export function getModelsForMode(
  mode: CoreContentQualityMode,
  adminModelOverride?: string | null
): ModelConfig {
  const baseConfig = MODEL_CONFIGS[mode];
  
  // If admin has configured a model override, use it for the main generation model (compile)
  // Also apply to section generation for consistency
  if (adminModelOverride) {
    console.log(`[getModelsForMode] Using admin model override: ${adminModelOverride}`);
    return {
      outline: baseConfig.outline, // Keep lightweight model for outline (structured output)
      section: adminModelOverride,  // Use admin model for section generation
      compile: adminModelOverride,  // Use admin model for final compilation
    };
  }
  
  return baseConfig;
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
// PROOF ELEMENTS & COMPETITIVE CONTEXT (NEW)
// ============================================

/**
 * Build proof requirements block for Core Content prompts
 * Forces inclusion of statistics, case studies, and expert references
 */
export function buildProofRequirementsBlock(): string {
  return `
## 📊 PROOF ELEMENTS (BẮT BUỘC)

Mỗi phần chính PHẢI có ít nhất 1-2 proof elements từ danh sách sau:

### LOẠI PROOF ĐƯỢC CHẤP NHẬN:
- ✅ **Statistics/Số liệu**: Con số cụ thể + nguồn (VD: "Theo Forbes 2025, 78%...")
- ✅ **Case Study/Ví dụ thực tế**: Câu chuyện cụ thể, tên thật nếu có
- ✅ **Expert Reference**: Trích dẫn chuyên gia, nghiên cứu học thuật
- ✅ **Data Comparison**: So sánh trước/sau, benchmark với thị trường
- ✅ **Research Citation**: Dẫn nguồn từ báo cáo, khảo sát uy tín

### QUY TẮC:
⚠️ MỖI CLAIM QUAN TRỌNG phải có PROOF đi kèm
❌ KHÔNG viết: "Nhiều người cho rằng...", "Hầu hết đều...", "Theo nghiên cứu gần đây..."
✅ VIẾT: "Theo khảo sát của McKinsey (2025), 78% doanh nghiệp...", "Ông John Smith, CEO của X, nhận định..."

### MỤC TIÊU PROOF:
- Intro: Ít nhất 1 số liệu gây chú ý
- Analysis: 2-3 proofs cho các điểm chính
- Impact: 1-2 data points về hậu quả
- Solution: Case study hoặc expert insight
- Conclusion: Reinforcement với key stat
`;
}

/**
 * Build competitive context block for subtle brand differentiation
 * Only triggers if brand has competitors defined
 */
export function buildCompetitiveContextBlock(brandContext: BrandContext | null): string {
  if (!brandContext) return '';
  
  const hasCompetitors = brandContext.mainCompetitors && brandContext.mainCompetitors.length > 0;
  const hasUSP = brandContext.uniqueValueProposition;
  // Use brand positioning as fallback for competitive advantages
  const hasBrandPositioning = brandContext.brandPositioning;
  
  if (!hasCompetitors && !hasUSP && !hasBrandPositioning) return '';
  
  let block = `
## 🎯 COMPETITIVE POSITIONING (Tinh tế - Không Attack)

### NGUYÊN TẮC:
1. ✅ Address pain points mà cách tiếp cận thông thường chưa giải quyết tốt
2. ✅ Highlight unique value của brand một cách TỰ NHIÊN
3. ❌ KHÔNG nhắc tên đối thủ trực tiếp
4. ❌ KHÔNG counter-positioning mạnh hay tiêu cực

### CÁCH VIẾT:
- VD tốt: "Khác với cách làm phổ biến hiện nay, phương pháp này..."
- VD tốt: "Trong khi nhiều giải pháp tập trung vào X, chúng ta nhìn từ góc độ Y..."
- VD xấu: "Đối thủ X không làm được điều này..."
- VD xấu: "Sản phẩm của chúng tôi tốt hơn các hãng khác..."
`;

  if (hasUSP) {
    block += `
### UNIQUE VALUE PROPOSITION (lồng ghép tự nhiên):
"${brandContext.uniqueValueProposition}"
`;
  }

  if (hasBrandPositioning) {
    block += `
### BRAND POSITIONING (đề cập tinh tế):
${brandContext.brandPositioning}
`;
  }

  if (hasCompetitors && brandContext.mainCompetitors) {
    block += `
### COMPETITIVE LANDSCAPE (chỉ tham khảo, KHÔNG nhắc tên):
Brand đang cạnh tranh với: ${brandContext.mainCompetitors.slice(0, 3).join(', ')}
→ Nội dung cần address những gì đối thủ CHƯA làm tốt
`;
  }

  block += `
⚡ NỘI DUNG NÊN:
- Đề cập 1-2 lần unique angles của brand
- Lồng ghép USP vào phần Solution một cách tự nhiên
- Không quá bán hàng, giữ tone chuyên gia khách quan
`;

  return block;
}

// ============================================
// STYLE GUIDE BLOCK (NEW)
// ============================================

/**
 * Build style guide block for writing consistency
 * Includes preferred/banned words, sentence style, emoji policy
 */
export function buildStyleGuideBlock(brandContext: BrandContext | null): string {
  if (!brandContext) return '';
  
  const hasPreferred = brandContext.preferredWords && brandContext.preferredWords.length > 0;
  const hasBanned = brandContext.bannedWords && brandContext.bannedWords.length > 0;
  const hasSentenceStyle = brandContext.sentenceStyle && brandContext.sentenceStyle !== 'balanced';
  const hasEmojiPolicy = brandContext.emojiPolicy;
  
  if (!hasPreferred && !hasBanned && !hasSentenceStyle && !hasEmojiPolicy) return '';
  
  let block = `
## ✍️ STYLE GUIDE (Brand Writing Rules)
`;

  if (hasPreferred && brandContext.preferredWords) {
    block += `
### ✅ Từ ngữ ƯU TIÊN sử dụng:
${brandContext.preferredWords.slice(0, 15).map(w => `- "${w}"`).join('\n')}
→ Lồng ghép tự nhiên khi phù hợp ngữ cảnh
`;
  }

  if (hasBanned && brandContext.bannedWords) {
    block += `
### ❌ Từ ngữ CẤM sử dụng:
${brandContext.bannedWords.slice(0, 15).map(w => `- "${w}"`).join('\n')}
→ TUYỆT ĐỐI không dùng các từ này
`;
  }

  if (hasSentenceStyle) {
    const styleGuides: Record<string, string> = {
      short: 'Câu ngắn gọn (10-18 từ/câu), súc tích, dễ đọc trên mobile',
      balanced: 'Câu vừa phải (15-25 từ/câu), cân bằng chi tiết và súc tích',
      long: 'Câu chi tiết hơn (20-35 từ/câu), phân tích sâu, học thuật',
    };
    block += `
### 📝 Phong cách câu: ${brandContext.sentenceStyle?.toUpperCase()}
${styleGuides[brandContext.sentenceStyle || 'balanced']}
`;
  }

  if (hasEmojiPolicy) {
    const emojiGuides: Record<string, string> = {
      none: 'KHÔNG sử dụng emoji trong nội dung',
      minimal: 'Dùng emoji rất hạn chế (1-2 emoji toàn bài, chỉ ở tiêu đề/kết luận)',
      moderate: 'Có thể dùng emoji vừa phải để tăng sự sinh động (tối đa 5-7 emoji)',
    };
    block += `
### 😊 Chính sách Emoji: ${brandContext.emojiPolicy?.toUpperCase()}
${emojiGuides[brandContext.emojiPolicy || 'minimal']}
`;
  }

  return block;
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

export interface EnhancedPromptConfig extends CoreContentConfig {
  smartContextInjection?: string;
  researchContext?: string;
}

export function buildOutlinePrompt(config: EnhancedPromptConfig): string {
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
${buildProofRequirementsBlock()}
${buildCompetitiveContextBlock(config.brandContext)}
${buildStyleGuideBlock(config.brandContext)}
${config.smartContextInjection || ''}

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
  config: EnhancedPromptConfig,
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
${buildProofRequirementsBlock()}

## QUY TẮC
- Tone: Trung lập, chuyên gia
- Giữ nhất quán brand voice
- Viết mạch lạc, tự nhiên
- Sử dụng ví dụ cụ thể khi cần
- KHÔNG thêm hook mạnh hoặc emoji
- PHẢI có proof elements (số liệu, ví dụ, trích dẫn)

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

export function buildSinglePassPrompt(config: EnhancedPromptConfig): string {
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
${buildProofRequirementsBlock()}
${buildCompetitiveContextBlock(config.brandContext)}
${buildStyleGuideBlock(config.brandContext)}
${config.smartContextInjection || ''}

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
6. PHẢI có proof elements (số liệu, ví dụ, trích dẫn) trong mỗi phần chính

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
