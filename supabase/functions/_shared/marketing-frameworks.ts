/**
 * Content Matrix & Strategic Balance + Marketing Frameworks
 * 
 * Topic Types: Problem-focused, Solution-focused, Story-focused, Data-focused
 * Funnel Balance: 40% TOFU, 35% MOFU, 25% BOFU
 * Emotional Balance: Inspire, Educate, Entertain, Convince
 */

// ============================================
// CONTENT MATRIX TYPES
// ============================================

export type TopicType = 'problem' | 'solution' | 'story' | 'data';
export type FunnelStage = 'tofu' | 'mofu' | 'bofu';
export type EmotionalTone = 'inspire' | 'educate' | 'entertain' | 'convince';

export interface ContentMatrixScores {
  topicType: TopicType;
  funnelStage: FunnelStage;
  emotionalTone: EmotionalTone;
}

export interface ContentMatrixBalance {
  topicTypes: Record<TopicType, number>;
  funnelStages: Record<FunnelStage, number>;
  emotionalTones: Record<EmotionalTone, number>;
}

export const IDEAL_FUNNEL_BALANCE: Record<FunnelStage, number> = {
  tofu: 40, // Top of Funnel - Awareness
  mofu: 35, // Middle of Funnel - Consideration  
  bofu: 25, // Bottom of Funnel - Decision
};

export const TOPIC_TYPE_LABELS: Record<TopicType, { vi: string; en: string; description: string }> = {
  problem: { 
    vi: 'Vấn đề', 
    en: 'Problem-focused',
    description: 'Topics tập trung vào pain points, sai lầm phổ biến, vấn đề cần giải quyết'
  },
  solution: { 
    vi: 'Giải pháp', 
    en: 'Solution-focused',
    description: 'Topics tập trung vào how-to, hướng dẫn, cách giải quyết vấn đề'
  },
  story: { 
    vi: 'Câu chuyện', 
    en: 'Story-focused',
    description: 'Topics sử dụng storytelling, case study, behind-the-scenes'
  },
  data: { 
    vi: 'Dữ liệu', 
    en: 'Data-focused',
    description: 'Topics dựa trên số liệu, thống kê, xu hướng, phân tích'
  },
};

export const FUNNEL_STAGE_LABELS: Record<FunnelStage, { vi: string; en: string; contentGoals: string[] }> = {
  tofu: {
    vi: 'Nhận diện (TOFU)',
    en: 'Top of Funnel',
    contentGoals: ['awareness', 'education', 'engagement'],
  },
  mofu: {
    vi: 'Cân nhắc (MOFU)',
    en: 'Middle of Funnel',
    contentGoals: ['expertise', 'trust-building', 'comparison'],
  },
  bofu: {
    vi: 'Quyết định (BOFU)',
    en: 'Bottom of Funnel', 
    contentGoals: ['conversion', 'offer', 'proof'],
  },
};

export const EMOTIONAL_TONE_LABELS: Record<EmotionalTone, { vi: string; emoji: string; hooks: string[] }> = {
  inspire: {
    vi: 'Truyền cảm hứng',
    emoji: '✨',
    hooks: ['Bạn có thể làm được', 'Câu chuyện thành công', 'Đừng bỏ cuộc'],
  },
  educate: {
    vi: 'Giáo dục',
    emoji: '📚',
    hooks: ['X điều bạn cần biết', 'Hướng dẫn từ A-Z', 'Giải thích chi tiết'],
  },
  entertain: {
    vi: 'Giải trí',
    emoji: '🎉',
    hooks: ['Có thể bạn chưa biết', 'Điều bất ngờ', 'Fun facts'],
  },
  convince: {
    vi: 'Thuyết phục',
    emoji: '💡',
    hooks: ['Vì sao bạn nên', 'Bằng chứng cho thấy', 'So sánh thực tế'],
  },
};

// ============================================
// CUSTOMER PERSONA CONTEXT
// ============================================

export interface CustomerPersonaContext {
  name: string;
  occupation?: string;
  painPoints: string[];
  desires: string[];
  objections: string[];
  buyingTriggers?: string[];
  preferredChannels?: string[];
  funnelStage?: 'tofu' | 'mofu' | 'bofu';
}

// ============================================
// MARKETING FRAMEWORKS
// ============================================

export interface MarketingFramework {
  name: string;
  code: string;
  description: string;
  patterns: string[];
  bestFor: string[];
}

export const MARKETING_FRAMEWORKS: Record<string, MarketingFramework> = {
  PAS: {
    name: 'Problem-Agitate-Solution',
    code: 'PAS',
    description: 'Nêu vấn đề → Làm nóng vấn đề → Đưa giải pháp',
    patterns: [
      '{Problem}? Đây là cách {Brand} giải quyết',
      '3 sai lầm {Persona} hay mắc về {Topic} (và cách tránh)',
      '{Pain Point} đang ảnh hưởng đến bạn như thế nào?',
      'Tại sao {Persona} vẫn gặp {Problem}? (Và giải pháp thực sự)',
    ],
    bestFor: ['tofu', 'education', 'awareness'],
  },
  BAB: {
    name: 'Before-After-Bridge',
    code: 'BAB',
    description: 'Trạng thái trước → Trạng thái sau → Cầu nối',
    patterns: [
      'Từ {Before State} đến {After State}: Hành trình của {Customer}',
      '{Customer Type} đã thay đổi {Metric} như thế nào với {Solution}',
      'Case study: Từ {Problem} đến {Success}',
      '30 ngày thay đổi: {Before} → {After}',
    ],
    bestFor: ['mofu', 'conversion', 'expertise'],
  },
  AIDA: {
    name: 'Attention-Interest-Desire-Action',
    code: 'AIDA',
    description: 'Thu hút → Quan tâm → Mong muốn → Hành động',
    patterns: [
      '⚡ {Shock stat} - {Interest hook} - {Desire trigger}',
      'Bạn có biết? {Surprising fact} → {Solution}',
      '{Number}% {Audience} đang làm sai điều này',
      'STOP! Đọc ngay nếu bạn đang gặp {Problem}',
    ],
    bestFor: ['bofu', 'conversion', 'engagement'],
  },
  '4U': {
    name: 'Useful-Urgent-Unique-Ultra-specific',
    code: '4U',
    description: 'Hữu ích, Khẩn cấp, Độc đáo, Cực kỳ cụ thể',
    patterns: [
      '[{Timeframe}] {Specific number} cách {Action} cho {Specific persona}',
      '{Persona}: {Number} điều BẮT BUỘC phải biết trong {Year}',
      'Hướng dẫn chi tiết từ A-Z: {Specific topic} cho {Persona}',
      '[Chỉ {Time}] {Number} bước {Action} - {Specific result}',
    ],
    bestFor: ['tofu', 'education', 'engagement'],
  },
  PASTOR: {
    name: 'Problem-Amplify-Story-Transformation-Offer-Response',
    code: 'PASTOR',
    description: 'Framework storytelling dài cho content conversion',
    patterns: [
      'Câu chuyện {Customer}: Từ {Problem} đến {Transformation}',
      'Vì sao {Brand} ra đời? Câu chuyện đằng sau sứ mệnh',
      '{Customer} đã vượt qua {Challenge} như thế nào?',
    ],
    bestFor: ['mofu', 'bofu', 'awareness'],
  },
  FAB: {
    name: 'Features-Advantages-Benefits',
    code: 'FAB',
    description: 'Tính năng → Ưu điểm → Lợi ích cho khách hàng',
    patterns: [
      '{Feature} của chúng tôi giúp bạn {Benefit}',
      'Tại sao {Feature} khác biệt? {Advantage} cho {Persona}',
      '{Number} tính năng giúp {Persona} đạt {Benefit}',
    ],
    bestFor: ['mofu', 'bofu', 'conversion'],
  },
};

// ============================================
// CONTENT MATRIX PROMPT BUILDER
// ============================================

export function buildContentMatrixSection(): string {
  return `
## 📊 CONTENT MATRIX & STRATEGIC BALANCE

Mỗi topic PHẢI được phân loại theo 3 chiều:

### 1. TOPIC TYPE (Loại nội dung):
- **problem**: Tập trung vào vấn đề, sai lầm, pain points (VD: "5 sai lầm...", "Vấn đề phổ biến...")
- **solution**: Tập trung vào giải pháp, how-to, hướng dẫn (VD: "Cách khắc phục...", "3 bước để...")
- **story**: Câu chuyện, case study, behind-the-scenes (VD: "Hành trình của...", "Câu chuyện thật...")
- **data**: Số liệu, thống kê, xu hướng, phân tích (VD: "Thống kê cho thấy...", "Dữ liệu năm 2025...")

### 2. FUNNEL STAGE (Giai đoạn khách hàng):
- **tofu** (40%): Top of Funnel - Nhận diện, awareness, thu hút mới
- **mofu** (35%): Middle of Funnel - Cân nhắc, so sánh, đánh giá
- **bofu** (25%): Bottom of Funnel - Quyết định, chuyển đổi, mua hàng

### 3. EMOTIONAL TONE (Cảm xúc chủ đạo):
- **inspire**: Truyền cảm hứng, động lực, khích lệ
- **educate**: Giáo dục, chia sẻ kiến thức, how-to
- **entertain**: Giải trí, thú vị, bất ngờ
- **convince**: Thuyết phục, so sánh, chứng minh`;
}

export function buildDiversityCheckSection(personaContext?: CustomerPersonaContext | null): string {
  let personaPainPoints = '';
  if (personaContext?.painPoints?.length) {
    personaPainPoints = `
### Pain Points từ Customer Persona:
${personaContext.painPoints.slice(0, 5).map(p => `- ${p}`).join('\n')}

→ ĐẢM BẢO có topics address các pain points này!`;
  }

  return `
## 🔄 TOPIC DIVERSITY CHECK (BẮT BUỘC)

Trước khi output, KIỂM TRA:

### Funnel Balance:
[ ] Có ít nhất 2-3 topics cho TOFU (awareness, education)?
[ ] Có ít nhất 2-3 topics cho MOFU (expertise, trust)?
[ ] Có ít nhất 1-2 topics cho BOFU (conversion)?

### Topic Type Mix:
[ ] Có ít nhất 1 topic Problem-focused?
[ ] Có ít nhất 1 topic Solution-focused?
[ ] Có ít nhất 1 topic Story hoặc Data-focused?

### Emotional Balance:
[ ] Không quá 50% topics cùng emotional tone?
[ ] Có mix giữa educate, inspire, và convince?
${personaPainPoints}

### Output Requirements:
[ ] Mỗi topic PHẢI có: topicType, funnelStage, emotionalTone
[ ] Balance: ~40% TOFU, ~35% MOFU, ~25% BOFU

Nếu FAIL diversity check → THÊM topics để cân bằng trước khi output.`;
}

// ============================================
// FRAMEWORK UTILITIES
// ============================================

// Get recommended frameworks based on funnel stage
export function getFrameworksForFunnel(funnelStage: string): MarketingFramework[] {
  return Object.values(MARKETING_FRAMEWORKS).filter(f => 
    f.bestFor.includes(funnelStage)
  );
}

// Get recommended frameworks based on content goal
export function getFrameworksForGoal(contentGoal: string): MarketingFramework[] {
  const goalToStage: Record<string, string[]> = {
    education: ['tofu', 'education'],
    awareness: ['tofu', 'awareness'],
    engagement: ['tofu', 'mofu', 'engagement'],
    expertise: ['mofu', 'expertise'],
    conversion: ['bofu', 'conversion'],
  };
  
  const stages = goalToStage[contentGoal] || ['tofu'];
  return Object.values(MARKETING_FRAMEWORKS).filter(f => 
    f.bestFor.some(stage => stages.includes(stage))
  );
}

// Build persona-aware prompt section
export function buildPersonaSection(personas: CustomerPersonaContext[]): string {
  if (!personas || personas.length === 0) return '';
  
  const primaryPersona = personas[0];
  const allPainPoints = personas.flatMap(p => p.painPoints).slice(0, 10);
  const allDesires = personas.flatMap(p => p.desires).slice(0, 10);
  const allObjections = personas.flatMap(p => p.objections).slice(0, 5);
  
  return `
## CUSTOMER PERSONAS:

### Primary Persona: ${primaryPersona.name}${primaryPersona.occupation ? ` (${primaryPersona.occupation})` : ''}
- Giai đoạn funnel: ${primaryPersona.funnelStage?.toUpperCase() || 'TOFU'}

### Pain Points (Vấn đề khách hàng đang gặp):
${allPainPoints.map(p => `- ${p}`).join('\n')}

### Desires (Điều khách hàng mong muốn):
${allDesires.map(d => `- ${d}`).join('\n')}

### Objections (Lý do từ chối/nghi ngờ):
${allObjections.map(o => `- ${o}`).join('\n')}

**Quan trọng:** Mỗi topic PHẢI address ít nhất 1 pain point hoặc desire của persona.
Topics nên preemptively handle objections trong reasoning.`;
}

// Build marketing framework guidance section
export function buildFrameworkSection(contentGoal?: string, funnelStage?: string): string {
  const frameworks = funnelStage 
    ? getFrameworksForFunnel(funnelStage)
    : contentGoal 
      ? getFrameworksForGoal(contentGoal)
      : Object.values(MARKETING_FRAMEWORKS).slice(0, 3);
  
  if (frameworks.length === 0) return '';
  
  return `
## MARKETING FRAMEWORKS (Gợi ý cấu trúc tiêu đề):

${frameworks.slice(0, 3).map(f => `
### ${f.code} - ${f.name}
${f.description}
Patterns:
${f.patterns.slice(0, 2).map(p => `  • "${p}"`).join('\n')}
`).join('\n')}

**Hướng dẫn:** Apply các framework patterns trên để tạo tiêu đề có cấu trúc marketing mạnh.
Không bắt buộc dùng chính xác pattern, nhưng nên học cách cấu trúc từ đó.`;
}

// Enhanced scoring guidance based on personas
export function buildEnhancedScoringGuidance(personas: CustomerPersonaContext[]): string {
  if (!personas || personas.length === 0) return '';
  
  const primaryPersona = personas[0];
  const painPoints = primaryPersona.painPoints.slice(0, 3);
  const desires = primaryPersona.desires.slice(0, 3);
  
  return `
## ENHANCED SCORING RULES (Persona-aware):

**brandFit scoring enhancements:**
- +15 điểm nếu topic trực tiếp address pain point: ${painPoints.join(', ')}
- +10 điểm nếu topic hướng đến desire: ${desires.join(', ')}
- +5 điểm nếu topic có góc nhìn độc đáo (contrarian, data-backed, insider)

**competition scoring enhancements:**
- +15 điểm nếu topic có specific number/data (VD: "3 cách", "giảm 50%")
- +10 điểm nếu topic có unique angle không ai làm
- -10 điểm nếu topic quá generic ("X điều cần biết" không twist)

**engagement scoring based on funnel:**
- TOFU topics: ưu tiên shareability, educational value
- MOFU topics: ưu tiên proof, comparison, case study
- BOFU topics: ưu tiên urgency, offer, clear CTA`;
}
