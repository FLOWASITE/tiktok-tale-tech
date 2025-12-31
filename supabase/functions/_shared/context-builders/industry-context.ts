// ============================================
// Industry Context Builder
// ============================================

import { IndustryMemory } from "../types/chat-types.ts";

/**
 * Build industry context section for system prompt
 */
export function buildIndustryContextSection(industryMemory: IndustryMemory | null): string {
  if (!industryMemory) return '';

  let section = `

## 🔒 INDUSTRY MEMORY (ƯU TIÊN CAO NHẤT - KHÔNG ĐƯỢC VI PHẠM)

### Ngành: ${industryMemory.name} (v${industryMemory.version})
- Target Audience: ${industryMemory.target_audience === 'B2B' ? 'Doanh nghiệp' : industryMemory.target_audience === 'B2C' ? 'Cá nhân' : 'Cả hai'}`;

  // Forbidden terms - highest priority
  if (industryMemory.forbidden_terms?.length) {
    section += `

### ⛔ TỪ CẤM NGÀNH (TUYỆT ĐỐI KHÔNG DÙNG):
${industryMemory.forbidden_terms.map(t => `- "${t}"`).join('\n')}
→ KHÔNG được gợi ý topic chứa các từ này, KHÔNG viết lại, KHÔNG paraphrase!`;
  }

  // Compliance rules
  if (industryMemory.compliance_rules?.length) {
    section += `

### ✅ QUY TẮC TUÂN THỦ:
${industryMemory.compliance_rules.map(r => {
      if (typeof r === 'string') return `- ${r}`;
      return `- ${r.rule}${r.level ? ` (${r.level})` : ''}`;
    }).join('\n')}`;
  }

  // Claim restrictions
  if (industryMemory.claim_restrictions?.length) {
    section += `

### ⚠️ CLAIM BỊ HẠN CHẾ (KHÔNG ĐƯỢC HỨA HẸN):
${industryMemory.claim_restrictions.map(c => {
      if (typeof c === 'string') return `- ${c}`;
      return `- ${c.claim}${c.reason ? ` (Lý do: ${c.reason})` : ''}`;
    }).join('\n')}`;
  }

  // Argument patterns
  if (industryMemory.argument_patterns) {
    const { valid_patterns, forbidden_patterns } = industryMemory.argument_patterns;
    if (valid_patterns?.length || forbidden_patterns?.length) {
      section += `

### 💬 ARGUMENT PATTERNS:`;
      if (valid_patterns?.length) {
        section += `
✅ Patterns được phép:
${valid_patterns.map(p => `- ${p}`).join('\n')}`;
      }
      if (forbidden_patterns?.length) {
        section += `
❌ Patterns KHÔNG được phép:
${forbidden_patterns.map(p => `- ${p}`).join('\n')}`;
      }
    }
  }

  // System rules
  if (industryMemory.system_rules?.length) {
    section += `

### 📋 SYSTEM RULES (Quy tắc hệ thống):
${industryMemory.system_rules.map(r => `- ${r}`).join('\n')}`;
  }

  // Preferred words
  if (industryMemory.preferred_words?.length) {
    section += `

### 👍 TỪ NÊN DÙNG:
${industryMemory.preferred_words.map(w => `- "${w}"`).join('\n')}`;
  }

  // Industry brand voice baseline
  if (industryMemory.brand_voice) {
    const bv = industryMemory.brand_voice;
    const voiceParts: string[] = [];
    if (bv.tone_of_voice?.length) voiceParts.push(`Tone: ${bv.tone_of_voice.join(', ')}`);
    if (bv.formality_level) voiceParts.push(`Formality: ${bv.formality_level}`);
    if (bv.language_style?.length) voiceParts.push(`Style: ${bv.language_style.join(', ')}`);
    if (bv.cta_policy) voiceParts.push(`CTA: ${bv.cta_policy}`);
    if (typeof bv.allow_emoji === 'boolean') voiceParts.push(`Emoji: ${bv.allow_emoji ? 'có' : 'không'}`);
    
    if (voiceParts.length) {
      section += `

### 🎯 BASELINE BRAND VOICE (từ ngành):
${voiceParts.map(p => `- ${p}`).join('\n')}`;
    }
  }

  section += `

⚠️ **QUAN TRỌNG**: Industry Memory OVERRIDE mọi yêu cầu khác nếu mâu thuẫn. Nếu user yêu cầu topic vi phạm các quy tắc trên, từ chối nhẹ nhàng và đề xuất alternative.`;

  return section;
}
