import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callAIWithMetrics } from "../_shared/ai-provider.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
import { createPromptManager } from "../_shared/prompt-integration.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PredictionRequest {
  adCopyId: string;
  variationId?: string;
}

interface PerformancePrediction {
  predicted_ctr: number;
  predicted_cpc: number;
  predicted_cpm: number;
  predicted_conversion_rate: number;
  predicted_roas: number;
  confidence_score: number;
  confidence_level: 'low' | 'medium' | 'high';
  benchmark_comparison: {
    ctr_vs_benchmark: 'above' | 'at' | 'below';
    ctr_diff_percent: number;
    cpc_vs_benchmark: 'above' | 'at' | 'below';
    cpc_diff_percent: number;
    roas_vs_benchmark: 'above' | 'at' | 'below';
    roas_diff_percent: number;
    benchmark_source: string;
    benchmark_sample_size: number;
  };
  factors: Array<{
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
    explanation: string;
  }>;
  improvement_suggestions: string[];
}

Deno.serve(withPerf({ functionName: 'predict-ad-performance', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    const body: PredictionRequest = await req.json();
    const { adCopyId, variationId } = body;

    console.log('[predict-ad-performance] Request:', { adCopyId, variationId });

    // Fetch ad copy with variations
    const { data: adCopy, error: adCopyError } = await supabase
      .from('ad_copies')
      .select(`
        *,
        brand_templates!ad_copies_brand_template_id_fkey(name, brand_name, industry),
        ad_copy_variations(*)
      `)
      .eq('id', adCopyId)
      .single();

    if (adCopyError || !adCopy) {
      console.error('[predict-ad-performance] Ad copy not found:', adCopyError);
      return new Response(JSON.stringify({ error: 'Ad copy not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get the specific variation or first one
    const variations = adCopy.ad_copy_variations || [];
    const targetVariation = variationId 
      ? variations.find((v: any) => v.id === variationId)
      : variations[0];

    if (!targetVariation) {
      return new Response(JSON.stringify({ error: 'No variation found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Fetch relevant benchmarks
    const industry = adCopy.brand_templates?.industry?.[0] || null;
    const { data: benchmarks } = await supabase
      .from('ad_copy_benchmarks')
      .select('*')
      .eq('platform', adCopy.platform)
      .or(`industry.eq.${industry},industry.is.null`)
      .limit(5);

    const benchmark = benchmarks?.find(b => b.objective === adCopy.objective) 
      || benchmarks?.find(b => b.industry === industry)
      || benchmarks?.[0];

    // Build content summary for AI analysis
    const contentSummary = `
Platform: ${adCopy.platform}
Objective: ${adCopy.objective}
Funnel Stage: ${adCopy.funnel_stage}
Industry: ${industry || 'General'}

Variation ${targetVariation.variation_label}:
- Primary Text: ${targetVariation.primary_text || 'N/A'} (${targetVariation.primary_text?.length || 0} chars)
- Headline: ${targetVariation.headline || 'N/A'} (${targetVariation.headline?.length || 0} chars)
- Description: ${targetVariation.description || 'N/A'} (${targetVariation.description?.length || 0} chars)
- CTA: ${targetVariation.cta_button}
${targetVariation.headlines?.length ? `- Headlines (RSA): ${targetVariation.headlines.length}` : ''}
${targetVariation.descriptions?.length ? `- Descriptions (RSA): ${targetVariation.descriptions.length}` : ''}

Benchmark Data (${benchmark?.data_source || 'industry_report'}):
- Avg CTR: ${benchmark?.avg_ctr || 1.0}%
- Avg CPC: ${benchmark?.avg_cpc || 5000} VND
- Avg CPM: ${benchmark?.avg_cpm || 30000} VND
- Avg Conversion Rate: ${benchmark?.avg_conversion_rate || 2.0}%
- Avg ROAS: ${benchmark?.avg_roas || 3.5}x
- Sample Size: ${benchmark?.sample_count || 0}
`.trim();

    // Try to fetch system prompt from registry with fallback
    const FALLBACK_SYSTEM = `Bạn là chuyên gia phân tích hiệu suất quảng cáo kỹ thuật số tại thị trường Việt Nam.
Dựa trên nội dung ad copy và dữ liệu benchmark được cung cấp, hãy dự đoán hiệu suất và phân tích các yếu tố ảnh hưởng.

QUAN TRỌNG:
1. Dự đoán phải dựa trên đặc điểm thực tế của nội dung quảng cáo
2. So sánh với benchmark của industry/platform tương ứng
3. Xác định các yếu tố tích cực và tiêu cực
4. Đưa ra gợi ý cải thiện cụ thể

Trả về JSON với cấu trúc sau:
{
  "predicted_ctr": number (0-10, phần trăm),
  "predicted_cpc": number (VND),
  "predicted_cpm": number (VND),
  "predicted_conversion_rate": number (0-10, phần trăm),
  "predicted_roas": number (0-10, lần),
  "confidence_score": number (0-100),
  "confidence_level": "low" | "medium" | "high",
  "benchmark_comparison": {...},
  "factors": [...],
  "improvement_suggestions": [...]
}

CHỈ trả về JSON hợp lệ, không có markdown hay giải thích.`;

    // Initialize supabase client for service operations
    const supabaseService = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    
    let systemPrompt = '';
    try {
      const promptManager = createPromptManager(supabaseService, 'predict-ad-performance', adCopy.organization_id);
      systemPrompt = await promptManager.get('system_predict', { 
        platform: adCopy.platform,
        objective: adCopy.objective,
        audience: industry || 'General'
      });
      console.log('[predict-ad-performance] Using prompt from registry');
    } catch (err) {
      console.warn('[predict-ad-performance] Failed to fetch prompt from registry, using hardcoded fallback');
    }
    const finalSystemPrompt = systemPrompt || FALLBACK_SYSTEM;

    // Get AI config from Admin Panel
    const aiConfig = await getAIConfig('predict-ad-performance', adCopy.organization_id);
    const adminModel = aiConfig?.model || undefined;

    // Use multi-provider system with auto metrics
    // Extract userId from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser } } = await supabaseService.auth.getUser(token);
    const userId = authUser?.id;

    const aiResult = await callAIWithMetrics(supabaseService, {
      functionName: 'predict-ad-performance',
      organizationId: adCopy.organization_id,
      userId,
      messages: [
        { role: 'system', content: finalSystemPrompt },
        { role: 'user', content: `Phân tích và dự đoán hiệu suất cho ad copy sau:\n\n${contentSummary}` },
      ],
      modelOverride: adminModel,
      temperatureOverride: aiConfig?.temperature,
      actionType: 'content_analysis',
    });

    if (!aiResult.success) {
      console.error('[predict-ad-performance] AI error:', aiResult.error);
      
      if (aiResult.error?.includes('429') || aiResult.error?.includes('rate')) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResult.error?.includes('402')) {
        return new Response(JSON.stringify({ error: 'Payment required, please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(aiResult.error || 'AI call failed');
    }

    const content = aiResult.data?.choices?.[0]?.message?.content || '';

    // Parse JSON response
    let prediction: PerformancePrediction;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      prediction = JSON.parse(cleanContent);
    } catch (e) {
      console.error('[predict-ad-performance] Parse error:', content);
      throw new Error('Failed to parse AI response');
    }

    console.log('[predict-ad-performance] Success:', { 
      confidence: prediction.confidence_score,
      ctr: prediction.predicted_ctr 
    });

    return new Response(JSON.stringify({
      prediction,
      variation: {
        id: targetVariation.id,
        label: targetVariation.variation_label,
      },
      benchmark: benchmark ? {
        platform: benchmark.platform,
        industry: benchmark.industry,
        objective: benchmark.objective,
        sample_count: benchmark.sample_count,
      } : null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[predict-ad-performance] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}));
