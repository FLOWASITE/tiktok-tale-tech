import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  buildCoTSection, 
  buildFewShotExamples, 
  buildLearningSection,
  buildSelfCorrectionRules,
  type LearningContext,
  type MergedRules
} from "../_shared/prompt-utils.ts";
import { fetchLearningContext, logPromptAnalytics } from "../_shared/learning-context.ts";
import {
  buildContentMatrixSection,
  buildDiversityCheckSection,
  buildPersonaSection,
  buildFrameworkSection,
  buildEnhancedScoringGuidance,
  type CustomerPersonaContext,
  type TopicType,
  type FunnelStage,
  type EmotionalTone,
} from "../_shared/marketing-frameworks.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface ContentPillar {
  name: string;
  weight: number;
  keywords: string[];
  color?: string;
}

interface TopicGenerationInput {
  mode?: 'suggest' | 'refine';
  rawTopic?: string;
  industry?: string;
  contentGoal?: string;
  brandTemplateId?: string;
  organizationId?: string;
  format?: 'carousel' | 'script' | 'multichannel' | 'all';
  recentTopics?: string[];
  seasonality?: 'holiday' | 'event' | 'normal';
  videoType?: string;
}

interface RefinedTopic {
  topic: string;
  angle: string;
  hook: string;
}

interface BrandContext {
  brandName: string;
  brandPositioning?: string;
  toneOfVoice?: string[];
  preferredWords?: string[];
  forbiddenWords?: string[];
  industry?: string[];
  formality?: string;
  languageStyle?: string[];
  allowEmoji?: boolean;
  contentPillars?: ContentPillar[];
}

interface IndustryContext {
  targetAudience?: string;
  forbiddenTerms?: string[];
  complianceRules?: { rule: string; description: string }[];
  brandVoice?: {
    tone?: string[];
    formality?: string;
    language_style?: string[];
  };
  seasonalEvents?: SeasonalEvent[];
}

// Seasonal event structure for industry-specific calendar
interface SeasonalEvent {
  event: string;
  date: string; // Format: DD/MM
  suggestedAngles: string[];
}

interface TopicScores {
  brandFit: number;
  trend: number;
  competition: number;
  engagement: number;
}

interface EnhancedTopicSuggestion {
  topic: string;
  category: 'evergreen' | 'trending' | 'seasonal' | 'reactive';
  pillar?: string;
  reasoning: string;
  formats: string[];
  relatedKeywords: string[];
  bestTimeToPost?: string;
  scores: TopicScores;
  estimatedEngagement: 'high' | 'medium' | 'low';
  // Content Matrix fields
  topicType: TopicType;
  funnelStage: FunnelStage;
  emotionalTone: EmotionalTone;
  // Seasonal fields
  relatedEvent?: string;
  eventDate?: string;
}

// Persona context for fetching
interface PersonaData {
  name: string;
  occupation?: string;
  pain_points?: string[];
  desires?: string[];
  objections?: string[];
  buying_triggers?: string[];
  preferred_channels?: string[];
  typical_funnel_stage?: string;
  is_primary?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const input: TopicGenerationInput = await req.json();
    const { mode, rawTopic, industry, contentGoal, brandTemplateId, organizationId, format, recentTopics, seasonality, videoType } = input;

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle refine mode
    if (mode === 'refine' && rawTopic) {
      console.log('Refine mode: processing raw topic:', rawTopic.substring(0, 50));
      return await handleRefineMode(rawTopic, videoType, brandTemplateId, supabase);
    }

    // Build cache key with extended parameters - include organizationId for isolation
    const cacheKey = `topic-suggestions-v4:${organizationId || 'global'}:${industry || 'general'}:${contentGoal || 'education'}:${brandTemplateId || 'none'}:${format || 'all'}`;
    
    // Check cache first
    const { data: cached } = await supabase
      .from('ai_response_cache')
      .select('response_data, expires_at')
      .eq('cache_key', cacheKey)
      .single();

    if (cached && new Date(cached.expires_at) > new Date()) {
      console.log('Cache hit for topic suggestions v4');
      await supabase.rpc('increment_cache_hit', { p_cache_key: cacheKey });
      
      return new Response(JSON.stringify({
        suggestions: cached.response_data,
        source: 'cache'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch brand context, industry context, and learning context IN PARALLEL
    let brandContext: BrandContext | null = null;
    let industryContext: IndustryContext | null = null;
    let learningContext: LearningContext | null = null;

    if (brandTemplateId) {
      console.log('Fetching brand template:', brandTemplateId);
      
      // First fetch brand template to get industry_template_id
      const { data: brandTemplate, error: brandError } = await supabase
        .from('brand_templates')
        .select(`
          brand_name,
          brand_positioning,
          tone_of_voice,
          preferred_words,
          forbidden_words,
          industry,
          formality_level,
          language_style,
          allow_emoji,
          content_pillars,
          industry_template_id
        `)
        .eq('id', brandTemplateId)
        .single();

      if (brandTemplate && !brandError) {
        brandContext = {
          brandName: brandTemplate.brand_name,
          brandPositioning: brandTemplate.brand_positioning,
          toneOfVoice: brandTemplate.tone_of_voice,
          preferredWords: brandTemplate.preferred_words,
          forbiddenWords: brandTemplate.forbidden_words,
          industry: brandTemplate.industry,
          formality: brandTemplate.formality_level,
          languageStyle: brandTemplate.language_style,
          allowEmoji: brandTemplate.allow_emoji,
          contentPillars: brandTemplate.content_pillars as ContentPillar[] || [],
        };

        console.log('Brand context loaded:', brandContext.brandName, 'Pillars:', brandContext.contentPillars?.length || 0);

        // PARALLEL: Fetch industry context and learning context simultaneously
        const learningPromise = fetchLearningContext(supabase, brandTemplateId, null);
        
        let industryPromise: Promise<any> | null = null;
        if (brandTemplate.industry_template_id) {
          console.log('Fetching industry memory:', brandTemplate.industry_template_id);
          industryPromise = (async () => {
            return await supabase
              .from('industry_templates')
              .select(`
                target_audience,
                forbidden_terms,
                compliance_rules,
                brand_voice,
                seasonal_events
              `)
              .eq('id', brandTemplate.industry_template_id)
              .single();
          })();
        }

        // Execute in parallel - saves ~200-300ms
        const [learningResult, industryResult] = await Promise.all([
          learningPromise,
          industryPromise
        ]);

        
        // Process learning context
        learningContext = learningResult;
        if (learningContext) {
          console.log('Learning context loaded:', learningContext.totalTopicsUsed, 'topics,', learningContext.topPerformers.length, 'top performers');
        } else {
          console.log('No topic history found for learning context');
        }

        if (industryResult) {
          const { data: industryTemplate, error: industryError } = industryResult;
          if (industryTemplate && !industryError) {
            industryContext = {
              targetAudience: industryTemplate.target_audience,
              forbiddenTerms: industryTemplate.forbidden_terms,
              complianceRules: industryTemplate.compliance_rules as { rule: string; description: string }[],
              brandVoice: industryTemplate.brand_voice as IndustryContext['brandVoice'],
              seasonalEvents: industryTemplate.seasonal_events as SeasonalEvent[] || [],
            };
            console.log('Industry context loaded, target audience:', industryContext.targetAudience, 'seasonal events:', industryContext.seasonalEvents?.length || 0);
          }
        }
      }
    }

    // Build the enhanced prompt with advanced techniques
    const prompt = buildEnhancedPrompt({
      industry: brandContext?.industry?.[0] || industry,
      contentGoal,
      brandContext,
      industryContext,
      format,
      recentTopics: recentTopics || learningContext?.recentTopics || [],
      seasonality,
      learningContext,
    });

    console.log('Generating enhanced topic suggestions with scores...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429 || response.status === 402) {
        return new Response(JSON.stringify({ 
          error: response.status === 429 
            ? 'Rate limit exceeded. Please try again later.'
            : 'Payment required. Please add credits.',
          suggestions: getDefaultSuggestions(contentGoal),
          source: 'fallback'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse enhanced JSON response
    let suggestions: EnhancedTopicSuggestion[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Validate and ensure all fields exist
        suggestions = parsed.map((item: any) => ({
          topic: item.topic || '',
          category: item.category || 'evergreen',
          pillar: item.pillar || undefined,
          reasoning: item.reasoning || '',
          formats: item.formats || ['multichannel'],
          relatedKeywords: item.relatedKeywords || [],
          bestTimeToPost: item.bestTimeToPost || undefined,
          scores: {
            brandFit: Math.min(100, Math.max(0, item.scores?.brandFit || 50)),
            trend: Math.min(100, Math.max(0, item.scores?.trend || 50)),
            competition: Math.min(100, Math.max(0, item.scores?.competition || 50)),
            engagement: Math.min(100, Math.max(0, item.scores?.engagement || 50)),
          },
          estimatedEngagement: item.estimatedEngagement || 'medium',
          // Content Matrix fields
          topicType: item.topicType || 'solution',
          funnelStage: item.funnelStage || 'tofu',
          emotionalTone: item.emotionalTone || 'educate',
        }));
      }
    } catch (parseError) {
      console.error('Failed to parse suggestions:', parseError);
      suggestions = getDefaultSuggestions(contentGoal);
    }

    if (suggestions.length === 0) {
      suggestions = getDefaultSuggestions(contentGoal);
    }

    // Cache the result for 12 hours (shorter for personalized content)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (brandTemplateId ? 12 : 24));

    await supabase.from('ai_response_cache').upsert({
      cache_key: cacheKey,
      function_name: 'generate-topic-suggestions',
      input_hash: cacheKey,
      response_data: suggestions,
      cache_scope: organizationId ? 'org' : 'global',
      organization_id: organizationId || null,
      brand_template_id: brandTemplateId || null,
      expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'cache_key'
    });

    console.log('Generated and cached', suggestions.length, 'enhanced suggestions with scores');

    // Log prompt analytics
    const executionTime = Date.now() - startTime;
    const contextRichnessScore = calculateContextRichness(brandContext, industryContext);
    const learningDataScore = learningContext ? Math.min(100, learningContext.totalTopicsUsed * 5 + learningContext.topPerformers.length * 10) : 0;
    
    await logPromptAnalytics(supabase, {
      functionName: 'generate-topic-suggestions',
      brandTemplateId: brandTemplateId || undefined,
      organizationId: organizationId || undefined,
      contextRichnessScore,
      learningDataScore,
      executionTimeMs: executionTime,
      modelUsed: 'google/gemini-2.5-flash',
    });

    return new Response(JSON.stringify({
      suggestions,
      source: 'ai',
      brandContextUsed: !!brandContext,
      industryContextUsed: !!industryContext,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating topic suggestions:', error);
    
    let contentGoal = 'education';
    try {
      const body = await req.clone().json();
      contentGoal = body.contentGoal || 'education';
    } catch {}
    
    return new Response(JSON.stringify({
      suggestions: getDefaultSuggestions(contentGoal),
      source: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Handle refine mode - generates 3 improved versions of a raw topic
async function handleRefineMode(
  rawTopic: string,
  videoType: string | undefined,
  brandTemplateId: string | undefined,
  supabase: any
): Promise<Response> {
  try {
    // Fetch brand context for better refinement
    let brandContext = '';
    if (brandTemplateId) {
      const { data: brandTemplate } = await supabase
        .from('brand_templates')
        .select('brand_name, brand_positioning, tone_of_voice, industry')
        .eq('id', brandTemplateId)
        .single();
      
      if (brandTemplate) {
        brandContext = `
Brand: ${brandTemplate.brand_name}
${brandTemplate.brand_positioning ? `Định vị: ${brandTemplate.brand_positioning}` : ''}
${brandTemplate.tone_of_voice?.length ? `Tone: ${brandTemplate.tone_of_voice.join(', ')}` : ''}
${brandTemplate.industry?.length ? `Ngành: ${brandTemplate.industry.join(', ')}` : ''}`;
      }
    }

    const videoTypeLabel = videoType === 'expert_share' ? 'chia sẻ chuyên gia' :
                          videoType === 'analyze_explain' ? 'phân tích giải thích' :
                          videoType === 'warning_mistake' ? 'cảnh báo sai lầm' :
                          videoType === 'quick_qa' ? 'hỏi đáp nhanh' : 'video marketing';

    const prompt = `Bạn là Content Strategist chuyên nghiệp. Người dùng đã nhập một ý tưởng chủ đề thô và cần bạn cải thiện thành 3 phiên bản hay hơn, cụ thể hơn, hấp dẫn hơn.

Chủ đề thô: "${rawTopic}"
Thể loại video: ${videoTypeLabel}
${brandContext}

Yêu cầu cho mỗi phiên bản cải thiện:
1. Cụ thể hóa: Thêm số liệu, con số, hoặc phạm vi rõ ràng
2. Hấp dẫn: Sử dụng pattern như "X điều...", "Bí quyết...", "Tại sao...", "Sai lầm..."
3. Đa dạng góc tiếp cận: Mỗi phiên bản có góc nhìn khác nhau
4. Phù hợp với thể loại video và brand (nếu có)

Trả về CHÍNH XÁC JSON array với 3 items:
[
  {
    "topic": "Tiêu đề chủ đề cải thiện (15-50 từ)",
    "angle": "Góc tiếp cận (ví dụ: practical, controversial, educational, storytelling)",
    "hook": "1 câu ngắn giải thích tại sao phiên bản này hay hơn bản gốc"
  }
]

CHỈ TRẢ VỀ JSON, KHÔNG GIẢI THÍCH THÊM.`;

    // Use lighter model for refine mode - faster response
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite', // Lighter model for simple refinement task
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI gateway error in refine mode:', response.status);
      return new Response(JSON.stringify({ 
        refinedTopics: [],
        error: 'AI error'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    let refinedTopics: RefinedTopic[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        refinedTopics = JSON.parse(jsonMatch[0]).map((item: any) => ({
          topic: item.topic || '',
          angle: item.angle || 'general',
          hook: item.hook || '',
        }));
      }
    } catch (parseError) {
      console.error('Failed to parse refined topics:', parseError);
    }

    console.log('Generated', refinedTopics.length, 'refined topics');

    return new Response(JSON.stringify({
      refinedTopics,
      source: 'ai',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in refine mode:', error);
    return new Response(JSON.stringify({
      refinedTopics: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Helper to calculate context richness score
function calculateContextRichness(brand: BrandContext | null, industry: IndustryContext | null): number {
  let score = 0;
  if (brand) {
    score += brand.brandName ? 15 : 0;
    score += brand.brandPositioning ? 15 : 0;
    score += (brand.toneOfVoice?.length || 0) > 0 ? 15 : 0;
    score += (brand.contentPillars?.length || 0) > 0 ? 20 : 0;
    score += (brand.preferredWords?.length || 0) > 0 ? 5 : 0;
    score += (brand.forbiddenWords?.length || 0) > 0 ? 5 : 0;
  }
  if (industry) {
    score += industry.targetAudience ? 10 : 0;
    score += (industry.forbiddenTerms?.length || 0) > 0 ? 10 : 0;
    score += (industry.complianceRules?.length || 0) > 0 ? 5 : 0;
  }
  return Math.min(100, score);
}

function buildEnhancedPrompt(params: {
  industry?: string;
  contentGoal?: string;
  brandContext: BrandContext | null;
  industryContext: IndustryContext | null;
  format?: string;
  recentTopics?: string[];
  seasonality?: string;
  learningContext?: LearningContext | null;
}): { system: string; user: string } {
  const { industry, contentGoal, brandContext, industryContext, format, recentTopics, seasonality, learningContext } = params;

  const goalLabels: Record<string, string> = {
    education: 'giáo dục, chia sẻ kiến thức chuyên môn',
    awareness: 'tăng nhận diện thương hiệu, xây dựng brand presence',
    engagement: 'tăng tương tác, tạo conversation với khách hàng',
    expertise: 'xây dựng hình ảnh chuyên gia, thought leadership',
    conversion: 'thúc đẩy chuyển đổi, bán hàng, lead generation',
  };

  const formatLabels: Record<string, string> = {
    carousel: 'carousel slides (visual, educational)',
    script: 'video script (engaging, storytelling)',
    multichannel: 'multi-channel posts (adaptable across platforms)',
    all: 'đa dạng formats',
  };

  // Build brand section
  let brandSection = '';
  if (brandContext) {
    brandSection = `
## BRAND CONTEXT:
- Tên thương hiệu: ${brandContext.brandName}
${brandContext.brandPositioning ? `- Định vị: ${brandContext.brandPositioning}` : ''}
${brandContext.toneOfVoice?.length ? `- Tone of Voice: ${brandContext.toneOfVoice.join(', ')}` : ''}
${brandContext.formality ? `- Mức độ formal: ${brandContext.formality}` : ''}
${brandContext.languageStyle?.length ? `- Phong cách ngôn ngữ: ${brandContext.languageStyle.join(', ')}` : ''}
${brandContext.preferredWords?.length ? `- Từ khóa ưu tiên sử dụng: ${brandContext.preferredWords.join(', ')}` : ''}
${brandContext.forbiddenWords?.length ? `- Từ KHÔNG được sử dụng: ${brandContext.forbiddenWords.join(', ')}` : ''}
${brandContext.allowEmoji !== undefined ? `- Cho phép emoji: ${brandContext.allowEmoji ? 'Có' : 'Không'}` : ''}`;
  }

  // Build content pillars section
  let pillarsSection = '';
  if (brandContext?.contentPillars?.length) {
    pillarsSection = `
## CONTENT PILLARS (phân bổ nội dung theo %):
${brandContext.contentPillars.map(p => `- ${p.name}: ${p.weight}% - Keywords: ${p.keywords.join(', ')}`).join('\n')}

Quan trọng: Mỗi chủ đề PHẢI được gán vào 1 content pillar phù hợp nhất trong "pillar" field.`;
  }

  // Build industry section
  let industrySection = '';
  if (industryContext) {
    industrySection = `
## INDUSTRY COMPLIANCE:
${industryContext.targetAudience ? `- Đối tượng mục tiêu: ${industryContext.targetAudience}` : ''}
${industryContext.forbiddenTerms?.length ? `- Thuật ngữ CẤM sử dụng (compliance): ${industryContext.forbiddenTerms.slice(0, 10).join(', ')}` : ''}
${industryContext.complianceRules?.length ? `- Quy tắc tuân thủ: ${industryContext.complianceRules.slice(0, 3).map(r => r.rule).join('; ')}` : ''}
${industryContext.brandVoice?.tone?.length ? `- Industry tone baseline: ${industryContext.brandVoice.tone.join(', ')}` : ''}`;
  }

  // Build constraints section
  let constraintsSection = '';
  if (recentTopics?.length) {
    constraintsSection = `
## CONSTRAINTS:
- KHÔNG gợi ý các chủ đề tương tự với: ${recentTopics.slice(0, 5).join('; ')}
- Tránh lặp lại góc nhìn hoặc format đã dùng gần đây`;
  }

  // Build Seasonal Calendar section with upcoming events
  let seasonalCalendarSection = '';
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  
  // General seasonal hints
  let seasonalityHint = '';
  if (seasonality === 'holiday') {
    seasonalityHint = '\n- Ưu tiên chủ đề liên quan đến mùa lễ hội, Tết, khuyến mãi cuối năm';
  } else if (seasonality === 'event') {
    seasonalityHint = '\n- Ưu tiên chủ đề reactive với sự kiện/tin tức nóng trong ngành';
  }
  
  // Industry-specific seasonal events
  if (industryContext?.seasonalEvents?.length) {
    const upcomingEvents = getUpcomingEvents(industryContext.seasonalEvents, currentDay, currentMonth, 14);
    
    if (upcomingEvents.length > 0) {
      seasonalCalendarSection = `
## 📅 SEASONAL CALENDAR AWARENESS:
Ngày hiện tại: ${String(currentDay).padStart(2, '0')}/${String(currentMonth).padStart(2, '0')}

### Sự kiện sắp diễn ra trong 2 tuần tới:
${upcomingEvents.map(e => `- **${e.event}** (${e.date}): Suggested angles: ${e.suggestedAngles.slice(0, 3).join(', ')}`).join('\n')}

### YÊU CẦU SEASONAL:
- Ưu tiên gợi ý 2-3 topics liên quan đến các sự kiện sắp tới
- Topics seasonal phải có category = "seasonal" hoặc "reactive"
- Gắn field "relatedEvent" và "eventDate" cho topics liên quan đến sự kiện
- Sử dụng suggested angles làm inspiration cho góc tiếp cận`;
    }
  }
  
  // General seasonal events (common for all industries)
  const generalSeasonalEvents = getGeneralSeasonalEvents(currentDay, currentMonth);
  if (generalSeasonalEvents.length > 0 && !seasonalCalendarSection) {
    seasonalCalendarSection = `
## 📅 SEASONAL AWARENESS:
Ngày hiện tại: ${String(currentDay).padStart(2, '0')}/${String(currentMonth).padStart(2, '0')}

### Sự kiện chung sắp diễn ra:
${generalSeasonalEvents.map(e => `- **${e.event}** (${e.date})`).join('\n')}

Ưu tiên 1-2 topics có thể liên quan đến các sự kiện này nếu phù hợp với brand.`;
  }

  // Build Chain-of-Thought section
  const cotSection = buildCoTSection('topic-suggestions');

  // Build Learning section if available
  const learningSection = learningContext ? buildLearningSection(learningContext) : '';

  // Build Few-Shot examples if available
  const fewShotSection = learningContext ? buildFewShotExamples(learningContext, 'topic-suggestions', 3) : '';

  // Build Self-Correction rules
  const selfCorrectionSection = buildSelfCorrectionRules('topic-suggestions');

  // Build Content Matrix section
  const contentMatrixSection = buildContentMatrixSection();
  const diversityCheckSection = buildDiversityCheckSection();

  const systemPrompt = `Bạn là Content Strategist chuyên nghiệp với 10+ năm kinh nghiệm trong content marketing tại Việt Nam.

Nhiệm vụ: Gợi ý các chủ đề content có chiến lược, phù hợp với brand và mục tiêu kinh doanh.
${brandSection}
${pillarsSection}
${industrySection}
${constraintsSection}
${seasonalityHint}
${seasonalCalendarSection}
${contentMatrixSection}
${cotSection}
${learningSection}
${fewShotSection}
${selfCorrectionSection}
${diversityCheckSection}

## OUTPUT FORMAT:
Trả về CHÍNH XÁC JSON array với mỗi item có cấu trúc sau:
[
  {
    "topic": "Tiêu đề chủ đề chi tiết (15-50 từ)",
    "category": "evergreen" | "trending" | "seasonal" | "reactive",
    "pillar": "Tên content pillar phù hợp nhất (nếu có pillars được định nghĩa)",
    "reasoning": "Lý do ngắn gọn tại sao chủ đề này phù hợp với brand (1-2 câu)",
    "formats": ["carousel", "script", "multichannel"],
    "relatedKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
    "bestTimeToPost": "HH:MM - HH:MM",
    "scores": {
      "brandFit": 0-100,
      "trend": 0-100,
      "competition": 0-100,
      "engagement": 0-100
    },
    "estimatedEngagement": "high" | "medium" | "low",
    "topicType": "problem" | "solution" | "story" | "data",
    "funnelStage": "tofu" | "mofu" | "bofu",
    "emotionalTone": "inspire" | "educate" | "entertain" | "convince",
    "relatedEvent": "(optional) Tên sự kiện liên quan nếu là seasonal/reactive topic",
    "eventDate": "(optional) Ngày sự kiện DD/MM"
  }
]

## SCORING GUIDELINES:
- **brandFit (0-100)**: Mức độ phù hợp với brand positioning, tone of voice, và ngành nghề. 90+ = hoàn toàn phù hợp, 70-89 = khá phù hợp, <70 = cần điều chỉnh.
- **trend (0-100)**: Mức độ trending hiện tại. 90+ = đang hot, 70-89 = có tiềm năng, 50-69 = ổn định, <50 = không trending.
- **competition (0-100)**: Đánh giá độ cạnh tranh (điểm CAO = ÍT cạnh tranh = TỐT). Áp dụng Competition Score Heuristics:
  - Base score: 60 (trung bình)
  - Topic có số liệu/data cụ thể → +10 điểm
  - Topic có góc nhìn contrarian/ngược dòng → +15 điểm
  - Topic mention persona-specific pain point → +10 điểm
  - Ví dụ: Topic "Tại sao 73% startup thất bại vì XYZ (và cách tránh)" = 60 + 10 (data) + 15 (contrarian) = 85
- **engagement (0-100)**: Tiềm năng tương tác dựa trên hook, format, sharability. 90+ = viral potential, 70-89 = tương tác cao, <70 = trung bình.

## UNIQUE ANGLE REQUIREMENTS:
- Mỗi topic PHẢI có góc nhìn độc đáo, không generic
- Tránh các angles phổ biến như "X điều bạn cần biết" nếu không có twist độc đáo
- Ưu tiên các unique angle types:
  1. **Contrarian takes**: Đi ngược quan điểm phổ biến, challenge status quo (VD: "Tại sao ABC thực ra KHÔNG hiệu quả")
  2. **Insider knowledge**: Thông tin chỉ người trong ngành mới biết, behind-the-scenes (VD: "Những gì agency không nói với bạn về...")
  3. **Data-backed**: Dựa trên số liệu, nghiên cứu cụ thể (VD: "Phân tích 500 case: Công thức tăng ROI 40%")
  4. **Personal story**: Kinh nghiệm thực tế, bài học từ thất bại/thành công (VD: "Tôi đã mất 200 triệu để học được...")
  5. **Curated synthesis**: Tổng hợp từ nhiều nguồn thành insight mới (VD: "3 patterns từ 10 brands thành công nhất 2024")
- KHÔNG chấp nhận: Tiêu đề generic như "Cách làm X hiệu quả", "X bước để thành công" mà không có góc nhìn độc đáo

## STRATEGIC BALANCE REQUIREMENTS:
- **Funnel Balance**: ~40% TOFU, ~35% MOFU, ~25% BOFU
- **Topic Types**: Mix problem/solution/story/data (ít nhất 2 types khác nhau)
- **Emotional Tones**: Mix educate/inspire/convince/entertain (không quá 50% cùng tone)

## GUIDELINES:
- Mỗi chủ đề phải CỤ THỂ và ACTIONABLE, không chung chung
- Đảm bảo phù hợp với tone of voice và positioning của brand
- Cân bằng: 40% evergreen, 30% trending, 20% seasonal, 10% reactive
- Mỗi chủ đề phải có góc nhìn độc đáo, không generic
- Ưu tiên chủ đề có potential viral hoặc shareable cao
- Gán pillar CHÍNH XÁC theo keywords của từng pillar`;

  const userPrompt = `Hãy gợi ý 8-10 chủ đề content với ĐIỂM SỐ CHI TIẾT và CONTENT MATRIX cho:

- Ngành: ${brandContext?.industry?.[0] || industry || 'kinh doanh nói chung'}
- Mục tiêu content: ${goalLabels[contentGoal || 'education'] || goalLabels.education}
- Format ưu tiên: ${formatLabels[format || 'all'] || formatLabels.all}
${brandContext ? `- Brand: ${brandContext.brandName}` : ''}
${industryContext?.targetAudience ? `- Target: ${industryContext.targetAudience}` : ''}
${brandContext?.contentPillars?.length ? `- Content Pillars: ${brandContext.contentPillars.map(p => p.name).join(', ')}` : ''}

Trả về JSON array theo format đã định nghĩa. ĐẢM BẢO mỗi topic có đầy đủ: scores object, topicType, funnelStage, emotionalTone.
ĐẢM BẢO diversity: có topics cho cả TOFU/MOFU/BOFU và mix các topic types.`;

  return { system: systemPrompt, user: userPrompt };
}

function getDefaultSuggestions(contentGoal?: string): EnhancedTopicSuggestion[] {
  const defaultsByGoal: Record<string, EnhancedTopicSuggestion[]> = {
    education: [
      {
        topic: 'Hướng dẫn từng bước cho người mới bắt đầu',
        category: 'evergreen',
        reasoning: 'Nội dung hướng dẫn luôn có giá trị lâu dài và được tìm kiếm nhiều',
        formats: ['carousel', 'script', 'multichannel'],
        relatedKeywords: ['hướng dẫn', 'bắt đầu', 'cơ bản', 'tutorial'],
        bestTimeToPost: '9:00 - 11:00',
        scores: { brandFit: 80, trend: 65, competition: 75, engagement: 80 },
        estimatedEngagement: 'high',
        topicType: 'solution',
        funnelStage: 'tofu',
        emotionalTone: 'educate',
      },
      {
        topic: '5 sai lầm phổ biến và cách tránh',
        category: 'evergreen',
        reasoning: 'Người dùng luôn muốn tránh sai lầm, dễ gây tương tác và chia sẻ',
        formats: ['carousel', 'multichannel'],
        relatedKeywords: ['sai lầm', 'tránh', 'kinh nghiệm', 'bài học'],
        bestTimeToPost: '12:00 - 14:00',
        scores: { brandFit: 75, trend: 70, competition: 65, engagement: 85 },
        estimatedEngagement: 'high',
        topicType: 'problem',
        funnelStage: 'tofu',
        emotionalTone: 'educate',
      },
      {
        topic: 'Checklist hoàn chỉnh cho năm 2025',
        category: 'seasonal',
        reasoning: 'Checklist dễ lưu và chia sẻ, phù hợp đầu năm mới',
        formats: ['carousel', 'multichannel'],
        relatedKeywords: ['checklist', '2025', 'kế hoạch', 'mục tiêu'],
        bestTimeToPost: '8:00 - 10:00',
        scores: { brandFit: 70, trend: 80, competition: 60, engagement: 70 },
        estimatedEngagement: 'medium',
        topicType: 'solution',
        funnelStage: 'mofu',
        emotionalTone: 'educate',
      },
    ],
    awareness: [
      {
        topic: 'Câu chuyện đằng sau thương hiệu',
        category: 'evergreen',
        reasoning: 'Storytelling tạo kết nối cảm xúc mạnh với khách hàng',
        formats: ['script', 'multichannel'],
        relatedKeywords: ['câu chuyện', 'brand story', 'khởi nghiệp', 'hành trình'],
        bestTimeToPost: '19:00 - 21:00',
        scores: { brandFit: 95, trend: 60, competition: 80, engagement: 85 },
        estimatedEngagement: 'high',
        topicType: 'story',
        funnelStage: 'tofu',
        emotionalTone: 'inspire',
      },
      {
        topic: 'Giá trị cốt lõi mà chúng tôi theo đuổi',
        category: 'evergreen',
        reasoning: 'Giúp khách hàng hiểu và tin tưởng thương hiệu hơn',
        formats: ['carousel', 'multichannel'],
        relatedKeywords: ['giá trị', 'core values', 'sứ mệnh', 'tầm nhìn'],
        scores: { brandFit: 90, trend: 55, competition: 70, engagement: 70 },
        estimatedEngagement: 'medium',
        topicType: 'story',
        funnelStage: 'mofu',
        emotionalTone: 'inspire',
      },
    ],
    engagement: [
      {
        topic: 'Bạn nghĩ gì về xu hướng này?',
        category: 'reactive',
        reasoning: 'Câu hỏi mở khuyến khích bình luận và thảo luận',
        formats: ['multichannel'],
        relatedKeywords: ['xu hướng', 'ý kiến', 'bình luận', 'thảo luận'],
        bestTimeToPost: '12:00 - 14:00',
        scores: { brandFit: 70, trend: 85, competition: 50, engagement: 95 },
        estimatedEngagement: 'high',
        topicType: 'data',
        funnelStage: 'tofu',
        emotionalTone: 'entertain',
      },
      {
        topic: 'Thử thách 7 ngày: Bạn có dám thử?',
        category: 'trending',
        reasoning: 'Challenges luôn viral và tạo FOMO',
        formats: ['script', 'multichannel'],
        relatedKeywords: ['challenge', 'thử thách', '7 ngày', 'viral'],
        scores: { brandFit: 65, trend: 90, competition: 55, engagement: 90 },
        estimatedEngagement: 'high',
        topicType: 'solution',
        funnelStage: 'mofu',
        emotionalTone: 'inspire',
      },
    ],
    expertise: [
      {
        topic: 'Phân tích chuyên sâu: Xu hướng thị trường 2025',
        category: 'seasonal',
        reasoning: 'Nội dung chuyên sâu xây dựng uy tín và được share nhiều',
        formats: ['carousel', 'script', 'multichannel'],
        relatedKeywords: ['phân tích', 'xu hướng', 'thị trường', 'dự báo'],
        bestTimeToPost: '9:00 - 11:00',
        scores: { brandFit: 85, trend: 80, competition: 70, engagement: 80 },
        estimatedEngagement: 'high',
        topicType: 'data',
        funnelStage: 'mofu',
        emotionalTone: 'educate',
      },
      {
        topic: 'Case study thành công từ thực tế',
        category: 'evergreen',
        reasoning: 'Case study là proof of concept tốt nhất',
        formats: ['carousel', 'multichannel'],
        relatedKeywords: ['case study', 'thành công', 'khách hàng', 'kết quả'],
        scores: { brandFit: 80, trend: 65, competition: 75, engagement: 75 },
        estimatedEngagement: 'high',
        topicType: 'story',
        funnelStage: 'bofu',
        emotionalTone: 'convince',
      },
    ],
    conversion: [
      {
        topic: 'Ưu đãi độc quyền: Chỉ còn 24 giờ',
        category: 'reactive',
        reasoning: 'FOMO và urgency thúc đẩy hành động nhanh',
        formats: ['multichannel'],
        relatedKeywords: ['ưu đãi', 'giảm giá', 'flash sale', 'khuyến mãi'],
        bestTimeToPost: '10:00 - 12:00',
        scores: { brandFit: 75, trend: 70, competition: 60, engagement: 85 },
        estimatedEngagement: 'high',
        topicType: 'solution',
        funnelStage: 'bofu',
        emotionalTone: 'convince',
      },
      {
        topic: 'Vì sao khách hàng chọn chúng tôi',
        category: 'evergreen',
        reasoning: 'Social proof tăng niềm tin và conversion',
        formats: ['carousel', 'script', 'multichannel'],
        relatedKeywords: ['testimonial', 'review', 'khách hàng', 'lý do'],
        scores: { brandFit: 85, trend: 60, competition: 65, engagement: 70 },
        estimatedEngagement: 'medium',
        topicType: 'story',
        funnelStage: 'bofu',
        emotionalTone: 'convince',
      },
    ],
  };

  return defaultsByGoal[contentGoal || 'education'] || defaultsByGoal.education;
}

// Helper function to get upcoming events within N days
function getUpcomingEvents(
  events: SeasonalEvent[],
  currentDay: number,
  currentMonth: number,
  withinDays: number
): SeasonalEvent[] {
  const currentDate = new Date(new Date().getFullYear(), currentMonth - 1, currentDay);
  
  return events
    .map(event => {
      const [eventDay, eventMonth] = event.date.split('/').map(Number);
      let eventDate = new Date(currentDate.getFullYear(), eventMonth - 1, eventDay);
      
      // If event is in the past this year, check next year
      if (eventDate < currentDate) {
        eventDate = new Date(currentDate.getFullYear() + 1, eventMonth - 1, eventDay);
      }
      
      const diffDays = Math.ceil((eventDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return { ...event, daysUntil: diffDays };
    })
    .filter(event => event.daysUntil >= 0 && event.daysUntil <= withinDays)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .map(({ daysUntil, ...event }) => event);
}

// Helper function to get general seasonal events (common holidays/events)
function getGeneralSeasonalEvents(currentDay: number, currentMonth: number): SeasonalEvent[] {
  const generalEvents: SeasonalEvent[] = [
    { event: 'Tết Nguyên Đán', date: '01/01', suggestedAngles: ['Tổng kết năm', 'Kế hoạch năm mới', 'Lời chúc'] },
    { event: 'Valentine\'s Day', date: '14/02', suggestedAngles: ['Tình yêu', 'Quà tặng', 'Câu chuyện'] },
    { event: 'Ngày Quốc tế Phụ nữ', date: '08/03', suggestedAngles: ['Tribute', 'Empowerment', 'Stories'] },
    { event: 'Ngày Giải phóng miền Nam', date: '30/04', suggestedAngles: ['Lịch sử', 'Tri ân', 'Nghỉ lễ'] },
    { event: 'Ngày Quốc tế Lao động', date: '01/05', suggestedAngles: ['Nghỉ lễ', 'Work-life balance', 'Team appreciation'] },
    { event: 'Ngày Nhà giáo Việt Nam', date: '20/11', suggestedAngles: ['Tri ân', 'Giáo dục', 'Stories'] },
    { event: 'Noel', date: '25/12', suggestedAngles: ['Festive', 'Year review', 'Ưu đãi cuối năm'] },
    { event: 'Tết Dương lịch', date: '01/01', suggestedAngles: ['Goals', 'Trends', 'Fresh start'] },
    { event: 'Black Friday', date: '29/11', suggestedAngles: ['Sales', 'Deals', 'Shopping guide'] },
    { event: 'Cyber Monday', date: '02/12', suggestedAngles: ['Online deals', 'Tech', 'Shopping'] },
    { event: 'Ngày Gia đình Việt Nam', date: '28/06', suggestedAngles: ['Family values', 'Stories', 'Appreciation'] },
    { event: 'Trung Thu', date: '15/08', suggestedAngles: ['Truyền thống', 'Gia đình', 'Quà tặng'] },
  ];
  
  return getUpcomingEvents(generalEvents, currentDay, currentMonth, 14);
}
