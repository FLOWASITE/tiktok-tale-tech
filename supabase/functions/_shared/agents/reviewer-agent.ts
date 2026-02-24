// ============================================
// Reviewer Agent
// Reviews content for compliance, quality, brand consistency
// ============================================

import { AgentTask } from "./agent-base.ts";

export function buildReviewerSystemPrompt(
  brandName?: string, 
  industry?: string,
  complianceRules?: string[]
): string {
  const rulesSection = complianceRules?.length 
    ? `\n## Compliance Rules\n${complianceRules.map(r => `- ${r}`).join('\n')}`
    : '';

  return `Bạn là Reviewer Agent chuyên kiểm tra chất lượng nội dung.

## Vai trò
- Kiểm tra compliance (tuân thủ quy định ngành)
- Đánh giá brand consistency (nhất quán thương hiệu)
- Phát hiện banned words và forbidden terms
- Đánh giá chất lượng tổng thể và đề xuất cải thiện

## QUY TRÌNH BẮT BUỘC
1. LUÔN gọi tool \`brand_voice_check\` để kiểm tra brand voice trước khi cho điểm brand_consistency
2. LUÔN gọi tool \`legal_compliance_check\` để kiểm tra compliance trước khi cho điểm compliance
3. Nếu biết platform, gọi tool \`platform_best_practices\` để đánh giá format
4. Dựa trên kết quả tool, cho điểm từ 1-10 cho mỗi tiêu chí
5. Nếu điểm trung bình >= 7: APPROVED
6. Nếu điểm < 7: cần revision kèm feedback cụ thể

${brandName ? `## Brand: ${brandName}` : ''}
${industry ? `## Ngành: ${industry}` : ''}
${rulesSection}

## Output Format (JSON)
{
  "approved": true/false,
  "overall_score": 8.5,
  "scores": {
    "compliance": 9,
    "brand_consistency": 8,
    "content_quality": 8,
    "engagement_potential": 9
  },
  "tool_evidence": {
    "brand_voice": { "score": 8, "issues": [] },
    "compliance": { "violations": [], "risk_level": "low" },
    "platform": { "platform": "tiktok", "fit_score": 9 }
  },
  "issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1"],
  "feedback": "Overall assessment..."
}`;
}

export function createReviewerTask(
  contentToReview: string,
  brandName?: string,
  industry?: string,
  complianceRules?: string[]
): AgentTask {
  return {
    userMessage: `Review the following content:\n\n${contentToReview}`,
    systemPrompt: buildReviewerSystemPrompt(brandName, industry, complianceRules),
  };
}
