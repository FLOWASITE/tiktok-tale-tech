/**
 * Hook for importing Industry Pack from JSON data
 * Parses JSON structure and imports into database tables
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ============== TYPES ==============

export interface JsonImportStep {
  step: number;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  count?: number;
  error?: string;
}

export interface JsonImportResult {
  success: boolean;
  packId?: string;
  packCode?: string;
  message: string;
  details: {
    globalPack: boolean;
    translations: number;
    jurisdictions: number;
    keyRegulations: number;
  };
}

export interface IndustryJsonData {
  global_pack: {
    industry_code: string;
    category_code: string;
    target_audience: string;
    related_industries: string[];
    version: string;
    global_brand_voice: {
      tone_of_voice: string[];
      formality_level: string;
      language_style: string[];
      cta_policy: string;
      allow_emoji: boolean;
      emoji_policy: string;
    };
    global_terminology: {
      forbidden_terms_global: string[];
      preferred_terms: Record<string, string[]>;
      forbidden_words_by_lang: Record<string, string[]>;
    };
    global_compliance_rules: Array<{
      rule: string;
      category: string;
      severity: string;
      effective_date: string;
      source: string;
    }>;
    global_claim_restrictions: Array<{
      claim: string;
      alternative: string;
      reason: string;
      severity: string;
    }>;
    global_argument_patterns: {
      valid_patterns: string[];
      forbidden_patterns: string[];
    };
    global_system_rules: string[];
    risk_guidelines: {
      high_risk_keywords: string[];
      scoring_weights: Record<string, number>;
      risk_thresholds: Record<string, number>;
    };
  };
  translations: Record<string, {
    name: string;
    short_name: string;
    preferred_terms: string[];
    forbidden_terms: string[];
    glossary: Record<string, string>;
  }>;
  jurisdictions: Record<string, {
    jurisdiction_code: string;
    validity_status: string;
    last_verified_date: string;
    disclaimer: string;
    industry_trends: string[];
    key_regulations: Array<{
      name: string;
      effective_date: string;
      summary: string;
      source_url: string;
      validity_status: string;
      last_verified_date?: string;
    }>;
    additional_compliance_rules?: Array<{
      rule: string;
      category: string;
      severity: string;
      effective_date: string;
      source: string;
    }>;
    additional_forbidden_terms?: string[];
  }>;
}

// ============== VALIDATION ==============

export function validateJsonStructure(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['JSON data phải là object'] };
  }

  const json = data as Record<string, unknown>;
  
  // Check required top-level keys
  if (!json.global_pack) errors.push('Thiếu trường "global_pack"');
  if (!json.translations) errors.push('Thiếu trường "translations"');
  if (!json.jurisdictions) errors.push('Thiếu trường "jurisdictions"');

  if (json.global_pack && typeof json.global_pack === 'object') {
    const pack = json.global_pack as Record<string, unknown>;
    if (!pack.industry_code) errors.push('Thiếu "global_pack.industry_code"');
    if (!pack.global_brand_voice) errors.push('Thiếu "global_pack.global_brand_voice"');
    if (!pack.global_terminology) errors.push('Thiếu "global_pack.global_terminology"');
    if (!pack.global_compliance_rules) errors.push('Thiếu "global_pack.global_compliance_rules"');
  }

  return { valid: errors.length === 0, errors };
}

// ============== CATEGORY MAPPING ==============

const CATEGORY_CODE_MAP: Record<string, string> = {
  'financial_services': 'finance',
  'healthcare': 'healthcare',
  'technology': 'technology',
  'education': 'education',
  'retail': 'retail',
  'food_beverage': 'food_beverage',
  'real_estate': 'real_estate',
  'manufacturing': 'manufacturing',
};

// ============== HOOK ==============

export function useIndustryJsonImport() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [steps, setSteps] = useState<JsonImportStep[]>([]);
  const [result, setResult] = useState<JsonImportResult | null>(null);
  const [existingPack, setExistingPack] = useState<{ id: string; code: string } | null>(null);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setSteps([]);
    setResult(null);
    setExistingPack(null);
  }, []);

  const updateStep = useCallback((stepNum: number, update: Partial<JsonImportStep>) => {
    setSteps(prev => prev.map(s => 
      s.step === stepNum ? { ...s, ...update } : s
    ));
  }, []);

  const checkExistingPack = useCallback(async (industryCode: string) => {
    const { data } = await supabase
      .from('industry_global_packs')
      .select('id, industry_code')
      .eq('industry_code', industryCode)
      .single();
    
    if (data) {
      setExistingPack({ id: data.id, code: data.industry_code });
      return data;
    }
    return null;
  }, []);

  const importFromJson = useCallback(async (
    jsonData: IndustryJsonData,
    action: 'merge' | 'replace' = 'merge'
  ): Promise<JsonImportResult> => {
    setIsProcessing(true);
    setResult(null);
    
    // Initialize steps
    const initialSteps: JsonImportStep[] = [
      { step: 1, name: 'Tạo/Cập nhật Global Pack', status: 'pending' },
      { step: 2, name: 'Import Translations', status: 'pending' },
      { step: 3, name: 'Import Jurisdiction Profiles', status: 'pending' },
    ];
    setSteps(initialSteps);

    const details = {
      globalPack: false,
      translations: 0,
      jurisdictions: 0,
      keyRegulations: 0,
    };

    try {
      // ============== STEP 1: Global Pack ==============
      updateStep(1, { status: 'running' });
      
      const pack = jsonData.global_pack;
      
      // Look up category_id
      const categoryCode = CATEGORY_CODE_MAP[pack.category_code] || pack.category_code;
      const { data: categoryData } = await supabase
        .from('industry_categories')
        .select('id')
        .eq('code', categoryCode)
        .single();

      // Transform data for database
      const globalBrandVoice = {
        tone_of_voice: pack.global_brand_voice.tone_of_voice.join(', '),
        formality_level: pack.global_brand_voice.formality_level,
        language_style: pack.global_brand_voice.language_style.join(', '),
        cta_policy: pack.global_brand_voice.cta_policy,
        allow_emoji: pack.global_brand_voice.allow_emoji,
        emoji_policy: pack.global_brand_voice.emoji_policy,
      };

      const globalTerminology = {
        forbidden_terms: pack.global_terminology.forbidden_terms_global.map(term => ({
          term,
          reason: null,
        })),
        preferred_terms: pack.global_terminology.preferred_terms,
        forbidden_words_by_lang: pack.global_terminology.forbidden_words_by_lang,
      };

      const globalComplianceRules = pack.global_compliance_rules.map((r, idx) => ({
        rule_id: `CR${String(idx + 1).padStart(3, '0')}`,
        rule_text: r.rule,
        category: r.category,
        severity: r.severity,
        effective_date: r.effective_date,
        source: r.source,
      }));

      const globalClaimRestrictions = pack.global_claim_restrictions.map(c => ({
        forbidden_claim: c.claim,
        suggested_alternative: c.alternative,
        reason: c.reason,
        severity: c.severity,
      }));

      const globalArgumentPatterns = {
        valid: pack.global_argument_patterns.valid_patterns.map(p => ({ pattern: p, category: 'general' })),
        forbidden: pack.global_argument_patterns.forbidden_patterns.map(p => ({ pattern: p, category: 'general' })),
      };

      const globalSystemRules = pack.global_system_rules.map((rule, idx) => ({
        rule,
        priority: idx + 1,
      }));

      const riskGuidelines = {
        related_industries: pack.related_industries,
        high_risk_keywords: pack.risk_guidelines.high_risk_keywords,
        scoring_weights: {
          forbidden_term: pack.risk_guidelines.scoring_weights.forbidden_term_match || pack.risk_guidelines.scoring_weights.forbidden_term || 25,
          claim_restriction: pack.risk_guidelines.scoring_weights.claim_restriction_match || pack.risk_guidelines.scoring_weights.claim_restriction || 20,
          forbidden_pattern: pack.risk_guidelines.scoring_weights.forbidden_pattern_match || pack.risk_guidelines.scoring_weights.forbidden_pattern || 15,
          high_risk_keyword: pack.risk_guidelines.scoring_weights.high_risk_keyword_match || pack.risk_guidelines.scoring_weights.high_risk_keyword || 30,
        },
        thresholds: pack.risk_guidelines.risk_thresholds,
      };

      // Determine industry_level: if no parent_pack specified, it's a 'core' pack
      const industryLevel = (pack as any).industry_level || 'core';
      const parentPackId = (pack as any).parent_pack_id || null;

      const packData = {
        industry_code: pack.industry_code,
        category_id: categoryData?.id || null,
        target_audience: pack.target_audience,
        global_brand_voice: globalBrandVoice,
        global_terminology: globalTerminology,
        global_compliance_rules: globalComplianceRules,
        global_claim_restrictions: globalClaimRestrictions,
        global_argument_patterns: globalArgumentPatterns,
        global_system_rules: globalSystemRules,
        risk_guidelines: riskGuidelines,
        related_industries: pack.related_industries,
        version: pack.version,
        status: 'active',
        industry_level: industryLevel,
        parent_pack_id: parentPackId,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      // Upsert global pack
      const { data: upsertedPack, error: packError } = await supabase
        .from('industry_global_packs')
        .upsert(packData as any, { onConflict: 'industry_code' })
        .select('id, industry_code')
        .single();

      if (packError) throw new Error(`Lỗi tạo Global Pack: ${packError.message}`);
      
      details.globalPack = true;
      updateStep(1, { status: 'success', count: 1 });

      const packId = upsertedPack.id;

      // ============== STEP 2: Translations ==============
      updateStep(2, { status: 'running' });

      for (const [langCode, translation] of Object.entries(jsonData.translations)) {
        const translationData = {
          global_pack_id: packId,
          language_code: langCode.toLowerCase(),
          name: translation.name,
          short_name: translation.short_name,
          preferred_terms: translation.preferred_terms,
          forbidden_terms: translation.forbidden_terms,
          glossary: translation.glossary,
          updated_at: new Date().toISOString(),
        };

        const { error: transError } = await supabase
          .from('industry_pack_translations')
          .upsert(translationData as any, { onConflict: 'global_pack_id,language_code' });

        if (transError) {
          console.error(`Translation error for ${langCode}:`, transError);
        } else {
          details.translations++;
        }
      }

      updateStep(2, { status: 'success', count: details.translations });

      // ============== STEP 3: Jurisdiction Profiles ==============
      updateStep(3, { status: 'running' });

      for (const [jurisdictionCode, jurisdiction] of Object.entries(jsonData.jurisdictions)) {
        // Build resolved_rules JSONB
        const resolvedRules = {
          industry_code: pack.industry_code,
          jurisdiction_code: jurisdictionCode,
          industry_name: jsonData.translations.vi?.name || jsonData.translations.en?.name || pack.industry_code,
          jurisdiction_name: getJurisdictionName(jurisdictionCode),
          target_audience: pack.target_audience,
          brand_voice: globalBrandVoice,
          terminology: {
            forbidden_terms: [
              ...pack.global_terminology.forbidden_terms_global,
              ...(jurisdiction.additional_forbidden_terms || []),
            ],
            preferred_terms: pack.global_terminology.preferred_terms,
          },
          compliance_rules: [
            ...globalComplianceRules,
            ...(jurisdiction.additional_compliance_rules?.map((r, idx) => ({
              rule_id: `CR_${jurisdictionCode}_${String(idx + 1).padStart(3, '0')}`,
              rule_text: r.rule,
              category: r.category,
              severity: r.severity,
              effective_date: r.effective_date,
              source: r.source,
            })) || []),
          ],
          claim_restrictions: globalClaimRestrictions,
          argument_patterns: globalArgumentPatterns,
          system_rules: globalSystemRules,
          key_regulations: jurisdiction.key_regulations.map(reg => ({
            name: reg.name,
            effective_date: reg.effective_date,
            summary: reg.summary,
            source_url: reg.source_url,
            validity_status: reg.validity_status,
          })),
          industry_trends: jurisdiction.industry_trends,
          risk_guidelines: riskGuidelines,
          disclaimer: jurisdiction.disclaimer,
        };

        details.keyRegulations += jurisdiction.key_regulations.length;

        const profileData = {
          global_pack_id: packId,
          jurisdiction_code: jurisdictionCode,
          resolved_rules: resolvedRules,
          validity_status: jurisdiction.validity_status,
          last_verified_date: jurisdiction.last_verified_date,
          updated_at: new Date().toISOString(),
        };

        const { error: profileError } = await supabase
          .from('industry_jurisdiction_profiles')
          .upsert(profileData as any, { onConflict: 'global_pack_id,jurisdiction_code' });

        if (profileError) {
          console.error(`Profile error for ${jurisdictionCode}:`, profileError);
        } else {
          details.jurisdictions++;
        }
      }

      updateStep(3, { status: 'success', count: details.jurisdictions });

      // ============== DONE ==============
      const finalResult: JsonImportResult = {
        success: true,
        packId,
        packCode: pack.industry_code,
        message: `Import thành công Industry Pack "${pack.industry_code}"`,
        details,
      };

      setResult(finalResult);
      setIsProcessing(false);

      toast({
        title: 'Import thành công!',
        description: `${details.translations} translations, ${details.jurisdictions} jurisdictions, ${details.keyRegulations} regulations`,
      });

      return finalResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      
      // Update current running step to error
      setSteps(prev => prev.map(s => 
        s.status === 'running' ? { ...s, status: 'error', error: errorMessage } : s
      ));

      const errorResult: JsonImportResult = {
        success: false,
        message: errorMessage,
        details,
      };

      setResult(errorResult);
      setIsProcessing(false);

      toast({
        title: 'Import thất bại',
        description: errorMessage,
        variant: 'destructive',
      });

      return errorResult;
    }
  }, [toast, updateStep]);

  return {
    isProcessing,
    steps,
    result,
    existingPack,
    reset,
    checkExistingPack,
    importFromJson,
    validateJsonStructure,
  };
}

// ============== UTILS ==============

function getJurisdictionName(code: string): string {
  const names: Record<string, string> = {
    VN: 'Việt Nam',
    US: 'United States',
    SG: 'Singapore',
    TH: 'Thailand',
    MY: 'Malaysia',
    ID: 'Indonesia',
    PH: 'Philippines',
  };
  return names[code] || code;
}
