// ============================================
// Enrich Industry Personas - AI-powered persona generation
// Generates target personas for global packs
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichRequest {
  global_pack_id?: string;
  industry_code?: string;
  batch_size?: number;
  enrich_empty_only?: boolean;
}

// Persona templates based on target audience
const B2B_PERSONAS = [
  {
    name: 'Decision Maker',
    age_range: '35-50',
    gender: 'all',
    income_level: 'very_high',
    occupation: 'C-Level / Director',
    communication_style: 'analytical',
    price_sensitivity: 'low',
    pain_points: ['Thiếu thời gian', 'Cần ROI rõ ràng', 'Rủi ro khi thay đổi'],
    goals: ['Tăng hiệu quả', 'Giảm chi phí', 'Competitive advantage'],
    objections: ['Chi phí cao', 'Khó tích hợp', 'Track record chưa đủ'],
  },
  {
    name: 'Implementer',
    age_range: '28-40',
    gender: 'all',
    income_level: 'high',
    occupation: 'Manager / Team Lead',
    communication_style: 'consultative',
    price_sensitivity: 'moderate',
    pain_points: ['Công cụ phức tạp', 'Thiếu hỗ trợ', 'Khó đào tạo team'],
    goals: ['Dễ sử dụng', 'Tài liệu đầy đủ', 'Support nhanh'],
    objections: ['Learning curve cao', 'Thiếu tích hợp', 'Pricing phức tạp'],
  },
  {
    name: 'End User',
    age_range: '25-35',
    gender: 'all',
    income_level: 'medium',
    occupation: 'Specialist / Staff',
    communication_style: 'direct',
    price_sensitivity: 'sensitive',
    pain_points: ['Workflow phức tạp', 'Thiếu training', 'Tools không đồng bộ'],
    goals: ['Tiết kiệm thời gian', 'Dễ học', 'Tích hợp tốt'],
    objections: ['Khó học', 'Chậm', 'Thiếu tính năng'],
  },
];

const B2C_PERSONAS = [
  {
    name: 'Value Seeker',
    age_range: '25-35',
    gender: 'all',
    income_level: 'medium',
    occupation: 'Nhân viên văn phòng',
    communication_style: 'direct',
    price_sensitivity: 'very_sensitive',
    pain_points: ['Budget hạn chế', 'Sợ mua phải hàng kém', 'Không có thời gian'],
    goals: ['Giá tốt nhất', 'Chất lượng đảm bảo', 'Mua nhanh gọn'],
    objections: ['Giá cao hơn đối thủ', 'Chưa biết brand', 'Ship chậm'],
  },
  {
    name: 'Quality Conscious',
    age_range: '30-45',
    gender: 'all',
    income_level: 'high',
    occupation: 'Professional',
    communication_style: 'consultative',
    price_sensitivity: 'moderate',
    pain_points: ['Khó tìm hàng chất lượng', 'Dịch vụ kém', 'Thiếu thông tin'],
    goals: ['Chất lượng cao', 'Dịch vụ tốt', 'Thông tin đầy đủ'],
    objections: ['Giá không xứng chất lượng', 'Review ít', 'Chính sách đổi trả'],
  },
  {
    name: 'Convenience Buyer',
    age_range: '22-40',
    gender: 'all',
    income_level: 'medium',
    occupation: 'Đa dạng',
    communication_style: 'emotional',
    price_sensitivity: 'sensitive',
    pain_points: ['Thiếu thời gian', 'Quy trình mua phức tạp', 'Ship lâu'],
    goals: ['Mua nhanh', 'Ship nhanh', 'Dễ dàng'],
    objections: ['Quy trình dài', 'Thanh toán phức tạp', 'Theo dõi đơn khó'],
  },
];

Deno.serve(withPerf({ functionName: 'enrich-personas', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: EnrichRequest = await req.json();
    const { global_pack_id, industry_code, batch_size = 10, enrich_empty_only = true } = body;

    let packsToEnrich: Array<{ id: string; industry_code: string; target_audience: string }> = [];

    if (global_pack_id) {
      // Single pack
      const { data: pack } = await supabase
        .from('industry_global_packs')
        .select('id, industry_code, target_audience')
        .eq('id', global_pack_id)
        .single();
      
      if (pack) packsToEnrich.push(pack);
    } else if (industry_code) {
      // By industry code
      const { data: pack } = await supabase
        .from('industry_global_packs')
        .select('id, industry_code, target_audience')
        .eq('industry_code', industry_code)
        .eq('is_active', true)
        .single();
      
      if (pack) packsToEnrich.push(pack);
    } else {
      // Batch: Get packs without personas
      let query = supabase
        .from('industry_global_packs')
        .select('id, industry_code, target_audience')
        .eq('is_active', true)
        .limit(batch_size);

      const { data: packs } = await query;
      
      if (enrich_empty_only && packs) {
        // Filter to only packs without personas
        for (const pack of packs) {
          const { count } = await supabase
            .from('industry_personas_v2')
            .select('id', { count: 'exact', head: true })
            .eq('global_pack_id', pack.id)
            .eq('is_active', true);
          
          if ((count || 0) === 0) {
            packsToEnrich.push(pack);
          }
        }
      } else {
        packsToEnrich = packs || [];
      }
    }

    let createdCount = 0;
    const results: string[] = [];

    for (const pack of packsToEnrich) {
      const personas = getPersonasForAudience(pack.target_audience);
      
      for (let i = 0; i < personas.length; i++) {
        const persona = personas[i];
        const { error } = await supabase
          .from('industry_personas_v2')
          .insert({
            global_pack_id: pack.id,
            name: persona.name,
            description: `Default ${persona.name} persona for ${pack.industry_code}`,
            age_range: persona.age_range,
            gender: persona.gender,
            income_level: persona.income_level,
            occupation: persona.occupation,
            communication_style: persona.communication_style,
            price_sensitivity: persona.price_sensitivity,
            pain_points: persona.pain_points,
            goals: persona.goals,
            objections: persona.objections,
            is_active: true,
            sort_order: i,
            values: [],
            interests: [],
            personality_traits: [],
            buying_motivation: [],
            decision_factors: [],
            preferred_channels: [],
            social_platforms: [],
            content_consumption: [],
            response_tone_hints: [],
            device_usage: {},
            content_preferences: { format: 'medium', practical: true },
            journey_stages: [],
            country_variants: {},
            created_by: user.id,
          });

        if (!error) {
          createdCount++;
        }
      }
      
      results.push(`${pack.industry_code}: ${personas.length} personas`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        packs_processed: packsToEnrich.length,
        personas_created: createdCount,
        details: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[enrich-personas] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

function getPersonasForAudience(targetAudience: string): typeof B2B_PERSONAS {
  switch (targetAudience) {
    case 'B2B':
      return B2B_PERSONAS;
    case 'B2C':
      return B2C_PERSONAS;
    case 'both':
      // Return mix: 2 B2B + 2 B2C
      return [B2B_PERSONAS[0], B2B_PERSONAS[1], B2C_PERSONAS[0], B2C_PERSONAS[1]];
    default:
      return B2C_PERSONAS;
  }
}
