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

    // Fetch brand context with extended fields + personas + products in parallel
    let brandContext = '';
    let contentPillars: string[] = [];
    let personasContext = '';
    let productsContext = '';
    
    if (brandTemplateId) {
      const [brandResult, personasResult, productsResult] = await Promise.all([
        supabase
          .from('brand_templates')
          .select(`
            brand_name, brand_positioning, tone_of_voice, content_pillars, industry,
            unique_value_proposition, mission, main_competitors, competitive_advantages,
            evergreen_themes, target_age_range, target_gender
          `)
          .eq('id', brandTemplateId)
          .single(),
        supabase
          .from('customer_personas')
          .select('name, occupation, age_range, pain_points, desires, buying_triggers, objections, is_primary')
          .eq('brand_template_id', brandTemplateId)
          .order('is_primary', { ascending: false })
          .limit(5),
        supabase
          .from('brand_products')
          .select('name, category, description, unique_selling_points, pain_points_solved, suggested_content_angles, is_featured')
          .eq('brand_template_id', brandTemplateId)
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .limit(5)
      ]);

      if (brandResult.data) {
        const brand = brandResult.data;
        brandContext = `
Brand: ${brand.brand_name}
Positioning: ${brand.brand_positioning || 'N/A'}
UVP: ${brand.unique_value_proposition || 'N/A'}
Mission: ${brand.mission || 'N/A'}
Tone: ${(brand.tone_of_voice || []).join(', ')}
Industry: ${(brand.industry || []).join(', ')}
Target: ${brand.target_age_range || ''} ${brand.target_gender || ''}
Competitive Advantages: ${(brand.competitive_advantages || []).join(', ')}
Evergreen Themes: ${(brand.evergreen_themes || []).join(', ')}`;
        
        if (brand.content_pillars) {
          const pillars = brand.content_pillars as any[];
          contentPillars = pillars.map(p => p.name || p);
        }
      }

      // Build personas context
      if (personasResult.data?.length) {
        personasContext = `

## CUSTOMER PERSONAS:
${personasResult.data.map((p: any) => `
- ${p.name}${p.is_primary ? ' ⭐ Primary' : ''} (${p.occupation || 'N/A'}, ${p.age_range || 'N/A'})
  Pain Points: ${(p.pain_points || []).slice(0, 3).join(', ')}
  Desires: ${(p.desires || []).slice(0, 3).join(', ')}
  Objections: ${(p.objections || []).slice(0, 2).join(', ')}
  Buying Triggers: ${(p.buying_triggers || []).slice(0, 3).join(', ')}`).join('\n')}
→ Topics PHẢI giải quyết pain points hoặc khơi gợi desires của personas`;
        console.log('Loaded', personasResult.data.length, 'personas');
      }

      // Build products context
      if (productsResult.data?.length) {
        productsContext = `

## PRODUCTS/SERVICES:
${productsResult.data.map((p: any) => `
- ${p.is_featured ? '⭐ ' : ''}${p.name}${p.category ? ` (${p.category})` : ''}
  USPs: ${(p.unique_selling_points || []).slice(0, 2).join(', ')}
  Solves: ${(p.pain_points_solved || []).slice(0, 2).join(', ')}
  Content Angles: ${(p.suggested_content_angles || []).slice(0, 2).join(', ')}`).join('\n')}
→ Có thể tạo topics về use cases, benefits, testimonials của sản phẩm`;
        console.log('Loaded', productsResult.data.length, 'products');
      }

      // Combine all contexts
      brandContext = brandContext + personasContext + productsContext;
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

    // NEW: Fetch trending topics from database (enriched with Perplexity data)
    let trendingContext = '';
    let trendingTopicsData: any[] = [];
    
    if (recommendationType === 'next_best' || recommendationType === 'weekly') {
      const { data: trendingTopics } = await supabase
        .from('trending_topics')
        .select('topic, category, velocity_score, peak_status, suggested_angles, source')
        .eq('organization_id', organizationId)
        .gt('expires_at', new Date().toISOString())
        .order('velocity_score', { ascending: false })
        .limit(10);

      if (trendingTopics && trendingTopics.length > 0) {
        trendingTopicsData = trendingTopics;
        trendingContext = `
## XU HƯỚNG ĐANG HOT (Real-time từ Perplexity Web Search + Curated Data):
${trendingTopics.map((t, i) => 
  `${i+1}. "${t.topic}" (velocity: ${t.velocity_score}/100, status: ${t.peak_status}, nguồn: ${t.source})
   - Góc độ gợi ý: ${(t.suggested_angles || []).slice(0, 2).join(', ')}`
).join('\n')}

⚡ ƯU TIÊN: Tích hợp các xu hướng này vào đề xuất khi phù hợp với brand! Nếu đề xuất dựa trên trending, hãy indicate rõ trong response.
`;
        console.log(`Found ${trendingTopics.length} trending topics for context`);
      } else {
        console.log('No fresh trending data available');
      }
    }

    // Build prompt based on recommendation type
    let systemPrompt = '';
    let userPrompt = '';

    switch (recommendationType) {
      case 'next_best':
        systemPrompt = `You are an expert content strategist. Analyze the brand context, topic history, and REAL-TIME TRENDING DATA to recommend the SINGLE best topic to create next.
Consider:
- Content gaps (pillars not covered recently)
- High-performing topic patterns  
- PRIORITIZE trending topics when they align with brand
- Current trends and timing
- Brand voice alignment

Return JSON with: { 
  "topic": string, 
  "reason": string, 
  "confidence": number (0-100), 
  "pillar": string, 
  "suggestedFormat": string, 
  "timing": string,
  "trendingMatch": { "topic": string, "velocityScore": number, "source": "web_search" | "curated_event" | "curated_news" } | null 
}

If your recommendation is based on or inspired by a trending topic, include trendingMatch. Otherwise set it to null.`;
        
        userPrompt = `${brandContext}

Content Goal: ${contentGoal || 'engagement'}
Content Pillars: ${contentPillars.join(', ') || 'Not defined'}

Recent Topic History:
${topicHistoryContext}
${trendingContext}

What is the SINGLE best topic to create next? PRIORITIZE trending topics if they fit the brand. Provide your recommendation in Vietnamese.`;
        break;

      case 'weekly':
        systemPrompt = `You are an expert content strategist. Create a balanced weekly content plan with 5-7 topic suggestions.
Consider:
- Cover different content pillars
- Mix of formats (educational, entertaining, promotional)
- INTEGRATE trending topics when relevant
- Optimal posting schedule
- Past performance patterns

Return JSON with: { 
  "weeklyPlan": [{ 
    "day": string, 
    "topic": string, 
    "pillar": string, 
    "format": string, 
    "reason": string, 
    "priority": number (1-10),
    "isTrendingBased": boolean,
    "trendingSource": string | null
  }], 
  "weekTheme": string, 
  "insights": string,
  "trendingTopicsUsed": number
}

For topics inspired by trending data, set isTrendingBased: true and include trendingSource (the original trending topic name).`;
        
        userPrompt = `${brandContext}

Content Goal: ${contentGoal || 'engagement'}
Content Pillars: ${contentPillars.join(', ') || 'Not defined'}

Recent Topic History:
${topicHistoryContext}
${trendingContext}

Create a weekly content plan with 5-7 diverse topics. INTEGRATE trending topics where appropriate. Respond in Vietnamese.`;
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
      console.error('AI API error:', aiResponse.status, errorText);
      
      // Handle rate limit and payment errors specifically
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Đã vượt quá giới hạn request. Vui lòng thử lại sau.',
            errorCode: 'RATE_LIMIT'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'AI credits đã hết. Vui lòng nạp thêm tại Settings → Usage.',
            errorCode: 'CREDITS_EXHAUSTED'
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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
