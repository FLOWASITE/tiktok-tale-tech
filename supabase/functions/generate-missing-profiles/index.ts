// ============================================
// Generate Missing Industry Jurisdiction Profiles
// Creates VN profiles for all global packs without profiles
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  jurisdiction_code?: string; // Default: VN
  batch_size?: number; // Default: 50
  dry_run?: boolean; // Just count, don't create
}

Deno.serve(withPerf({ functionName: 'generate-missing-profiles', slowThresholdMs: 30000 }, async (req) => {
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

    const body: GenerateRequest = await req.json().catch(() => ({}));
    const jurisdictionCode = body.jurisdiction_code || 'VN';
    const batchSize = body.batch_size || 50;
    const dryRun = body.dry_run || false;

    console.log(`[generate-missing-profiles] Starting for jurisdiction: ${jurisdictionCode}, batch: ${batchSize}, dryRun: ${dryRun}`);

    // Find packs without profiles for this jurisdiction
    const { data: allPacks, error: packsError } = await supabase
      .from('industry_global_packs')
      .select('id, industry_code, industry_level, target_audience, global_brand_voice, global_compliance_rules, global_claim_restrictions, global_argument_patterns, global_system_rules, global_terminology, risk_guidelines, related_industries, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (packsError) {
      throw new Error(`Failed to fetch packs: ${packsError.message}`);
    }

    // Get existing profiles
    const { data: existingProfiles } = await supabase
      .from('industry_jurisdiction_profiles')
      .select('global_pack_id')
      .eq('jurisdiction_code', jurisdictionCode);

    const existingPackIds = new Set((existingProfiles || []).map(p => p.global_pack_id));
    const packsWithoutProfiles = (allPacks || []).filter(p => !existingPackIds.has(p.id));

    console.log(`[generate-missing-profiles] Found ${packsWithoutProfiles.length} packs without ${jurisdictionCode} profiles`);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dry_run: true,
          jurisdiction_code: jurisdictionCode,
          total_packs: allPacks?.length || 0,
          existing_profiles: existingPackIds.size,
          missing_profiles: packsWithoutProfiles.length,
          sample_missing: packsWithoutProfiles.slice(0, 10).map(p => ({
            id: p.id,
            code: p.industry_code,
            level: p.industry_level,
          })),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process in batches
    const toProcess = packsWithoutProfiles.slice(0, batchSize);
    let generatedCount = 0;
    const errors: string[] = [];

    for (const pack of toProcess) {
      try {
        // Fetch translations for this pack
        const { data: translations } = await supabase
          .from('industry_pack_translations')
          .select('language_code, name, short_name, preferred_terms, forbidden_terms, glossary')
          .eq('global_pack_id', pack.id);

        const translationMap: Record<string, any> = {};
        for (const t of translations || []) {
          translationMap[t.language_code] = t;
        }

        // Build names object
        const names: Record<string, string> = {};
        for (const [lang, trans] of Object.entries(translationMap)) {
          names[lang] = (trans as any).name;
        }

        // Build terminology
        const terminology = {
          forbidden_terms: pack.global_terminology?.forbidden_terms_global || [],
          preferred_terms: translationMap[jurisdictionCode]?.preferred_terms || 
                           translationMap['vi']?.preferred_terms || [],
          forbidden_words_local: pack.global_terminology?.forbidden_words_by_lang?.[jurisdictionCode] ||
                                 translationMap[jurisdictionCode]?.forbidden_terms || [],
        };

        // Build resolved_rules
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

        // Insert profile
        const { error: insertError } = await supabase
          .from('industry_jurisdiction_profiles')
          .insert({
            global_pack_id: pack.id,
            jurisdiction_code: jurisdictionCode,
            resolved_rules: resolvedRules,
            validity_status: 'current',
            disclaimer: resolvedRules.disclaimer,
          });

        if (insertError) {
          errors.push(`${pack.industry_code}: ${insertError.message}`);
        } else {
          generatedCount++;
          console.log(`[generate-missing-profiles] Created profile for ${pack.industry_code}/${jurisdictionCode}`);
        }

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${pack.industry_code}: ${errorMessage}`);
      }
    }

    const remaining = packsWithoutProfiles.length - toProcess.length;

    return new Response(
      JSON.stringify({
        success: true,
        jurisdiction_code: jurisdictionCode,
        generated: generatedCount,
        processed: toProcess.length,
        remaining: remaining,
        errors: errors.length > 0 ? errors : undefined,
        message: remaining > 0 
          ? `Generated ${generatedCount} profiles. Run again to process ${remaining} more.`
          : `Generated ${generatedCount} profiles. All packs now have ${jurisdictionCode} profiles.`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[generate-missing-profiles] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

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
