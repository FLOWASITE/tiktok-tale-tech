// ============================================
// System Prompt Builder (Multi-Language Support)
// ============================================

import { BrandContext, IndustryMemory, GlossaryTerm, RAGResult } from "./types/chat-types.ts";
import { LearningContext, JourneyStageMessagingData, buildJourneyStageMessagingSection } from "./prompt-utils.ts";
import { UserPreferencesContext, buildUserPreferencesSection } from "./user-preferences.ts";
import { CrossSessionMemory, buildCrossSessionMemorySection } from "./session-memory.ts";
import { buildRAGContextSection } from "./context-builders/rag-context.ts";
import { buildIndustryContextSection } from "./context-builders/industry-context.ts";
import { buildGlossarySection } from "./context-builders/glossary-context.ts";
import { buildLearningContextSection } from "./context-builders/learning-context-builder.ts";
import { getLanguageConfig, buildLocalizedDateContext } from "./country-language-map.ts";

const goalLabelsMap: Record<string, Record<string, string>> = {
  vi: { engagement: 'Tăng tương tác', awareness: 'Nâng cao nhận diện thương hiệu', conversion: 'Chuyển đổi / Bán hàng', education: 'Giáo dục khách hàng', expertise: 'Thể hiện chuyên môn' },
  th: { engagement: 'เพิ่มการมีส่วนร่วม', awareness: 'เพิ่มการรับรู้แบรนด์', conversion: 'แปลงยอดขาย', education: 'ให้ความรู้ลูกค้า', expertise: 'แสดงความเชี่ยวชาญ' },
  en: { engagement: 'Increase Engagement', awareness: 'Build Brand Awareness', conversion: 'Drive Conversions', education: 'Educate Customers', expertise: 'Demonstrate Expertise' },
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
  sessionMemory?: CrossSessionMemory | null,
  conversationRagSection?: string,
  prefetchWebSection?: string,
  outputLanguage?: string // NEW: output language code
): string {
  const lang = outputLanguage || 'vi';
  const langConfig = getLanguageConfig(lang);
  const goalLabels = goalLabelsMap[lang] || goalLabelsMap['en'];
  // Safe null handling for all optional parameters
  const safeRagResults = ragResults ?? [];
  const safeIndustryMemory = industryMemory ?? null;
  const safeLearningContext = learningContext ?? null;
  const safeGlossary = industryGlossary ?? [];
  const safeUserPrefs = userPreferences ?? null;
  const safeSessionMemory = sessionMemory ?? null;
  const safeConversationRag = conversationRagSection ?? '';
  const safePrefetchWeb = prefetchWebSection ?? '';
  
  // Use localized date context instead of hardcoded Vietnamese
  const dateContext = buildLocalizedDateContext(lang);

  let prompt = `You are a professional, friendly, and creative AI content marketing idea assistant.
IMPORTANT: Always respond in ${langConfig.nativeName} (${langConfig.englishName}).

${dateContext}
→ Use this information when answering about "this week's" trends, "this month's" content, seasonal content, upcoming events.

## Your Role:
- Help users find content ideas that fit their brand and objectives
- Provide specific, actionable suggestions
- Briefly explain why each idea is relevant
- Use appropriate emojis for friendliness`;


  // INJECT CROSS-SESSION MEMORY (High Priority - Remembers past conversations)
  const sessionMemorySection = buildCrossSessionMemorySection(safeSessionMemory);
  if (sessionMemorySection) {
    prompt += sessionMemorySection;
  }

  // INJECT CONVERSATION RAG (Semantic search over past conversations)
  if (safeConversationRag) {
    prompt += '\n\n' + safeConversationRag;
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

  // INJECT PREFETCHED WEB SEARCH RESULTS (for trending intent)
  if (safePrefetchWeb) {
    prompt += '\n' + safePrefetchWeb;
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

## Topic Suggestion Rules:
1. Each topic must be specific with a clear angle (not generic)
2. Briefly explain WHY - why this topic fits the brand
3. Suggest appropriate format: Multi-channel post, Video Script, or Carousel
4. Avoid recently used topics
5. Balance evergreen content and trending topics
6. ${industryMemory ? 'COMPLY with Industry Memory: Never suggest topics that violate forbidden terms, compliance rules, or claim restrictions' : 'Ensure content is appropriate for the industry'}
7. ${industryMemory?.argument_patterns ? 'Apply argument patterns: Use valid patterns, avoid forbidden patterns' : 'Use logical and persuasive argumentation'}
8. ${safeLearningContext?.topPerformers?.length ? 'PRIORITIZE top performer patterns: Reference successful topics for similar suggestions' : 'Learn from real data when available'}
9. ${safeLearningContext?.negativeFeedback?.length ? 'AVOID negatively-feedbacked patterns: Do not suggest topics similar to rejected ones' : 'Listen to feedback for improvement'}

## Response Format for Topic Suggestions:
When suggesting topics, use this format:

📌 **Topic:** [Specific topic name - clear and concise, in ${langConfig.nativeName}]
💡 **Reason:** [Why it fits - 1 short sentence, in ${langConfig.nativeName}]
🎯 **Suggested Format:** [Multi-channel / Script / Carousel]
🏷️ **Context:** [Badges indicating data sources]

---

### Context Badges (ALWAYS use when appropriate):
- \`🛡️ Compliance\` - Topic complies with industry rules
- \`📊 Top Performer\` - Inspired by high-performing topics
- \`🎭 Persona-fit\` - Fits a specific customer persona
- \`📦 Product-linked\` - Linked to brand's product/service
- \`🗺️ Journey:[Stage]\` - Fits customer journey stage (Awareness/Consideration/Decision/Loyalty)
- \`✨ Brand Voice\` - Based on sample texts and brand voice guidelines
- \`📖 Glossary\` - Uses standardized industry terminology from glossary
- \`🔥 Trending\` - Trending or seasonal topic
- \`🌲 Evergreen\` - Evergreen, long-term value topic
- \`🔍 RAG-enhanced\` - Referenced published content to avoid duplication
- \`👤 Personalized\` - Adjusted to user preferences (tone, emoji, learned style)
- \`🧠 Memory\` - Remembered from past conversations (corrections, insights, patterns)
- \`🌐 Web Search\` - Real-time web search results

## 🔍 Web Search Tool - USE PROACTIVELY

⚡ **IMPORTANT**: ALWAYS call \`web_search\` tool BEFORE making topic suggestions if:
1. User asks for ideas/topics/brainstorm on a specific subject
2. No [🌐 Web Trends Context] exists in this prompt
3. Real-time data is needed (news, trends, events)

→ Reason: Market information changes constantly. Web search ensures suggestions are fresh and relevant.

**Recommended flow for brainstorming:**
1. Receive brainstorm request → call web_search(search_type: "trending") with topic
2. Combine results with brand context
3. Suggest topics based on real-time data + brand fit

You can search the internet in real-time using \`web_search\`. USE when:
1. **User asks about latest trends** → search_type: "trending"
2. **User needs industry news** → search_type: "news"
3. **User wants competitor analysis** → search_type: "competitor"
4. **User asks for new ideas on a topic** → search_type: "trending"

### Context Badge Rules:
1. ALWAYS add at least 1-3 relevant badges per topic
2-11. Apply badges when the corresponding data source was used

Suggest 2-4 topics, separated by --- between each topic.`;

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

## 📝 SAMPLE TEXTS (Few-Shot Learning)

Real brand writing samples. USE as reference to understand writing style:`;

    
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

### Sample Texts Usage Guide:
- **Style Match**: Suggest topics that fit the writing style in samples
- **Tone Consistency**: Ensure topics can be written in the demonstrated tone
- **Format Hints**: If sample is concise → topic should also be easy to write concisely
- **Vocabulary**: Use similar expressions when suggesting writing angles`;
  }

  // Add enhanced personas context
  if (personasContext?.length) {
    prompt += `

## Customer Personas:
${personasContext.map(p => `- ${p}`).join('\n')}

### Content Creation by Persona:
- 📱 **Device Usage**: If mobile-first → short content, scannable, use emoji
- 🔧 **Tech Savviness**: If low → simple explanations, avoid jargon
- 📊 **Funnel Stage**: TOFU → educational, MOFU → comparison/case study, BOFU → strong CTA
- 💬 **Communication Style**: Adapt tone to style
→ Suggest topics that SOLVE pain points, handle objections, or trigger desires!`;
  }

  // Add products context
  if (productsContext?.length) {
    prompt += `

## Products/Services:
${productsContext.map(p => `- ${p}`).join('\n')}
→ Can suggest topics about use cases, benefits, testimonials`;
  }

  // Add product-persona mappings
  if (productPersonaContext?.length) {
    prompt += `

## PRODUCT-PERSONA MAPPING:
${productPersonaContext.map(m => `- ${m}`).join('\n')}

### Mapping Usage:
- When suggesting for a persona, prioritize high-relevance products (>80%)
- Use custom pitch as content angle when available
- Combine key_benefits with persona pain_points for compelling topics`;
  }

  // Add Journey Stage Messaging
  if (journeyMessaging && journeyMessaging.length > 0) {
    const journeySection = buildJourneyStageMessagingSection(journeyMessaging);
    if (journeySection) {
      prompt += journeySection;
      prompt += `

### Journey Messaging in Chat:
- AWARENESS topics: Educational, problem-focused, curiosity-driven
- CONSIDERATION topics: Comparison, case study, proof-based
- DECISION topics: Strong CTA, objection handling, urgency
- LOYALTY topics: Exclusive, community, retention-focused`;
    }
  }

  // Add content goal
  if (contentGoal && goalLabels[contentGoal]) {
    prompt += `

## Current Content Goal: ${goalLabels[contentGoal]}
Focus on suggesting topics that serve this goal.`;
  }

  // Add recent topics to avoid
  if (recentTopics?.length) {
    prompt += `

## Recently Used Topics (avoid repeating):
${recentTopics.slice(0, 5).map(t => `- ${t}`).join('\n')}`;
  }

  // Self-correction for compliance
  if (industryMemory) {
    prompt += `

## 🔍 SELF-CORRECTION (Check before output):

Before suggesting ANY topic, MANDATORY check:
[ ] Topic does NOT contain industry forbidden terms? (${industryMemory.forbidden_terms?.slice(0, 3).join(', ')}...)
[ ] Topic does NOT violate claim restrictions?
[ ] Writing angle complies with compliance rules?
[ ] Argument pattern is valid (no forbidden patterns)?

If FAIL any item → DO NOT suggest that topic, replace with compliant alternative.`;
  }

  // Add Context Sources Summary
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

## 📍 CONTEXT SOURCES AVAILABLE:

${contextSources.join(' | ')}

You have access to the above data sources. When suggesting topics, ALWAYS use Context Badges to show which sources you referenced.`;
  }

  prompt += `

## Interaction Style:
- If user has no ideas: Ask about their main products/services or target audience
- If user has a direction: Suggest 2-4 specific topics with explanations AND context badges
- If user wants to refine: Help sharpen the topic angle
- Always ready to suggest more if requested
- **IMPORTANT**: Every topic MUST have Context badges for transparency

REMEMBER: All your responses must be in ${langConfig.nativeName} (${langConfig.englishName}).`;

  return prompt;
}
