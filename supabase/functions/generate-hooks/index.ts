import { callAI, callAIWithMetrics } from "../_shared/ai-provider.ts";
import { resolveUserId } from "../_shared/logger.ts";
import { evaluateHook, type HookEvaluation } from "../_shared/ai-hook-evaluator.ts";
import { 
  getChannelOptimization, 
  buildOptimizedPromptSection, 
  applyTokenOptimization,
  type ChannelOptimization 
} from "../_shared/channel-optimization.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createPromptManager, buildPrompt } from "../_shared/prompt-integration.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { withSemanticCache } from "../_shared/cache/semantic-cache.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BrandVoice {
  tone_of_voice?: string[];
  formality_level?: string;
  preferred_words?: string[];
  forbidden_words?: string[];
  brand_positioning?: string;
  brand_name?: string;
}

interface GenerateHooksRequest {
  topic: string;
  brandVoice?: BrandVoice;
  platform?: string;       // Single platform (backward compatible)
  platforms?: string[];    // Multi-platform mode - tạo hook riêng cho từng platform
  duration?: string;
  count?: number;
  organizationId?: string;
  brandTemplateId?: string;
}

interface GeneratedHook {
  opening_line: string;
  visual_direction: string;
  text_overlay: string;
  framework: string;
  psychology_reason: string;
  engagement_level: string;
  platform?: string;
  evaluation?: {
    score: number;
    issues: string[];
    strengths: string[];
  };
}

// Tạo hook cho 1 platform cụ thể
async function generateHookForPlatform(
  supabase: any,
  topic: string,
  platform: string,
  brandVoice: BrandVoice | undefined,
  duration: string | undefined,
  organizationId: string | undefined,
  brandTemplateId: string | undefined
): Promise<GeneratedHook> {
  // Initialize PromptManager for this function
  const pm = createPromptManager(supabase, 'generate-hooks', organizationId, brandTemplateId);
  
  // Fetch channel optimization for this platform
  let channelOptimization: ChannelOptimization | null = null;
  try {
    channelOptimization = await getChannelOptimization(supabase, platform, organizationId, brandTemplateId);
  } catch (optErr) {
    console.warn(`[generate-hooks] Failed to load optimization for ${platform}:`, optErr);
  }

  // Build brand voice context
  let brandContext = '';
  if (brandVoice) {
    const parts = [];
    if (brandVoice.brand_name) parts.push(`Brand: ${brandVoice.brand_name}`);
    if (brandVoice.tone_of_voice?.length) parts.push(`Tone: ${brandVoice.tone_of_voice.join(', ')}`);
    if (brandVoice.formality_level) parts.push(`Formality: ${brandVoice.formality_level}`);
    if (brandVoice.brand_positioning) parts.push(`Positioning: ${brandVoice.brand_positioning}`);
    if (brandVoice.preferred_words?.length) parts.push(`Preferred words: ${brandVoice.preferred_words.join(', ')}`);
    if (brandVoice.forbidden_words?.length) parts.push(`Avoid words: ${brandVoice.forbidden_words.join(', ')}`);
    
    if (parts.length > 0) {
      brandContext = `\n\nBrand Voice Guidelines:\n${parts.join('\n')}`;
    }
  }

  // Build channel optimization context
  let channelOptimizationContext = '';
  if (channelOptimization) {
    channelOptimizationContext = buildOptimizedPromptSection(platform, channelOptimization);
  }

  const durationContext = duration ? `\nVideo Duration: ${duration}` : '';

  // Build strict JSON-enforcing system prompt
  const systemPrompt = `Bạn là chuyên gia viết hooks và opening lines cho social media. 
Nhiệm vụ: Tạo hook cho platform ${platform.toUpperCase()}.
${brandContext}${durationContext}${channelOptimizationContext ? `\n\n${channelOptimizationContext}` : ''}

NGUYÊN TẮC:
1. Gây tò mò ngay từ đầu
2. Đánh vào pain point hoặc desire  
3. Tạo urgency hoặc FOMO
4. Dùng số liệu hoặc facts gây shock

CRITICAL: Bạn PHẢI trả về ĐÚNG 1 JSON object (không phải array). KHÔNG giải thích, KHÔNG markdown, KHÔNG text nào khác.`;

  // Build user prompt with strict JSON schema
  const userPrompt = `Tạo 1 hook cho chủ đề: "${topic}"

Trả về CHÍNH XÁC 1 JSON object với format sau (KHÔNG có \`\`\`, KHÔNG có text khác):
{
  "opening_line": "Câu hook thu hút attention",
  "visual_direction": "Mô tả ngắn về hình ảnh/video đi kèm",
  "text_overlay": "Text hiển thị trên màn hình",
  "framework": "question|bold_statement|transformation|story|number|negative|social_proof|direct_address|shocking_fact|challenge",
  "psychology_reason": "Giải thích tâm lý tại sao hook này hiệu quả",
  "engagement_level": "high|medium|low"
}`;

  // Calculate optimized max tokens
  const baseMaxTokens = 1024; // Smaller since only 1 hook
  const optimizedMaxTokens = channelOptimization 
    ? applyTokenOptimization(baseMaxTokens, channelOptimization)
    : baseMaxTokens;

  const result = await callAIWithMetrics(supabase, {
    functionName: 'generate-hooks',
    organizationId,
    brandTemplateId,
    channels: [platform],
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperatureOverride: 0.8,
    maxTokensOverride: optimizedMaxTokens,
  });

  if (!result.success) {
    throw new Error(result.error || 'AI call failed');
  }

  const content = result.data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content in AI response');
  }

  // Parse JSON with robust handling
  let hook: GeneratedHook;
  let jsonStr = content.trim();
  
  // Strip markdown code blocks (handle ```json, ``` variations)
  jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  
  // Also handle case where backticks are in the middle
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }
  
  // Extract JSON object if there's surrounding text
  const objStart = jsonStr.indexOf('{');
  const objEnd = jsonStr.lastIndexOf('}');
  if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
    jsonStr = jsonStr.slice(objStart, objEnd + 1);
  }
  
  try {
    hook = JSON.parse(jsonStr);
  } catch (parseErr) {
    console.error('[generate-hooks] JSON parse error for platform:', platform, 'Raw:', content.substring(0, 200));
    throw new Error(`Failed to parse hook JSON: ${parseErr}`);
  }
  hook.platform = platform; // Gán platform vào hook

  // Evaluate hook
  try {
    const evaluation = await evaluateHook(
      hook.opening_line || '',
      platform,
      { brandVoice: brandVoice?.tone_of_voice?.join(', ') }
    );
    
    hook.evaluation = {
      score: evaluation.combinedScore,
      issues: evaluation.issues,
      strengths: evaluation.strengths,
    };
  } catch (evalErr) {
    console.warn(`[generate-hooks] Evaluation failed for ${platform}:`, evalErr);
  }

  return hook;
}

Deno.serve(withPerf({ functionName: 'generate-hooks', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      topic, 
      brandVoice, 
      platform, 
      platforms,  // New: array of platforms
      duration, 
      count = 5, 
      organizationId, 
      brandTemplateId 
    } = await req.json() as GenerateHooksRequest;
    
    if (!topic) {
      return new Response(
        JSON.stringify({ error: 'Topic is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve userId from auth header for cost tracking
    const userId = await resolveUserId(req, supabase);

    // =====================================================
    // MODE 1: Multi-platform - tạo hook riêng cho từng platform
    // =====================================================
    if (platforms && platforms.length > 0) {
      console.log('[generate-hooks] Multi-platform mode for:', platforms.join(', '));

      // Tạo hook song song cho tất cả platforms
      const hookPromises = platforms.map(p => 
        generateHookForPlatform(supabase, topic, p, brandVoice, duration, organizationId, brandTemplateId)
          .catch(err => {
            console.error(`[generate-hooks] Failed for ${p}:`, err);
            return null; // Return null for failed platforms
          })
      );

      const results = await Promise.all(hookPromises);
      const hooks = results.filter((h): h is GeneratedHook => h !== null);

      console.log('[generate-hooks] Generated', hooks.length, 'hooks for', platforms.length, 'platforms');

      return new Response(
        JSON.stringify({ hooks }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================================================
    // MODE 2: Single platform (backward compatible)
    // =====================================================
    const targetChannel = platform || 'facebook';
    console.log('[generate-hooks] Single platform mode for:', targetChannel, 'count:', count);

    // Initialize PromptManager
    const pm = createPromptManager(supabase, 'generate-hooks', organizationId, brandTemplateId);

    let channelOptimization: ChannelOptimization | null = null;
    try {
      channelOptimization = await getChannelOptimization(supabase, targetChannel, organizationId, brandTemplateId);
    } catch (optErr) {
      console.warn('[generate-hooks] Failed to load channel optimization:', optErr);
    }

    // Build brand voice context
    let brandContext = '';
    if (brandVoice) {
      const parts = [];
      if (brandVoice.brand_name) parts.push(`Brand: ${brandVoice.brand_name}`);
      if (brandVoice.tone_of_voice?.length) parts.push(`Tone: ${brandVoice.tone_of_voice.join(', ')}`);
      if (brandVoice.formality_level) parts.push(`Formality: ${brandVoice.formality_level}`);
      if (brandVoice.brand_positioning) parts.push(`Positioning: ${brandVoice.brand_positioning}`);
      if (brandVoice.preferred_words?.length) parts.push(`Preferred words: ${brandVoice.preferred_words.join(', ')}`);
      if (brandVoice.forbidden_words?.length) parts.push(`Avoid words: ${brandVoice.forbidden_words.join(', ')}`);
      
      if (parts.length > 0) {
        brandContext = `\n\nBrand Voice Guidelines:\n${parts.join('\n')}`;
      }
    }

    let channelOptimizationContext = '';
    if (channelOptimization) {
      channelOptimizationContext = buildOptimizedPromptSection(targetChannel, channelOptimization);
    }

    const platformContext = platform ? `\nTarget Platform: ${platform}` : '';
    const durationContext = duration ? `\nVideo Duration: ${duration}` : '';

    // Build strict JSON-enforcing system prompt
    const systemPrompt = `Bạn là chuyên gia viết hooks và opening lines cho social media.
Nhiệm vụ: Tạo ${count} hooks cho platform ${targetChannel.toUpperCase()}.
${brandContext}${platformContext}${durationContext}${channelOptimizationContext ? `\n\n${channelOptimizationContext}` : ''}

NGUYÊN TẮC:
1. Gây tò mò ngay từ đầu
2. Đánh vào pain point hoặc desire
3. Tạo urgency hoặc FOMO
4. Dùng số liệu hoặc facts gây shock

CRITICAL: Bạn PHẢI trả về JSON array. KHÔNG giải thích, KHÔNG markdown, KHÔNG text nào khác.`;

    // Build user prompt with strict JSON schema
    const userPrompt = `Tạo ${count} hooks cho chủ đề: "${topic}"

Trả về CHÍNH XÁC ${count} JSON objects trong array với format sau (KHÔNG có \`\`\`, KHÔNG có text khác):
[
  {
    "opening_line": "Câu hook thu hút attention",
    "visual_direction": "Mô tả ngắn về hình ảnh/video đi kèm", 
    "text_overlay": "Text hiển thị trên màn hình",
    "framework": "question|bold_statement|transformation|story|number|negative|social_proof|direct_address|shocking_fact|challenge",
    "psychology_reason": "Giải thích tâm lý tại sao hook này hiệu quả",
    "engagement_level": "high|medium|low"
  }
]`;

    // Calculate optimized max tokens
    const baseMaxTokens = 2048;
    const optimizedMaxTokens = channelOptimization 
      ? applyTokenOptimization(baseMaxTokens, channelOptimization)
      : baseMaxTokens;

    const result = await callAIWithMetrics(supabase, {
      functionName: 'generate-hooks',
      organizationId,
      userId,
      brandTemplateId,
      channels: platform ? [platform] : undefined,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperatureOverride: 0.8,
      maxTokensOverride: optimizedMaxTokens,
    });

    if (!result.success) {
      console.error('[generate-hooks] AI error:', result.error);
      
      if (result.error?.includes('Rate limit')) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (result.error?.includes('Payment')) {
        return new Response(
          JSON.stringify({ error: 'Credits exhausted. Please add more credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to generate hooks' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content = result.data?.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('[generate-hooks] No content in response');
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON from the response with robust handling
    let hooks;
    try {
      let jsonStr = content.trim();
      
      // Strip markdown code blocks (handle ```json, ``` variations)
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      
      // Also handle case where backticks are in the middle
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }
      
      // Try to find array first
      const arrayStart = jsonStr.indexOf('[');
      const arrayEnd = jsonStr.lastIndexOf(']');
      
      // If no array, try object
      const objStart = jsonStr.indexOf('{');
      const objEnd = jsonStr.lastIndexOf('}');
      
      if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart && 
          (arrayStart < objStart || objStart === -1)) {
        jsonStr = jsonStr.slice(arrayStart, arrayEnd + 1);
      } else if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
        jsonStr = jsonStr.slice(objStart, objEnd + 1);
      }
      
      hooks = JSON.parse(jsonStr);
      
      if (!Array.isArray(hooks)) {
        hooks = [hooks];
      }
    } catch (parseError) {
      console.error('[generate-hooks] Failed to parse response:', parseError, 'Raw:', content.substring(0, 300));
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Evaluate each hook
    const hooksWithEvaluations = await Promise.all(
      hooks.map(async (hook: any, idx: number) => {
        const hookChannel = platform || 'facebook';
        try {
          const evaluation = await evaluateHook(
            hook.opening_line || '',
            hookChannel,
            { brandVoice: brandVoice?.tone_of_voice?.join(', ') }
          );
          
          return {
            ...hook,
            platform: hookChannel, // Add platform to each hook
            evaluation: {
              score: evaluation.combinedScore,
              issues: evaluation.issues,
              strengths: evaluation.strengths,
            },
          };
        } catch (evalErr) {
          console.warn('[generate-hooks] Evaluation failed for hook', idx, ':', evalErr);
          return { ...hook, platform: hookChannel };
        }
      })
    );

    console.log('[generate-hooks] Generated', hooksWithEvaluations.length, 'hooks via', result.provider);

    return new Response(
      JSON.stringify({ hooks: hooksWithEvaluations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-hooks] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
