import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Import shared modules
import { getAIConfig } from "../_shared/ai-config.ts";
import { callAI as callAIProvider } from "../_shared/ai-provider.ts";
import { fetchIndustryMemory } from "../_shared/data-fetchers/industry-fetcher.ts";
import { buildIndustryContextSection } from "../_shared/context-builders/industry-context.ts";
import { createPromptManager } from "../_shared/prompt-integration.ts";
import { withSemanticCache } from "../_shared/cache/semantic-cache.ts";
import { getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// Platform Alias Mapping for Backward Compatibility
// ============================================
const PLATFORM_ALIAS: Record<string, string> = {
  'meta_feed': 'facebook_feed',
  'meta_story': 'facebook_story',
  'meta_reels': 'instagram_reels',
  'zalo': 'zalo_oa',
};

function normalizePlatform(platform: string): string {
  return PLATFORM_ALIAS[platform] || platform;
}

interface AdCopyRequest {
  topic: string;
  platform: string;
  objective: string;
  landingUrl?: string;
  audienceBrief?: string;
  funnelStage: string;
  variationCount: number;
  brandTemplateId?: string;
  productId?: string;
  personaId?: string;
  campaignId?: string;
  organizationId: string;
  userId: string;
}

interface CharLimitConfig {
  ideal?: number;
  max: number;
}

interface PlatformLimits {
  primary_text?: CharLimitConfig;
  headline?: CharLimitConfig;
  description?: CharLimitConfig;
  short_headline?: CharLimitConfig;
  long_headline?: CharLimitConfig;
}

// Character limits per platform
const CHAR_LIMITS: Record<string, PlatformLimits> = {
  facebook_feed: {
    primary_text: { ideal: 125, max: 500 },
    headline: { ideal: 40, max: 60 },
    description: { ideal: 25, max: 30 },
  },
  facebook_story: {
    primary_text: { ideal: 90, max: 200 },
    headline: { ideal: 30, max: 40 },
  },
  instagram_feed: {
    primary_text: { ideal: 125, max: 2200 },
    headline: { ideal: 40, max: 60 },
    description: { ideal: 25, max: 30 },
  },
  instagram_story: {
    primary_text: { ideal: 90, max: 200 },
    headline: { ideal: 30, max: 40 },
  },
  instagram_reels: {
    primary_text: { ideal: 90, max: 200 },
    headline: { ideal: 30, max: 40 },
  },
  google_rsa: {
    headline: { max: 30 },
    description: { max: 90 },
  },
  google_display: {
    short_headline: { max: 25 },
    long_headline: { max: 90 },
    description: { max: 90 },
  },
  tiktok: {
    primary_text: { ideal: 80, max: 150 },
    headline: { ideal: 30, max: 50 },
  },
  zalo_oa: {
    primary_text: { ideal: 100, max: 200 },
    headline: { ideal: 30, max: 50 },
    description: { ideal: 25, max: 40 },
  },
  zalo_message: {
    primary_text: { ideal: 150, max: 300 },
    headline: { ideal: 25, max: 40 },
    description: { ideal: 20, max: 35 },
  },
  zalo_article: {
    primary_text: { ideal: 200, max: 500 },
    headline: { ideal: 50, max: 80 },
    description: { ideal: 100, max: 160 },
  },
  linkedin: {
    primary_text: { ideal: 150, max: 600 },
    headline: { ideal: 70, max: 200 },
    description: { ideal: 60, max: 100 },
  },
};

// Policy checker rules
const POLICY_RULES = {
  forbidden_patterns: [
    /click here/gi,
    /buy now!!+/gi,
    /100% guarantee/gi,
    /earn \$?\d+ per day/gi,
    /lose \d+ kg in \d+ day/gi,
  ],
  excessive_caps_threshold: 0.5,
  excessive_punctuation: /[!?]{3,}/g,
};

interface PolicyWarning {
  field: string;
  type: string;
  message: string;
  severity: string;
}

function checkPolicyViolations(text: string, field: string, industryForbiddenTerms?: string[]): PolicyWarning[] {
  const warnings: PolicyWarning[] = [];
  
  // Check forbidden patterns
  for (const pattern of POLICY_RULES.forbidden_patterns) {
    if (pattern.test(text)) {
      warnings.push({
        field,
        type: 'policy_violation',
        message: `Text có thể vi phạm chính sách quảng cáo`,
        severity: 'warning',
      });
      break;
    }
  }
  
  // Check industry forbidden terms
  if (industryForbiddenTerms?.length) {
    const lowerText = text.toLowerCase();
    for (const term of industryForbiddenTerms) {
      if (lowerText.includes(term.toLowerCase())) {
        warnings.push({
          field,
          type: 'industry_violation',
          message: `Chứa từ cấm ngành: "${term}"`,
          severity: 'error',
        });
      }
    }
  }
  
  // Check excessive capitalization
  const upperCount = (text.match(/[A-Z]/g) || []).length;
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  if (letterCount > 0 && upperCount / letterCount > POLICY_RULES.excessive_caps_threshold) {
    warnings.push({
      field,
      type: 'best_practice',
      message: 'Quá nhiều chữ viết hoa có thể giảm hiệu quả',
      severity: 'info',
    });
  }
  
  // Check excessive punctuation
  if (POLICY_RULES.excessive_punctuation.test(text)) {
    warnings.push({
      field,
      type: 'best_practice',
      message: 'Tránh sử dụng quá nhiều dấu chấm than hoặc hỏi',
      severity: 'info',
    });
  }
  
  return warnings;
}

function countChars(text: string | null): number {
  return text?.length || 0;
}

function checkCharLimits(text: string | null, field: string, limits: CharLimitConfig): PolicyWarning[] {
  const warnings: PolicyWarning[] = [];
  const count = countChars(text);
  
  if (count > limits.max) {
    warnings.push({
      field,
      type: 'character_limit',
      message: `Vượt ${count - limits.max} ký tự (tối đa ${limits.max})`,
      severity: 'error',
    });
  } else if (limits.ideal && count > limits.ideal) {
    warnings.push({
      field,
      type: 'character_limit',
      message: `Nên rút gọn (lý tưởng ${limits.ideal} ký tự)`,
      severity: 'warning',
    });
  }
  
  return warnings;
}

// Note: Retry logic is now handled by ai-provider.ts with circuit breaker pattern

// ============================================
// AI Metrics Logging with Cost
// ============================================
import { estimateCost } from "../_shared/cost-estimator.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

async function logAIMetrics(
  supabase: any,
  traceId: string,
  functionName: string,
  totalDurationMs: number,
  options: {
    organizationId?: string;
    brandTemplateId?: string;
    inputTokensEstimated?: number;
    outputTokensEstimated?: number;
    contextSources?: string[];
    hadError?: boolean;
    errorType?: string;
    errorMessage?: string;
  }
) {
  try {
    const model = 'google/gemini-2.5-flash';
    const estimatedCostUsd = estimateCost(
      model, 
      options.inputTokensEstimated || 0, 
      options.outputTokensEstimated || 0
    );
    
    await supabase.from('ai_metrics').insert({
      trace_id: traceId,
      function_name: functionName,
      total_duration_ms: totalDurationMs,
      organization_id: options.organizationId || null,
      brand_template_id: options.brandTemplateId || null,
      input_tokens_estimated: options.inputTokensEstimated || null,
      output_tokens_estimated: options.outputTokensEstimated || null,
      context_sources: options.contextSources || [],
      had_error: options.hadError || false,
      error_type: options.errorType || null,
      error_message: options.errorMessage || null,
      // NEW: Cost tracking
      models_used: { default: model },
      estimated_cost_usd: estimatedCostUsd,
    });
    console.log(`[generate-ad-copy] Metrics saved: cost=$${estimatedCostUsd.toFixed(6)}`);
  } catch (error) {
    console.error('[generate-ad-copy] Failed to log metrics:', error);
  }
}

Deno.serve(withPerf({ functionName: 'generate-ad-copy', slowThresholdMs: 45000 }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const traceId = crypto.randomUUID();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const body: AdCopyRequest = await req.json();
    let { 
      topic, platform, objective, landingUrl, audienceBrief, 
      funnelStage, variationCount, brandTemplateId, productId, 
      personaId, campaignId, organizationId 
    } = body;
    const userId = claimsData.user.id;

    // Normalize platform for backward compatibility
    const originalPlatform = platform;
    platform = normalizePlatform(platform);
    
    console.log('[generate-ad-copy] Request:', { 
      traceId,
      topic, 
      platform, 
      originalPlatform: originalPlatform !== platform ? originalPlatform : undefined,
      objective, 
      variationCount 
    });

    // Get AI config from centralized system
    const aiConfig = await getAIConfig('generate-ad-copy', organizationId);
    console.log('[generate-ad-copy] Using AI config:', { model: aiConfig.model, temperature: aiConfig.temperature });

    // Context sources for metrics
    const contextSources: string[] = [];

    // Fetch brand context
    let brandContext = '';
    let industryTemplateId: string | null = null;
    if (brandTemplateId) {
      const { data: brand } = await supabase
        .from('brand_templates')
        .select('brand_name, brand_guideline, tone_of_voice, preferred_words, forbidden_words, cta_templates, industry_template_id')
        .eq('id', brandTemplateId)
        .single();
      
      if (brand) {
        contextSources.push('brand_template');
        industryTemplateId = brand.industry_template_id;
        brandContext = `
Brand: ${brand.brand_name}
Guideline: ${brand.brand_guideline || ''}
Tone: ${(brand.tone_of_voice || []).join(', ')}
Preferred Words: ${(brand.preferred_words || []).join(', ')}
Forbidden Words: ${(brand.forbidden_words || []).join(', ')}
CTA Templates: ${(brand.cta_templates || []).join(', ')}
`.trim();
      }
    }

    // Fetch industry memory context
    let industryContext = '';
    let industryForbiddenTerms: string[] = [];
    if (industryTemplateId) {
      const industryMemory = await fetchIndustryMemory(supabase, industryTemplateId, 'vi');
      if (industryMemory) {
        contextSources.push('industry_memory');
        industryContext = buildIndustryContextSection(industryMemory);
        industryForbiddenTerms = [
          ...(industryMemory.forbidden_terms || []),
          ...(industryMemory.forbidden_words || []),
        ];
      }
    }

    // Fetch product context
    let productContext = '';
    if (productId) {
      const { data: product } = await supabase
        .from('brand_products')
        .select('name, description, benefits, unique_selling_points, pain_points_solved')
        .eq('id', productId)
        .single();
      
      if (product) {
        contextSources.push('product');
        productContext = `
Product: ${product.name}
Description: ${product.description || ''}
Benefits: ${(product.benefits || []).join(', ')}
USPs: ${(product.unique_selling_points || []).join(', ')}
Solves: ${(product.pain_points_solved || []).join(', ')}
`.trim();
      }
    }

    // Fetch persona context
    let personaContext = '';
    if (personaId) {
      const { data: persona } = await supabase
        .from('customer_personas')
        .select('name, age_range, pain_points, desires, buying_motivation, objections, tech_savviness, device_usage')
        .eq('id', personaId)
        .single();
      
      if (persona) {
        contextSources.push('persona');
        personaContext = `
Target Persona: ${persona.name}
Age: ${persona.age_range || ''}
Pain Points: ${(persona.pain_points || []).join(', ')}
Desires: ${(persona.desires || []).join(', ')}
Buying Motivation: ${(persona.buying_motivation || []).join(', ')}
Objections: ${(persona.objections || []).join(', ')}
Tech Savviness: ${persona.tech_savviness || ''}
Device Usage: ${(persona.device_usage || []).join(', ')}
`.trim();
      }
    }

    // Build platform-specific prompt
    const limits = CHAR_LIMITS[platform] || CHAR_LIMITS.facebook_feed;
    let platformInstructions = '';
    let outputFormat = '';

    if (platform === 'google_rsa') {
      platformInstructions = `
Platform: Google Responsive Search Ads (RSA)
- Generate 15 unique headlines (max 30 characters each)
- Generate 4 unique descriptions (max 90 characters each)
- Headlines should be diverse: include features, benefits, CTAs, questions
- Descriptions should complement headlines, not repeat them
- Use dynamic keyword insertion hints where appropriate
`;
      outputFormat = `
Return JSON array with ${variationCount} variations:
[{
  "headlines": ["headline1", "headline2", ...(15 headlines)],
  "descriptions": ["desc1", "desc2", "desc3", "desc4"]
}]`;
    } else if (platform === 'google_display') {
      platformInstructions = `
Platform: Google Display Network (GDN) Ads
- Generate 5 short headlines (max 25 characters each) - punchy, attention-grabbing
- Generate 1 long headline (max 90 characters) - more descriptive
- Generate 5 descriptions (max 90 characters each)
- Headlines should be action-oriented and benefit-focused
- Descriptions should expand on value proposition
- Keep messaging clear and concise for display format
`;
      outputFormat = `
Return JSON array with ${variationCount} variations:
[{
  "short_headlines": ["short1", "short2", "short3", "short4", "short5"],
  "long_headline": "longer descriptive headline here",
  "descriptions": ["desc1", "desc2", "desc3", "desc4", "desc5"]
}]`;
    } else if (platform === 'tiktok') {
      const ptLimits = limits.primary_text || { ideal: 80, max: 150 };
      const hlLimits = limits.headline || { ideal: 30, max: 50 };
      
      platformInstructions = `
Platform: TikTok In-Feed Ads
- Primary Text: ${ptLimits.ideal} chars ideal, max ${ptLimits.max} (hiển thị ở overlay)
- Headline: ${hlLimits.ideal} chars ideal, max ${hlLimits.max}
- Tone: Casual, trendy, Gen Z friendly
- Use hooks that work for vertical video
- Avoid overly salesy language
- Consider trending sounds/formats references
`;
      outputFormat = `
Return JSON array with ${variationCount} variations:
[{
  "primary_text": "...",
  "headline": "...",
  "cta_button": "learn_more|shop_now|sign_up|get_offer|download"
}]`;
    } else if (platform === 'zalo_oa' || platform === 'zalo_message' || platform === 'zalo_article') {
      const ptLimits = limits.primary_text || { ideal: 100, max: 200 };
      const hlLimits = limits.headline || { ideal: 30, max: 50 };
      const descLimits = limits.description || { ideal: 25, max: 40 };
      
      const zaloTypeDesc: Record<string, string> = {
        'zalo_oa': 'Zalo Official Account Post - bài đăng OA trên feed',
        'zalo_message': 'Zalo Message Ads - tin nhắn quảng cáo conversational',
        'zalo_article': 'Zalo Article - bài viết dạng tin tức/blog',
      };
      
      platformInstructions = `
Platform: ${zaloTypeDesc[platform] || 'Zalo Ads'}
- Primary Text: ${ptLimits.ideal} chars ideal, max ${ptLimits.max}
- Headline: ${hlLimits.ideal} chars ideal, max ${hlLimits.max}
- Description: ${descLimits.ideal} chars ideal, max ${descLimits.max}
- Tone: Friendly, conversational, Vietnamese local
- ${platform === 'zalo_message' ? 'Viết như tin nhắn trực tiếp, thân thiện' : ''}
- ${platform === 'zalo_article' ? 'Tiêu đề hấp dẫn, nội dung informative' : ''}
- Use Vietnamese colloquial language appropriately
- Không so sánh trực tiếp với đối thủ
`;
      outputFormat = `
Return JSON array with ${variationCount} variations:
[{
  "primary_text": "...",
  "headline": "...",
  "description": "...",
  "cta_button": "learn_more|shop_now|send_message|get_offer|contact_us"
}]`;
    } else if (platform === 'linkedin') {
      const ptLimits = limits.primary_text || { ideal: 150, max: 600 };
      const hlLimits = limits.headline || { ideal: 70, max: 200 };
      const descLimits = limits.description || { ideal: 60, max: 100 };
      
      platformInstructions = `
Platform: LinkedIn Sponsored Content
- Primary Text: ${ptLimits.ideal} chars ideal, max ${ptLimits.max} (intro text)
- Headline: ${hlLimits.ideal} chars ideal, max ${hlLimits.max}
- Description: ${descLimits.ideal} chars ideal, max ${descLimits.max}
- Tone: Professional, thought leadership
- Use industry jargon appropriately
- Focus on business value, ROI, career growth
- Include data/statistics when relevant
`;
      outputFormat = `
Return JSON array with ${variationCount} variations:
[{
  "primary_text": "...",
  "headline": "...",
  "description": "...",
  "cta_button": "learn_more|sign_up|download|get_quote|contact_us"
}]`;
    } else if (platform === 'facebook_feed' || platform === 'facebook_story') {
      const formatType = platform === 'facebook_story' ? 'Story' : 'Feed';
      const ptLimits = limits.primary_text || { ideal: 125, max: 500 };
      const hlLimits = limits.headline || { ideal: 40, max: 60 };
      const descLimits = limits.description || { ideal: 25, max: 30 };
      
      platformInstructions = `
Platform: Facebook ${formatType} Ads
- Primary Text: ${ptLimits.ideal} chars ideal, max ${ptLimits.max}
- Headline: ${hlLimits.ideal} chars ideal, max ${hlLimits.max}
${descLimits ? `- Link Description: ${descLimits.ideal} chars ideal, max ${descLimits.max}` : ''}
- Tone: Thân thiện, informal, có thể dùng emoji phổ biến
- ${platform === 'facebook_story' ? 'Optimize for vertical format, urgent/ephemeral messaging' : 'Optimize for mobile feed scrolling'}
`;
      outputFormat = `
Return JSON array with ${variationCount} variations:
[{
  "primary_text": "...",
  "headline": "...",
  ${platform === 'facebook_feed' ? '"description": "...",' : ''}
  "cta_button": "learn_more|shop_now|sign_up|get_offer|contact_us|book_now"
}]`;
    } else {
      // Instagram platforms
      const formatType = platform === 'instagram_story' ? 'Story' : platform === 'instagram_reels' ? 'Reels' : 'Feed';
      const ptLimits = limits.primary_text || { ideal: 125, max: 2200 };
      const hlLimits = limits.headline || { ideal: 40, max: 60 };
      const descLimits = limits.description || { ideal: 25, max: 30 };
      
      platformInstructions = `
Platform: Instagram ${formatType} Ads
- Primary Text: ${ptLimits.ideal} chars ideal, max ${ptLimits.max}
- Headline: ${hlLimits.ideal} chars ideal, max ${hlLimits.max}
${formatType === 'Feed' && descLimits ? `- Link Description: ${descLimits.ideal} chars ideal, max ${descLimits.max}` : ''}
- Tone: Visual-first, aesthetic, có thể dùng hashtags và emoji
- ${platform === 'instagram_reels' ? 'Hook mạnh trong 3 giây đầu, trending/viral format' : ''}
- ${platform === 'instagram_story' ? 'Urgent messaging, vertical format optimized' : ''}
- ${platform === 'instagram_feed' ? 'Caption dài OK, storytelling format' : ''}
`;
      outputFormat = `
Return JSON array with ${variationCount} variations:
[{
  "primary_text": "...",
  "headline": "...",
  ${platform === 'instagram_feed' ? '"description": "...",' : ''}
  "cta_button": "learn_more|shop_now|sign_up|get_offer|contact_us|book_now"
}]`;
    }

    // Objective-based messaging
    const objectiveGuidance: Record<string, string> = {
      traffic: 'Focus on curiosity, benefits, and clear value proposition',
      conversions: 'Use urgency, social proof, specific numbers, and strong CTAs',
      engagement: 'Ask questions, be relatable, encourage interaction',
      awareness: 'Be memorable, focus on brand values and positioning',
      leads: 'Highlight value proposition, build trust, reduce friction',
    };

    // Funnel stage messaging
    const funnelGuidance: Record<string, string> = {
      awareness: 'Problem agitation, attention-grabbing hooks, introduce the solution',
      consideration: 'Feature-benefit comparison, testimonials, address objections',
      conversion: 'Urgency, limited-time offers, strong social proof, clear CTA',
      retention: 'Loyalty rewards, exclusive offers, community belonging',
    };

    // Try to fetch system prompt from registry
    let baseSystemPrompt = '';
    try {
      const serviceSupabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const promptManager = createPromptManager(serviceSupabase, 'generate-ad-copy', organizationId);
      baseSystemPrompt = await promptManager.get('system_prompt', {
        platform,
        objective,
        forbiddenTerms: industryForbiddenTerms.join(', '),
      });
    } catch (err) {
      console.warn('[generate-ad-copy] Failed to fetch prompt from registry, using hardcoded');
    }

    const systemPrompt = baseSystemPrompt || `You are an expert advertising copywriter specializing in digital ads. 
Generate high-converting ad copy following these strict guidelines:

${platformInstructions}

Objective: ${objective}
Guidance: ${objectiveGuidance[objective] || objectiveGuidance.traffic}

Funnel Stage: ${funnelStage}
Guidance: ${funnelGuidance[funnelStage] || funnelGuidance.awareness}

${industryContext ? industryContext : ''}
${brandContext ? `\n--- BRAND CONTEXT ---\n${brandContext}` : ''}
${productContext ? `\n--- PRODUCT CONTEXT ---\n${productContext}` : ''}
${personaContext ? `\n--- TARGET PERSONA ---\n${personaContext}` : ''}
${audienceBrief ? `\n--- AUDIENCE BRIEF ---\n${audienceBrief}` : ''}
${landingUrl ? `\n--- LANDING URL ---\n${landingUrl}` : ''}

RULES:
1. Respect character limits strictly
2. Write in Vietnamese unless brand context specifies otherwise
3. Avoid policy-violating language (misleading claims, excessive caps, sensational terms)
4. Each variation must have a unique angle/approach
5. Use emojis sparingly and appropriately for the platform
6. ${industryForbiddenTerms.length > 0 ? `NEVER use these industry forbidden terms: ${industryForbiddenTerms.join(', ')}` : ''}

${outputFormat}

IMPORTANT: Return ONLY valid JSON, no markdown or explanation.`;

    const userPrompt = `Generate ${variationCount} ad copy variations for: ${topic}`;

    // Estimate input tokens
    const inputTokensEstimated = Math.ceil((systemPrompt.length + userPrompt.length) / 4);

    // Call AI via multi-provider system with semantic cache
    console.log('[generate-ad-copy] Calling AI via multi-provider system:', {
      functionName: 'generate-ad-copy',
      organizationId,
      modelOverride: aiConfig.model,
    });

    const serviceSupabase = getServiceClient();
    const cacheInputText = `ad-copy:${platform}:${objective}:${funnelStage}:${topic.substring(0, 200)}:${brandContext.substring(0, 100)}`;

    const cacheResult = await withSemanticCache(
      serviceSupabase,
      cacheInputText,
      { functionName: 'generate-ad-copy', organizationId, brandTemplateId, similarityThreshold: 0.93 },
      async () => {
        return await callAIProvider({
          functionName: 'generate-ad-copy',
          organizationId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          modelOverride: aiConfig.model || undefined,
          temperatureOverride: aiConfig.temperature,
          maxTokensOverride: aiConfig.max_tokens,
        });
      },
      5, // TTL 5 days
    );

    if (cacheResult.fromCache) {
      console.log(`[generate-ad-copy] Semantic cache hit (similarity: ${cacheResult.similarity?.toFixed(3)})`);
    }

    const aiResult = cacheResult.data;

    if (!aiResult.success) {
      console.error('[generate-ad-copy] AI error:', aiResult.error);
      
      // Log error metrics
      await logAIMetrics(supabase, traceId, 'generate-ad-copy', Date.now() - startTime, {
        organizationId,
        brandTemplateId,
        contextSources,
        hadError: true,
        errorType: 'ai_provider_error',
        errorMessage: aiResult.error?.substring(0, 500),
      });
      
      if (aiResult.error?.includes('Rate limit') || aiResult.error?.includes('429')) {
        return new Response(JSON.stringify({ 
          error: 'Hệ thống đang quá tải, vui lòng thử lại sau.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (aiResult.error?.includes('Payment') || aiResult.error?.includes('402')) {
        return new Response(JSON.stringify({ 
          error: 'Đã hết quota AI, vui lòng liên hệ admin.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI call failed: ${aiResult.error}`);
    }

    console.log('[generate-ad-copy] AI response received from provider:', aiResult.provider, 'model:', aiResult.model);
    const content = aiResult.data?.choices?.[0]?.message?.content || '';
    
    // Estimate output tokens
    const outputTokensEstimated = Math.ceil(content.length / 4);
    
    // Parse JSON response
    let variations: any[];
    try {
      // Clean markdown if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      variations = JSON.parse(cleanContent);
    } catch (e) {
      console.error('[generate-ad-copy] Parse error:', content);
      
      await logAIMetrics(supabase, traceId, 'generate-ad-copy', Date.now() - startTime, {
        organizationId,
        brandTemplateId,
        contextSources,
        hadError: true,
        errorType: 'parse_error',
        errorMessage: 'Failed to parse AI response as JSON',
      });
      
      throw new Error('Không thể xử lý phản hồi từ AI. Vui lòng thử lại.');
    }

    // Create ad copy record - use normalized platform
    const { data: adCopy, error: insertError } = await supabase
      .from('ad_copies')
      .insert({
        title: topic.substring(0, 100),
        topic,
        platform,
        objective,
        landing_url: landingUrl || null,
        brand_template_id: brandTemplateId || null,
        campaign_id: campaignId || null,
        organization_id: organizationId,
        user_id: userId,
        audience_brief: audienceBrief || null,
        product_id: productId || null,
        persona_id: personaId || null,
        funnel_stage: funnelStage,
        status: 'draft',
        industry_template_id: industryTemplateId || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[generate-ad-copy] Insert error:', insertError);
      throw new Error(`Không thể lưu ad copy: ${insertError.message}`);
    }

    // Process and save variations
    const variationLabels = ['A', 'B', 'C', 'D', 'E'];
    const processedVariations = [];

    for (let i = 0; i < variations.length; i++) {
      const v = variations[i];
      const label = variationLabels[i] || `V${i + 1}`;
      const charCounts: Record<string, number> = {};
      const policyWarnings: PolicyWarning[] = [];

      if (platform === 'google_rsa') {
        // Process RSA variations
        charCounts.headlines = v.headlines?.length || 0;
        charCounts.descriptions = v.descriptions?.length || 0;
        
        // Check each headline/description
        v.headlines?.forEach((h: string, idx: number) => {
          charCounts[`headline_${idx}`] = h.length;
          if (h.length > 30) {
            policyWarnings.push({
              field: `headline_${idx}`,
              type: 'character_limit',
              message: `Headline ${idx + 1} vượt ${h.length - 30} ký tự`,
              severity: 'error',
            });
          }
          policyWarnings.push(...checkPolicyViolations(h, `headline_${idx}`, industryForbiddenTerms));
        });
        
        v.descriptions?.forEach((d: string, idx: number) => {
          charCounts[`description_${idx}`] = d.length;
          if (d.length > 90) {
            policyWarnings.push({
              field: `description_${idx}`,
              type: 'character_limit',
              message: `Description ${idx + 1} vượt ${d.length - 90} ký tự`,
              severity: 'error',
            });
          }
          policyWarnings.push(...checkPolicyViolations(d, `description_${idx}`, industryForbiddenTerms));
        });
      } else if (platform === 'google_display') {
        // Process Google Display variations
        const shortHeadlines = v.short_headlines || [];
        const longHeadline = v.long_headline || '';
        const descriptions = v.descriptions || [];
        
        charCounts.short_headlines = shortHeadlines.length;
        charCounts.long_headline = longHeadline.length;
        charCounts.descriptions = descriptions.length;
        
        // Check short headlines (max 25 chars)
        shortHeadlines.forEach((h: string, idx: number) => {
          charCounts[`short_headline_${idx}`] = h.length;
          if (h.length > 25) {
            policyWarnings.push({
              field: `short_headline_${idx}`,
              type: 'character_limit',
              message: `Short headline ${idx + 1} vượt ${h.length - 25} ký tự`,
              severity: 'error',
            });
          }
          policyWarnings.push(...checkPolicyViolations(h, `short_headline_${idx}`, industryForbiddenTerms));
        });
        
        // Check long headline (max 90 chars)
        if (longHeadline.length > 90) {
          policyWarnings.push({
            field: 'long_headline',
            type: 'character_limit',
            message: `Long headline vượt ${longHeadline.length - 90} ký tự`,
            severity: 'error',
          });
        }
        policyWarnings.push(...checkPolicyViolations(longHeadline, 'long_headline', industryForbiddenTerms));
        
        // Check descriptions (max 90 chars)
        descriptions.forEach((d: string, idx: number) => {
          charCounts[`description_${idx}`] = d.length;
          if (d.length > 90) {
            policyWarnings.push({
              field: `description_${idx}`,
              type: 'character_limit',
              message: `Description ${idx + 1} vượt ${d.length - 90} ký tự`,
              severity: 'error',
            });
          }
          policyWarnings.push(...checkPolicyViolations(d, `description_${idx}`, industryForbiddenTerms));
        });
      } else {
        // Process Meta/Social variations
        charCounts.primary_text = countChars(v.primary_text);
        charCounts.headline = countChars(v.headline);
        charCounts.description = countChars(v.description);
        
        if (limits.primary_text) {
          policyWarnings.push(...checkCharLimits(v.primary_text, 'primary_text', limits.primary_text));
        }
        if (limits.headline) {
          policyWarnings.push(...checkCharLimits(v.headline, 'headline', limits.headline));
        }
        if (limits.description) {
          policyWarnings.push(...checkCharLimits(v.description, 'description', limits.description));
        }
        
        // Policy checks with industry terms
        if (v.primary_text) policyWarnings.push(...checkPolicyViolations(v.primary_text, 'primary_text', industryForbiddenTerms));
        if (v.headline) policyWarnings.push(...checkPolicyViolations(v.headline, 'headline', industryForbiddenTerms));
      }

      // Build variation data based on platform
      let variationData: any = {
        ad_copy_id: adCopy.id,
        variation_label: label,
        char_counts: charCounts,
        policy_warnings: policyWarnings,
        is_approved: false,
      };

      if (platform === 'google_display') {
        variationData.headlines = v.short_headlines || [];
        variationData.descriptions = v.descriptions || [];
        variationData.headline = v.long_headline || null;
        variationData.primary_text = null;
        variationData.description = null;
        variationData.cta_button = 'learn_more';
      } else if (platform === 'google_rsa') {
        variationData.headlines = v.headlines || [];
        variationData.descriptions = v.descriptions || [];
        variationData.primary_text = null;
        variationData.headline = null;
        variationData.description = null;
        variationData.cta_button = 'learn_more';
      } else {
        variationData.primary_text = v.primary_text || null;
        variationData.headline = v.headline || null;
        variationData.description = v.description || null;
        variationData.cta_button = v.cta_button || 'learn_more';
        variationData.headlines = [];
        variationData.descriptions = [];
      }

      processedVariations.push(variationData);
    }

    // Insert all variations
    const { data: savedVariations, error: varError } = await supabase
      .from('ad_copy_variations')
      .insert(processedVariations)
      .select();

    if (varError) {
      console.error('[generate-ad-copy] Variations insert error:', varError);
    }

    // Log success metrics
    await logAIMetrics(supabase, traceId, 'generate-ad-copy', Date.now() - startTime, {
      organizationId,
      brandTemplateId,
      inputTokensEstimated,
      outputTokensEstimated,
      contextSources,
      hadError: false,
    });

    const response = {
      ...adCopy,
      variations: savedVariations || [],
      policyCheck: {
        passed: processedVariations.every(v => 
          v.policy_warnings.filter((w: PolicyWarning) => w.severity === 'error').length === 0
        ),
        totalWarnings: processedVariations.reduce((sum, v) => sum + v.policy_warnings.length, 0),
      },
    };

    console.log('[generate-ad-copy] Success:', { id: adCopy.id, variations: savedVariations?.length, durationMs: Date.now() - startTime });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định';
    console.error('[generate-ad-copy] Error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}));
