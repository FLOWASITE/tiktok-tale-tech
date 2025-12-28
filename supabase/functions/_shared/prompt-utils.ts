/**
 * Advanced Prompt Engineering Utilities
 * 
 * Provides reusable prompt components for:
 * - Chain-of-Thought (CoT) reasoning
 * - Few-Shot Learning examples
 * - Self-Correction instructions
 * - Dynamic Context Injection
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export interface BrandContext {
  brandName: string;
  brandPositioning?: string;
  toneOfVoice?: string[];
  preferredWords?: string[];
  forbiddenWords?: string[];
  industry?: string[];
  formality?: string;
  languageStyle?: string[];
  allowEmoji?: boolean;
  contentPillars?: ContentPillar[];
  products?: BrandProduct[];
  // Extended brand identity fields
  mission?: string;
  vision?: string;
  uniqueValueProposition?: string;
  tagline?: string;
  // Market & Competition
  mainCompetitors?: string[];
  competitiveAdvantages?: string[];
  marketSegment?: string;
  targetAgeRange?: string;
  targetGender?: string;
  targetLocations?: string[];
  // Content Guidelines
  brandHashtags?: string[];
  signaturePhrases?: string[];
  ctaTemplates?: string[];
  evergreenThemes?: string[];
  // Customer Personas
  primaryPersona?: CustomerPersona;
  allPersonas?: CustomerPersona[];
}

export interface BrandProduct {
  name: string;
  category?: string;
  description?: string;
  unique_selling_points?: string[];
  target_audience?: string;
  pain_points_solved?: string[];
  benefits?: string[];
  suggested_content_angles?: string[];
  is_featured?: boolean;
}

export interface CustomerPersona {
  name: string;
  avatarEmoji?: string;
  occupation?: string;
  ageRange?: string;
  gender?: string;
  painPoints?: string[];
  desires?: string[];
  objections?: string[];
  buyingTriggers?: string[];
  preferredChannels?: string[];
  typicalFunnelStage?: string;
  isPrimary?: boolean;
}

export interface ContentPillar {
  name: string;
  weight: number;
  keywords: string[];
  color?: string;
}

export interface IndustryContext {
  targetAudience?: string;
  forbiddenTerms?: string[];
  complianceRules?: { rule: string; description: string }[];
  claimRestrictions?: string[];
  brandVoice?: {
    tone?: string[];
    formality?: string;
    language_style?: string[];
  };
  systemRules?: string[];
  argumentPatterns?: {
    valid_patterns?: string[];
    forbidden_patterns?: string[];
  };
}

export interface LearningContext {
  topPerformers: TopPerformerTopic[];
  recentTopics: string[];
  negativeFeedback: NegativeFeedbackItem[];
  preferredCategories: string[];
  preferredPillars: string[];
  averagePerformance: number;
  totalTopicsUsed: number;
}

export interface TopPerformerTopic {
  topic: string;
  score: number;
  category?: string;
  pillar?: string;
  format?: string;
}

export interface NegativeFeedbackItem {
  topic: string;
  feedback: string;
  reason?: string;
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

export type ContentFormat = 'carousel' | 'script' | 'multichannel' | 'topic-suggestions';

export interface PromptContext {
  brand: BrandContext | null;
  industry: IndustryContext | null;
  learning: LearningContext | null;
  format: ContentFormat;
  contentGoal?: string;
}

// ============================================
// CHAIN-OF-THOUGHT (CoT) BUILDERS
// ============================================

/**
 * Build Chain-of-Thought section for different content formats
 */
export function buildCoTSection(format: ContentFormat): string {
  const cotByFormat: Record<ContentFormat, string> = {
    'topic-suggestions': `
## QUY TRÌNH TƯ DUY (CHAIN-OF-THOUGHT)

Trước khi gợi ý topic, bạn PHẢI suy nghĩ theo từng bước:

**Bước 1: Phân tích Brand Context**
- Brand đang ở vị trí nào trong ngành?
- Tone of Voice chính là gì?
- Có content pillars nào cần cân bằng không?

**Bước 2: Đánh giá Learning History**
- Topics nào đã perform tốt? Tại sao?
- Topics nào có feedback tiêu cực? Pattern gì cần tránh?
- Category nào đang hot với brand này?

**Bước 3: Kiểm tra Compliance**
- Có từ cấm nào cần tránh không?
- Có quy tắc ngành nào ảnh hưởng đến góc viết không?
- Claim nào bị hạn chế?

**Bước 4: Scoring & Ranking**
- Ước tính brandFit dựa trên positioning match
- Ước tính trend dựa trên thời điểm và keywords
- Ước tính competition dựa trên độ unique của góc nhìn
- Ước tính engagement dựa trên hook potential và format

**Bước 5: Output Generation**
- Chỉ output topics có overall score >= 60
- Đảm bảo đa dạng categories và pillars
- Không lặp lại pattern của recent topics`,

    'script': `
## QUY TRÌNH TƯ DUY (CHAIN-OF-THOUGHT)

Trước khi viết kịch bản, bạn PHẢI lập kế hoạch:

**Bước 1: Scene Planning (Nội bộ)**
- Xác định cấu trúc: Hook → Problem → Analysis → Solution → CTA
- Xác định nhịp: Mạnh → Trung → Mạnh → Nhẹ → CTA
- Xác định key messages (tối đa 3 messages chính)
- Xác định emotional arc: Curiosity → Concern → Understanding → Relief → Action

**Bước 2: Kiểm tra Brand Voice**
- Tone đang dùng có match với tone_of_voice không?
- Có từ nào trong danh sách cấm không?
- Mức độ formal có phù hợp không?

**Bước 3: Kiểm tra Nối mạch**
- Prompt sau có kế thừa prompt trước không?
- Có "nhảy ý" đột ngột không?
- Tổng thời lượng có đúng target không?

**Bước 4: Self-Correction (Trước khi output)**
- Quét lại tất cả prompts: có từ cấm không?
- Hook 2 dòng đầu có đủ mạnh không?
- CTA cuối có phù hợp với goal không?`,

    'multichannel': `
## QUY TRÌNH TƯ DUY (CHAIN-OF-THOUGHT)

Trước khi viết nội dung đa kênh, bạn PHẢI phân tích:

**Bước 1: Core Message Extraction**
- Message chính cần truyền tải là gì? (1 câu)
- Supporting messages là gì? (2-3 điểm)
- CTA chung cho tất cả kênh?

**Bước 2: Channel-Specific Adaptation**
Cho MỖI kênh, nghĩ:
- Audience của kênh này expect gì?
- Format constraints (char limit, hashtag, emoji)?
- Hook style phù hợp với platform?
- CTA nào effective nhất trên kênh này?

**Bước 3: Cross-Channel Consistency Check**
- Core message có nhất quán không?
- Tone of Voice có đồng bộ không?
- Không có contradiction về facts/numbers?

**Bước 4: Compliance Verification**
- Mỗi kênh có tuân thủ industry rules không?
- Có từ cấm nào trong bất kỳ kênh nào không?
- CTA có phù hợp với từng kênh nhưng hướng cùng mục tiêu không?`,

    'carousel': `
## QUY TRÌNH TƯ DUY (CHAIN-OF-THOUGHT)

Trước khi tạo carousel, bạn PHẢI lập kế hoạch:

**Bước 1: Visual Hierarchy Planning**
Cho mỗi slide, xác định:
- Primary text (lớn nhất, đọc đầu tiên)
- Secondary text (supporting, nhỏ hơn)
- Visual element position (nếu có)
- Brand element position

**Bước 2: Slide Flow Optimization**
- Slide 1: Hook text chiếm >60% visual attention
- Slides giữa: Balance text và visual 50-50
- Slide cuối: CTA text chiếm >70%

**Bước 3: Narrative Arc**
- Có "cliff-hanger" nhẹ để người xem swipe tiếp?
- Mỗi slide có MỘT ý chính duy nhất?
- Transition giữa slides có logic?
- Pace: Hook nhanh → Build chậm → CTA rõ?

**Bước 4: Brand Voice Check**
- Text trên slide có đúng tone không?
- Có từ cấm không?
- Caption và CTA có consistent không?`,
  };

  return cotByFormat[format] || cotByFormat['topic-suggestions'];
}

// ============================================
// FEW-SHOT LEARNING BUILDERS
// ============================================

/**
 * Build Few-Shot examples from learning context
 */
export function buildFewShotExamples(
  learningContext: LearningContext | null,
  format: ContentFormat,
  count: number = 3
): string {
  if (!learningContext || learningContext.topPerformers.length === 0) {
    return '';
  }

  const relevantExamples = learningContext.topPerformers
    .filter(t => !format || t.format === format || format === 'topic-suggestions')
    .slice(0, count);

  if (relevantExamples.length === 0) {
    return '';
  }

  const examplesText = relevantExamples.map((example, i) => {
    return `**Ví dụ ${i + 1}** (Score: ${example.score}/100)
- Topic: "${example.topic}"
- Category: ${example.category || 'N/A'}
- Pillar: ${example.pillar || 'N/A'}`;
  }).join('\n\n');

  return `
## 📚 VÍ DỤ TOPICS ĐÃ THÀNH CÔNG (FEW-SHOT LEARNING)

Các topics sau đã perform tốt với brand này. Học từ pattern của chúng:

${examplesText}

**Insight rút ra:**
- Các topics có score cao thường có góc nhìn độc đáo
- Phù hợp với brand positioning và content pillars
- Hook strong và CTA clear`;
}

// ============================================
// LEARNING CONTEXT BUILDERS
// ============================================

/**
 * Build learning section from topic history
 */
export function buildLearningSection(learningContext: LearningContext | null): string {
  if (!learningContext) {
    return '';
  }

  const parts: string[] = [];

  parts.push(`## 🧠 HỌC TỪ LỊCH SỬ PERFORMANCE\n`);
  parts.push(`Dựa trên ${learningContext.totalTopicsUsed} topics đã sử dụng, average performance: ${learningContext.averagePerformance}/100\n`);

  // Preferred categories
  if (learningContext.preferredCategories.length > 0) {
    parts.push(`\n### Categories hoạt động tốt:`);
    parts.push(learningContext.preferredCategories.join(', '));
  }

  // Preferred pillars
  if (learningContext.preferredPillars.length > 0) {
    parts.push(`\n### Content Pillars hiệu quả:`);
    parts.push(learningContext.preferredPillars.join(', '));
  }

  // Negative feedback - patterns to avoid
  if (learningContext.negativeFeedback.length > 0) {
    parts.push(`\n### ⚠️ PATTERNS CẦN TRÁNH (từ feedback tiêu cực):`);
    learningContext.negativeFeedback.slice(0, 5).forEach(item => {
      parts.push(`- "${item.topic}": ${item.feedback}`);
    });
  }

  // Recent topics to avoid repetition
  if (learningContext.recentTopics.length > 0) {
    parts.push(`\n### Topics gần đây (KHÔNG lặp lại):`);
    parts.push(learningContext.recentTopics.slice(0, 5).join('; '));
  }

  return parts.join('\n');
}

// ============================================
// SELF-CORRECTION BUILDERS
// ============================================

/**
 * Build Self-Correction rules based on merged rules
 */
export function buildSelfCorrectionRules(
  format: ContentFormat,
  mergedRules?: MergedRules
): string {
  const baseChecklist = `
## ✅ SELF-CORRECTION CHECKLIST (KIỂM TRA TRƯỚC KHI OUTPUT)

Sau khi tạo xong nội dung, BẮT BUỘC kiểm tra:`;

  const formatSpecificChecks: Record<ContentFormat, string[]> = {
    'topic-suggestions': [
      '[ ] Mỗi topic có đủ scores object (brandFit, trend, competition, engagement)?',
      '[ ] Không có topic nào trùng với recentTopics?',
      '[ ] Đã cân bằng categories (40% evergreen, 30% trending, 20% seasonal, 10% reactive)?',
      '[ ] Mỗi topic có pillar assignment nếu có content pillars?',
      '[ ] Không có từ cấm trong bất kỳ topic nào?',
      // Content Matrix checks
      '[ ] DIVERSITY: Có ít nhất 2 topics cho mỗi funnel stage (TOFU/MOFU/BOFU)?',
      '[ ] DIVERSITY: Có mix các topic types (problem/solution/story/data)?',
      '[ ] DIVERSITY: Có topics address các pain points chính của persona (nếu có)?',
      '[ ] Mỗi topic có topicType, funnelStage, emotionalTone?',
      '[ ] Balance: ~40% TOFU, ~35% MOFU, ~25% BOFU?',
    ],
    'script': [
      '[ ] Tất cả lời thoại đúng Tone of Voice đã định nghĩa?',
      '[ ] Không có từ cấm trong bất kỳ prompt nào?',
      '[ ] Hook 2 dòng đầu đủ mạnh để giữ chân người xem?',
      '[ ] Mạch nối giữa các prompt mượt mà?',
      '[ ] CTA cuối cùng phù hợp với content goal?',
    ],
    'multichannel': [
      '[ ] Core message nhất quán qua tất cả kênh?',
      '[ ] Không có từ cấm trong bất kỳ kênh nào?',
      '[ ] Mỗi kênh tuân thủ format constraints (char limit, hashtag, emoji)?',
      '[ ] Tone of Voice đồng bộ, không "khác giọng" giữa các kênh?',
      '[ ] CTA phù hợp với từng kênh?',
    ],
    'carousel': [
      '[ ] Text trên mỗi slide ngắn gọn, dễ đọc trên mobile?',
      '[ ] Không có từ cấm trong nội dung slide?',
      '[ ] Visual hierarchy rõ ràng (primary > secondary)?',
      '[ ] Slide flow logic, có cliff-hanger để swipe tiếp?',
      '[ ] CTA slide cuối clear và actionable?',
    ],
  };

  const complianceChecks = mergedRules ? [
    mergedRules.forbidden_terms.length > 0 ? `[ ] KHÔNG có từ cấm industry: ${mergedRules.forbidden_terms.slice(0, 5).join(', ')}...` : null,
    mergedRules.forbidden_words.length > 0 ? `[ ] KHÔNG có từ cấm brand: ${mergedRules.forbidden_words.slice(0, 5).join(', ')}...` : null,
    mergedRules.compliance_rules.length > 0 ? '[ ] Tuân thủ tất cả compliance rules?' : null,
    mergedRules.claim_restrictions.length > 0 ? '[ ] Không có claim bị hạn chế?' : null,
  ].filter(Boolean) : [];

  const checks = [
    ...formatSpecificChecks[format] || formatSpecificChecks['topic-suggestions'],
    ...complianceChecks,
  ];

  return `${baseChecklist}

${checks.join('\n')}

Nếu FAIL bất kỳ mục nào → SỬA trước khi output.`;
}

// ============================================
// DYNAMIC CONTEXT INJECTION
// ============================================

/**
 * Inject dynamic context into base prompt
 */
export function injectDynamicContext(
  basePrompt: string,
  context: PromptContext
): string {
  let enrichedPrompt = basePrompt;

  // Add CoT section
  const cotSection = buildCoTSection(context.format);
  enrichedPrompt = `${enrichedPrompt}\n\n${cotSection}`;

  // Add Learning section if available
  if (context.learning) {
    const learningSection = buildLearningSection(context.learning);
    enrichedPrompt = `${enrichedPrompt}\n\n${learningSection}`;

    // Add Few-Shot examples
    const fewShotSection = buildFewShotExamples(context.learning, context.format, 3);
    if (fewShotSection) {
      enrichedPrompt = `${enrichedPrompt}\n\n${fewShotSection}`;
    }
  }

  return enrichedPrompt;
}

// ============================================
// PROMPT QUALITY SCORING
// ============================================

export interface PromptQualityScore {
  brandContextScore: number;    // 0-100
  industryContextScore: number; // 0-100
  learningDataScore: number;    // 0-100
  overallScore: number;         // 0-100
}

/**
 * Calculate prompt quality score based on available context
 */
export function calculatePromptQuality(context: PromptContext): PromptQualityScore {
  // Brand context score
  let brandScore = 0;
  if (context.brand) {
    brandScore += context.brand.brandName ? 20 : 0;
    brandScore += context.brand.brandPositioning ? 20 : 0;
    brandScore += (context.brand.toneOfVoice?.length || 0) > 0 ? 20 : 0;
    brandScore += (context.brand.preferredWords?.length || 0) > 0 ? 10 : 0;
    brandScore += (context.brand.forbiddenWords?.length || 0) > 0 ? 10 : 0;
    brandScore += (context.brand.contentPillars?.length || 0) > 0 ? 20 : 0;
  }

  // Industry context score
  let industryScore = 0;
  if (context.industry) {
    industryScore += context.industry.targetAudience ? 25 : 0;
    industryScore += (context.industry.forbiddenTerms?.length || 0) > 0 ? 25 : 0;
    industryScore += (context.industry.complianceRules?.length || 0) > 0 ? 25 : 0;
    industryScore += (context.industry.brandVoice?.tone?.length || 0) > 0 ? 25 : 0;
  }

  // Learning data score
  let learningScore = 0;
  if (context.learning) {
    learningScore += context.learning.totalTopicsUsed >= 10 ? 30 : context.learning.totalTopicsUsed * 3;
    learningScore += context.learning.topPerformers.length >= 5 ? 30 : context.learning.topPerformers.length * 6;
    learningScore += context.learning.negativeFeedback.length > 0 ? 20 : 0;
    learningScore += context.learning.preferredCategories.length > 0 ? 10 : 0;
    learningScore += context.learning.preferredPillars.length > 0 ? 10 : 0;
  }

  // Overall weighted score
  const overallScore = Math.round(
    brandScore * 0.4 +
    industryScore * 0.3 +
    learningScore * 0.3
  );

  return {
    brandContextScore: Math.min(100, brandScore),
    industryContextScore: Math.min(100, industryScore),
    learningDataScore: Math.min(100, learningScore),
    overallScore: Math.min(100, overallScore),
  };
}

// ============================================
// EXTENDED BRAND CONTEXT BUILDERS
// ============================================

/**
 * Build Brand Identity section for prompts
 */
export function buildBrandIdentitySection(brand: BrandContext): string {
  const parts: string[] = [];

  if (!brand.mission && !brand.vision && !brand.uniqueValueProposition && !brand.tagline) {
    return '';
  }

  parts.push(`## 🎯 BRAND IDENTITY (SỬ DỤNG TRONG NỘI DUNG)`);

  if (brand.mission) {
    parts.push(`\n### Mission (Sứ mệnh)`);
    parts.push(brand.mission);
    parts.push(`→ Nội dung nên phản ánh sứ mệnh này`);
  }

  if (brand.vision) {
    parts.push(`\n### Vision (Tầm nhìn)`);
    parts.push(brand.vision);
    parts.push(`→ Xây dựng narrative hướng đến tầm nhìn`);
  }

  if (brand.uniqueValueProposition) {
    parts.push(`\n### Unique Value Proposition (USP)`);
    parts.push(brand.uniqueValueProposition);
    parts.push(`→ USP là ĐIỂM NHẤN quan trọng, nên xuất hiện hoặc được gợi nhắc trong content`);
  }

  if (brand.tagline) {
    parts.push(`\n### Tagline`);
    parts.push(`"${brand.tagline}"`);
    parts.push(`→ Có thể sử dụng tự nhiên làm outro hoặc kết thúc content`);
  }

  return parts.join('\n');
}

/**
 * Build Market Positioning section for prompts
 */
export function buildMarketPositioningSection(brand: BrandContext): string {
  const parts: string[] = [];

  const hasData = brand.mainCompetitors?.length || brand.competitiveAdvantages?.length ||
    brand.marketSegment || brand.targetAgeRange || brand.targetGender || brand.targetLocations?.length;

  if (!hasData) return '';

  parts.push(`## 🏆 MARKET POSITIONING`);

  if (brand.marketSegment) {
    parts.push(`\n### Phân khúc thị trường: ${brand.marketSegment}`);
  }

  if (brand.targetAgeRange || brand.targetGender || brand.targetLocations?.length) {
    const demographics: string[] = [];
    if (brand.targetAgeRange) demographics.push(`Độ tuổi: ${brand.targetAgeRange}`);
    if (brand.targetGender) demographics.push(`Giới tính: ${brand.targetGender}`);
    if (brand.targetLocations?.length) demographics.push(`Khu vực: ${brand.targetLocations.join(', ')}`);
    
    parts.push(`\n### Demographics`);
    demographics.forEach(d => parts.push(`- ${d}`));
  }

  if (brand.mainCompetitors?.length) {
    parts.push(`\n### Đối thủ cạnh tranh (ĐỂ HIỂU CONTEXT, KHÔNG NHẮC TÊN):`);
    parts.push(brand.mainCompetitors.join(', '));
    parts.push(`⚠️ KHÔNG bao giờ nhắc tên đối thủ trong content`);
  }

  if (brand.competitiveAdvantages?.length) {
    parts.push(`\n### Lợi thế cạnh tranh (NÊN HIGHLIGHT):`);
    brand.competitiveAdvantages.forEach(adv => parts.push(`- ✓ ${adv}`));
    parts.push(`→ Nội dung NÊN khéo léo làm nổi bật các lợi thế này`);
  }

  return parts.join('\n');
}

/**
 * Build Content Guidelines section for prompts
 */
export function buildContentGuidelinesSection(brand: BrandContext): string {
  const parts: string[] = [];

  const hasData = brand.brandHashtags?.length || brand.signaturePhrases?.length ||
    brand.ctaTemplates?.length || brand.evergreenThemes?.length;

  if (!hasData) return '';

  parts.push(`## 📝 CONTENT GUIDELINES`);

  if (brand.brandHashtags?.length) {
    parts.push(`\n### Brand Hashtags (Đính kèm cho social posts):`);
    parts.push(brand.brandHashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' '));
    parts.push(`→ LUÔN đính kèm 1-3 brand hashtags cho các kênh social`);
  }

  if (brand.signaturePhrases?.length) {
    parts.push(`\n### Signature Phrases (Câu nói đặc trưng):`);
    brand.signaturePhrases.slice(0, 5).forEach(phrase => {
      parts.push(`- "${phrase}"`);
    });
    parts.push(`→ Sử dụng TỰ NHIÊN trong nội dung, không gượng ép`);
  }

  if (brand.ctaTemplates?.length) {
    parts.push(`\n### CTA Templates (Ưu tiên sử dụng):`);
    brand.ctaTemplates.slice(0, 5).forEach(cta => {
      parts.push(`- ${cta}`);
    });
    parts.push(`→ CTA trong content NÊN theo một trong các mẫu trên`);
  }

  if (brand.evergreenThemes?.length) {
    parts.push(`\n### Evergreen Themes (Chủ đề xanh - luôn phù hợp):`);
    parts.push(brand.evergreenThemes.join(', '));
    parts.push(`→ Có thể dùng làm content pillars hoặc góc tiếp cận`);
  }

  return parts.join('\n');
}

/**
 * Build Customer Persona section for prompts
 */
export function buildCustomerPersonaSection(persona: CustomerPersona | null | undefined): string {
  if (!persona) return '';

  const parts: string[] = [];

  parts.push(`## 👤 TARGET PERSONA${persona.isPrimary ? ' (PRIMARY)' : ''}`);
  parts.push(`\n### ${persona.avatarEmoji || '👤'} ${persona.name}`);

  if (persona.occupation || persona.ageRange || persona.gender) {
    const profile: string[] = [];
    if (persona.occupation) profile.push(persona.occupation);
    if (persona.ageRange) profile.push(persona.ageRange);
    if (persona.gender) profile.push(persona.gender);
    parts.push(`Profile: ${profile.join(' | ')}`);
  }

  if (persona.painPoints?.length) {
    parts.push(`\n### Pain Points (Nỗi đau cần giải quyết):`);
    persona.painPoints.slice(0, 5).forEach(pp => parts.push(`- 🔴 ${pp}`));
    parts.push(`→ Content PHẢI address các pain points này`);
  }

  if (persona.desires?.length) {
    parts.push(`\n### Desires (Điều họ mong muốn):`);
    persona.desires.slice(0, 5).forEach(d => parts.push(`- 🟢 ${d}`));
    parts.push(`→ Show rằng brand có thể giúp họ đạt được`);
  }

  if (persona.objections?.length) {
    parts.push(`\n### Objections (Rào cản mua hàng):`);
    persona.objections.slice(0, 5).forEach(obj => parts.push(`- ⚠️ ${obj}`));
    parts.push(`→ Nội dung nên giải quyết trước các objections này`);
  }

  if (persona.buyingTriggers?.length) {
    parts.push(`\n### Buying Triggers (Yếu tố thúc đẩy mua):`);
    persona.buyingTriggers.slice(0, 5).forEach(bt => parts.push(`- 💡 ${bt}`));
    parts.push(`→ Sử dụng làm hooks hoặc CTA triggers`);
  }

  if (persona.typicalFunnelStage) {
    const stageMap: Record<string, string> = {
      awareness: 'TOFU - Đang tìm hiểu',
      consideration: 'MOFU - Đang so sánh',
      decision: 'BOFU - Sẵn sàng mua',
    };
    parts.push(`\n### Funnel Stage: ${stageMap[persona.typicalFunnelStage] || persona.typicalFunnelStage}`);
    parts.push(`→ Điều chỉnh tone và CTA phù hợp với stage này`);
  }

  return parts.join('\n');
}

/**
 * Build complete extended brand prompt section
 */
export function buildExtendedBrandPrompt(brand: BrandContext | null): string {
  if (!brand) return '';

  const sections: string[] = [];

  const identitySection = buildBrandIdentitySection(brand);
  if (identitySection) sections.push(identitySection);

  const marketSection = buildMarketPositioningSection(brand);
  if (marketSection) sections.push(marketSection);

  const guidelinesSection = buildContentGuidelinesSection(brand);
  if (guidelinesSection) sections.push(guidelinesSection);

  const personaSection = buildCustomerPersonaSection(brand.primaryPersona);
  if (personaSection) sections.push(personaSection);

  // Add all personas if available
  if (brand.allPersonas?.length && brand.allPersonas.length > 1) {
    sections.push(buildAllPersonasSection(brand.allPersonas));
  }

  // Add products context
  if (brand.products?.length) {
    sections.push(buildProductsContextSection(brand.products));
  }

  return sections.join('\n\n');
}

/**
 * Build all personas section for comprehensive audience understanding
 */
export function buildAllPersonasSection(personas: CustomerPersona[]): string {
  if (!personas?.length) return '';

  const parts: string[] = [];
  parts.push(`## 👥 TẤT CẢ CUSTOMER PERSONAS (${personas.length} personas)`);

  personas.forEach((persona, index) => {
    const isPrimary = persona.isPrimary;
    parts.push(`\n### ${index + 1}. ${persona.avatarEmoji || '👤'} ${persona.name}${isPrimary ? ' ⭐ (Primary)' : ''}`);
    
    const profile: string[] = [];
    if (persona.occupation) profile.push(persona.occupation);
    if (persona.ageRange) profile.push(persona.ageRange);
    if (persona.gender) profile.push(persona.gender);
    if (profile.length) parts.push(`Profile: ${profile.join(' | ')}`);
    
    if (persona.painPoints?.length) {
      parts.push(`Pain Points: ${persona.painPoints.slice(0, 3).join(', ')}`);
    }
    if (persona.desires?.length) {
      parts.push(`Desires: ${persona.desires.slice(0, 3).join(', ')}`);
    }
    if (persona.buyingTriggers?.length) {
      parts.push(`Buying Triggers: ${persona.buyingTriggers.slice(0, 3).join(', ')}`);
    }
  });

  parts.push(`\n→ Khi gợi ý topic, cân nhắc pain points và desires của TẤT CẢ personas`);
  
  return parts.join('\n');
}

/**
 * Build products context section for prompts
 */
export function buildProductsContextSection(products: BrandProduct[]): string {
  if (!products?.length) return '';

  const parts: string[] = [];
  const featuredProducts = products.filter(p => p.is_featured);
  const otherProducts = products.filter(p => !p.is_featured);

  parts.push(`## 🛍️ SẢN PHẨM/DỊCH VỤ (${products.length} sản phẩm)`);

  // Featured products first
  if (featuredProducts.length > 0) {
    parts.push(`\n### ⭐ Sản phẩm nổi bật:`);
    featuredProducts.forEach(product => {
      parts.push(`\n**${product.name}**${product.category ? ` (${product.category})` : ''}`);
      if (product.description) {
        parts.push(`Mô tả: ${product.description.slice(0, 150)}...`);
      }
      if (product.unique_selling_points?.length) {
        parts.push(`USPs: ${product.unique_selling_points.slice(0, 3).join(', ')}`);
      }
      if (product.pain_points_solved?.length) {
        parts.push(`Giải quyết: ${product.pain_points_solved.slice(0, 3).join(', ')}`);
      }
      if (product.suggested_content_angles?.length) {
        parts.push(`Góc content gợi ý: ${product.suggested_content_angles.slice(0, 3).join(', ')}`);
      }
    });
    parts.push(`→ ƯU TIÊN tạo content về sản phẩm nổi bật`);
  }

  // Other products (summary)
  if (otherProducts.length > 0) {
    parts.push(`\n### Sản phẩm khác:`);
    otherProducts.slice(0, 5).forEach(product => {
      parts.push(`- ${product.name}${product.category ? ` (${product.category})` : ''}`);
    });
    if (otherProducts.length > 5) {
      parts.push(`...và ${otherProducts.length - 5} sản phẩm khác`);
    }
  }

  parts.push(`\n→ Topics có thể xoay quanh sản phẩm, use cases, benefits, testimonials`);

  return parts.join('\n');
}

/**
 * Database types for fetching brand context
 */
export interface BrandContextDBRow {
  brand_name: string;
  brand_positioning?: string;
  tone_of_voice?: string[];
  preferred_words?: string[];
  forbidden_words?: string[];
  industry?: string[];
  formality_level?: string;
  language_style?: string[];
  allow_emoji?: boolean;
  content_pillars?: any;
  // Extended fields
  mission?: string;
  vision?: string;
  unique_value_proposition?: string;
  tagline?: string;
  main_competitors?: string[];
  competitive_advantages?: string[];
  market_segment?: string;
  target_age_range?: string;
  target_gender?: string;
  target_locations?: string[];
  brand_hashtags?: string[];
  signature_phrases?: string[];
  cta_templates?: string[];
  evergreen_themes?: string[];
}

export interface CustomerPersonaDBRow {
  name: string;
  avatar_emoji?: string;
  occupation?: string;
  age_range?: string;
  gender?: string;
  pain_points?: string[];
  desires?: string[];
  objections?: string[];
  buying_triggers?: string[];
  preferred_channels?: string[];
  typical_funnel_stage?: string;
  is_primary?: boolean;
}

/**
 * Map database brand row to BrandContext
 */
export function mapBrandDBToBrandContext(
  row: BrandContextDBRow,
  products?: BrandProduct[],
  personas?: CustomerPersonaDBRow[]
): BrandContext {
  const primaryPersona = personas?.find(p => p.is_primary);
  
  return {
    brandName: row.brand_name,
    brandPositioning: row.brand_positioning,
    toneOfVoice: row.tone_of_voice,
    preferredWords: row.preferred_words,
    forbiddenWords: row.forbidden_words,
    industry: row.industry,
    formality: row.formality_level,
    languageStyle: row.language_style,
    allowEmoji: row.allow_emoji,
    contentPillars: row.content_pillars,
    products: products,
    // Extended identity
    mission: row.mission,
    vision: row.vision,
    uniqueValueProposition: row.unique_value_proposition,
    tagline: row.tagline,
    // Market & Competition
    mainCompetitors: row.main_competitors,
    competitiveAdvantages: row.competitive_advantages,
    marketSegment: row.market_segment,
    targetAgeRange: row.target_age_range,
    targetGender: row.target_gender,
    targetLocations: row.target_locations,
    // Content Guidelines
    brandHashtags: row.brand_hashtags,
    signaturePhrases: row.signature_phrases,
    ctaTemplates: row.cta_templates,
    evergreenThemes: row.evergreen_themes,
    // Personas
    primaryPersona: primaryPersona ? mapPersonaDBToPersona(primaryPersona) : undefined,
    allPersonas: personas?.map(mapPersonaDBToPersona),
  };
}

/**
 * Map database persona row to CustomerPersona
 */
export function mapPersonaDBToPersona(row: CustomerPersonaDBRow): CustomerPersona {
  return {
    name: row.name,
    avatarEmoji: row.avatar_emoji,
    occupation: row.occupation,
    ageRange: row.age_range,
    gender: row.gender,
    painPoints: row.pain_points,
    desires: row.desires,
    objections: row.objections,
    buyingTriggers: row.buying_triggers,
    preferredChannels: row.preferred_channels,
    typicalFunnelStage: row.typical_funnel_stage,
    isPrimary: row.is_primary,
  };
}

/**
 * Extended brand SELECT query for Supabase
 */
export const EXTENDED_BRAND_SELECT = `
  brand_name,
  brand_positioning,
  tone_of_voice,
  preferred_words,
  forbidden_words,
  industry,
  formality_level,
  language_style,
  allow_emoji,
  content_pillars,
  mission,
  vision,
  unique_value_proposition,
  tagline,
  main_competitors,
  competitive_advantages,
  market_segment,
  target_age_range,
  target_gender,
  target_locations,
  brand_hashtags,
  signature_phrases,
  cta_templates,
  evergreen_themes,
  industry_template_id
`;

/**
 * Customer persona SELECT query for Supabase
 */
export const CUSTOMER_PERSONA_SELECT = `
  name,
  avatar_emoji,
  occupation,
  age_range,
  gender,
  pain_points,
  desires,
  objections,
  buying_triggers,
  preferred_channels,
  typical_funnel_stage,
  is_primary
`;

/**
 * Featured products SELECT query for Supabase
 */
export const FEATURED_PRODUCTS_SELECT = `
  name,
  category,
  description,
  unique_selling_points,
  target_audience,
  pain_points_solved,
  benefits,
  suggested_content_angles,
  is_featured
`;
