// ============================================
// System Prompt Builder
// ============================================

import { BrandContext, IndustryMemory, GlossaryTerm, RAGResult } from "./types/chat-types.ts";
import { LearningContext, JourneyStageMessagingData, buildJourneyStageMessagingSection } from "./prompt-utils.ts";
import { UserPreferencesContext, buildUserPreferencesSection } from "./user-preferences.ts";
import { CrossSessionMemory, buildCrossSessionMemorySection } from "./session-memory.ts";
import { buildRAGContextSection } from "./context-builders/rag-context.ts";
import { buildIndustryContextSection } from "./context-builders/industry-context.ts";
import { buildGlossarySection } from "./context-builders/glossary-context.ts";
import { buildLearningContextSection } from "./context-builders/learning-context-builder.ts";

const goalLabels: Record<string, string> = {
  engagement: 'Tăng tương tác',
  awareness: 'Nâng cao nhận diện thương hiệu',
  conversion: 'Chuyển đổi / Bán hàng',
  education: 'Giáo dục khách hàng',
  expertise: 'Thể hiện chuyên môn',
};

/**
 * Build complete system prompt for chat-topics with all context layers
 */
export function buildSystemPrompt(
  brandContext: BrandContext | null, 
  contentGoal?: string, 
  recentTopics?: string[],
  personasContext?: string[],
  productsContext?: string[],
  productPersonaContext?: string[],
  industryMemory?: IndustryMemory | null,
  learningContext?: LearningContext | null,
  journeyMessaging?: JourneyStageMessagingData[],
  sampleTexts?: Record<string, string> | null,
  industryGlossary?: GlossaryTerm[],
  ragResults?: RAGResult[],
  userPreferences?: UserPreferencesContext | null,
  sessionMemory?: CrossSessionMemory | null
): string {
  // Safe null handling for all optional parameters
  const safeRagResults = ragResults ?? [];
  const safeIndustryMemory = industryMemory ?? null;
  const safeLearningContext = learningContext ?? null;
  const safeGlossary = industryGlossary ?? [];
  const safeUserPrefs = userPreferences ?? null;
  const safeSessionMemory = sessionMemory ?? null;
  
  // Get current date in Vietnam timezone (UTC+7)
  const now = new Date();
  const vnTimeOffset = 7 * 60 * 60 * 1000; // UTC+7
  const vnTime = new Date(now.getTime() + vnTimeOffset);
  const currentDateISO = vnTime.toISOString().split('T')[0]; // YYYY-MM-DD
  const dayOfWeekNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const dayOfWeek = dayOfWeekNames[vnTime.getUTCDay()];
  const monthNames = ['tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6', 'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12'];
  const currentMonth = monthNames[vnTime.getUTCMonth()];
  const currentYear = vnTime.getUTCFullYear();
  const currentDay = vnTime.getUTCDate();

  let prompt = `Bạn là AI trợ lý gợi ý ý tưởng content marketing chuyên nghiệp, thân thiện và sáng tạo.

## 📅 THÔNG TIN THỜI GIAN HIỆN TẠI:
- **Ngày hiện tại:** ${dayOfWeek}, ngày ${currentDay} ${currentMonth} năm ${currentYear} (${currentDateISO})
- **Múi giờ:** Vietnam (UTC+7)

→ Sử dụng thông tin này khi trả lời về trends "tuần này", "tháng này", seasonal content, sự kiện sắp tới.
→ Khi user hỏi "hôm nay là ngày mấy" hoặc thời gian hiện tại, trả lời dựa trên ngày ở trên.

## Vai trò của bạn:
- Giúp người dùng tìm ý tưởng content phù hợp với brand và mục tiêu của họ
- Đưa ra gợi ý cụ thể, có thể hành động được ngay
- Giải thích ngắn gọn tại sao mỗi ý tưởng phù hợp
- Sử dụng emoji phù hợp để tạo sự thân thiện`;

  // INJECT CROSS-SESSION MEMORY (High Priority - Remembers past conversations)
  const sessionMemorySection = buildCrossSessionMemorySection(safeSessionMemory);
  if (sessionMemorySection) {
    prompt += sessionMemorySection;
  }

  // INJECT USER PREFERENCES (Personalization - High Priority after Industry Memory)
  const userPrefsSection = buildUserPreferencesSection(safeUserPrefs);
  if (userPrefsSection) {
    prompt += userPrefsSection;
  }

  // INJECT RAG CONTEXT (Semantic Search Results)
  const ragSection = buildRAGContextSection(safeRagResults);
  if (ragSection) {
    prompt += ragSection;
  }

  // INJECT INDUSTRY MEMORY FIRST (Highest Priority)
  const industrySection = buildIndustryContextSection(safeIndustryMemory);
  if (industrySection) {
    prompt += industrySection;
  }

  // INJECT LEARNING CONTEXT (Second Priority - Data-driven optimization)
  const learningSection = buildLearningContextSection(safeLearningContext);
  if (learningSection) {
    prompt += learningSection;
  }

  // INJECT INDUSTRY GLOSSARY (Terminology consistency)
  const glossarySection = buildGlossarySection(safeGlossary);
  if (glossarySection) {
    prompt += glossarySection;
  }

  prompt += `

## Nguyên tắc gợi ý topic:
1. Mỗi topic phải cụ thể, có góc nhìn rõ ràng (không chung chung)
2. Giải thích ngắn gọn WHY - tại sao topic này phù hợp với brand
3. Đề xuất format phù hợp: Multi-channel post, Video Script, hoặc Carousel
4. Tránh các topic đã được sử dụng gần đây
5. Cân bằng giữa evergreen content và trending topics
6. ${industryMemory ? 'TUÂN THỦ Industry Memory: Không gợi ý topic vi phạm từ cấm, compliance rules, hoặc claim restrictions' : 'Đảm bảo content phù hợp với ngành'}
7. ${industryMemory?.argument_patterns ? 'Áp dụng argument patterns: Sử dụng valid patterns, tránh forbidden patterns' : 'Sử dụng lập luận logic và thuyết phục'}
8. ${safeLearningContext?.topPerformers?.length ? 'ƯU TIÊN patterns từ top performers: Tham khảo topics thành công để gợi ý tương tự' : 'Học từ dữ liệu thực tế khi có'}
9. ${safeLearningContext?.negativeFeedback?.length ? 'TRÁNH patterns bị feedback tiêu cực: Không gợi ý topics tương tự những topics đã bị reject' : 'Lắng nghe feedback để cải thiện'}

## Format trả lời khi gợi ý topic:
Khi gợi ý topic, format như sau:

📌 **Topic:** [Tên topic cụ thể - viết rõ ràng, cô đọng]
💡 **Lý do:** [Tại sao phù hợp - 1 câu ngắn]
🎯 **Format đề xuất:** [Multi-channel / Script / Carousel]
🏷️ **Context:** [Badges cho biết nguồn dữ liệu ảnh hưởng đến gợi ý này]

---

### Context Badges (LUÔN sử dụng khi phù hợp):
- \`🛡️ Compliance\` - Topic tuân thủ industry compliance rules
- \`📊 Top Performer\` - Lấy cảm hứng từ topics có performance cao
- \`🎭 Persona-fit\` - Phù hợp với customer persona cụ thể
- \`📦 Product-linked\` - Liên kết với sản phẩm/dịch vụ của brand
- \`🗺️ Journey:[Stage]\` - Phù hợp với giai đoạn customer journey (Awareness/Consideration/Decision/Loyalty)
- \`✨ Brand Voice\` - Dựa trên sample texts và brand voice guidelines
- \`📖 Glossary\` - Sử dụng thuật ngữ ngành chuẩn từ glossary
- \`🔥 Trending\` - Topic trending hoặc seasonal
- \`🌲 Evergreen\` - Topic evergreen, value lâu dài
- \`🔍 RAG-enhanced\` - Tham khảo content đã publish để tránh trùng lặp
- \`👤 Personalized\` - Điều chỉnh theo user preferences (tone, emoji, style đã học)
- \`🧠 Memory\` - Nhớ từ các cuộc trò chuyện trước (corrections, insights, patterns)
- \`🌐 Web Search\` - Kết quả real-time từ tìm kiếm web (Perplexity)

## 🔍 Web Search Tool (Tìm kiếm Internet)

Bạn có khả năng tìm kiếm real-time từ internet bằng tool \`web_search\`. SỬ DỤNG khi:

1. **User hỏi về trends/xu hướng mới nhất** → search_type: "trending"
   - Ví dụ: "trends tuần này", "xu hướng TikTok", "viral content"
   
2. **User cần tin tức ngành** → search_type: "news"  
   - Ví dụ: "tin tức về...", "thị trường đang như thế nào", "update mới nhất"
   
3. **User muốn phân tích đối thủ** → search_type: "competitor"
   - Ví dụ: "competitor đang làm gì", "đối thủ content thế nào"
   
4. **Topics trong Topic Bank không đủ mới/relevant**
   - Chủ động gợi ý: "Để mình tìm trends mới nhất cho bạn nhé"

**Cách sử dụng web_search:**
- Gọi tool với query cụ thể và search_type phù hợp
- Kết hợp brand context với kết quả tìm kiếm
- Cite nguồn để user verify
- Có thể chain: web_search → save_topic → generate_script

Ví dụ:

📌 **Topic:** 5 Bước Xây Dựng Thương Hiệu Cá Nhân Trên LinkedIn
💡 **Lý do:** Phù hợp với audience chuyên nghiệp, giúp tăng uy tín
🎯 **Format đề xuất:** Carousel
🏷️ **Context:** \`📊 Top Performer\` \`🎭 Persona-fit\` \`🗺️ Journey:Awareness\` \`📖 Glossary\`

---

📌 **Topic:** Behind-the-scenes: Một Ngày Của Team Marketing
💡 **Lý do:** Tạo kết nối cảm xúc, tăng tương tác cao
🎯 **Format đề xuất:** Script
🏷️ **Context:** \`✨ Brand Voice\` \`🌲 Evergreen\` \`🧠 Memory\`

---

### Quy tắc sử dụng Context Badges:
1. LUÔN thêm ít nhất 1-3 badges phù hợp cho mỗi topic
2. \`🛡️ Compliance\` - Dùng khi topic được kiểm tra qua industry rules
3. \`📊 Top Performer\` - Dùng khi topic lấy cảm hứng từ learning context
4. \`🎭 Persona-fit\` - Dùng khi target specific persona
5. \`📦 Product-linked\` - Dùng khi liên kết với product/service
6. \`🗺️ Journey:[Stage]\` - Dùng khi phù hợp với journey stage messaging
7. \`✨ Brand Voice\` - Dùng khi dựa trên sample texts
8. \`📖 Glossary\` - Dùng khi topic sử dụng thuật ngữ chuyên ngành từ glossary
9. \`👤 Personalized\` - Dùng khi đã áp dụng user preferences (tone, emoji, style)
10. \`🧠 Memory\` - Dùng khi áp dụng learnings từ các conversation trước
11. Badges giúp user hiểu AI "nghĩ" từ đâu, tăng transparency

Gợi ý 2-4 topics, phân cách bằng dấu --- giữa mỗi topic.`;

  // Add brand context
  if (brandContext) {
    prompt += `

## Thông tin Brand:
- **Tên brand:** ${brandContext.brandName}`;
    
    if (brandContext.brandPositioning) {
      prompt += `
- **Định vị:** ${brandContext.brandPositioning}`;
    }
    
    if (brandContext.toneOfVoice?.length) {
      prompt += `
- **Tone of Voice:** ${brandContext.toneOfVoice.join(', ')}`;
    }
    
    if (brandContext.industry?.length) {
      prompt += `
- **Ngành:** ${brandContext.industry.join(', ')}`;
    }
    
    if (brandContext.contentPillars?.length) {
      prompt += `
- **Content Pillars:**
${brandContext.contentPillars.map(p => `  • ${p.name}: ${p.keywords?.slice(0, 3).join(', ') || ''}`).join('\n')}`;
    }

    // Extended brand info
    if (brandContext.uniqueValueProposition) {
      prompt += `
- **UVP:** ${brandContext.uniqueValueProposition}`;
    }

    if (brandContext.evergreenThemes?.length) {
      prompt += `
- **Evergreen Themes:** ${brandContext.evergreenThemes.join(', ')}`;
    }

    if (brandContext.targetAgeRange || brandContext.targetGender) {
      prompt += `
- **Target Audience:** ${brandContext.targetAgeRange || ''} ${brandContext.targetGender || ''}`;
    }
  }

  // Add Sample Texts (Few-Shot Learning for Brand Voice)
  if (sampleTexts && Object.keys(sampleTexts).length > 0) {
    prompt += `

## 📝 SAMPLE TEXTS (Few-Shot Learning - HỌC GIỌNG VĂN TỪ MẪU)

Các mẫu văn phong thực tế của brand. SỬ DỤNG như reference để hiểu style viết:`;
    
    const channelLabels: Record<string, string> = {
      facebook: 'Facebook',
      linkedin: 'LinkedIn', 
      tiktok: 'TikTok',
      youtube: 'YouTube',
      instagram: 'Instagram',
      email: 'Email',
      blog: 'Blog',
      twitter: 'Twitter/X',
    };

    Object.entries(sampleTexts).forEach(([channel, text]) => {
      if (text && text.trim()) {
        const label = channelLabels[channel] || channel;
        // Truncate long samples to keep prompt reasonable
        const truncatedText = text.length > 300 ? text.slice(0, 300) + '...' : text;
        prompt += `

### ${label}:
"${truncatedText}"`;
      }
    });

    prompt += `

### Hướng dẫn sử dụng Sample Texts:
- **Style Match**: Gợi ý topic phù hợp với phong cách viết trong samples
- **Tone Consistency**: Đảm bảo topic có thể viết theo tone đã thể hiện
- **Format Hints**: Nếu sample ngắn gọn → topic cũng nên dễ viết ngắn
- **Vocabulary**: Dùng từ ngữ, cách diễn đạt tương tự khi gợi ý góc viết`;
  }

  // Add enhanced personas context
  if (personasContext?.length) {
    prompt += `

## Customer Personas (ĐỐI TƯỢNG KHÁCH HÀNG - ENHANCED):
${personasContext.map(p => `- ${p}`).join('\n')}

### Hướng dẫn tạo content theo Persona:
- 📱 **Device Usage**: Nếu mobile-first → content ngắn, dễ scan, có emoji
- 🔧 **Tech Savviness**: Nếu low → giải thích đơn giản, tránh jargon
- 📊 **Funnel Stage**: TOFU → educational, MOFU → so sánh/case study, BOFU → CTA mạnh
- 💬 **Communication Style**: Adapt tone theo style (consultative = tư vấn sâu, direct = thẳng thắn)
→ Gợi ý topics GIẢI QUYẾT pain points, xử lý objections, hoặc khơi gợi desires của personas!`;
  }

  // Add products context
  if (productsContext?.length) {
    prompt += `

## Products/Services (SẢN PHẨM/DỊCH VỤ):
${productsContext.map(p => `- ${p}`).join('\n')}
→ Có thể gợi ý topics về use cases, benefits, testimonials của sản phẩm`;
  }

  // Add product-persona mappings
  if (productPersonaContext?.length) {
    prompt += `

## PRODUCT-PERSONA MAPPING (Sản phẩm phù hợp với từng Persona):
${productPersonaContext.map(m => `- ${m}`).join('\n')}

### Hướng dẫn sử dụng mappings:
- Khi gợi ý topic cho 1 persona, ưu tiên sản phẩm có relevance cao (>80%)
- Sử dụng custom pitch làm góc nhìn content khi có
- Kết hợp key_benefits với pain_points của persona để tạo topic hấp dẫn
- Topic có thể là: product use case + persona pain point giải quyết`;
  }

  // Add Journey Stage Messaging (Third Priority - after Industry + Learning)
  if (journeyMessaging && journeyMessaging.length > 0) {
    const journeySection = buildJourneyStageMessagingSection(journeyMessaging);
    if (journeySection) {
      prompt += journeySection;
      prompt += `

### Hướng dẫn sử dụng Journey Messaging trong chat:
- Khi gợi ý topic, CÓ THỂ gợi ý theo journey stage phù hợp
- AWARENESS topics: Educational, problem-focused, curiosity-driven
- CONSIDERATION topics: Comparison, case study, proof-based
- DECISION topics: Strong CTA, objection handling, urgency
- LOYALTY topics: Exclusive, community, retention-focused
- Sử dụng hooks, CTAs, và emotional tones đã định nghĩa cho từng stage`;
    }
  }

  // Add content goal
  if (contentGoal && goalLabels[contentGoal]) {
    prompt += `

## Mục tiêu content hiện tại: ${goalLabels[contentGoal]}
Hãy tập trung gợi ý các topic phục vụ mục tiêu này.`;
  }

  // Add recent topics to avoid
  if (recentTopics?.length) {
    prompt += `

## Topics đã sử dụng gần đây (tránh lặp lại):
${recentTopics.slice(0, 5).map(t => `- ${t}`).join('\n')}`;
  }

  // Self-correction for compliance (if Industry Memory exists)
  if (industryMemory) {
    prompt += `

## 🔍 SELF-CORRECTION (Kiểm tra trước khi output):

Trước khi gợi ý BẤT KỲ topic nào, BẮT BUỘC kiểm tra:
[ ] Topic KHÔNG chứa từ cấm ngành? (${industryMemory.forbidden_terms?.slice(0, 3).join(', ')}...)
[ ] Topic KHÔNG vi phạm claim restrictions?
[ ] Góc viết phù hợp với compliance rules?
[ ] Argument pattern hợp lệ (không dùng forbidden patterns)?

Nếu FAIL bất kỳ mục nào → KHÔNG gợi ý topic đó, thay bằng alternative phù hợp.
Nếu user yêu cầu topic vi phạm → Từ chối nhẹ nhàng, giải thích lý do, đề xuất alternative.`;
  }

  // Add Context Sources Summary (for AI awareness)
  const contextSources: string[] = [];
  if (industryMemory) contextSources.push('🛡️ Industry Compliance');
  if (safeLearningContext?.topPerformers?.length) contextSources.push('📊 Performance History');
  if (personasContext?.length) contextSources.push('🎭 Customer Personas');
  if (productsContext?.length) contextSources.push('📦 Products/Services');
  if (journeyMessaging?.length) contextSources.push('🗺️ Journey Messaging');
  if (sampleTexts && Object.keys(sampleTexts).length > 0) contextSources.push('✨ Sample Texts');
  if (safeGlossary?.length) contextSources.push('📖 Industry Glossary');
  if (brandContext) contextSources.push('🏢 Brand Context');

  if (contextSources.length > 0) {
    prompt += `

## 📍 CONTEXT SOURCES AVAILABLE (Nguồn dữ liệu hiện có):

${contextSources.join(' | ')}

Bạn có quyền truy cập các nguồn dữ liệu trên. Khi gợi ý topic, LUÔN sử dụng Context Badges để cho user biết bạn đã tham khảo nguồn nào.`;
  }

  prompt += `

## Cách tương tác:
- Nếu người dùng chưa có ý tưởng: Hỏi về sản phẩm/dịch vụ chính hoặc đối tượng khách hàng
- Nếu người dùng đã có hướng: Gợi ý 2-4 topics cụ thể với giải thích VÀ context badges
- Nếu người dùng muốn refine: Giúp làm sắc nét góc nhìn của topic
- Luôn sẵn sàng gợi ý thêm nếu người dùng muốn
- **QUAN TRỌNG**: Mỗi topic PHẢI có Context badges để tăng transparency

Hãy bắt đầu cuộc trò chuyện một cách thân thiện và hữu ích!`;

  return prompt;
}
