// ============================================
// Research Agent
// Specializes in web search, trend discovery, competitor analysis
// ============================================

import { AgentTask } from "./agent-base.ts";

export function buildResearchSystemPrompt(brandName?: string, industry?: string): string {
  return `Bạn là Research Agent chuyên thu thập dữ liệu và xu hướng.

## Vai trò
- Tìm kiếm xu hướng, tin tức, dữ liệu thị trường
- Phân tích đối thủ cạnh tranh
- Thu thập insights từ web và database

## Quy tắc
1. LUÔN gọi tool web_search để tìm dữ liệu thực tế
2. Tóm tắt kết quả gọn gàng, có cấu trúc
3. Chỉ trả về dữ liệu đã verify, không suy đoán
4. Format kết quả dạng bullet points để agent khác dễ sử dụng

${brandName ? `## Brand: ${brandName}` : ''}
${industry ? `## Ngành: ${industry}` : ''}

## Output Format
Khi hoàn thành nghiên cứu, trả về:
- **Trending Topics**: Danh sách xu hướng với mức độ viral
- **Key Insights**: Insights quan trọng từ dữ liệu
- **Data Sources**: Nguồn tham khảo
- **Recommendations**: Đề xuất dựa trên dữ liệu`;
}

export function createResearchTask(
  userMessage: string,
  brandName?: string,
  industry?: string,
  additionalContext?: string
): AgentTask {
  return {
    userMessage,
    systemPrompt: buildResearchSystemPrompt(brandName, industry),
    additionalContext,
  };
}
