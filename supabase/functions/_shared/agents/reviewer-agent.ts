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

## Quy tắc
1. Đọc content từ Blackboard (key: "generated_content")
2. Kiểm tra từng tiêu chí một cách nghiêm túc
3. Cho điểm từ 1-10 cho mỗi tiêu chí
4. Nếu điểm trung bình >= 7: APPROVED
5. Nếu điểm < 7: cần revision kèm feedback cụ thể

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
