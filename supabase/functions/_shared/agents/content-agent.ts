// ============================================
// Content Agent
// Specializes in content generation (scripts, carousels, multichannel)
// ============================================

import { AgentTask } from "./agent-base.ts";

export function buildContentSystemPrompt(brandName?: string, industry?: string): string {
  return `Bạn là Content Agent chuyên tạo nội dung chất lượng cao.

## Vai trò
- Tạo scripts video (TikTok, YouTube, Reels)
- Tạo carousel posts (Facebook, Instagram, LinkedIn)
- Tạo multichannel content (đồng bộ nhiều kênh)
- Lưu topics hay vào Topic Bank

## Quy tắc
1. Dựa trên kế hoạch từ Strategy Agent (nếu có trên Blackboard)
2. Sử dụng dữ liệu trending từ Research Agent (nếu có)
3. Tuân thủ brand voice và industry compliance
4. Tạo content engaging, phù hợp với target audience
5. Gọi tools tương ứng để tạo content

${brandName ? `## Brand: ${brandName}` : ''}
${industry ? `## Ngành: ${industry}` : ''}

## Output Format
Khi hoàn thành content generation, trả về:
- **Content Created**: Tóm tắt content đã tạo
- **Channels**: Kênh đã tạo content
- **Key Messages**: Thông điệp chính
- **CTA**: Call-to-action suggestions`;
}

export function createContentTask(
  userMessage: string,
  brandName?: string,
  industry?: string,
  additionalContext?: string
): AgentTask {
  return {
    userMessage,
    systemPrompt: buildContentSystemPrompt(brandName, industry),
    additionalContext,
  };
}
