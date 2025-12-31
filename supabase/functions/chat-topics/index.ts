import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchLearningContext, PerformanceInsight } from "../_shared/learning-context.ts";
import { LearningContext, JourneyStageMessagingData, buildJourneyStageMessagingSection, JourneyStage } from "../_shared/prompt-utils.ts";
import { CHAT_TOOLS, ToolCall, ToolCallResult, AgentTurn } from "../_shared/tool-definitions.ts";
import { executeToolCall } from "../_shared/tool-executor.ts";
import { 
  executeToolChain, 
  detectToolChainDependencies, 
  summarizeToolChain,
  buildToolChainMessages,
  ToolChainResult 
} from "../_shared/tool-chain-executor.ts";
import { fetchUserPreferences, buildUserPreferencesSection, UserPreferencesContext } from "../_shared/user-preferences.ts";
import { fetchCrossSessionMemory, buildCrossSessionMemorySection, CrossSessionMemory } from "../_shared/session-memory.ts";
import { executeAgenticLoop, createSSEWriter, buildReActPromptSection, AgentSSEEvent } from "../_shared/agentic-loop.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIMENSIONS = 768;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  brandTemplateId?: string;
  contentGoal?: string;
  organizationId?: string;
  userId?: string;
  enableTools?: boolean;
  enableAgenticLoop?: boolean; // Enable multi-turn agentic loop
  maxAgentTurns?: number; // Max turns for agentic loop (default 5)
}

interface RAGResult {
  content_type: string;
  content_id: string;
  content_text: string;
  similarity: number;
  metadata: Record<string, any>;
}

interface BrandContext {
  brandName: string;
  brandPositioning?: string;
  toneOfVoice?: string[];
  industry?: string[];
  contentPillars?: Array<{ name: string; keywords: string[] }>;
  uniqueValueProposition?: string;
  targetAgeRange?: string;
  targetGender?: string;
  evergreenThemes?: string[];
  brandHashtags?: string[];
  mainCompetitors?: string[];
  industryTemplateId?: string;
}

interface IndustryMemory {
  id: string;
  code: string;
  name: string;
  version: string;
  target_audience: string;
  compliance_rules: Array<string | { rule: string; level?: string }>;
  claim_restrictions: Array<string | { claim: string; reason?: string }>;
  forbidden_terms: string[];
  brand_voice: {
    tone_of_voice?: string[];
    formality_level?: string;
    language_style?: string[];
    allow_emoji?: boolean;
    cta_policy?: string;
  };
  channel_settings?: Record<string, { risk_level: string; notes?: string }>;
  metadata?: { applies_to?: string[]; legal_basis?: string[] };
  argument_patterns?: { valid_patterns?: string[]; forbidden_patterns?: string[] };
  system_rules?: string[];
  preferred_words?: string[];
  forbidden_words?: string[];
}

interface GlossaryTerm {
  term: string;
  abbreviation: string | null;
  category: string;
  definition: string;
  example_usage: string | null;
  is_preferred: boolean;
  related_terms: string[];
}

// Generate embedding for RAG query
async function generateQueryEmbedding(query: string): Promise<number[] | null> {
  if (!LOVABLE_API_KEY) return null;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: [query],
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      console.error('Embedding API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating query embedding:', error);
    return null;
  }
}

// Search for relevant past content using RAG
async function searchRelevantContent(
  supabase: any,
  query: string,
  organizationId: string,
  brandTemplateId?: string,
  limit: number = 5
): Promise<RAGResult[]> {
  try {
    const embedding = await generateQueryEmbedding(query);
    if (!embedding) return [];

    const embeddingStr = `[${embedding.join(',')}]`;

    const { data, error } = await supabase.rpc('search_embeddings', {
      query_embedding: embeddingStr,
      match_organization_id: organizationId,
      match_brand_template_id: brandTemplateId || null,
      match_content_types: ['topic', 'script'],
      match_threshold: 0.7,
      match_count: limit,
    });

    if (error) {
      console.error('RAG search error:', error);
      return [];
    }

    // Deduplicate by content_id
    const deduped = new Map<string, RAGResult>();
    for (const r of (data || [])) {
      const key = `${r.content_type}:${r.content_id}`;
      if (!deduped.has(key) || deduped.get(key)!.similarity < r.similarity) {
        deduped.set(key, r);
      }
    }

    return Array.from(deduped.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  } catch (error) {
    console.error('Error in RAG search:', error);
    return [];
  }
}

// Build RAG context section for system prompt
function buildRAGContextSection(ragResults: RAGResult[]): string {
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

// Fetch industry memory from database
async function fetchIndustryMemory(
  supabase: any,
  industryTemplateId: string,
  languageCode: string = 'vi'
): Promise<IndustryMemory | null> {
  try {
    // First try with requested language
    const { data: template, error } = await supabase
      .from('industry_templates')
      .select(`
        id, code, version, target_audience, is_active,
        compliance_rules, claim_restrictions, forbidden_terms,
        brand_voice, channel_settings, metadata,
        argument_patterns, system_rules, preferred_words, forbidden_words,
        industry_template_translations!inner (
          name, language_code
        )
      `)
      .eq('id', industryTemplateId)
      .eq('is_active', true)
      .eq('industry_template_translations.language_code', languageCode)
      .maybeSingle();

    if (error) {
      console.error('Error fetching industry memory:', error);
      return null;
    }

    // If no result with requested language, try fallback to English
    if (!template) {
      const { data: fallbackTemplate, error: fallbackError } = await supabase
        .from('industry_templates')
        .select(`
          id, code, version, target_audience, is_active,
          compliance_rules, claim_restrictions, forbidden_terms,
          brand_voice, channel_settings, metadata,
          argument_patterns, system_rules, preferred_words, forbidden_words,
          industry_template_translations!inner (
            name, language_code
          )
        `)
        .eq('id', industryTemplateId)
        .eq('is_active', true)
        .eq('industry_template_translations.language_code', 'en')
        .maybeSingle();

      if (fallbackError || !fallbackTemplate) {
        console.log('No industry template found for:', industryTemplateId);
        return null;
      }

      return {
        id: fallbackTemplate.id,
        code: fallbackTemplate.code,
        name: fallbackTemplate.industry_template_translations?.[0]?.name || fallbackTemplate.code,
        version: fallbackTemplate.version,
        target_audience: fallbackTemplate.target_audience || 'both',
        compliance_rules: fallbackTemplate.compliance_rules || [],
        claim_restrictions: fallbackTemplate.claim_restrictions || [],
        forbidden_terms: fallbackTemplate.forbidden_terms || [],
        brand_voice: fallbackTemplate.brand_voice || {},
        channel_settings: fallbackTemplate.channel_settings,
        metadata: fallbackTemplate.metadata,
        argument_patterns: fallbackTemplate.argument_patterns,
        system_rules: fallbackTemplate.system_rules || [],
        preferred_words: fallbackTemplate.preferred_words || [],
        forbidden_words: fallbackTemplate.forbidden_words || [],
      };
    }

    return {
      id: template.id,
      code: template.code,
      name: template.industry_template_translations?.[0]?.name || template.code,
      version: template.version,
      target_audience: template.target_audience || 'both',
      compliance_rules: template.compliance_rules || [],
      claim_restrictions: template.claim_restrictions || [],
      forbidden_terms: template.forbidden_terms || [],
      brand_voice: template.brand_voice || {},
      channel_settings: template.channel_settings,
      metadata: template.metadata,
      argument_patterns: template.argument_patterns,
      system_rules: template.system_rules || [],
      preferred_words: template.preferred_words || [],
      forbidden_words: template.forbidden_words || [],
    };
  } catch (error) {
    console.error('Error in fetchIndustryMemory:', error);
    return null;
  }
}

// Build industry context section for system prompt
function buildIndustryContextSection(industryMemory: IndustryMemory | null): string {
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

// Fetch industry glossary terms from database
async function fetchIndustryGlossary(
  supabase: any,
  industryTemplateId: string,
  languageCode: string = 'vi',
  limit: number = 30
): Promise<GlossaryTerm[]> {
  try {
    const { data, error } = await supabase
      .from('industry_glossary')
      .select(`
        term, abbreviation, category, is_preferred, related_terms,
        industry_glossary_translations!inner (
          definition, example_usage, language_code
        )
      `)
      .eq('industry_template_id', industryTemplateId)
      .eq('is_active', true)
      .eq('industry_glossary_translations.language_code', languageCode)
      .order('is_preferred', { ascending: false })
      .order('sort_order', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching industry glossary:', error);
      return [];
    }

    if (!data?.length) {
      // Fallback to English if no results
      const { data: fallbackData } = await supabase
        .from('industry_glossary')
        .select(`
          term, abbreviation, category, is_preferred, related_terms,
          industry_glossary_translations!inner (
            definition, example_usage, language_code
          )
        `)
        .eq('industry_template_id', industryTemplateId)
        .eq('is_active', true)
        .eq('industry_glossary_translations.language_code', 'en')
        .order('is_preferred', { ascending: false })
        .order('sort_order', { ascending: true })
        .limit(limit);

      if (fallbackData?.length) {
        return fallbackData.map((g: any) => ({
          term: g.term,
          abbreviation: g.abbreviation,
          category: g.category,
          definition: g.industry_glossary_translations?.[0]?.definition || '',
          example_usage: g.industry_glossary_translations?.[0]?.example_usage,
          is_preferred: g.is_preferred,
          related_terms: g.related_terms || [],
        }));
      }
      return [];
    }

    return data.map((g: any) => ({
      term: g.term,
      abbreviation: g.abbreviation,
      category: g.category,
      definition: g.industry_glossary_translations?.[0]?.definition || '',
      example_usage: g.industry_glossary_translations?.[0]?.example_usage,
      is_preferred: g.is_preferred,
      related_terms: g.related_terms || [],
    }));
  } catch (error) {
    console.error('Error in fetchIndustryGlossary:', error);
    return [];
  }
}

// Build glossary section for system prompt
function buildGlossarySection(glossary: GlossaryTerm[]): string {
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

// Build learning context section for system prompt
function buildLearningContextSection(learningContext: LearningContext | null): string {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, brandTemplateId, contentGoal, organizationId, userId, enableTools, enableAgenticLoop, maxAgentTurns }: ChatRequest = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch brand context with extended fields + personas + products + mappings + learning context in parallel
    let brandContext: BrandContext | null = null;
    let personasContext: string[] = [];
    let productsContext: string[] = [];
    let productPersonaContext: string[] = [];
    let recentTopics: string[] = [];
    let industryMemory: IndustryMemory | null = null;
    let learningContext: LearningContext | null = null;
    let journeyMessaging: JourneyStageMessagingData[] = [];
    let sampleTexts: Record<string, string> | null = null;
    let industryGlossary: GlossaryTerm[] = [];
    let userPreferences: UserPreferencesContext | null = null;
    let sessionMemory: CrossSessionMemory | null = null;
    
    // Fetch user preferences and cross-session memory if userId is provided
    if (userId) {
      const [userPrefsResult, sessionMemoryResult] = await Promise.all([
        fetchUserPreferences(supabase, userId, brandTemplateId),
        fetchCrossSessionMemory(supabase, userId, brandTemplateId, organizationId, 10),
      ]);
      
      userPreferences = userPrefsResult;
      sessionMemory = sessionMemoryResult;
      
      if (userPreferences) {
        console.log('Loaded user preferences:', {
          tone: userPreferences.preferredTone,
          skillLevel: userPreferences.skillLevel,
          emojiFrequency: userPreferences.emojiFrequency,
          stylePatterns: userPreferences.stylePatterns.length,
          avgEditPercentage: userPreferences.avgEditPercentage,
        });
      }
      
      if (sessionMemory) {
        console.log('Loaded cross-session memory:', {
          insights: sessionMemory.insights.length,
          corrections: sessionMemory.corrections.length,
          summaries: sessionMemory.conversationSummaries.length,
          totalConversations: sessionMemory.totalConversations,
          avgMessagesPerSession: sessionMemory.avgMessagesPerSession,
        });
      }
    }
    
    if (brandTemplateId) {
      const [brandResult, personasResult, productsResult, mappingsResult, historyResult] = await Promise.all([
        supabase
          .from('brand_templates')
          .select(`
            brand_name, brand_positioning, tone_of_voice, industry, content_pillars,
            unique_value_proposition, target_age_range, target_gender, evergreen_themes,
            brand_hashtags, main_competitors, industry_template_id, sample_texts
          `)
          .eq('id', brandTemplateId)
          .single(),
        supabase
          .from('customer_personas')
          .select(`
            id, name, occupation, age_range, pain_points, desires, buying_triggers, is_primary,
            device_usage, tech_savviness, buying_motivation, communication_style, 
            typical_funnel_stage, objections, journey_map, priority_score
          `)
          .eq('brand_template_id', brandTemplateId)
          .order('priority_score', { ascending: false, nullsFirst: false })
          .order('is_primary', { ascending: false })
          .limit(5),
        supabase
          .from('brand_products')
          .select('id, name, category, description, unique_selling_points, suggested_content_angles, is_featured')
          .eq('brand_template_id', brandTemplateId)
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .limit(5),
        supabase
          .from('product_persona_mappings')
          .select('product_id, persona_id, relevance_score, is_primary_product, custom_pitch, key_benefits, preferred_content_angles')
          .eq('brand_template_id', brandTemplateId)
          .order('relevance_score', { ascending: false })
          .limit(20),
        supabase
          .from('topic_history')
          .select('topic')
          .eq('brand_template_id', brandTemplateId)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);
      
      if (brandResult.data) {
        const brand = brandResult.data;
        brandContext = {
          brandName: brand.brand_name,
          brandPositioning: brand.brand_positioning,
          toneOfVoice: brand.tone_of_voice,
          industry: brand.industry,
          contentPillars: brand.content_pillars as any,
          uniqueValueProposition: brand.unique_value_proposition,
          targetAgeRange: brand.target_age_range,
          targetGender: brand.target_gender,
          evergreenThemes: brand.evergreen_themes,
          brandHashtags: brand.brand_hashtags,
          mainCompetitors: brand.main_competitors,
          industryTemplateId: brand.industry_template_id,
        };

        // Parse sample_texts if available
        if (brand.sample_texts && typeof brand.sample_texts === 'object') {
          sampleTexts = brand.sample_texts as Record<string, string>;
          console.log('Loaded sample_texts channels:', Object.keys(sampleTexts).join(', '));
        }

        // Fetch Industry Memory and Glossary if brand has industry_template_id
        if (brand.industry_template_id) {
          const [memoryResult, glossaryResult] = await Promise.all([
            fetchIndustryMemory(supabase, brand.industry_template_id, 'vi'),
            fetchIndustryGlossary(supabase, brand.industry_template_id, 'vi', 30)
          ]);
          industryMemory = memoryResult;
          industryGlossary = glossaryResult;
          if (industryGlossary.length > 0) {
            console.log('Loaded', industryGlossary.length, 'industry glossary terms');
          }
        }

        // Fetch Learning Context in parallel
        learningContext = await fetchLearningContext(supabase, brandTemplateId, organizationId || null, 50);
        console.log('Learning context:', learningContext ? {
          topPerformers: learningContext.topPerformers?.length || 0,
          avgPerformance: learningContext.averagePerformance,
          negativeFeedback: learningContext.negativeFeedback?.length || 0,
          preferredCategories: learningContext.preferredCategories?.length || 0,
          publishedCount: learningContext.publishedCount || 0,
        } : 'No learning context');
      }

      // Build enhanced personas context
      if (personasResult.data?.length) {
        personasContext = personasResult.data.map((p: any) => {
          const parts = [
            `${p.name}${p.is_primary ? ' ⭐' : ''} (${p.occupation || 'N/A'}, ${p.age_range || 'N/A'})`,
          ];
          
          if (p.device_usage) parts.push(`📱 ${p.device_usage}`);
          if (p.tech_savviness) parts.push(`🔧 Tech: ${p.tech_savviness}`);
          if (p.typical_funnel_stage) parts.push(`📊 Stage: ${p.typical_funnel_stage.toUpperCase()}`);
          if (p.communication_style) parts.push(`💬 Style: ${p.communication_style}`);
          
          parts.push(`Pain Points: ${(p.pain_points || []).slice(0, 3).join(', ')}`);
          parts.push(`Desires: ${(p.desires || []).slice(0, 3).join(', ')}`);
          
          if (p.buying_motivation?.length) {
            parts.push(`Động lực mua: ${p.buying_motivation.slice(0, 2).join(', ')}`);
          }
          if (p.objections?.length) {
            parts.push(`Objections: ${p.objections.slice(0, 2).join(', ')}`);
          }
          
          return parts.join(' | ');
        });
        console.log('Loaded', personasResult.data.length, 'enhanced personas for chat context');
      }

      // Build products context
      if (productsResult.data?.length) {
        productsContext = productsResult.data.map((p: any) => 
          `${p.is_featured ? '⭐ ' : ''}${p.name}${p.category ? ` (${p.category})` : ''}: ${(p.suggested_content_angles || []).slice(0, 2).join(', ')}`
        );
        console.log('Loaded', productsResult.data.length, 'products for chat context');
      }

      // Build product-persona mappings context
      if (mappingsResult.data?.length && personasResult.data?.length && productsResult.data?.length) {
        const personaMap = new Map(personasResult.data.map((p: any) => [p.id, p.name]));
        const productMap = new Map(productsResult.data.map((p: any) => [p.id, p.name]));
        
        productPersonaContext = mappingsResult.data
          .filter((m: any) => personaMap.has(m.persona_id) && productMap.has(m.product_id))
          .map((m: any) => {
            const parts = [
              `${productMap.get(m.product_id)} → ${personaMap.get(m.persona_id)} (${m.relevance_score}%)`
            ];
            if (m.is_primary_product) parts[0] = '⭐ ' + parts[0];
            if (m.custom_pitch) parts.push(`Pitch: "${m.custom_pitch}"`);
            if (m.key_benefits?.length) parts.push(`Benefits: ${m.key_benefits.slice(0, 2).join(', ')}`);
            return parts.join(' | ');
          });
        console.log('Loaded', productPersonaContext.length, 'product-persona mappings');

        // Fetch journey stage messaging for all mappings
        if (mappingsResult.data?.length > 0) {
          const mappingIds = mappingsResult.data.map((m: any) => m.id).filter(Boolean);
          if (mappingIds.length > 0) {
            const { data: journeyData, error: journeyError } = await supabase
              .from('journey_stage_messaging')
              .select('mapping_id, journey_stage, headline, hook, key_message, pain_points_focus, benefits_highlight, cta_template, emotional_tone, objection_response, content_types, avoid_messages')
              .in('mapping_id', mappingIds);

            if (journeyError) {
              console.error('Error fetching journey messaging:', journeyError);
            } else if (journeyData?.length) {
              journeyMessaging = journeyData.map((j: any) => ({
                mapping_id: j.mapping_id,
                journey_stage: j.journey_stage as JourneyStage,
                headline: j.headline,
                hook: j.hook,
                key_message: j.key_message,
                pain_points_focus: j.pain_points_focus || [],
                benefits_highlight: j.benefits_highlight || [],
                cta_template: j.cta_template,
                emotional_tone: j.emotional_tone,
                objection_response: j.objection_response,
                content_types: j.content_types || [],
                avoid_messages: j.avoid_messages || [],
              }));
              console.log('Loaded', journeyMessaging.length, 'journey stage messaging records');
            }
          }
        }
      }

      if (historyResult.data) {
        recentTopics = historyResult.data.map(h => h.topic);
      }
    }

    // RAG: Search for relevant past content based on user's latest message
    let ragResults: RAGResult[] = [];
    if (organizationId && messages.length > 0) {
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (lastUserMessage) {
        ragResults = await searchRelevantContent(
          supabase,
          lastUserMessage.content,
          organizationId,
          brandTemplateId,
          5
        );
        console.log('RAG search results:', ragResults.length, 'relevant items found');
      }
    }

    // Build system prompt with extended context including Industry Memory + Learning Context + Journey Messaging + Glossary + RAG + User Preferences + Session Memory
    const systemPrompt = buildSystemPrompt(
      brandContext, 
      contentGoal, 
      recentTopics, 
      personasContext, 
      productsContext, 
      productPersonaContext,
      industryMemory,
      learningContext,
      journeyMessaging,
      sampleTexts,
      industryGlossary,
      ragResults,
      userPreferences,
      sessionMemory
    );

    // Prepare messages for AI
    const aiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    console.log('Chat-topics request:', {
      brandTemplateId,
      contentGoal,
      messageCount: messages.length,
      hasBrandContext: !!brandContext,
      hasIndustryMemory: !!industryMemory,
      industryVersion: industryMemory?.version,
      industryName: industryMemory?.name,
      forbiddenTermsCount: industryMemory?.forbidden_terms?.length || 0,
      complianceRulesCount: industryMemory?.compliance_rules?.length || 0,
      hasLearningContext: !!learningContext,
      learningTopPerformers: learningContext?.topPerformers?.length || 0,
      learningAvgPerformance: learningContext?.averagePerformance || 0,
      hasJourneyMessaging: journeyMessaging.length > 0,
      journeyMessagingCount: journeyMessaging.length,
      hasSampleTexts: !!sampleTexts,
      sampleTextsChannels: sampleTexts ? Object.keys(sampleTexts).length : 0,
      hasIndustryGlossary: industryGlossary.length > 0,
      industryGlossaryCount: industryGlossary.length,
      hasRAGContext: ragResults.length > 0,
      ragResultsCount: ragResults.length,
      hasUserPreferences: !!userPreferences,
      userPrefsSkillLevel: userPreferences?.skillLevel,
      userPrefsTone: userPreferences?.preferredTone,
      hasSessionMemory: !!sessionMemory,
      sessionMemoryInsights: sessionMemory?.insights.length || 0,
      sessionMemoryCorrections: sessionMemory?.corrections.length || 0,
      enableTools: enableTools ?? true,
    });

    // Determine if we should use tool calling and agentic loop
    const useTools = enableTools !== false;
    const useAgenticLoop = enableAgenticLoop !== false && useTools; // Agentic loop requires tools
    const maxTurns = maxAgentTurns || 5;

    // Add ReAct prompt section if using agentic loop
    const finalSystemPrompt = useAgenticLoop 
      ? systemPrompt + buildReActPromptSection()
      : systemPrompt;

    // ============ AGENTIC LOOP MODE ============
    if (useAgenticLoop) {
      console.log('[chat-topics] Using Agentic Loop mode, max turns:', maxTurns);
      
      const executionContext = {
        supabase,
        userId: userId || undefined,
        organizationId: organizationId || undefined,
        brandTemplateId: brandTemplateId || undefined,
      };

      // Create streaming response
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();
      const sseWriter = createSSEWriter(writer);

      // Start async agentic loop execution
      (async () => {
        try {
          const agentResult = await executeAgenticLoop(
            messages,
            finalSystemPrompt,
            {
              maxTurns,
              executionContext,
              onTurnStart: (turn) => {
                console.log(`[chat-topics] Turn ${turn} started`);
              },
              onTurnComplete: (turn) => {
                console.log(`[chat-topics] Turn ${turn.turn_number} complete:`, turn.observation_summary);
              },
              onToolExecuting: (toolName) => {
                console.log(`[chat-topics] Executing tool: ${toolName}`);
              },
            },
            sseWriter
          );

          // Send done signal
          await writer.write(encoder.encode('data: [DONE]\n\n'));
          
          console.log('[chat-topics] Agentic loop complete:', {
            turns: agentResult.total_turns,
            exitReason: agentResult.exit_reason,
            durationMs: agentResult.total_duration_ms,
          });
        } catch (err) {
          console.error('[chat-topics] Agentic loop error:', err);
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            data: { message: err instanceof Error ? err.message : 'Unknown error' },
          })}\n\n`;
          await writer.write(encoder.encode(errorEvent));
        } finally {
          await writer.close();
        }
      })();

      return new Response(readable, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    // ============ LEGACY SINGLE-TURN MODE ============
    console.log('[chat-topics] Using legacy single-turn mode');
    
    // Build request body - ALWAYS stream first response
    const requestBody: any = {
      model: 'google/gemini-2.5-flash',
      messages: aiMessages,
      temperature: 0.8,
      stream: true, // Always stream for faster initial response
    };

    if (useTools) {
      requestBody.tools = CHAT_TOOLS;
      requestBody.tool_choice = 'auto';
    }

    // Call Lovable AI with streaming
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse streaming response to check for tool calls
    const reader = response.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: 'No response body' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const decoder = new TextDecoder();
    let textBuffer = '';
    let contentChunks: string[] = [];
    let toolCalls: any[] = [];
    let toolCallArgBuffers: Map<number, string> = new Map();
    let finishReason: string | null = null;

    // Collect all streaming data first
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      textBuffer += decoder.decode(value, { stream: true });

      // Process line by line
      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta;
          const reason = parsed.choices?.[0]?.finish_reason;
          
          if (reason) {
            finishReason = reason;
          }

          // Collect content tokens
          if (delta?.content) {
            contentChunks.push(delta.content);
          }

          // Collect tool calls (streamed in chunks)
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const index = tc.index ?? 0;
              
              // Initialize tool call on first chunk
              if (tc.id) {
                toolCalls[index] = {
                  id: tc.id,
                  type: tc.type || 'function',
                  function: {
                    name: tc.function?.name || '',
                    arguments: '',
                  },
                };
                toolCallArgBuffers.set(index, '');
              }
              
              // Append function name if present
              if (tc.function?.name && toolCalls[index]) {
                toolCalls[index].function.name = tc.function.name;
              }
              
              // Append argument chunks
              if (tc.function?.arguments) {
                const currentArgs = toolCallArgBuffers.get(index) || '';
                toolCallArgBuffers.set(index, currentArgs + tc.function.arguments);
              }
            }
          }
        } catch {
          // Incomplete JSON, skip
        }
      }
    }

    // Finalize tool call arguments
    for (const [index, args] of toolCallArgBuffers.entries()) {
      if (toolCalls[index]) {
        toolCalls[index].function.arguments = args;
      }
    }

    // Filter out empty/invalid tool calls
    toolCalls = toolCalls.filter(tc => tc && tc.id && tc.function?.name);

    const fullContent = contentChunks.join('');

    console.log('Streaming complete:', {
      contentLength: fullContent.length,
      toolCallsCount: toolCalls.length,
      finishReason,
    });

    // Check if AI wants to call tools
    if (toolCalls.length > 0 && useTools) {
      console.log('AI requested tool calls:', toolCalls.length, toolCalls.map(tc => tc.function.name));
      
      const executionContext = {
        supabase,
        userId: userId || undefined,
        organizationId: organizationId || undefined,
        brandTemplateId: brandTemplateId || undefined,
      };

      // Detect if this is a multi-step chain (tools depend on each other)
      const { isChain, dependencyGraph } = detectToolChainDependencies(toolCalls);
      
      let toolResults: ToolCallResult[] = [];
      let chainResult: ToolChainResult | null = null;
      let chainSummary: { summary: string; outputs: Record<string, any> } | null = null;

      if (isChain) {
        // Execute as a chain - tools run in sequence, outputs feed into subsequent tools
        console.log('Detected tool chain with dependencies:', 
          Array.from(dependencyGraph.entries()).map(([to, from]) => 
            `${toolCalls[to].function.name} depends on ${from.map(i => toolCalls[i].function.name).join(', ')}`
          )
        );

        chainResult = await executeToolChain(toolCalls, executionContext, {
          stopOnError: false, // Continue even if a step fails
          maxRetries: 1,
        });

        toolResults = chainResult.final_results;
        chainSummary = summarizeToolChain(chainResult);
        
        console.log('Chain execution complete:', chainSummary.summary);
      } else {
        // Execute tools in parallel (no dependencies)
        console.log('Executing tools in parallel (no dependencies detected)');
        
        const toolPromises = toolCalls.map(async (toolCall) => {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            return await executeToolCall(toolCall.function.name, args, executionContext);
          } catch (err) {
            console.error(`Tool ${toolCall.function.name} parse error:`, err);
            return {
              success: false,
              tool_name: toolCall.function.name,
              result: null,
              error: 'Failed to parse tool arguments',
            };
          }
        });

        toolResults = await Promise.all(toolPromises);
      }

      // Log results
      toolResults.forEach((result, idx) => {
        console.log(`Tool ${toolCalls[idx].function.name} result:`, result.success);
      });

      // Build tool results messages for AI (one per tool call for proper OpenAI format)
      const toolResultsMessages = toolCalls.map((tc, idx) => {
        const baseResult = toolResults[idx] || { error: 'No result' };
        // Add chain context if available
        const enrichedResult = chainResult ? {
          ...baseResult,
          chain_step: idx + 1,
          total_steps: toolCalls.length,
          chain_context: chainResult.chain_context,
        } : baseResult;
        
        return {
          role: 'tool' as const,
          content: JSON.stringify(enrichedResult),
          tool_call_id: tc.id,
        };
      });

      // Build the assistant message that triggered tool calls
      const assistantMessage = {
        role: 'assistant' as const,
        content: fullContent || null,
        tool_calls: toolCalls,
      };

      // Call AI again with tool results - STREAM the follow-up response!
      const followUpMessages = [
        ...aiMessages,
        assistantMessage,
        ...toolResultsMessages,
      ];

      // Add chain context as system message for AI awareness
      if (chainResult && chainSummary) {
        followUpMessages.push({
          role: 'system' as const,
          content: `Multi-step tool chain completed. ${chainSummary.summary}. 
Available outputs from chain: ${Object.keys(chainSummary.outputs).join(', ')}.
Summarize results for user and suggest next actions.`,
        });
      }

      console.log('Calling follow-up with tool results, streaming response...');

      const followUpResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: followUpMessages,
          temperature: 0.8,
          stream: true, // Stream the follow-up too!
        }),
      });

      if (!followUpResponse.ok) {
        console.error('Follow-up AI error:', followUpResponse.status);
        // Return tool results with whatever content we have
        return new Response(JSON.stringify({
          type: 'tool_results',
          content: fullContent,
          tool_calls: toolCalls,
          tool_results: toolResults,
          chain_result: chainResult ? {
            total_duration_ms: chainResult.total_duration_ms,
            has_errors: chainResult.has_errors,
            chain_context: chainResult.chain_context,
          } : undefined,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create a TransformStream to inject tool_results header then stream content
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      // Start async processing
      (async () => {
        try {
          // First, send tool results as a special SSE event
          const toolResultsEvent = `data: ${JSON.stringify({
            type: 'tool_results',
            tool_calls: toolCalls,
            tool_results: toolResults,
            is_chain: isChain,
            chain_result: chainResult ? {
              total_duration_ms: chainResult.total_duration_ms,
              has_errors: chainResult.has_errors,
              chain_context: chainResult.chain_context,
              summary: chainSummary?.summary,
            } : undefined,
          })}\n\n`;
          await writer.write(encoder.encode(toolResultsEvent));

          // Then stream the follow-up response
          const followUpReader = followUpResponse.body?.getReader();
          if (followUpReader) {
            while (true) {
              const { done, value } = await followUpReader.read();
              if (done) break;
              await writer.write(value);
            }
          }
        } catch (err) {
          console.error('Streaming error:', err);
        } finally {
          await writer.close();
        }
      })();

      return new Response(readable, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    // No tool calls - return streamed content as regular message
    // Re-stream the content we collected for consistent frontend handling
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        // Send content as SSE chunks
        const chunkSize = 20; // characters per chunk for smooth streaming effect
        for (let i = 0; i < fullContent.length; i += chunkSize) {
          const chunk = fullContent.slice(i, i + chunkSize);
          const sseEvent = `data: ${JSON.stringify({
            choices: [{
              delta: { content: chunk },
              index: 0,
            }],
          })}\n\n`;
          await writer.write(encoder.encode(sseEvent));
        }
        await writer.write(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        console.error('Re-streaming error:', err);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

    // Return streaming response (legacy mode)
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Chat-topics error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildSystemPrompt(
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
  const goalLabels: Record<string, string> = {
    engagement: 'Tăng tương tác',
    awareness: 'Nâng cao nhận diện thương hiệu',
    conversion: 'Chuyển đổi / Bán hàng',
    education: 'Giáo dục khách hàng',
    expertise: 'Thể hiện chuyên môn',
  };

  const safeIndustryMemory = industryMemory ?? null;
  const safeLearningContext = learningContext ?? null;
  const safeGlossary = industryGlossary ?? [];
  const safeRagResults = ragResults ?? [];
  const safeUserPrefs = userPreferences ?? null;
  const safeSessionMemory = sessionMemory ?? null;
  
  let prompt = `Bạn là AI trợ lý gợi ý ý tưởng content marketing chuyên nghiệp, thân thiện và sáng tạo.

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
