/**
 * Industry Pack Excel Exporter
 * Export existing Industry Pack data to Excel file for backup or editing
 */

import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import type { IndustryGlobalPack } from '@/types/industryParkV2';

export interface ExportResult {
  success: boolean;
  filename?: string;
  message: string;
  error?: string;
}

/**
 * Export a single Industry Pack to Excel
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
    const globalBrandVoice = pack.global_brand_voice as Record<string, any> || {};

    // 1. Pack Info Sheet
    const packInfoData = [
      ['code *', 'category_code *', 'parent_pack_code', 'industry_level', 'sort_order', 'target_audience *', 'tone_of_voice', 'formality_level', 'language_style', 'cta_policy', 'allow_emoji'],
      [
        pack.industry_code,
        pack.category_id || '',
        pack.parent_pack_id || '',
        pack.industry_level || 'core',
        String(pack.sort_order || 0),
        pack.target_audience || 'B2C',
        globalBrandVoice.tone_of_voice || '',
        globalBrandVoice.formality_level || 'semi_formal',
        globalBrandVoice.language_style || '',
        globalBrandVoice.cta_policy || '',
        globalBrandVoice.allow_emoji ? 'true' : 'false',
      ],
    ];
    const packInfoSheet = XLSX.utils.aoa_to_sheet(packInfoData);
    XLSX.utils.book_append_sheet(workbook, packInfoSheet, '1. Pack Info');

    // 2. Translations Sheet
    const translationsData = [
      ['language_code *', 'name *', 'short_name', 'preferred_words', 'forbidden_words'],
      ...(translations || []).map(t => [
        t.language_code,
        t.name,
        t.short_name || '',
        (t.preferred_terms as string[] || []).join(', '),
        (t.forbidden_terms as string[] || []).join(', '),
      ]),
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

    // 8. Jurisdictions Sheet - use resolved_rules for export
    const jurisdictionsData = [
      ['jurisdiction_code *', 'additional_forbidden_terms', 'modified_compliance_rules', 'notes'],
      ...(jurisdictions || []).map(j => {
        const resolvedRules = j.resolved_rules as Record<string, any> || {};
        return [
          j.jurisdiction_code,
          (resolvedRules.additional_forbidden_terms as string[] || []).join(';'),
          resolvedRules.modified_compliance_rules ? JSON.stringify(resolvedRules.modified_compliance_rules) : '',
          j.disclaimer || '',
        ];
      }),
    ];
    const jurisdictionsSheet = XLSX.utils.aoa_to_sheet(jurisdictionsData);
    XLSX.utils.book_append_sheet(workbook, jurisdictionsSheet, '8. Jurisdictions');

    // 9. Personas Sheet
    const personasData = [
      [
        'name *', 'description', 'age_range', 'gender', 'income_level', 'education_level',
        'occupation', 'location_type', 'family_status', 'lifestyle', 'tech_savviness',
        'price_sensitivity', 'purchase_frequency', 'pain_points', 'goals', 'objections',
        'values', 'interests', 'buying_motivation', 'decision_factors', 'personality_traits',
        'preferred_channels', 'social_platforms', 'content_consumption', 'communication_style',
        'response_tone_hints', 'sort_order',
      ],
      ...(personas || []).map(p => [
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
        String(p.sort_order || 0),
      ]),
    ];
    const personasSheet = XLSX.utils.aoa_to_sheet(personasData);
    XLSX.utils.book_append_sheet(workbook, personasSheet, '9. Personas');

    // Generate filename and download
    const filename = `industry_pack_${pack.industry_code}_export.xlsx`;
    XLSX.writeFile(workbook, filename);

    return {
      success: true,
      filename,
      message: `Đã export Industry Pack "${pack.industry_code}" thành công`,
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

  return {
    translations: translations || 0,
    forbiddenTerms: forbiddenTerms || 0,
    complianceRules: complianceRules || 0,
    claimRestrictions: claimRestrictions || 0,
    argumentPatterns: argumentPatterns || 0,
    systemRules: systemRules || 0,
    jurisdictions: jurisdictions || 0,
    personas: personas || 0,
  };
}
