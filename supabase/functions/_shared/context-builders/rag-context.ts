// ============================================
// RAG Context Builder
// ============================================

import { RAGResult } from "../types/chat-types.ts";

/**
 * Build RAG context section for system prompt
 */
export function buildRAGContextSection(ragResults: RAGResult[]): string {
  if (!ragResults?.length) return '';

  let section = `

## 🔍 RELATED PAST CONTENT (RAG Context)

Đây là các content đã tạo trước đó có liên quan đến cuộc hội thoại. Tham khảo để:
- Tránh gợi ý topics trùng lặp hoặc quá tương tự
- Học từ patterns thành công
- Maintain consistency với content đã publish`;

  const topicResults = ragResults.filter(r => r.content_type === 'topic');
  const scriptResults = ragResults.filter(r => r.content_type === 'script');

  if (topicResults.length > 0) {
    section += `

### 📌 Related Topics:`;
    topicResults.forEach((r, i) => {
      const score = r.metadata?.performance_score;
      const category = r.metadata?.category;
      let line = `${i + 1}. "${r.content_text.slice(0, 80)}${r.content_text.length > 80 ? '...' : ''}" (similarity: ${Math.round(r.similarity * 100)}%`;
      if (score) line += `, score: ${score}`;
      if (category) line += `, ${category}`;
      line += ')';
      section += `
${line}`;
    });
  }

  if (scriptResults.length > 0) {
    section += `

### 🎬 Related Scripts:`;
    scriptResults.forEach((r, i) => {
      section += `
${i + 1}. "${r.content_text.slice(0, 80)}${r.content_text.length > 80 ? '...' : ''}" (similarity: ${Math.round(r.similarity * 100)}%)`;
    });
  }

  section += `

⚠️ **QUAN TRỌNG**: Tham khảo content đã có để tránh trùng lặp. Nếu gợi ý topic tương tự content đã có, hãy đề xuất góc nhìn MỚI hoặc cải tiến.`;

  return section;
}
