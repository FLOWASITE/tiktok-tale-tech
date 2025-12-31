// ============================================
// Glossary Context Builder
// ============================================

import { GlossaryTerm } from "../types/chat-types.ts";

/**
 * Build glossary section for system prompt
 */
export function buildGlossarySection(glossary: GlossaryTerm[]): string {
  if (!glossary?.length) return '';

  // Group by category
  const byCategory = glossary.reduce((acc, term) => {
    const cat = term.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(term);
    return acc;
  }, {} as Record<string, GlossaryTerm[]>);

  const categoryLabels: Record<string, string> = {
    general: '📚 Chung',
    technical: '⚙️ Kỹ thuật',
    legal: '⚖️ Pháp lý',
    marketing: '📢 Marketing',
    compliance: '✅ Tuân thủ',
  };

  let section = `

## 📖 INDUSTRY GLOSSARY (Thuật ngữ ngành - ƯU TIÊN sử dụng)

Sử dụng thuật ngữ chuyên ngành chính xác để tăng credibility và compliance:`;

  // Preferred terms first (across all categories)
  const preferredTerms = glossary.filter(t => t.is_preferred);
  if (preferredTerms.length > 0) {
    section += `

### ⭐ Thuật ngữ ưu tiên (LUÔN dùng):`;
    preferredTerms.slice(0, 10).forEach(term => {
      section += `
- **${term.term}**${term.abbreviation ? ` (${term.abbreviation})` : ''}: ${term.definition.slice(0, 100)}${term.definition.length > 100 ? '...' : ''}`;
    });
  }

  // Then by category
  Object.entries(byCategory).forEach(([category, terms]) => {
    const nonPreferred = terms.filter(t => !t.is_preferred).slice(0, 5);
    if (nonPreferred.length === 0) return;

    section += `

### ${categoryLabels[category] || category}:`;
    nonPreferred.forEach(term => {
      let line = `- **${term.term}**`;
      if (term.abbreviation) line += ` (${term.abbreviation})`;
      line += `: ${term.definition.slice(0, 80)}${term.definition.length > 80 ? '...' : ''}`;
      section += `
${line}`;
    });
  });

  section += `

### Cách sử dụng glossary trong topic:
1. **Ưu tiên dùng thuật ngữ chuẩn** thay vì từ thông dụng để tăng chuyên nghiệp
2. **Viết đúng chính tả** các thuật ngữ chuyên ngành
3. Nếu có **abbreviation**, có thể dùng sau khi đã giải thích đầy đủ 1 lần
4. Context badge: Dùng \`📖 Glossary\` khi topic sử dụng thuật ngữ ngành`;

  return section;
}
