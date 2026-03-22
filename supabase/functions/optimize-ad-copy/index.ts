import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callAIWithMetrics } from "../_shared/ai-provider.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
import { createPromptManager } from "../_shared/prompt-integration.ts";
import { resolveUserId } from "../_shared/logger.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OptimizeRequest {
  variationId: string;
  headline?: string;
  primaryText?: string;
  description?: string;
  ctaButton?: string;
  platform?: string;
  objective?: string;
  optimizationGoal?: 'ctr' | 'conversion' | 'engagement';
}

Deno.serve(withPerf({ functionName: 'optimize-ad-copy' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: OptimizeRequest = await req.json();
    const { 
      headline, 
      primaryText, 
      description, 
      ctaButton, 
      platform = 'facebook', 
      objective = 'conversions',
      optimizationGoal = 'ctr'
    } = request;

    // Build the content to optimize
    const contentParts = [];
    if (headline) contentParts.push(`Current Headline: "${headline}"`);
    if (primaryText) contentParts.push(`Current Primary Text: "${primaryText}"`);
    if (description) contentParts.push(`Current Description: "${description}"`);
    if (ctaButton) contentParts.push(`Current CTA: "${ctaButton}"`);

    if (contentParts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No content to optimize' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to fetch system prompt from registry with fallback
    const FALLBACK_SYSTEM = `You are a digital ad optimization expert with 10+ years of experience.

**Optimization Principles:**
- Power Words: Use impactful words (Free, Exclusive, Secret, Discover...)
- Urgency: Create time pressure (Only 24h left, Limited quantity...)
- Social Proof: Evidence (10,000+ customers, Trusted by...)
- Benefit Focus: Focus on customer benefits, not features
- Question Hook: Ask curiosity-provoking questions
- Number Specificity: Specific data builds trust
- Emotional Trigger: Activate emotions
- Scarcity: Create scarcity

Respond in the same language as the ad copy provided.`;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve userId for cost tracking
    const userId = await resolveUserId(req, supabase);


    let systemPrompt = '';
    try {
      const promptManager = createPromptManager(supabase, 'optimize-ad-copy');
      systemPrompt = await promptManager.get('system_optimize', { 
        platform,
        objective,
        current_score: '0'
      });
      console.log('[optimize-ad-copy] Using prompt from registry');
    } catch (err) {
      console.warn('[optimize-ad-copy] Failed to fetch prompt from registry, using hardcoded fallback');
    }
    const finalSystemPrompt = systemPrompt || FALLBACK_SYSTEM;

    const prompt = `Analyze and suggest improvements for the following ad copy:

${contentParts.join('\n')}

**Context:**
- Platform: ${platform}
- Objective: ${objective}
- Optimization goal: ${optimizationGoal === 'ctr' ? 'Increase CTR' : optimizationGoal === 'conversion' ? 'Increase Conversion Rate' : 'Increase Engagement'}

**Requirements:**
Suggest 2-4 specific improvements, each must include:
1. Field to improve (headline, primary_text, description, cta)
2. New suggested content (in the SAME LANGUAGE as the original ad copy)
3. Predicted improvement % (realistic: 5-25%)
4. Metric that will improve (ctr, conversion_rate, engagement)
5. Confidence level (low/medium/high)
6. Why this improvement works (in the same language as the ad copy)
7. Technique used: power_words, urgency, social_proof, benefit_focus, question_hook, number_specificity, emotional_trigger, scarcity

Return JSON in this format:
{
  "suggestions": [
    {
      "field": "headline" | "primary_text" | "description" | "cta",
      "original": "current content",
      "suggested": "new suggested content",
      "predicted_improvement": number (5-25),
      "improvement_metric": "ctr" | "conversion_rate" | "engagement",
      "confidence": "low" | "medium" | "high",
      "reason": "Brief explanation, 1-2 sentences",
      "technique": "string"
    }
  ]
}

Return JSON only, no other text.`;

    // Get AI config from Admin Panel
    const aiConfig = await getAIConfig('optimize-ad-copy');
    const adminModel = aiConfig?.model || undefined;

    // Use multi-provider system with auto metrics
    const aiResult = await callAIWithMetrics(supabase, {
      functionName: 'optimize-ad-copy',
      userId,
      messages: [
        { role: "system", content: finalSystemPrompt },
        { role: "user", content: prompt }
      ],
      modelOverride: adminModel,
      temperatureOverride: aiConfig?.temperature,
      actionType: 'content_optimization',
    });

    if (!aiResult.success) {
      console.error("AI error:", aiResult.error);
      throw new Error(aiResult.error || 'AI call failed');
    }

    const text = aiResult.data?.choices?.[0]?.message?.content || "";
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to parse AI response:', text);
      throw new Error('Failed to parse AI response');
    }

    const optimizeResult = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify(optimizeResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Optimize ad copy error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
