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
const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');

// ========== PERPLEXITY INDUSTRY DATA SEARCH ==========
interface IndustryInsight {
  insights: string[];
  statistics: string[];
  caseStudies: string[];
  citations: string[];
}

// ========== AUDIENCE Q&A MINING INTERFACE ==========
interface AudienceQAResult {
  questions: string[];
  sources: string[];
  categories: string[];
}

async function searchIndustryData(industry: string, brandName: string): Promise<IndustryInsight | null> {
  if (!PERPLEXITY_API_KEY) {
    console.log('Perplexity API not configured, skipping industry data search');
    return null;
  }

  try {
    const currentYear = new Date().getFullYear();
    const searchQuery = `${industry} Việt Nam ${currentYear}: thống kê ngành mới nhất, case studies thành công, insights marketing, báo cáo thị trường, xu hướng tiêu dùng, số liệu doanh thu, thị phần. Tập trung vào dữ liệu thực tế và số liệu cụ thể.`;

    console.log('Perplexity industry search:', searchQuery.substring(0, 80));

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { 
            role: 'system', 
            content: `Bạn là chuyên gia phân tích ngành tại Việt Nam. Trả về dữ liệu theo format JSON:
{
  "insights": ["insight 1", "insight 2", ...],
  "statistics": ["thống kê với con số cụ thể 1", "thống kê 2", ...],
  "caseStudies": ["case study brand A: ...", "case study B: ...", ...]
}
Chỉ đưa thông tin thực tế, có nguồn đáng tin cậy. Mỗi mục 3-5 items.` 
          },
          { role: 'user', content: searchQuery }
        ],
        search_recency_filter: 'month',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    console.log('Perplexity industry data received, citations:', citations.length);

    // Parse JSON from response
    let result: IndustryInsight = {
      insights: [],
      statistics: [],
      caseStudies: [],
      citations
    };

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result.insights = parsed.insights || [];
        result.statistics = parsed.statistics || [];
        result.caseStudies = parsed.caseStudies || [];
      } else {
        // Fallback: extract lines as insights
        const lines = content.split('\n').filter((line: string) => line.trim() && line.length > 20);
        result.insights = lines.slice(0, 5);
      }
    } catch (parseError) {
      console.error('Failed to parse Perplexity response:', parseError);
      const lines = content.split('\n').filter((line: string) => line.trim() && line.length > 20);
      result.insights = lines.slice(0, 5);
    }

    return result;
  } catch (error) {
    console.error('Perplexity search error:', error);
    return null;
  }
}

// ========== PERPLEXITY AUDIENCE Q&A MINING ==========
async function searchAudienceQuestions(industry: string, targetAudience?: string): Promise<AudienceQAResult | null> {
  if (!PERPLEXITY_API_KEY) {
    console.log('Perplexity API not configured, skipping audience Q&A mining');
    return null;
  }

  try {
    const audienceContext = targetAudience || 'khách hàng';
    const searchQuery = `Câu hỏi phổ biến nhất của ${audienceContext} về ${industry} Việt Nam. Những thắc mắc, vấn đề, khó khăn thường gặp khi tìm hiểu hoặc sử dụng dịch vụ/sản phẩm ${industry}. Bao gồm: câu hỏi từ forums, cộng đồng, People Also Ask, FAQ thường gặp.`;

    console.log('Perplexity Q&A mining:', searchQuery.substring(0, 80));

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { 
            role: 'system', 
            content: `Bạn là chuyên gia nghiên cứu khách hàng. Liệt kê các câu hỏi THỰC SỰ mà khách hàng đang hỏi trên internet (forums, cộng đồng, Google, Facebook groups). Trả về dạng JSON:
{
  "questions": ["Câu hỏi 1?", "Câu hỏi 2?", ...],
  "sources": ["forum/community name 1", "source 2", ...],
  "categories": ["category 1", "category 2", ...]
}
Tập trung vào 8-12 câu hỏi phổ biến nhất, thực tế và có thể tạo content trả lời.` 
          },
          { role: 'user', content: searchQuery }
        ],
        search_recency_filter: 'month',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity Q&A API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    console.log('Perplexity Q&A received, citations:', citations.length);

    // Parse JSON from response
    let result: AudienceQAResult = {
      questions: [],
      sources: citations.length > 0 ? citations.slice(0, 5) : [],
      categories: []
    };

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result.questions = parsed.questions || [];
        result.sources = parsed.sources || citations.slice(0, 5);
        result.categories = parsed.categories || [];
      } else {
        // Fallback: extract lines as questions
        const lines = content.split('\n').filter((line: string) => line.trim() && line.includes('?'));
        result.questions = lines.slice(0, 10).map((q: string) => q.replace(/^[\d\.\-\*]+\s*/, '').trim());
      }
    } catch (parseError) {
      console.error('Failed to parse Q&A response:', parseError);
      const lines = content.split('\n').filter((line: string) => line.trim() && line.includes('?'));
      result.questions = lines.slice(0, 10).map((q: string) => q.replace(/^[\d\.\-\*]+\s*/, '').trim());
    }

    console.log('Extracted', result.questions.length, 'audience questions');
    return result;
  } catch (error) {
    console.error('Audience Q&A mining error:', error);
    return null;
  }
}

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
  products?: BrandProduct[];
}

interface BrandProduct {
  name: string;
  category?: string;
  description?: string;
  unique_selling_points?: string[];
  target_audience?: string;
  pain_points_solved?: string[];
  benefits?: string[];
  suggested_content_angles?: string[];
  is_featured?: boolean;
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

interface TopicDataSource {
  hasRealData: boolean;
  perplexity: boolean;
  statistics: string[];
  citations: string[];
  dataType?: 'insight' | 'statistic' | 'case_study';
}

interface ScoreBreakdown {
  brandFitReason?: string;
  trendReason?: string;
  competitionReason?: string;
  engagementReason?: string;
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
  // Data source transparency
  dataSources?: TopicDataSource;
  // Enhanced reasoning
  scoreBreakdown?: ScoreBreakdown;
  // Search Intent & SEO
  searchIntent?: 'informational' | 'navigational' | 'commercial' | 'transactional';
  suggestedKeywords?: {
    primary: string;
    secondary: string[];
    longTail: string[];
  };
  // Content Series & Cluster
  series?: {
    seriesName: string;
    totalParts: number;
    currentPart?: number;
    relatedTopics?: string[];
  };
  clusterRole?: 'pillar' | 'cluster' | 'standalone';
  // Audience Q&A Mining (Phase 4)
  audienceQuestion?: string;
  isFromAudienceQA?: boolean;
  // Content Tier (3H Model)
  contentTier?: 'hero' | 'hub' | 'hygiene';
  // Media Ownership (Owned/Earned/Paid)
  mediaOwnership?: 'owned' | 'earned' | 'paid';
}

// Helper to infer search intent from funnel stage and topic type
function inferSearchIntent(funnelStage?: string, topicType?: string): 'informational' | 'navigational' | 'commercial' | 'transactional' {
  if (funnelStage === 'bofu') return 'transactional';
  if (funnelStage === 'mofu') return 'commercial';
  if (topicType === 'story') return 'navigational';
  return 'informational';
}

// Helper to infer content tier (3H Model) from category, searchIntent, funnelStage
function inferContentTier(
  category?: string,
  searchIntent?: string,
  funnelStage?: string
): 'hero' | 'hub' | 'hygiene' {
  // Hero: reactive, seasonal + transactional (big campaigns, launches)
  if (category === 'reactive' || (category === 'seasonal' && funnelStage === 'bofu')) {
    return 'hero';
  }
  // Hub: evergreen series content, relationship-building (MOFU)
  if ((category === 'evergreen' || category === 'trending') && funnelStage === 'mofu') {
    return 'hub';
  }
  // Hygiene: informational, SEO-driven (TOFU content)
  if (searchIntent === 'informational' || funnelStage === 'tofu') {
    return 'hygiene';
  }
  // Default to hygiene (60% of content should be hygiene)
  return 'hygiene';
}

// Helper to infer media ownership from format, contentTier, and topic characteristics
function inferMediaOwnership(
  formats?: string[],
  contentTier?: string,
  category?: string,
  topicType?: string
): 'owned' | 'earned' | 'paid' {
  // Paid: Hero content often requires paid amplification
  if (contentTier === 'hero' && (category === 'reactive' || category === 'seasonal')) {
    return 'paid';
  }
  // Earned: UGC, testimonials, memes, viral-potential content
  const earnedFormats = ['ugc', 'testimonial', 'meme'];
  if (formats?.some(f => earnedFormats.includes(f))) {
    return 'earned';
  }
  // Earned: Story-type content often gets organic shares
  if (topicType === 'story') {
    return 'earned';
  }
  // Default: Most content is owned media (blog, newsletter, fanpage posts)
  return 'owned';
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
    const input: TopicGenerationInput & { forceRefresh?: boolean } = await req.json();
    const { mode, rawTopic, industry, contentGoal, brandTemplateId, organizationId, format, recentTopics, seasonality, videoType, forceRefresh } = input;

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
    
    // Check cache first (skip if forceRefresh is true)
    if (!forceRefresh) {
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
    } else {
      console.log('Force refresh requested, skipping cache');
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

        // Fetch products for this brand template
        const { data: products } = await supabase
          .from('brand_products')
          .select('name, category, description, unique_selling_points, target_audience, pain_points_solved, benefits, suggested_content_angles, is_featured')
          .eq('brand_template_id', brandTemplateId)
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .order('sort_order', { ascending: true });

        if (products && products.length > 0) {
          brandContext.products = products as BrandProduct[];
          console.log('Products loaded:', products.length);
        }

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

    // ========== PARALLEL: Fetch industry data AND audience Q&A from Perplexity ==========
    let industryInsight: IndustryInsight | null = null;
    let audienceQA: AudienceQAResult | null = null;
    const industryToSearch = brandContext?.industry?.[0] || industry || '';
    const brandNameToSearch = brandContext?.brandName || '';
    const targetAudienceToSearch = industryContext?.targetAudience || '';
    
    if (industryToSearch) {
      console.log('Fetching industry data AND audience Q&A from Perplexity in parallel...');
      
      // Execute both Perplexity calls in parallel
      const [industryResult, qaResult] = await Promise.all([
        searchIndustryData(industryToSearch, brandNameToSearch),
        searchAudienceQuestions(industryToSearch, targetAudienceToSearch)
      ]);
      
      industryInsight = industryResult;
      audienceQA = qaResult;
      
      if (industryInsight) {
        console.log('Industry insight loaded:', {
          insights: industryInsight.insights.length,
          statistics: industryInsight.statistics.length,
          caseStudies: industryInsight.caseStudies.length,
          citations: industryInsight.citations.length
        });
      }
      
      if (audienceQA) {
        console.log('Audience Q&A loaded:', {
          questions: audienceQA.questions.length,
          sources: audienceQA.sources.length
        });
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
      industryInsight,
      audienceQA, // NEW: Pass audience Q&A data
    });

    console.log('Generating enhanced topic suggestions with real industry data...');

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
        suggestions = parsed.map((item: any) => {
          // Determine data source info based on topic content and context
          const hasDataPattern = /\d+%|\d+\s*(triệu|tỷ|nghìn|K|M)|tăng\s*\d+|giảm\s*\d+/i.test(item.topic);
          const usedPerplexity = !!(industryInsight && industryInsight.insights.length > 0);
          
          // Find matching statistics if topic contains numbers
          const matchedStats: string[] = [];
          if (usedPerplexity && hasDataPattern && industryInsight?.statistics) {
            for (const stat of industryInsight.statistics) {
              // Check if any number from stat appears in topic
              const numbers = stat.match(/\d+/g) || [];
              for (const num of numbers) {
                if (item.topic.includes(num)) {
                  matchedStats.push(stat);
                  break;
                }
              }
            }
          }

          return {
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
            // Seasonal fields
            relatedEvent: item.relatedEvent,
            eventDate: item.eventDate,
            // Data source transparency
            dataSources: {
              hasRealData: usedPerplexity && hasDataPattern,
              perplexity: usedPerplexity,
              statistics: matchedStats.slice(0, 2),
              citations: usedPerplexity ? (industryInsight?.citations?.slice(0, 3) || []) : [],
              dataType: matchedStats.length > 0 ? 'statistic' : (usedPerplexity ? 'insight' : undefined),
            },
            // Enhanced reasoning with score breakdown
            scoreBreakdown: item.scoreBreakdown || {
              brandFitReason: item.scores?.brandFit >= 80 ? 'Phù hợp cao với brand positioning' : item.scores?.brandFit >= 60 ? 'Khá phù hợp với brand' : 'Cần điều chỉnh cho phù hợp',
              trendReason: hasDataPattern ? 'Dựa trên dữ liệu thực tế từ web search' : (item.scores?.trend >= 70 ? 'Có tiềm năng trending' : 'Evergreen content'),
              competitionReason: item.scores?.competition >= 80 ? 'Góc tiếp cận độc đáo, ít cạnh tranh' : 'Cần góc nhìn khác biệt',
              engagementReason: item.scores?.engagement >= 80 ? 'Hook mạnh, có potential viral' : 'Tiềm năng tương tác trung bình',
            },
            // Search Intent & SEO fields
            searchIntent: item.searchIntent || inferSearchIntent(item.funnelStage, item.topicType),
            suggestedKeywords: item.suggestedKeywords || {
              primary: item.relatedKeywords?.[0] || '',
              secondary: item.relatedKeywords?.slice(1, 3) || [],
              longTail: item.relatedKeywords?.slice(3, 5)?.map((k: string) => k) || [],
            },
            // Content Series & Cluster fields
            clusterRole: item.clusterRole || 'standalone',
            series: item.series || undefined,
            // Audience Q&A Mining fields
            audienceQuestion: item.audienceQuestion || undefined,
            isFromAudienceQA: item.isFromAudienceQA === true || !!item.audienceQuestion,
            // Content Tier (3H Model)
            contentTier: item.contentTier || inferContentTier(item.category, item.searchIntent || inferSearchIntent(item.funnelStage, item.topicType), item.funnelStage),
            // Media Ownership (Owned/Earned/Paid)
            mediaOwnership: item.mediaOwnership || inferMediaOwnership(
              item.formats,
              item.contentTier || inferContentTier(item.category, item.searchIntent, item.funnelStage),
              item.category,
              item.topicType
            ),
          };
        });
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
      perplexityUsed: !!industryInsight,
      citationsCount: industryInsight?.citations?.length || 0,
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
  industryInsight?: IndustryInsight | null;
  audienceQA?: AudienceQAResult | null;
}): { system: string; user: string } {
  const { industry, contentGoal, brandContext, industryContext, format, recentTopics, seasonality, learningContext, industryInsight, audienceQA } = params;

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
    blog_post: 'blog post (SEO-friendly, long-form)',
    infographic: 'infographic (data visualization)',
    podcast: 'podcast/audio content',
    case_study: 'case study (detailed analysis)',
    whitepaper: 'whitepaper/research (deep-dive)',
    webinar: 'webinar (online seminar)',
    live_stream: 'live stream (real-time engagement)',
    ugc: 'user-generated content campaign',
    meme: 'meme/viral content',
    poll: 'poll/quiz (interactive)',
    testimonial: 'testimonial/social proof',
    newsletter: 'newsletter/email marketing',
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

  // Build product catalog section
  let productsSection = '';
  if (brandContext?.products?.length) {
    const featuredProducts = brandContext.products.filter(p => p.is_featured);
    const otherProducts = brandContext.products.filter(p => !p.is_featured).slice(0, 3);
    const productsToShow = [...featuredProducts, ...otherProducts];
    
    productsSection = `
## SẢN PHẨM/DỊCH VỤ CỦA BRAND:
${productsToShow.map(p => `
### ${p.is_featured ? '⭐ ' : ''}${p.name}${p.category ? ` (${p.category})` : ''}
${p.description ? `- Mô tả: ${p.description}` : ''}
${p.unique_selling_points?.length ? `- USP: ${p.unique_selling_points.join(', ')}` : ''}
${p.pain_points_solved?.length ? `- Giải quyết vấn đề: ${p.pain_points_solved.join(', ')}` : ''}
${p.benefits?.length ? `- Lợi ích: ${p.benefits.join(', ')}` : ''}
${p.suggested_content_angles?.length ? `- Góc content gợi ý: ${p.suggested_content_angles.join(', ')}` : ''}
`).join('')}

Khi content goal là "conversion", ƯU TIÊN gợi ý topic về sản phẩm cụ thể sử dụng USP và benefits trong reasoning.`;
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

  // Build Real Industry Data section (from Perplexity)
  let realDataSection = '';
  if (industryInsight) {
    realDataSection = `
## 📊 DỮ LIỆU THỰC TẾ NGÀNH (Real-time từ Perplexity - CỰC KỲ QUAN TRỌNG):
Các dữ liệu sau là THỰC TẾ, được tìm kiếm từ internet. HÃY SỬ DỤNG để tạo topics có số liệu cụ thể!

### Insights ngành:
${industryInsight.insights.slice(0, 5).map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

### Thống kê & Số liệu thực tế:
${industryInsight.statistics.slice(0, 5).map((s, idx) => `${idx + 1}. ${s}`).join('\n')}

### Case Studies thực tế:
${industryInsight.caseStudies.slice(0, 3).map((c, idx) => `${idx + 1}. ${c}`).join('\n')}

${industryInsight.citations.length > 0 ? `### Nguồn tham khảo:
${industryInsight.citations.slice(0, 3).map((c, idx) => `${idx + 1}. ${c}`).join('\n')}` : ''}

### YÊU CẦU SỬ DỤNG DỮ LIỆU THỰC:
- ƯU TIÊN CAO: Sử dụng số liệu thực tế trong tiêu đề topic (VD: "73% doanh nghiệp...", "Tăng 40% doanh thu...")
- Tạo 3-4 topics dựa trên insights/statistics thực tế ở trên
- Topics sử dụng data thực tế có scores.trend và scores.engagement CAO HƠN (+10-15 điểm)
- Mention nguồn trong reasoning nếu phù hợp`;
  }

  // Build Audience Q&A section (from Perplexity)
  let audienceQASection = '';
  if (audienceQA && audienceQA.questions.length > 0) {
    audienceQASection = `
## 🙋 AUDIENCE Q&A MINING (Câu hỏi thực tế từ khách hàng - CỰC KỲ QUAN TRỌNG):
Các câu hỏi sau được thu thập từ forums, cộng đồng, Google "People Also Ask", Facebook groups - đây là những gì khách hàng THỰC SỰ ĐANG HỎI!

### Câu hỏi phổ biến từ audience:
${audienceQA.questions.slice(0, 10).map((q, idx) => `${idx + 1}. ${q}`).join('\n')}

${audienceQA.sources.length > 0 ? `### Nguồn thu thập:
${audienceQA.sources.slice(0, 3).map((s, idx) => `${idx + 1}. ${s}`).join('\n')}` : ''}

### YÊU CẦU SỬ DỤNG AUDIENCE Q&A:
- **ƯU TIÊN CAO**: Tạo 2-3 topics TRỰC TIẾP trả lời các câu hỏi trên
- Topics từ Q&A mining có field "audienceQuestion" = câu hỏi gốc và "isFromAudienceQA" = true
- Topics Q&A-based thường có searchIntent = "informational" và funnelStage = "tofu"
- Điểm engagement cao hơn (+10-15) vì đây là nhu cầu thực tế của khách hàng
- Format topic như: "Giải đáp: [câu hỏi]" hoặc "Tại sao [vấn đề từ câu hỏi]?" hoặc "[Số] điều về [topic từ câu hỏi]"`;
  }

  const systemPrompt = `Bạn là Content Strategist chuyên nghiệp với 10+ năm kinh nghiệm trong content marketing tại Việt Nam.

Nhiệm vụ: Gợi ý các chủ đề content có chiến lược, phù hợp với brand và mục tiêu kinh doanh.
${brandSection}
${pillarsSection}
${industrySection}
${realDataSection}
${audienceQASection}
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
    "formats": ["carousel" | "script" | "multichannel" | "blog_post" | "infographic" | "podcast" | "case_study" | "whitepaper" | "webinar" | "live_stream" | "ugc" | "meme" | "poll" | "testimonial" | "newsletter"],
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
    "eventDate": "(optional) Ngày sự kiện DD/MM",
    "searchIntent": "informational" | "navigational" | "commercial" | "transactional",
    "suggestedKeywords": {
      "primary": "keyword chính để SEO",
      "secondary": ["keyword phụ 1", "keyword phụ 2"],
      "longTail": ["long-tail keyword 1 (3-5 từ)", "long-tail keyword 2"]
    },
    "clusterRole": "pillar" | "cluster" | "standalone",
    "series": "(optional) { seriesName: string, totalParts: number, currentPart: number, relatedTopics: string[] }",
    "audienceQuestion": "(optional) Câu hỏi gốc từ audience nếu topic dựa trên Q&A mining",
    "isFromAudienceQA": "(optional) true nếu topic được tạo từ Audience Q&A",
    "contentTier": "hero" | "hub" | "hygiene",
    "mediaOwnership": "owned" | "earned" | "paid"
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

## SEARCH INTENT & SEO GUIDELINES:
Mỗi topic PHẢI được phân loại search intent và gợi ý keywords SEO:

### Search Intent Classification:
- **informational**: User muốn tìm hiểu, học hỏi (VD: "Cách làm...", "Hướng dẫn...", "Tại sao...")
- **navigational**: User tìm kiếm brand/website cụ thể (VD: topics về brand story, about us)
- **commercial**: User đang nghiên cứu, so sánh trước khi mua (VD: "So sánh...", "Top 10...", "Review...")
- **transactional**: User sẵn sàng hành động/mua (VD: "Đăng ký ngay...", "Mua...", "Tư vấn...")

### Keyword Suggestions:
- **primary**: 1 keyword chính (2-4 từ) để tối ưu SEO cho topic
- **secondary**: 2-3 keywords liên quan có volume tìm kiếm cao
- **longTail**: 2-3 long-tail keywords (4-7 từ) - cụ thể hơn, ít cạnh tranh

### Mapping Intent → Funnel Stage:
- informational → thường là TOFU
- commercial → thường là MOFU
- transactional → thường là BOFU

## CONTENT SERIES & CLUSTER GUIDELINES:
Xây dựng hệ thống content có chiến lược với Topic Clusters và Content Series:

### Cluster Role Classification:
- **pillar**: Nội dung trụ cột, bao quát chủ đề lớn, deep-dive. Thường là long-form, comprehensive. Mỗi 8-10 topics nên có 1-2 pillar.
- **cluster**: Nội dung chi tiết về một khía cạnh của pillar topic. Link ngược về pillar. Chiếm 50-60% topics.
- **standalone**: Nội dung độc lập, không thuộc cluster nào (reactive, trending topics). 20-30% topics.

### Content Series:
- Đề xuất 1-2 topics dạng Series (có thể chia thành nhiều parts)
- Series phù hợp cho: how-to guides, case study series, weekly tips
- Format series object:
  - seriesName: Tên series (VD: "Master Content Marketing")
  - totalParts: Số phần dự kiến (3-5 parts)
  - currentPart: Phần hiện tại (1 cho topic đầu tiên)
  - relatedTopics: Gợi ý tiêu đề các parts khác

### Cluster Linking Strategy:
- Pillar topics nên có clusterRole = "pillar" và list relatedTopics trong series
- Cluster topics link về pillar thông qua relatedKeywords chung


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

## 🎯 HERO-HUB-HYGIENE (3H MODEL) CLASSIFICATION:
Mỗi topic PHẢI được phân loại theo mô hình 3H của Google:

### Content Tiers:
- **hero** (10% topics = 1 topic): 
  - Big-bang content, viral potential, tạo buzz lớn
  - VD: Product launches, brand campaigns, collabs với KOLs, challenges
  - High production value, wide reach
  - Thường là seasonal/reactive topics
  - category thường = "reactive" hoặc "seasonal"
  
- **hub** (30% topics = 2-3 topics):
  - Regular, scheduled content xây dựng loyalty
  - VD: Weekly series, newsletters, podcast episodes, educational deep-dives
  - Push content - chủ động đẩy đến audience
  - Thường là evergreen content dạng series
  - funnelStage thường = "mofu"
  
- **hygiene** (60% topics = 5-6 topics):
  - Always-on, SEO-driven, answer common questions
  - VD: FAQs, how-tos, tutorials, guides, comparisons
  - Pull content - audience tìm đến qua search
  - Thường là informational/commercial intent
  - funnelStage thường = "tofu", searchIntent = "informational"

### 3H Balance Requirements:
- Mỗi batch 8-10 topics PHẢI có: 1 Hero, 2-3 Hub, 5-6 Hygiene
- Hero content tập trung vào seasonal events hoặc brand campaigns
- Hub content xây dựng series, educational deep-dives
- Hygiene content phủ SEO keywords, FAQs, how-tos

## 📡 MEDIA OWNERSHIP (OWNED/EARNED/PAID) CLASSIFICATION:
Mỗi topic PHẢI được phân loại theo mô hình Media Ownership:

### Media Types:
- **owned** (Kênh sở hữu):
  - Content đăng trên kênh do brand kiểm soát hoàn toàn
  - VD: Website/Blog, Email newsletter, Fanpage chính thức, App, YouTube channel
  - Ưu điểm: Kiểm soát 100%, chi phí thấp, xây dựng tài sản dài hạn
  - Thường là: blog_post, newsletter, multichannel posts
  
- **earned** (Kênh lan truyền):
  - Content được viral, chia sẻ tự nhiên không mất phí
  - VD: PR/Media coverage, User reviews, Word-of-mouth, Social shares, UGC
  - Ưu điểm: Độ tin cậy cao, reach tự nhiên, cost-effective
  - Thường là: ugc, testimonial, meme, viral content, story-type topics
  
- **paid** (Kênh trả phí):
  - Content quảng cáo để đạt reach nhanh chóng
  - VD: Facebook/Google Ads, Sponsored posts, Influencer marketing, Affiliate
  - Ưu điểm: Reach ngay lập tức, targeting chính xác, scalable
  - Thường là: hero content, product launches, seasonal campaigns

### Mapping Guidelines:
- formats = ['ugc', 'testimonial', 'meme'] → thường là earned
- contentTier = 'hero' + category = 'reactive'/'seasonal' → thường là paid
- formats = ['blog_post', 'newsletter'] → thường là owned
- topicType = 'story' → thường là earned (viral potential)

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
