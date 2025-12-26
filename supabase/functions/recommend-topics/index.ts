import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecommendationRequest {
  brandTemplateId?: string;
  contentGoal?: string;
  organizationId?: string;
  recommendationType: 'next_best' | 'weekly' | 'conflict_check' | 'learning_feedback';
  topics?: string[]; // For conflict check
  feedbackData?: {
    topicId: string;
    feedback: 'positive' | 'negative';
    reason?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      brandTemplateId, 
      contentGoal, 
      organizationId,
      recommendationType,
      topics,
      feedbackData
    } = await req.json() as RecommendationRequest;

    console.log(`Processing recommendation: ${recommendationType}`);

    // Fetch brand context if available
    let brandContext = '';
    let contentPillars: string[] = [];
    if (brandTemplateId) {
      const { data: brand } = await supabase
        .from('brand_templates')
        .select('brand_name, brand_positioning, tone_of_voice, content_pillars, industry')
        .eq('id', brandTemplateId)
        .single();

      if (brand) {
        brandContext = `
Brand: ${brand.brand_name}
Positioning: ${brand.brand_positioning || 'N/A'}
Tone: ${(brand.tone_of_voice || []).join(', ')}
Industry: ${(brand.industry || []).join(', ')}`;
        
        if (brand.content_pillars) {
          const pillars = brand.content_pillars as any[];
          contentPillars = pillars.map(p => p.name || p);
        }
      }
    }

    // Fetch topic history for context
    const { data: recentTopics } = await supabase
      .from('topic_history')
      .select('topic, category, content_goal, feedback, performance_score, created_at, pillar')
      .eq(organizationId ? 'organization_id' : 'brand_template_id', organizationId || brandTemplateId)
      .order('created_at', { ascending: false })
      .limit(50);

    const topicHistoryContext = recentTopics?.length 
      ? recentTopics.map(t => `- ${t.topic} (${t.category}, feedback: ${t.feedback || 'none'}, score: ${t.performance_score || 'N/A'})`).join('\n')
      : 'No topic history available';

    // Build prompt based on recommendation type
    let systemPrompt = '';
    let userPrompt = '';

    switch (recommendationType) {
      case 'next_best':
        systemPrompt = `You are an expert content strategist. Analyze the brand context and topic history to recommend the SINGLE best topic to create next.
Consider:
- Content gaps (pillars not covered recently)
- High-performing topic patterns
- Current trends and timing
- Brand voice alignment
Return JSON with: { "topic": string, "reason": string, "confidence": number (0-100), "pillar": string, "suggestedFormat": string, "timing": string }`;
        
        userPrompt = `${brandContext}

Content Goal: ${contentGoal || 'engagement'}
Content Pillars: ${contentPillars.join(', ') || 'Not defined'}

Recent Topic History:
${topicHistoryContext}

What is the SINGLE best topic to create next? Provide your recommendation in Vietnamese.`;
        break;

      case 'weekly':
        systemPrompt = `You are an expert content strategist. Create a balanced weekly content plan with 5-7 topic suggestions.
Consider:
- Cover different content pillars
- Mix of formats (educational, entertaining, promotional)
- Optimal posting schedule
- Past performance patterns
Return JSON with: { "weeklyPlan": [{ "day": string, "topic": string, "pillar": string, "format": string, "reason": string, "priority": number (1-10) }], "weekTheme": string, "insights": string }`;
        
        userPrompt = `${brandContext}

Content Goal: ${contentGoal || 'engagement'}
Content Pillars: ${contentPillars.join(', ') || 'Not defined'}

Recent Topic History:
${topicHistoryContext}

Create a weekly content plan with 5-7 diverse topics. Respond in Vietnamese.`;
        break;

      case 'conflict_check':
        systemPrompt = `You are a content conflict detector. Analyze the given topics for potential conflicts:
- Duplicate/overlapping topics
- Contradicting messages
- Cannibalization (competing for same audience)
- Timing conflicts
Return JSON with: { "conflicts": [{ "topics": string[], "type": "duplicate" | "contradiction" | "cannibalization" | "timing", "severity": "high" | "medium" | "low", "explanation": string, "resolution": string }], "summary": string }`;
        
        userPrompt = `${brandContext}

Topics to check for conflicts:
${(topics || []).map((t, i) => `${i + 1}. ${t}`).join('\n')}

Recent published topics:
${topicHistoryContext}

Identify any conflicts. Respond in Vietnamese.`;
        break;

      case 'learning_feedback':
        systemPrompt = `You are an AI learning from user feedback to improve future recommendations.
Analyze the feedback pattern and generate insights for better recommendations.
Return JSON with: { "learnings": string[], "adjustments": { "preferMore": string[], "preferLess": string[], "avoidPatterns": string[] }, "confidenceBoost": number }`;
        
        userPrompt = `${brandContext}

User just provided feedback:
- Topic: ${feedbackData?.topicId}
- Feedback: ${feedbackData?.feedback}
- Reason: ${feedbackData?.reason || 'Not specified'}

Topic history with feedback:
${topicHistoryContext}

What should we learn from this to improve future recommendations? Respond in Vietnamese.`;
        break;
    }

    // Call AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI response received');

    // Parse JSON from response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Return structured fallback based on type
      switch (recommendationType) {
        case 'next_best':
          result = {
            topic: 'Không thể tạo đề xuất',
            reason: 'Hãy thử lại sau',
            confidence: 0,
            pillar: 'general',
            suggestedFormat: 'post',
            timing: 'anytime'
          };
          break;
        case 'weekly':
          result = { weeklyPlan: [], weekTheme: '', insights: 'Không thể tạo kế hoạch' };
          break;
        case 'conflict_check':
          result = { conflicts: [], summary: 'Không phát hiện xung đột' };
          break;
        case 'learning_feedback':
          result = { learnings: [], adjustments: { preferMore: [], preferLess: [], avoidPatterns: [] }, confidenceBoost: 0 };
          break;
      }
    }

    return new Response(
      JSON.stringify({ success: true, result, type: recommendationType }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Recommendation error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
