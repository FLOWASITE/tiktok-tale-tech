// ============================================
// CORE CONTENT GENERATION - SIMPLIFIED SINGLE-PASS
// Uses model from Admin Config (ai_function_configs)
// ============================================

import { BrandContext, IndustryMemory } from './types/chat-types.ts';
import { getFullGEOGuidelines } from './geo-prompt-guidelines.ts';

// ============================================
// TYPES
// ============================================

export type CoreContentRole = 'seed' | 'sprout' | 'harvest';

export interface CoreContentConfig {
  topic: string;
  contentGoal: string;
  contentAngle?: string;
  role?: CoreContentRole;
  lengthMode?: CoreContentLengthMode;
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

// ============================================
// WORD BUDGET CALCULATION - Length Mode
// ============================================

export type CoreContentLengthMode = 'short' | 'medium' | 'long';

interface LengthConfig {
  minWords: number;
  maxWords: number;
  targetWords: number;
  sectionBudgets: {
    intro: number;
    analysis: number;
    impact: number;
    solution: number;
    conclusion: number;
  };
}

const LENGTH_CONFIGS: Record<CoreContentLengthMode, LengthConfig> = {
  short: {
    minWords: 500,
    maxWords: 700,
    targetWords: 600,
    sectionBudgets: {
      intro: 80,
      analysis: 180,
      impact: 80,
      solution: 160,
      conclusion: 60,
    },
  },
  medium: {
    minWords: 700,
    maxWords: 1200,
    targetWords: 950,
    sectionBudgets: {
      intro: 130,
      analysis: 300,
      impact: 130,
      solution: 280,
      conclusion: 100,
    },
  },
  long: {
    minWords: 1200,
    maxWords: 2000,
    targetWords: 1500,
    sectionBudgets: {
      intro: 200,
      analysis: 480,
      impact: 200,
      solution: 420,
      conclusion: 160,
    },
  },
};

export function getLengthConfig(lengthMode?: CoreContentLengthMode): LengthConfig {
  const mode = lengthMode && LENGTH_CONFIGS[lengthMode] ? lengthMode : 'medium';
  return LENGTH_CONFIGS[mode];
}

interface WordBudget {
  total: number;
  intro: number;
  analysis: number;
  impact: number;
  solution: number;
  conclusion: number;
}

export function getWordBudgetByLength(lengthMode: CoreContentLengthMode): WordBudget {
  const config = LENGTH_CONFIGS[lengthMode];
  return {
    total: config.targetWords,
    ...config.sectionBudgets,
  };
}

// ============================================
// DEFAULT MODEL (Fallback if no admin config)
// ============================================

const DEFAULT_MODEL = 'google/gemini-2.5-flash';

export function getDefaultModel(): string {
  return DEFAULT_MODEL;
}

// ============================================
// PROOF ELEMENTS & COMPETITIVE CONTEXT
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
// STYLE GUIDE BLOCK
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
// ENHANCED PROMPT CONFIG
// ============================================

export interface EnhancedPromptConfig extends CoreContentConfig {
  smartContextInjection?: string;
  researchContext?: string;
  registrySystemPrompt?: string;  // System prompt fetched from registry
}

// ============================================
// SINGLE-PASS PROMPT (MAIN GENERATION)
// ============================================

export function buildSinglePassPrompt(config: EnhancedPromptConfig): string {
  const geoGuidelines = getFullGEOGuidelines();
  
  // If registry prompt is available, append GEO guidelines
  if (config.registrySystemPrompt) {
    console.log('[buildSinglePassPrompt] Using registry system prompt + GEO guidelines');
    return config.registrySystemPrompt + '\n\n' + geoGuidelines;
  }
  
  // HARDCODED FALLBACK: Use when registry prompt is unavailable
  console.log('[buildSinglePassPrompt] Using hardcoded fallback prompt + GEO guidelines');
  
  const lengthMode = config.lengthMode || 'medium';
  const wordBudget = getWordBudgetByLength(lengthMode);
  const lengthConfig = getLengthConfig(lengthMode);
  
  const wordCountInstruction = `
## 📏 ĐỘ DÀI BẮT BUỘC
- Tổng số từ mục tiêu: ${lengthConfig.targetWords} từ
- ⚠️ KHÔNG được viết ít hơn ${lengthConfig.minWords} từ
- ⚠️ KHÔNG được viết nhiều hơn ${lengthConfig.maxWords} từ
- Đây là YÊU CẦU CỨNG, phải tuân thủ tuyệt đối

📝 Phân bổ cho từng phần:
- Mở đầu: ~${lengthConfig.sectionBudgets.intro} từ
- Phân tích: ~${lengthConfig.sectionBudgets.analysis} từ
- Tác động: ~${lengthConfig.sectionBudgets.impact} từ
- Giải pháp: ~${lengthConfig.sectionBudgets.solution} từ
- Kết luận: ~${lengthConfig.sectionBudgets.conclusion} từ
`;
  
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
${wordCountInstruction}
${buildProofRequirementsBlock()}
${buildCompetitiveContextBlock(config.brandContext)}
${buildStyleGuideBlock(config.brandContext)}
${config.smartContextInjection || ''}
${geoGuidelines}

## YÊU CẦU BẮT BUỘC
1. Cấu trúc 5 phần:
   - Giới thiệu/Context (hook + bối cảnh)
   - Phân tích nguyên nhân/Tác động
   - Hậu quả đối với đối tượng mục tiêu
   - Giải pháp/Case study
   - Kết luận + CTA
2. Tone: Chuyên nghiệp, chuyên gia
3. Có ít nhất 5 điểm chính (bullet hoặc bold)
4. Sử dụng Markdown (## heading, **bold**, - bullet)
5. PHẢI có proof elements (số liệu, ví dụ, trích dẫn) trong mỗi phần chính

## OUTPUT
Viết trực tiếp nội dung Core Content.
KHÔNG thêm tiêu đề "Core Content" hay metadata.`;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getGoalDescription(goal?: string): string {
  const descriptions: Record<string, string> = {
    education: 'Giáo dục - Chia sẻ kiến thức hữu ích, hướng dẫn chi tiết',
    awareness: 'Nhận diện - Tăng nhận biết về vấn đề/giải pháp',
    engagement: 'Tương tác - Khuyến khích suy nghĩ, thảo luận',
    expertise: 'Xây dựng chuyên gia - Thể hiện chuyên môn sâu',
    conversion: 'Chuyển đổi - Thúc đẩy hành động, quyết định',
  };
  return descriptions[goal || 'education'] || descriptions.education;
}

export function getAngleDescription(angle?: string): string {
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
// MAX TOKENS CALCULATION
// ============================================

export function getMaxTokens(lengthMode: CoreContentLengthMode): number {
  // Tokens are approximately 1.3x word count for Vietnamese
  const config = getLengthConfig(lengthMode);
  // Add buffer for formatting and prompt overhead
  return Math.round(config.maxWords * 1.5) + 500;
}
