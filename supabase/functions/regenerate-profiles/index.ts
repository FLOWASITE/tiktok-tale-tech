// ============================================
// Regenerate Industry Jurisdiction Profiles
// Trigger: Manual or on global pack update
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegenerateRequest {
  global_pack_id?: string;
  globalPackId?: string; // Support camelCase from frontend
  jurisdiction_code?: string;
  jurisdictionCode?: string; // Support camelCase from frontend
  regenerate_all?: boolean;
  regenerateAll?: boolean; // Support camelCase from frontend
}

Deno.serve(withPerf({ functionName: 'regenerate-profiles', slowThresholdMs: 30000 }, async (req) => {
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

    // Verify admin role
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RegenerateRequest = await req.json();
    // Support both snake_case and camelCase from frontend
    const global_pack_id = body.global_pack_id || body.globalPackId;
    const jurisdiction_code = body.jurisdiction_code || body.jurisdictionCode;
    const regenerate_all = body.regenerate_all || body.regenerateAll;

    let regeneratedCount = 0;
    const errors: string[] = [];

    if (regenerate_all) {
      // Regenerate all profiles
      const { data: allPacks } = await supabase
        .from('industry_global_packs')
        .select('id, industry_code')
        .eq('is_active', true);

      for (const pack of allPacks || []) {
        const { data: profiles } = await supabase
          .from('industry_jurisdiction_profiles')
          .select('id, jurisdiction_code')
          .eq('global_pack_id', pack.id);

        for (const profile of profiles || []) {
          const result = await regenerateProfile(supabase, pack.id, profile.jurisdiction_code);
          if (result.success) {
            regeneratedCount++;
          } else {
            errors.push(`${pack.industry_code}/${profile.jurisdiction_code}: ${result.error}`);
          }
        }
      }
    } else if (global_pack_id) {
      if (jurisdiction_code) {
        // Regenerate specific profile
        const result = await regenerateProfile(supabase, global_pack_id, jurisdiction_code);
        if (result.success) {
          regeneratedCount = 1;
        } else {
          errors.push(result.error || 'Unknown error');
        }
      } else {
        // Regenerate all profiles for a pack
        const { data: profiles } = await supabase
          .from('industry_jurisdiction_profiles')
          .select('jurisdiction_code')
          .eq('global_pack_id', global_pack_id);

        for (const profile of profiles || []) {
          const result = await regenerateProfile(supabase, global_pack_id, profile.jurisdiction_code);
          if (result.success) {
            regeneratedCount++;
          } else {
            errors.push(`${profile.jurisdiction_code}: ${result.error}`);
          }
        }
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Missing global_pack_id or regenerate_all flag' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        regenerated: regeneratedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[regenerate-profiles] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

async function regenerateProfile(
  supabase: any,
  globalPackId: string,
  jurisdictionCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Fetch global pack
    const { data: pack, error: packError } = await supabase
      .from('industry_global_packs')
      .select('*')
      .eq('id', globalPackId)
      .single();

    if (packError || !pack) {
      return { success: false, error: 'Global pack not found' };
    }

    // 2. Fetch translations
    const { data: translations } = await supabase
      .from('industry_pack_translations')
      .select('language_code, name, short_name, preferred_terms, forbidden_terms, glossary')
      .eq('global_pack_id', globalPackId);

    const translationMap: Record<string, any> = {};
    for (const t of translations || []) {
      translationMap[t.language_code] = t;
    }

    // 3. Build names object
    const names: Record<string, string> = {};
    for (const [lang, trans] of Object.entries(translationMap)) {
      names[lang] = (trans as any).name;
    }

    // 4. Build terminology
    const terminology = {
      forbidden_terms: pack.global_terminology?.forbidden_terms_global || [],
      preferred_terms: translationMap[jurisdictionCode]?.preferred_terms || 
                       translationMap['vi']?.preferred_terms || [],
      forbidden_words_local: pack.global_terminology?.forbidden_words_by_lang?.[jurisdictionCode] ||
                             translationMap[jurisdictionCode]?.forbidden_terms || [],
    };

    // 5. Build resolved_rules
    const resolvedRules = {
      industry_code: pack.industry_code,
      jurisdiction_code: jurisdictionCode,
      names,
      target_audience: pack.target_audience || 'both',
      brand_voice: pack.global_brand_voice || {},
      terminology,
      compliance_rules: pack.global_compliance_rules || [],
      claim_restrictions: pack.global_claim_restrictions || [],
      argument_patterns: pack.global_argument_patterns || { valid_patterns: [], forbidden_patterns: [] },
      system_rules: pack.global_system_rules || [],
      key_regulations: [],
      industry_trends: [],
      risk_guidelines: pack.risk_guidelines || {
        high_risk_keywords: [],
        scoring_weights: {},
        risk_thresholds: { low: 0, medium: 30, high: 60, blocked: 80 },
      },
      related_industries: pack.related_industries || [],
      disclaimer: getDefaultDisclaimer(jurisdictionCode),
    };

    // 6. Upsert profile
    const { error: upsertError } = await supabase
      .from('industry_jurisdiction_profiles')
      .upsert({
        global_pack_id: globalPackId,
        jurisdiction_code: jurisdictionCode,
        resolved_rules: resolvedRules,
        validity_status: 'current',
        disclaimer: resolvedRules.disclaimer,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'global_pack_id,jurisdiction_code',
      });

    if (upsertError) {
      return { success: false, error: upsertError.message };
    }

    console.log(`[regenerate-profiles] Regenerated ${pack.industry_code}/${jurisdictionCode}`);
    return { success: true };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

function getDefaultDisclaimer(jurisdictionCode: string): string {
  const disclaimers: Record<string, string> = {
    VN: 'Thông tin chỉ mang tính tham khảo. Vui lòng kiểm tra nguồn chính thức để đảm bảo tuân thủ pháp luật Việt Nam.',
    SG: 'Information is for reference only. Please verify with official sources for Singapore regulatory compliance.',
    TH: 'Information is for reference only. Please verify with official sources for Thailand regulatory compliance.',
    ID: 'Information is for reference only. Please verify with official sources for Indonesia regulatory compliance.',
    US: 'Information is for reference only. Please verify with official sources for US regulatory compliance.',
    EU: 'Information is for reference only. Please verify with official sources for EU regulatory compliance.',
  };
  return disclaimers[jurisdictionCode] || 'Information is for reference only. Please verify with official sources.';
}
