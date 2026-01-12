// ============================================
// Industry Park v2.1 - Jurisdiction Profile Fetcher
// Pre-computed resolved_rules - Single query, maximum performance
// ============================================

export interface ResolvedRulesV2 {
  industry_code: string;
  jurisdiction_code: string;
  names: Record<string, string>;
  target_audience: 'B2B' | 'B2C' | 'both';
  brand_voice: {
    tone_of_voice?: string[];
    formality_level?: string;
    language_style?: string[];
    cta_policy?: string;
    allow_emoji?: boolean;
  };
  terminology: {
    forbidden_terms: string[];
    preferred_terms: string[];
    forbidden_words_local: string[];
  };
  compliance_rules: Array<{
    rule: string;
    category?: string;
    severity?: string;
    effective_date?: string;
    source?: string;
  }>;
  claim_restrictions: Array<{
    claim: string;
    alternative: string;
    reason?: string;
    severity?: string;
  }>;
  argument_patterns: {
    valid_patterns: string[];
    forbidden_patterns: string[];
  };
  system_rules: string[];
  key_regulations: Array<{
    name: string;
    effective_date: string;
    summary: string;
    source_url?: string;
    validity_status: string;
    last_verified_date?: string;
  }>;
  industry_trends: string[];
  risk_guidelines: {
    high_risk_keywords: string[];
    scoring_weights: Record<string, number>;
    risk_thresholds: Record<string, number>;
  };
  related_industries: string[];
  disclaimer: string;
}

export interface JurisdictionProfileResult {
  profile_id: string;
  global_pack_id: string;
  jurisdiction_code: string;
  resolved_rules: ResolvedRulesV2;
  validity_status: string;
  disclaimer: string | null;
}

/**
 * Fetch pre-computed jurisdiction profile from v2.1 tables
 * Primary method - uses industry_jurisdiction_profiles
 */
export async function fetchJurisdictionProfile(
  supabase: any,
  globalPackId: string,
  jurisdictionCode: string = 'VN'
): Promise<JurisdictionProfileResult | null> {
  try {
    // 1. Try exact jurisdiction match
    const { data: profile, error } = await supabase
      .from('industry_jurisdiction_profiles')
      .select('id, global_pack_id, jurisdiction_code, resolved_rules, validity_status, disclaimer')
      .eq('global_pack_id', globalPackId)
      .eq('jurisdiction_code', jurisdictionCode)
      .eq('validity_status', 'current')
      .maybeSingle();

    if (error) {
      console.error('[industry-fetcher-v2] Error fetching profile:', error);
      return null;
    }

    if (profile) {
      return {
        profile_id: profile.id,
        global_pack_id: profile.global_pack_id,
        jurisdiction_code: profile.jurisdiction_code,
        resolved_rules: profile.resolved_rules as ResolvedRulesV2,
        validity_status: profile.validity_status,
        disclaimer: profile.disclaimer,
      };
    }

    // 2. Fallback to VN if different jurisdiction requested but not found
    if (jurisdictionCode !== 'VN') {
      console.log(`[industry-fetcher-v2] Jurisdiction ${jurisdictionCode} not found, falling back to VN`);
      const { data: vnProfile } = await supabase
        .from('industry_jurisdiction_profiles')
        .select('id, global_pack_id, jurisdiction_code, resolved_rules, validity_status, disclaimer')
        .eq('global_pack_id', globalPackId)
        .eq('jurisdiction_code', 'VN')
        .eq('validity_status', 'current')
        .maybeSingle();

      if (vnProfile) {
        return {
          profile_id: vnProfile.id,
          global_pack_id: vnProfile.global_pack_id,
          jurisdiction_code: vnProfile.jurisdiction_code,
          resolved_rules: vnProfile.resolved_rules as ResolvedRulesV2,
          validity_status: vnProfile.validity_status,
          disclaimer: vnProfile.disclaimer,
        };
      }
    }

    // 3. Fallback to GLOBAL profile
    const { data: globalProfile } = await supabase
      .from('industry_jurisdiction_profiles')
      .select('id, global_pack_id, jurisdiction_code, resolved_rules, validity_status, disclaimer')
      .eq('global_pack_id', globalPackId)
      .eq('jurisdiction_code', 'GLOBAL')
      .eq('validity_status', 'current')
      .maybeSingle();

    if (globalProfile) {
      return {
        profile_id: globalProfile.id,
        global_pack_id: globalProfile.global_pack_id,
        jurisdiction_code: globalProfile.jurisdiction_code,
        resolved_rules: globalProfile.resolved_rules as ResolvedRulesV2,
        validity_status: globalProfile.validity_status,
        disclaimer: globalProfile.disclaimer,
      };
    }

    console.log(`[industry-fetcher-v2] No profile found for pack ${globalPackId}`);
    return null;
  } catch (error) {
    console.error('[industry-fetcher-v2] Exception:', error);
    return null;
  }
}

/**
 * Fetch profile by industry_code instead of global_pack_id
 * Convenience method for when you only have the code
 */
export async function fetchProfileByIndustryCode(
  supabase: any,
  industryCode: string,
  jurisdictionCode: string = 'VN'
): Promise<JurisdictionProfileResult | null> {
  try {
    // First get the global pack id
    const { data: pack, error } = await supabase
      .from('industry_global_packs')
      .select('id')
      .eq('industry_code', industryCode)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !pack) {
      console.log(`[industry-fetcher-v2] Global pack not found for code: ${industryCode}`);
      return null;
    }

    return fetchJurisdictionProfile(supabase, pack.id, jurisdictionCode);
  } catch (error) {
    console.error('[industry-fetcher-v2] Exception in fetchProfileByIndustryCode:', error);
    return null;
  }
}

/**
 * Fetch profile for a brand template
 * Uses the new global_pack_id and jurisdiction_code columns
 */
export async function fetchProfileForBrand(
  supabase: any,
  brandTemplateId: string
): Promise<JurisdictionProfileResult | null> {
  try {
    // Get brand's global_pack_id and jurisdiction_code
    const { data: brand, error } = await supabase
      .from('brand_templates')
      .select('global_pack_id, jurisdiction_code, industry_template_id')
      .eq('id', brandTemplateId)
      .maybeSingle();

    if (error || !brand) {
      console.log(`[industry-fetcher-v2] Brand not found: ${brandTemplateId}`);
      return null;
    }

    // If brand has v2.1 global_pack_id
    if (brand.global_pack_id) {
      return fetchJurisdictionProfile(
        supabase, 
        brand.global_pack_id, 
        brand.jurisdiction_code || 'VN'
      );
    }

    // Fallback: Try to find global pack from old industry_template_id
    if (brand.industry_template_id) {
      const { data: template } = await supabase
        .from('industry_templates')
        .select('code')
        .eq('id', brand.industry_template_id)
        .maybeSingle();

      if (template?.code) {
        // Extract base code (remove _vn, _sg, _th suffixes)
        let baseCode = template.code;
        if (baseCode.endsWith('_vn')) baseCode = baseCode.replace('_vn', '');
        if (baseCode.endsWith('_sg')) baseCode = baseCode.replace('_sg', '');
        if (baseCode.endsWith('_th')) baseCode = baseCode.replace('_th', '');

        return fetchProfileByIndustryCode(
          supabase, 
          baseCode, 
          brand.jurisdiction_code || 'VN'
        );
      }
    }

    return null;
  } catch (error) {
    console.error('[industry-fetcher-v2] Exception in fetchProfileForBrand:', error);
    return null;
  }
}

/**
 * Get all available jurisdictions for a global pack
 */
export async function getAvailableJurisdictions(
  supabase: any,
  globalPackId: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('industry_jurisdiction_profiles')
      .select('jurisdiction_code')
      .eq('global_pack_id', globalPackId)
      .eq('validity_status', 'current');

    if (error || !data) return ['VN'];
    return data.map((p: { jurisdiction_code: string }) => p.jurisdiction_code);
  } catch {
    return ['VN'];
  }
}

/**
 * Check if a jurisdiction profile exists
 */
export async function jurisdictionProfileExists(
  supabase: any,
  globalPackId: string,
  jurisdictionCode: string
): Promise<boolean> {
  const { count } = await supabase
    .from('industry_jurisdiction_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('global_pack_id', globalPackId)
    .eq('jurisdiction_code', jurisdictionCode);
  
  return (count || 0) > 0;
}
