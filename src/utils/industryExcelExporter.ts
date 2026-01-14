/**
 * Industry Pack Excel Exporter v2.2
 * Export existing Industry Pack data to Excel file for backup or editing
 * Updated with Risk Guidelines, Key Regulations, Glossary, and Extended Personas
 */

import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

export interface ExportResult {
  success: boolean;
  filename?: string;
  message: string;
  error?: string;
}

/**
 * Export a single Industry Pack to Excel (v2.2 format)
 */
export async function exportIndustryPackToExcel(packId: string): Promise<ExportResult> {
  try {
    // Fetch all related data in parallel
    const [
      { data: pack, error: packError },
      { data: translations },
      { data: forbiddenTerms },
      { data: complianceRules },
      { data: claimRestrictions },
      { data: argumentPatterns },
      { data: systemRules },
      { data: jurisdictions },
      { data: personas },
    ] = await Promise.all([
      supabase.from('industry_global_packs').select('*').eq('id', packId).single(),
      supabase.from('industry_pack_translations').select('*').eq('global_pack_id', packId),
      (supabase.from('industry_forbidden_terms' as any).select('*').eq('global_pack_id', packId) as any),
      (supabase.from('industry_compliance_rules' as any).select('*').eq('global_pack_id', packId) as any),
      (supabase.from('industry_claim_restrictions' as any).select('*').eq('global_pack_id', packId) as any),
      (supabase.from('industry_argument_patterns' as any).select('*').eq('global_pack_id', packId) as any),
      (supabase.from('industry_system_rules' as any).select('*').eq('global_pack_id', packId) as any),
      supabase.from('industry_jurisdiction_profiles').select('*').eq('global_pack_id', packId),
      supabase.from('industry_personas_v2').select('*').eq('global_pack_id', packId),
    ]);

    if (packError || !pack) {
      return { success: false, message: 'Không tìm thấy Industry Pack', error: packError?.message };
    }

    const workbook = XLSX.utils.book_new();
    const packData = pack as any;
    const brandVoiceBase = packData.brand_voice_base as Record<string, any> || packData.global_brand_voice as Record<string, any> || {};
    const riskGuidelines = packData.risk_guidelines as Record<string, any> || {};

    // 1. Pack Info Sheet with Risk Guidelines
    const packInfoData = [
      [
        'code *', 'category_code *', 'parent_pack_code', 'industry_level', 'sort_order', 
        'target_audience *', 'tone_of_voice', 'formality_level', 'language_style', 
        'cta_policy', 'allow_emoji', 'emoji_policy',
        // Risk Guidelines fields
        'related_industries', 'high_risk_keywords',
        'weight_forbidden_term', 'weight_claim_restriction', 'weight_forbidden_pattern', 'weight_high_risk_keyword',
        'threshold_low', 'threshold_medium', 'threshold_high', 'threshold_blocked'
      ],
      [
        pack.industry_code,
        pack.category_id || '',
        pack.parent_pack_id || '',
        pack.industry_level || 'core',
        String(pack.sort_order || 0),
        pack.target_audience || 'B2C',
        brandVoiceBase.tone_of_voice || '',
        brandVoiceBase.formality_level || 'semi_formal',
        brandVoiceBase.language_style || '',
        brandVoiceBase.cta_policy || '',
        brandVoiceBase.allow_emoji ? 'true' : 'false',
        brandVoiceBase.emoji_policy || 'limited',
        // Risk Guidelines
        (riskGuidelines.related_industries as string[] || []).join(';'),
        (riskGuidelines.high_risk_keywords as string[] || []).join(';'),
        riskGuidelines.scoring_weights?.forbidden_term || 50,
        riskGuidelines.scoring_weights?.claim_restriction || 30,
        riskGuidelines.scoring_weights?.forbidden_pattern || 20,
        riskGuidelines.scoring_weights?.high_risk_keyword || 10,
        riskGuidelines.thresholds?.low || 0,
        riskGuidelines.thresholds?.medium || 30,
        riskGuidelines.thresholds?.high || 60,
        riskGuidelines.thresholds?.blocked || 100,
      ],
    ];
    const packInfoSheet = XLSX.utils.aoa_to_sheet(packInfoData);
    XLSX.utils.book_append_sheet(workbook, packInfoSheet, '1. Pack Info');

    // 2. Translations Sheet with Glossary
    const translationsData = [
      ['language_code *', 'name *', 'short_name', 'preferred_words', 'forbidden_words', 'glossary_keys', 'glossary_values'],
      ...(translations || []).map(t => {
        const glossary = t.glossary as Record<string, string> || {};
        return [
          t.language_code,
          t.name,
          t.short_name || '',
          (t.preferred_terms as string[] || []).join(', '),
          (t.forbidden_terms as string[] || []).join(', '),
          Object.keys(glossary).join(';'),
          Object.values(glossary).join(';'),
        ];
      }),
    ];
    const translationsSheet = XLSX.utils.aoa_to_sheet(translationsData);
    XLSX.utils.book_append_sheet(workbook, translationsSheet, '2. Translations');

    // 3. Forbidden Terms Sheet
    const forbiddenTermsData = [
      ['term *', 'reason'],
      ...(forbiddenTerms || []).map((t: any) => [t.term, t.reason || '']),
    ];
    const forbiddenTermsSheet = XLSX.utils.aoa_to_sheet(forbiddenTermsData);
    XLSX.utils.book_append_sheet(workbook, forbiddenTermsSheet, '3. Forbidden Terms');

    // 4. Compliance Rules Sheet
    const complianceRulesData = [
      ['rule_id *', 'rule_text *', 'category', 'severity *'],
      ...(complianceRules || []).map((r: any) => [
        r.rule_id,
        r.rule_text,
        r.category || 'general',
        r.severity || 'warning',
      ]),
    ];
    const complianceRulesSheet = XLSX.utils.aoa_to_sheet(complianceRulesData);
    XLSX.utils.book_append_sheet(workbook, complianceRulesSheet, '4. Compliance Rules');

    // 5. Claim Restrictions Sheet
    const claimRestrictionsData = [
      ['forbidden_claim *', 'suggested_alternative *', 'severity'],
      ...(claimRestrictions || []).map((c: any) => [
        c.forbidden_claim,
        c.suggested_alternative,
        c.severity || 'warning',
      ]),
    ];
    const claimRestrictionsSheet = XLSX.utils.aoa_to_sheet(claimRestrictionsData);
    XLSX.utils.book_append_sheet(workbook, claimRestrictionsSheet, '5. Claim Restrictions');

    // 6. Argument Patterns Sheet
    const argumentPatternsData = [
      ['type *', 'pattern *', 'category'],
      ...(argumentPatterns || []).map((p: any) => [p.type, p.pattern, p.category || 'general']),
    ];
    const argumentPatternsSheet = XLSX.utils.aoa_to_sheet(argumentPatternsData);
    XLSX.utils.book_append_sheet(workbook, argumentPatternsSheet, '6. Argument Patterns');

    // 7. System Rules Sheet
    const systemRulesData = [
      ['rule *', 'priority *'],
      ...(systemRules || []).map((r: any) => [r.rule, r.priority || 'medium']),
    ];
    const systemRulesSheet = XLSX.utils.aoa_to_sheet(systemRulesData);
    XLSX.utils.book_append_sheet(workbook, systemRulesSheet, '7. System Rules');

    // 8. Jurisdictions Sheet with extended fields
    const jurisdictionsData = [
      ['jurisdiction_code *', 'additional_forbidden_terms', 'modified_compliance_rules', 'notes', 'validity_status', 'last_verified_date', 'industry_trends'],
      ...(jurisdictions || []).map(j => {
        const jData = j as any;
        const resolvedRules = jData.resolved_rules as Record<string, any> || {};
        return [
          jData.jurisdiction_code,
          (resolvedRules.additional_forbidden_terms as string[] || []).join(';'),
          resolvedRules.modified_compliance_rules ? JSON.stringify(resolvedRules.modified_compliance_rules) : '',
          jData.disclaimer || '',
          jData.validity_status || 'current',
          jData.last_verified_date || '',
          (jData.industry_trends as string[] || []).join(';'),
        ];
      }),
    ];
    const jurisdictionsSheet = XLSX.utils.aoa_to_sheet(jurisdictionsData);
    XLSX.utils.book_append_sheet(workbook, jurisdictionsSheet, '8. Jurisdictions');

    // 9. Key Regulations Sheet (extract from resolved_rules)
    const keyRegulationsRows: any[][] = [];
    (jurisdictions || []).forEach(j => {
      const resolvedRules = j.resolved_rules as Record<string, any> || {};
      const regulations = resolvedRules.key_regulations as any[] || [];
      regulations.forEach(reg => {
        keyRegulationsRows.push([
          j.jurisdiction_code,
          reg.regulation_name || '',
          reg.effective_date || '',
          reg.summary || '',
          reg.source_url || '',
          reg.validity_status || 'current',
        ]);
      });
    });
    const keyRegulationsData = [
      ['jurisdiction_code *', 'regulation_name *', 'effective_date *', 'summary', 'source_url', 'validity_status'],
      ...keyRegulationsRows,
    ];
    const keyRegulationsSheet = XLSX.utils.aoa_to_sheet(keyRegulationsData);
    XLSX.utils.book_append_sheet(workbook, keyRegulationsSheet, '9. Key Regulations');

    // 10. Personas Sheet with Extended PRO fields
    const personasData = [
      [
        'name *', 'description', 'age_range', 'gender', 'income_level', 'education_level',
        'occupation', 'location_type', 'family_status', 'lifestyle', 'tech_savviness',
        'price_sensitivity', 'purchase_frequency', 'pain_points', 'goals', 'objections',
        'values', 'interests', 'buying_motivation', 'decision_factors', 'personality_traits',
        'preferred_channels', 'social_platforms', 'content_consumption', 'communication_style',
        'response_tone_hints', 'trigger_words', 'persona_type', 'sort_order',
        'avatar_url', 'segment_size', 'priority_score', 'device_usage', 'content_preferences',
        'journey_stages', 'country_variants',
      ],
      ...(personas || []).map(persona => {
        const p = persona as any;
        return [
          p.name,
          p.description || '',
          p.age_range || '',
          p.gender || 'all',
          p.income_level || 'medium',
          p.education_level || '',
          p.occupation || '',
          p.location_type || 'urban',
          p.family_status || '',
          p.lifestyle || '',
          p.tech_savviness || 'medium',
          p.price_sensitivity || 'medium',
          p.purchase_frequency || 'monthly',
          (p.pain_points as string[] || []).join(';'),
          (p.goals as string[] || []).join(';'),
          (p.objections as string[] || []).join(';'),
          (p.values as string[] || []).join(';'),
          (p.interests as string[] || []).join(';'),
          (p.buying_motivation as string[] || []).join(';'),
          (p.decision_factors as string[] || []).join(';'),
          (p.personality_traits as string[] || []).join(';'),
          (p.preferred_channels as string[] || []).join(';'),
          (p.social_platforms as string[] || []).join(';'),
          (p.content_consumption as string[] || []).join(';'),
          p.communication_style || 'direct',
          (p.response_tone_hints as string[] || []).join(';'),
          (p.trigger_words as string[] || []).join(';'),
          p.persona_type || 'primary',
          String(p.sort_order || 0),
          p.avatar_url || '',
          p.segment_size != null ? String(p.segment_size) : '',
          p.priority_score != null ? String(p.priority_score) : '',
          p.device_usage ? JSON.stringify(p.device_usage) : '',
          p.content_preferences ? JSON.stringify(p.content_preferences) : '',
          p.journey_stages ? JSON.stringify(p.journey_stages) : '',
          p.country_variants ? JSON.stringify(p.country_variants) : '',
        ];
      }),
    ];
    const personasSheet = XLSX.utils.aoa_to_sheet(personasData);
    XLSX.utils.book_append_sheet(workbook, personasSheet, '10. Personas');

    // Generate filename and download
    const filename = `industry_pack_${pack.industry_code}_v2.2_export.xlsx`;
    XLSX.writeFile(workbook, filename);

    return {
      success: true,
      filename,
      message: `Đã export Industry Pack "${pack.industry_code}" thành công (v2.2)`,
    };
  } catch (error) {
    console.error('Export error:', error);
    return {
      success: false,
      message: 'Lỗi khi export dữ liệu',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get export statistics for a pack
 */
export async function getExportStats(packId: string): Promise<{
  translations: number;
  forbiddenTerms: number;
  complianceRules: number;
  claimRestrictions: number;
  argumentPatterns: number;
  systemRules: number;
  jurisdictions: number;
  keyRegulations: number;
  personas: number;
}> {
  const [
    { count: translations },
    { count: forbiddenTerms },
    { count: complianceRules },
    { count: claimRestrictions },
    { count: argumentPatterns },
    { count: systemRules },
    { count: jurisdictions },
    { count: personas },
  ] = await Promise.all([
    supabase.from('industry_pack_translations').select('*', { count: 'exact', head: true }).eq('global_pack_id', packId),
    (supabase.from('industry_forbidden_terms' as any).select('*', { count: 'exact', head: true }).eq('global_pack_id', packId) as any),
    (supabase.from('industry_compliance_rules' as any).select('*', { count: 'exact', head: true }).eq('global_pack_id', packId) as any),
    (supabase.from('industry_claim_restrictions' as any).select('*', { count: 'exact', head: true }).eq('global_pack_id', packId) as any),
    (supabase.from('industry_argument_patterns' as any).select('*', { count: 'exact', head: true }).eq('global_pack_id', packId) as any),
    (supabase.from('industry_system_rules' as any).select('*', { count: 'exact', head: true }).eq('global_pack_id', packId) as any),
    supabase.from('industry_jurisdiction_profiles').select('*', { count: 'exact', head: true }).eq('global_pack_id', packId),
    supabase.from('industry_personas_v2').select('*', { count: 'exact', head: true }).eq('global_pack_id', packId),
  ]);

  // Count key regulations from resolved_rules
  const { data: jurisdictionData } = await supabase
    .from('industry_jurisdiction_profiles')
    .select('resolved_rules')
    .eq('global_pack_id', packId);

  let keyRegulationsCount = 0;
  (jurisdictionData || []).forEach(j => {
    const resolvedRules = j.resolved_rules as Record<string, any> || {};
    keyRegulationsCount += (resolvedRules.key_regulations as any[] || []).length;
  });

  return {
    translations: translations || 0,
    forbiddenTerms: forbiddenTerms || 0,
    complianceRules: complianceRules || 0,
    claimRestrictions: claimRestrictions || 0,
    argumentPatterns: argumentPatterns || 0,
    systemRules: systemRules || 0,
    jurisdictions: jurisdictions || 0,
    keyRegulations: keyRegulationsCount,
    personas: personas || 0,
  };
}
