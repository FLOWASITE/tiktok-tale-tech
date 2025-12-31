// ============================================
// Learning Context Builder
// ============================================

import { LearningContext } from "../prompt-utils.ts";

/**
 * Build learning context section for system prompt
 */
export function buildLearningContextSection(learningContext: LearningContext | null): string {
  if (!learningContext) return '';

  let section = `

## 📊 AI LEARNING (Học từ lịch sử performance thực tế)

### Tổng quan:
- Đã phân tích **${learningContext.totalTopicsUsed}** topics, điểm TB: **${learningContext.averagePerformance}/100**
- Đã xuất bản: **${learningContext.publishedCount || 0}** contents`;

  // Add total engagement if available
  if (learningContext.totalEngagement) {
    const te = learningContext.totalEngagement;
    if (te.views || te.likes || te.comments || te.shares) {
      section += `
- Tổng engagement: ${te.views ? `👀 ${te.views} views` : ''} ${te.likes ? `❤️ ${te.likes} likes` : ''} ${te.comments ? `💬 ${te.comments} comments` : ''} ${te.shares ? `🔄 ${te.shares} shares` : ''}`;
    }
  }

  // Top performers - PRIORITIZE these patterns
  if (learningContext.topPerformers?.length) {
    section += `

### ⭐ TOP PERFORMERS (Ưu tiên gợi ý patterns tương tự):`;
    learningContext.topPerformers.slice(0, 5).forEach((t, i) => {
      let line = `${i + 1}. "${t.topic}" (${t.score}pts, ${t.category}`;
      if (t.pillar) line += `, ${t.pillar}`;
      line += ')';
      if (t.engagement) {
        const e = t.engagement;
        const engParts: string[] = [];
        if (e.views) engParts.push(`${e.views} views`);
        if (e.likes) engParts.push(`${e.likes} likes`);
        if (e.comments) engParts.push(`${e.comments} cmt`);
        if (engParts.length) line += ` - ${engParts.join(', ')}`;
      }
      section += `
   ${line}`;
    });
    section += `
→ Tham khảo patterns thành công để gợi ý topics tương tự!`;
  }

  // Performance insights by category
  if (learningContext.performanceInsights?.length) {
    section += `

### 📈 PERFORMANCE BY CATEGORY:`;
    learningContext.performanceInsights.slice(0, 4).forEach(p => {
      section += `
- **${p.topicPattern}**: Score TB ${p.avgScore}, ${p.count} topics`;
      if (p.avgEngagement.views > 0 || p.avgEngagement.likes > 0) {
        section += ` (avg: ${p.avgEngagement.views} views, ${p.avgEngagement.likes} likes)`;
      }
      if (p.sampleTopics?.length) {
        section += `
  VD: "${p.sampleTopics[0]}"`;
      }
    });
  }

  // Preferred categories and pillars
  if (learningContext.preferredCategories?.length) {
    section += `

### ✅ CATEGORIES ƯA THÍCH (performance cao):
${learningContext.preferredCategories.map(c => `- ${c}`).join('\n')}`;
  }

  if (learningContext.preferredPillars?.length) {
    section += `

### ✅ PILLARS ƯA THÍCH:
${learningContext.preferredPillars.map(p => `- ${p}`).join('\n')}`;
  }

  // Negative feedback - AVOID these patterns
  if (learningContext.negativeFeedback?.length) {
    section += `

### ❌ PATTERNS CẦN TRÁNH (feedback tiêu cực):`;
    learningContext.negativeFeedback.slice(0, 5).forEach(nf => {
      let line = `- "${nf.topic}"`;
      if (nf.reason) line += ` - Lý do: ${nf.reason}`;
      section += `
${line}`;
    });
    section += `
→ KHÔNG gợi ý topics có pattern tương tự!`;
  }

  // Recent topics - avoid repetition (already handled in main prompt but reinforce here)
  if (learningContext.recentTopics?.length) {
    section += `

### 🔄 TOPICS GẦN ĐÂY (7 ngày - tránh lặp):
${learningContext.recentTopics.slice(0, 5).map(t => `- ${t}`).join('\n')}`;
  }

  section += `

⚠️ **QUAN TRỌNG**: Ưu tiên gợi ý topics theo patterns thành công (top performers), tránh patterns có feedback tiêu cực.`;

  return section;
}
