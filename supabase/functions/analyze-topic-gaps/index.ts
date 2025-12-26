import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TopicGap {
  pillar: string;
  gapType: 'missing' | 'underperforming' | 'overdue';
  severity: 'high' | 'medium' | 'low';
  reason: string;
  suggestedTopics: string[];
  priority: number;
}

interface ClusterResult {
  clusterId: string;
  clusterName: string;
  topics: string[];
  avgPerformance: number;
  topKeywords: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brandTemplateId, contentGoal, organizationId, analysisType } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch topic history for analysis
    let query = supabase
      .from('topic_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    if (brandTemplateId) {
      query = query.eq('brand_template_id', brandTemplateId);
    }

    const { data: topicHistory, error: historyError } = await query;
    if (historyError) throw historyError;

    // Fetch brand template for context
    let brandContext = null;
    if (brandTemplateId) {
      const { data: brand } = await supabase
        .from('brand_templates')
        .select('brand_name, brand_positioning, content_pillars, tone_of_voice, industry')
        .eq('id', brandTemplateId)
        .single();
      brandContext = brand;
    }

    // Prepare data for AI analysis
    const existingTopics = topicHistory?.map(t => ({
      topic: t.topic,
      category: t.category,
      pillar: t.pillar,
      wasUsed: t.was_used,
      performance: t.performance_score,
      createdAt: t.created_at,
    })) || [];

    const contentPillars = brandContext?.content_pillars || [];
    
    // Build the analysis prompt based on type
    let systemPrompt = `Bạn là chuyên gia phân tích content marketing. Phân tích dữ liệu và trả về JSON hợp lệ.`;
    let userPrompt = '';

    if (analysisType === 'gap') {
      userPrompt = `Phân tích GAP trong content strategy:

Brand: ${brandContext?.brand_name || 'Unknown'}
Positioning: ${brandContext?.brand_positioning || 'N/A'}
Content Pillars: ${JSON.stringify(contentPillars)}
Content Goal: ${contentGoal}

Các topics đã có (${existingTopics.length}):
${existingTopics.slice(0, 30).map(t => `- ${t.topic} (pillar: ${t.pillar || 'none'}, perf: ${t.performance || 'N/A'})`).join('\n')}

Tìm:
1. Content pillars nào thiếu topics?
2. Topics nào cần cải thiện (underperforming)?
3. Chủ đề nào đã lâu không dùng (overdue)?

Trả về JSON với format:
{
  "gaps": [
    {
      "pillar": "tên pillar",
      "gapType": "missing|underperforming|overdue",
      "severity": "high|medium|low",
      "reason": "lý do ngắn gọn",
      "suggestedTopics": ["topic 1", "topic 2", "topic 3"],
      "priority": 1-10
    }
  ],
  "insights": "tóm tắt insights chính",
  "recommendations": ["khuyến nghị 1", "khuyến nghị 2"]
}`;
    } else if (analysisType === 'cluster') {
      userPrompt = `Phân cụm (cluster) các topics theo semantic similarity:

Các topics (${existingTopics.length}):
${existingTopics.slice(0, 50).map(t => `- ${t.topic}`).join('\n')}

Nhóm các topics có nội dung/ý nghĩa tương tự lại với nhau.
Mỗi cluster nên có ít nhất 2 topics.

Trả về JSON với format:
{
  "clusters": [
    {
      "clusterId": "cluster_1",
      "clusterName": "Tên mô tả ngắn cho nhóm",
      "topics": ["topic 1", "topic 2"],
      "topKeywords": ["keyword1", "keyword2", "keyword3"],
      "avgPerformance": 75
    }
  ],
  "unclustered": ["topic không thuộc nhóm nào"],
  "summary": "tóm tắt về phân bố clusters"
}`;
    } else if (analysisType === 'keywords') {
      userPrompt = `Mở rộng từ khóa cho content strategy:

Brand: ${brandContext?.brand_name || 'Unknown'}
Industry: ${JSON.stringify(brandContext?.industry || [])}
Content Goal: ${contentGoal}

Keywords đã có từ topics:
${existingTopics.slice(0, 30).map(t => t.topic).join(', ')}

Đề xuất:
1. Từ khóa liên quan (LSI keywords)
2. Từ khóa trending trong ngành
3. Long-tail keywords tiềm năng
4. Từ khóa đối thủ có thể đang dùng

Trả về JSON với format:
{
  "lsiKeywords": ["keyword1", "keyword2"],
  "trendingKeywords": ["keyword1", "keyword2"],
  "longTailKeywords": ["keyword phrase 1", "keyword phrase 2"],
  "competitorKeywords": ["keyword1", "keyword2"],
  "keywordClusters": [
    { "theme": "tên theme", "keywords": ["kw1", "kw2", "kw3"] }
  ]
}`;
    } else if (analysisType === 'refine') {
      const { topicToRefine } = await req.json();
      userPrompt = `Tinh chỉnh và cải thiện topic sau:

Topic gốc: "${topicToRefine}"
Brand: ${brandContext?.brand_name || 'Unknown'}
Positioning: ${brandContext?.brand_positioning || 'N/A'}
Tone: ${JSON.stringify(brandContext?.tone_of_voice || [])}
Content Goal: ${contentGoal}

Đề xuất:
1. 3-5 biến thể tốt hơn của topic này
2. Góc nhìn độc đáo hơn
3. Điều chỉnh cho phù hợp brand voice

Trả về JSON với format:
{
  "original": "${topicToRefine}",
  "refinedVersions": [
    {
      "topic": "phiên bản mới",
      "improvement": "mô tả ngắn về cải thiện",
      "angle": "góc nhìn mới",
      "brandFitScore": 85
    }
  ],
  "bestChoice": "topic tốt nhất",
  "reasoning": "lý do chọn"
}`;
    }

    console.log(`Analyzing topics - Type: ${analysisType}, Topics: ${existingTopics.length}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      result = { error: 'Failed to parse AI response', raw: content };
    }

    return new Response(JSON.stringify({
      success: true,
      analysisType,
      result,
      topicsAnalyzed: existingTopics.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in analyze-topic-gaps:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
