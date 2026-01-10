// ============================================
// Smart Context Builder for AI Content Generation
// Combines Learning History, RAG, and Brand Context
// ============================================

import { fetchLearningContext } from './learning-context.ts';
import type { LearningContext, BrandContext, CustomerPersona, BrandProduct } from './prompt-utils.ts';
import { HOOK_CRITERIA, CTA_CRITERIA } from './critique-criteria.ts';

/**
 * Smart context options
 */
export interface SmartContextOptions {
  qualityMode: 'fast' | 'balanced' | 'quality';
  brandTemplateId?: string;
  organizationId?: string;
  targetPersonaId?: string;
  targetProductId?: string;
  includeHookPatterns?: boolean;
  includeCTAPatterns?: boolean;
  includeLearning?: boolean;
}

/**
 * Smart context result
 */
export interface SmartContextResult {
  learningContext: LearningContext | null;
  hookPatternsSection: string;
  ctaPatternsSection: string;
  fewShotExamples: string;
  negativePatterns: string;
  personaSection: string;
  differentiation: string;
  contextRichnessScore: number;
}

/**
 * Build hook patterns section for AI system prompt
 * Injects good patterns and anti-patterns to prevent weak hooks
 */
export function buildHookPatternsSection(qualityMode: 'fast' | 'balanced' | 'quality'): string {
  if (qualityMode === 'fast') {
    // Fast mode: Minimal patterns
    return `
## 🎣 HOOK PATTERNS (Câu mở đầu)
PATTERNS TỐT: Số liệu + Emotion, Câu hỏi gây tò mò, Story hook, Pain point
❌ TRÁNH: "Xin chào", "Hôm nay", "Bạn có biết" (quá generic)`;
  }

  // Balanced/Quality mode: Full patterns
  const goodPatterns = Object.entries(HOOK_CRITERIA.patterns)
    .slice(0, 6)
    .map(([_, config]) => `- ✅ ${config.description} (ví dụ: ${config.regex.source.slice(0, 50)}...)`)
    .join('\n');

  const antiPatterns = HOOK_CRITERIA.antiPatterns
    .slice(0, 5)
    .map(ap => `- ❌ "${ap.pattern.source}" → ${ap.reason}`)
    .join('\n');

  return `
## 🎣 HOOK PATTERNS (BẮT BUỘC TUÂN THỦ)

### PATTERNS TỐT (ƯU TIÊN SỬ DỤNG):
${goodPatterns}

### ANTI-PATTERNS (TUYỆT ĐỐI KHÔNG DÙNG):
${antiPatterns}

### VÍ DỤ HOOK MẠNH:
- "3 sai lầm khiến 90% người mới thất bại..."
- "Tôi đã mất 2 năm để nhận ra điều này..."
- "Bạn có biết 87% khách hàng bỏ đi vì lý do này?"
- "Câu chuyện này sẽ thay đổi cách bạn nghĩ về..."

⚠️ HOOK PHẢI:
1. Match ít nhất 1 pattern tốt
2. KHÔNG bắt đầu bằng anti-pattern
3. Gây tò mò/shock trong 3 giây đầu`;
}

/**
 * Build CTA patterns section for AI system prompt
 */
export function buildCTAPatternsSection(
  qualityMode: 'fast' | 'balanced' | 'quality',
  ctaTemplates?: string[]
): string {
  if (qualityMode === 'fast') {
    return `
## 📲 CTA GUIDELINES
CTA cần có: Action verb + Benefit + Urgency
❌ TRÁNH: "Liên hệ ngay", "Xem thêm" (quá generic)`;
  }

  // Build blacklist
  const blacklistItems = CTA_CRITERIA.blacklist
    .slice(0, 4)
    .map(item => `- ❌ "${item.pattern.source}" → ${item.reason}`)
    .join('\n');

  // Build good examples
  const goodExamples = CTA_CRITERIA.examples.strong
    .slice(0, 4)
    .map(ex => `- ✅ "${ex}"`)
    .join('\n');

  // Brand-specific CTA templates
  let brandCTAs = '';
  if (ctaTemplates?.length) {
    brandCTAs = `
### CTA TEMPLATES CỦA BRAND (ƯU TIÊN SỬ DỤNG):
${ctaTemplates.slice(0, 5).map(cta => `- ${cta}`).join('\n')}`;
  }

  return `
## 📲 CTA PATTERNS (BẮT BUỘC TUÂN THỦ)

### CTA BLACKLIST (KHÔNG ĐƯỢC DÙNG):
${blacklistItems}

### CTA MẠNH (THAM KHẢO):
${goodExamples}

### CẤU TRÚC CTA TỐT:
1. **Action Verb cụ thể**: Đăng ký, Tải ngay, Nhận ngay, Đặt lịch...
2. **Benefit rõ ràng**: "...để nhận ebook miễn phí", "...tiết kiệm 30%"
3. **Urgency element**: "chỉ hôm nay", "còn 3 slot", "hết hạn trong 24h"

${brandCTAs}

⚠️ CTA PHẢI:
- Có ACTION VERB + BENEFIT
- KHÔNG generic như "Liên hệ ngay", "Xem thêm"`;
}

/**
 * Build few-shot examples from learning context
 */
export function buildFewShotFromLearning(
  learningContext: LearningContext | null,
  count: number = 3
): string {
  if (!learningContext || learningContext.topPerformers.length === 0) {
    return '';
  }

  const examples = learningContext.topPerformers.slice(0, count);
  const examplesText = examples.map((ex, i) => {
    let text = `**Ví dụ ${i + 1}** (Score: ${ex.score}/100)`;
    text += `\n- Topic: "${ex.topic}"`;
    if (ex.category) text += `\n- Category: ${ex.category}`;
    if (ex.engagement?.likes || ex.engagement?.views) {
      text += `\n- Engagement: ${ex.engagement.likes || 0} likes, ${ex.engagement.views || 0} views`;
    }
    return text;
  }).join('\n\n');

  return `
## 📚 VÍ DỤ CONTENT THÀNH CÔNG (FEW-SHOT LEARNING)

Các nội dung sau đã perform tốt với brand này. Học từ pattern:

${examplesText}

⚡ ÁP DỤNG: Góc nhìn độc đáo + Hook mạnh + CTA rõ ràng`;
}

/**
 * Build negative patterns section
 */
export function buildNegativePatternsSection(
  learningContext: LearningContext | null
): string {
  if (!learningContext || learningContext.negativeFeedback.length === 0) {
    return '';
  }

  const negatives = learningContext.negativeFeedback.slice(0, 5);
  const patternsText = negatives.map(item => 
    `- ❌ "${item.topic.slice(0, 60)}..." → ${item.feedback || item.reason || 'Không phù hợp'}`
  ).join('\n');

  return `
## ⚠️ PATTERNS CẦN TRÁNH (TỪ FEEDBACK TIÊU CỰC)

${patternsText}

→ KHÔNG lặp lại các pattern này trong nội dung mới`;
}

/**
 * Build persona-driven content adaptation section
 */
export function buildPersonaAdaptationSection(
  persona: CustomerPersona | null
): string {
  if (!persona) return '';

  const parts: string[] = [];
  parts.push(`
## 🎯 PERSONA-DRIVEN ADAPTATION

### Target: ${persona.avatarEmoji || '👤'} ${persona.name}`);

  if (persona.painPoints?.length) {
    parts.push(`
### Pain Points (HOOK PHẢI đánh trúng):
${persona.painPoints.slice(0, 3).map(pp => `- 🔴 ${pp}`).join('\n')}`);
  }

  if (persona.buyingTriggers?.length) {
    parts.push(`
### Buying Triggers (CTA PHẢI sử dụng):
${persona.buyingTriggers.slice(0, 3).map(bt => `- 💡 ${bt}`).join('\n')}`);
  }

  if (persona.communicationStyle) {
    parts.push(`
### Communication Style: ${persona.communicationStyle}
→ Điều chỉnh tone theo style này`);
  }

  if (persona.objections?.length) {
    parts.push(`
### Objections (PHẢN BÁC trong content):
${persona.objections.slice(0, 3).map(obj => `- ⚠️ ${obj}`).join('\n')}`);
  }

  if (persona.journeyMap?.length) {
    const journeyHint = persona.journeyMap
      .map(j => `${j.stage}: ${j.content_type}`)
      .join(' → ');
    parts.push(`
### Journey Map: ${journeyHint}`);
  }

  parts.push(`
⚡ NỘI DUNG PHẢI:
- Hook đánh trúng pain points
- CTA trigger buying motivation
- Tone match communication style
- Address objections một cách tinh tế`);

  return parts.join('\n');
}

/**
 * Build differentiation instruction when semantic similarity is high
 */
export function buildDifferentiationSection(
  similarityScore: number,
  matchedContentPreview?: string
): string {
  if (similarityScore < 0.75) return '';

  return `
## ⚠️ CẢNH BÁO TRÙNG LẶP (Similarity: ${Math.round(similarityScore * 100)}%)

NỘI DUNG TƯƠNG TỰ ĐÃ CÓ:
"${matchedContentPreview?.slice(0, 150) || 'Content preview'}..."

### BẮT BUỘC TẠO SỰ KHÁC BIỆT:
1. **GÓC NHÌN MỚI**: Tiếp cận từ góc độ khác (pain point → solution, problem → opportunity)
2. **HOOK KHÁC**: Dùng pattern khác với content cũ
3. **CASE STUDY/VÍ DỤ MỚI**: Không lặp lại ví dụ đã dùng
4. **DATA POINT MỚI**: Số liệu/thống kê khác
5. **CTA KHÁC**: Hành động khác hoặc góc độ benefit khác

❌ KHÔNG copy ý tưởng hoặc cấu trúc từ content cũ`;
}

/**
 * Fetch and build smart context for content generation
 */
export async function buildSmartContext(
  supabase: any,
  options: SmartContextOptions
): Promise<SmartContextResult> {
  const {
    qualityMode,
    brandTemplateId,
    organizationId,
    includeHookPatterns = true,
    includeCTAPatterns = true,
    includeLearning = true,
  } = options;

  // Initialize result
  const result: SmartContextResult = {
    learningContext: null,
    hookPatternsSection: '',
    ctaPatternsSection: '',
    fewShotExamples: '',
    negativePatterns: '',
    personaSection: '',
    differentiation: '',
    contextRichnessScore: 0,
  };

  // Skip learning context for fast mode
  if (includeLearning && qualityMode !== 'fast') {
    try {
      result.learningContext = await fetchLearningContext(
        supabase,
        brandTemplateId || null,
        organizationId || null,
        50
      );
      
      if (result.learningContext) {
        result.fewShotExamples = buildFewShotFromLearning(
          result.learningContext,
          qualityMode === 'quality' ? 5 : 3
        );
        result.negativePatterns = buildNegativePatternsSection(result.learningContext);
      }
    } catch (err) {
      console.warn('[smart-context] Failed to fetch learning context:', err);
    }
  }

  // Build hook patterns
  if (includeHookPatterns) {
    result.hookPatternsSection = buildHookPatternsSection(qualityMode);
  }

  // Build CTA patterns
  if (includeCTAPatterns) {
    result.ctaPatternsSection = buildCTAPatternsSection(qualityMode);
  }

  // Calculate context richness score
  let richnessScore = 0;
  if (result.learningContext) {
    richnessScore += result.learningContext.topPerformers.length >= 5 ? 30 : result.learningContext.topPerformers.length * 6;
    richnessScore += result.learningContext.negativeFeedback.length > 0 ? 20 : 0;
    richnessScore += result.learningContext.totalTopicsUsed >= 10 ? 20 : result.learningContext.totalTopicsUsed * 2;
  }
  if (result.hookPatternsSection) richnessScore += 15;
  if (result.ctaPatternsSection) richnessScore += 15;
  
  result.contextRichnessScore = Math.min(100, richnessScore);

  return result;
}

/**
 * Build complete smart prompt injection
 */
export function buildSmartPromptInjection(context: SmartContextResult): string {
  const sections: string[] = [];

  if (context.hookPatternsSection) {
    sections.push(context.hookPatternsSection);
  }

  if (context.ctaPatternsSection) {
    sections.push(context.ctaPatternsSection);
  }

  if (context.fewShotExamples) {
    sections.push(context.fewShotExamples);
  }

  if (context.negativePatterns) {
    sections.push(context.negativePatterns);
  }

  if (context.personaSection) {
    sections.push(context.personaSection);
  }

  if (context.differentiation) {
    sections.push(context.differentiation);
  }

  return sections.join('\n\n');
}
