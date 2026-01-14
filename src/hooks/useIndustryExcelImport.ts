/**
 * Hook for importing Industry Pack from Excel file
 * Parses the multi-sheet Excel template and imports into database
 */

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SHEETS } from '@/utils/industryExcelGenerator';
import {
  validateTranslations,
  validateJurisdictions,
  validateComplianceRules,
  validateClaimRestrictions,
  validatePackInfo,
  validateArgumentPatterns,
  validateSystemRules,
  validatePersonas,
  validateKeyRegulations,
  validateForbiddenTerms,
  type ValidationError,
  type ValidationWarning,
} from '@/utils/excelValidation';

export type ImportStep = 'upload' | 'preview' | 'validate' | 'importing' | 'done';

export interface ParsedSheetData {
  sheetKey: string;
  sheetTitle: string;
  rows: Record<string, string>[];
  headers: string[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// Re-export types for external use
export type { ValidationError, ValidationWarning };

export interface ParseResult {
  packInfo: Record<string, string> | null;
  translations: Record<string, string>[];
  forbiddenTerms: Record<string, string>[];
  complianceRules: Record<string, string>[];
  claimRestrictions: Record<string, string>[];
  argumentPatterns: Record<string, string>[];
  systemRules: Record<string, string>[];
  jurisdictions: Record<string, string>[];
  keyRegulations: Record<string, string>[]; // NEW v2.2
  personas: Record<string, string>[];
}

export interface ImportProgress {
  current: number;
  total: number;
  currentStep: string;
}

export interface ImportResult {
  success: boolean;
  packId?: string;
  packCode?: string;
  message: string;
  details: {
    translations: number;
    forbiddenTerms: number;
    complianceRules: number;
    claimRestrictions: number;
    argumentPatterns: number;
    systemRules: number;
    jurisdictions: number;
    keyRegulations: number; // NEW v2.2
    personas: number;
  };
}

export function useIndustryExcelImport() {
  const { toast } = useToast();
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [sheetData, setSheetData] = useState<ParsedSheetData[]>([]);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>({ current: 0, total: 8, currentStep: '' });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [existingPack, setExistingPack] = useState<{ id: string; code: string } | null>(null);
  const [conflictAction, setConflictAction] = useState<'skip' | 'merge' | 'replace'>('merge');

  const reset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setSheetData([]);
    setParseResult(null);
    setErrors([]);
    setWarnings([]);
    setIsProcessing(false);
    setProgress({ current: 0, total: 8, currentStep: '' });
    setImportResult(null);
    setExistingPack(null);
    setConflictAction('merge');
  }, []);

  const parseExcelFile = useCallback(async (file: File): Promise<void> => {
    setIsProcessing(true);
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];
    const parsedSheets: ParsedSheetData[] = [];

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      // Parse each expected sheet
      for (const [sheetKey, sheetDef] of Object.entries(SHEETS)) {
        const sheetName = sheetDef.title;
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
          allWarnings.push({
            sheet: sheetName,
            row: 0,
            message: `Sheet "${sheetName}" không tìm thấy trong file`,
          });
          parsedSheets.push({
            sheetKey,
            sheetTitle: sheetName,
            rows: [],
            headers: [],
            errors: [],
            warnings: [],
          });
          continue;
        }

        // Convert to JSON, skipping header row
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
          raw: false,
          defval: '',
        });

        // Skip description row (row 2) and example row (row 3) if present
        // Check if first row looks like description
        let dataRows = jsonData;
        if (jsonData.length > 0) {
          const firstRow = jsonData[0];
          const firstValue = Object.values(firstRow)[0];
          
          // If first data row looks like description, skip it
          if (typeof firstValue === 'string' && firstValue.includes('(') && firstValue.includes(')')) {
            dataRows = jsonData.slice(1);
          }
          
          // If second row looks like example, check if user wants to import it
          if (dataRows.length > 0 && dataRows[0]) {
            const exampleRow = dataRows[0];
            const exampleValues = Object.values(exampleRow);
            // Check if this matches the example from template
            const templateExample = sheetDef.columns[0]?.example;
            if (exampleValues[0] === templateExample) {
              allWarnings.push({
                sheet: sheetName,
                row: 2,
                message: `Dòng ví dụ mẫu sẽ được bỏ qua`,
              });
              dataRows = dataRows.slice(1);
            }
          }
        }

        // Clean header names (remove * for required fields)
        const headers = Object.keys(jsonData[0] || {}).map(h => h.replace(' *', '').trim());

        // Validate required fields
        const sheetErrors: ValidationError[] = [];
        const requiredColumns = sheetDef.columns.filter(c => c.required).map(c => c.name);

        dataRows.forEach((row, rowIndex) => {
          requiredColumns.forEach(col => {
            const headerWithStar = `${col} *`;
            const value = row[col] || row[headerWithStar];
            if (!value || value.trim() === '') {
              sheetErrors.push({
                sheet: sheetName,
                row: rowIndex + 3, // Account for header and description rows
                column: col,
                message: `Trường bắt buộc "${col}" bị thiếu`,
              });
            }
          });
        });

        // Normalize row keys (remove * from headers)
        const normalizedRows = dataRows.map(row => {
          const normalized: Record<string, string> = {};
          Object.entries(row).forEach(([key, value]) => {
            const cleanKey = key.replace(' *', '').trim();
            normalized[cleanKey] = value;
          });
          return normalized;
        }).filter(row => {
          // Filter out empty rows
          return Object.values(row).some(v => v && v.trim() !== '');
        });

        parsedSheets.push({
          sheetKey,
          sheetTitle: sheetName,
          rows: normalizedRows,
          headers,
          errors: sheetErrors,
          warnings: [],
        });

        allErrors.push(...sheetErrors);
      }

      // Build parse result
      const findSheet = (key: string) => parsedSheets.find(s => s.sheetKey === key)?.rows || [];
      
      const result: ParseResult = {
        packInfo: findSheet('pack_info')[0] || null,
        translations: findSheet('translations'),
        forbiddenTerms: findSheet('forbidden_terms'),
        complianceRules: findSheet('compliance_rules'),
        claimRestrictions: findSheet('claim_restrictions'),
        argumentPatterns: findSheet('argument_patterns'),
        systemRules: findSheet('system_rules'),
        jurisdictions: findSheet('jurisdictions'),
        keyRegulations: findSheet('key_regulations'),
        personas: findSheet('personas'),
      };

      // Validate pack_info exists
      if (!result.packInfo || !result.packInfo.code) {
        allErrors.push({
          sheet: '1. Pack Info',
          row: 3,
          column: 'code',
          message: 'Thiếu mã ngành (industry code) - trường bắt buộc',
        });
      }

      // Advanced validation for each sheet
      const packInfoValidation = validatePackInfo(result.packInfo, '1. Pack Info');
      allErrors.push(...packInfoValidation.errors);
      allWarnings.push(...packInfoValidation.warnings);

      const translationsValidation = validateTranslations(result.translations, '2. Translations');
      allErrors.push(...translationsValidation.errors);
      allWarnings.push(...translationsValidation.warnings);

      const complianceValidation = validateComplianceRules(result.complianceRules, '4. Compliance Rules');
      allErrors.push(...complianceValidation.errors);
      allWarnings.push(...complianceValidation.warnings);

      const claimValidation = validateClaimRestrictions(result.claimRestrictions, '5. Claim Restrictions');
      allErrors.push(...claimValidation.errors);
      allWarnings.push(...claimValidation.warnings);

      const patternsValidation = validateArgumentPatterns(result.argumentPatterns, '6. Argument Patterns');
      allErrors.push(...patternsValidation.errors);
      allWarnings.push(...patternsValidation.warnings);

      const systemRulesValidation = validateSystemRules(result.systemRules, '7. System Rules');
      allErrors.push(...systemRulesValidation.errors);
      allWarnings.push(...systemRulesValidation.warnings);

      const jurisdictionsValidation = validateJurisdictions(result.jurisdictions, '8. Jurisdictions');
      allErrors.push(...jurisdictionsValidation.errors);
      allWarnings.push(...jurisdictionsValidation.warnings);

      const keyRegulationsValidation = validateKeyRegulations(result.keyRegulations, '9. Key Regulations');
      allErrors.push(...keyRegulationsValidation.errors);
      allWarnings.push(...keyRegulationsValidation.warnings);

      const forbiddenTermsValidation = validateForbiddenTerms(result.forbiddenTerms, '3. Forbidden Terms');
      allErrors.push(...forbiddenTermsValidation.errors);
      allWarnings.push(...forbiddenTermsValidation.warnings);

      const personasValidation = validatePersonas(result.personas, '10. Personas');
      allErrors.push(...personasValidation.errors);
      allWarnings.push(...personasValidation.warnings);

      setSheetData(parsedSheets);
      setParseResult(result);
      setErrors(allErrors);
      setWarnings(allWarnings);
      setStep('preview');

    } catch (error) {
      console.error('Error parsing Excel file:', error);
      toast({
        title: 'Lỗi đọc file',
        description: 'Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    await parseExcelFile(selectedFile);
  }, [parseExcelFile]);

  const checkConflicts = useCallback(async () => {
    if (!parseResult?.packInfo?.code) return;

    setIsProcessing(true);
    try {
      const { data: existing } = await supabase
        .from('industry_global_packs')
        .select('id, industry_code')
        .eq('industry_code', parseResult.packInfo.code)
        .maybeSingle();

      if (existing) {
        setExistingPack({ id: existing.id, code: existing.industry_code });
      }
      setStep('validate');
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [parseResult]);

  const importData = useCallback(async () => {
    if (!parseResult?.packInfo) return;

    setStep('importing');
    setIsProcessing(true);
    const details = {
      translations: 0,
      forbiddenTerms: 0,
      complianceRules: 0,
      claimRestrictions: 0,
      argumentPatterns: 0,
      systemRules: 0,
      jurisdictions: 0,
      keyRegulations: 0,
      personas: 0,
    };

    try {
      const packInfo = parseResult.packInfo;
      let packId: string;

      // Step 1: Create or update global pack with Risk Guidelines
      setProgress({ current: 1, total: 10, currentStep: 'Tạo Industry Pack...' });

      // Build risk_guidelines from pack info
      const riskGuidelines = {
        related_industries: packInfo.related_industries?.split(';').map(i => i.trim()).filter(Boolean) || [],
        high_risk_keywords: packInfo.high_risk_keywords?.split(';').map(k => k.trim()).filter(Boolean) || [],
        scoring_weights: {
          forbidden_term: parseInt(packInfo.weight_forbidden_term) || 50,
          claim_restriction: parseInt(packInfo.weight_claim_restriction) || 30,
          forbidden_pattern: parseInt(packInfo.weight_forbidden_pattern) || 20,
          high_risk_keyword: parseInt(packInfo.weight_high_risk_keyword) || 10,
        },
        thresholds: {
          low: parseInt(packInfo.threshold_low) || 0,
          medium: parseInt(packInfo.threshold_medium) || 30,
          high: parseInt(packInfo.threshold_high) || 60,
          blocked: parseInt(packInfo.threshold_blocked) || 100,
        },
      };

      if (existingPack && conflictAction !== 'skip') {
        if (conflictAction === 'replace') {
          // Delete existing and recreate
          await supabase.from('industry_global_packs').delete().eq('id', existingPack.id);
        }
        
        if (conflictAction === 'merge') {
          packId = existingPack.id;
          // Update existing pack
          await supabase
            .from('industry_global_packs')
            .update({
              category_id: packInfo.category_code,
              target_audience: packInfo.target_audience || 'B2C',
              brand_voice_base: {
                tone_of_voice: packInfo.tone_of_voice || '',
                formality_level: packInfo.formality_level || 'semi_formal',
                language_style: packInfo.language_style || '',
                cta_policy: packInfo.cta_policy || '',
                allow_emoji: packInfo.allow_emoji === 'true',
                emoji_policy: packInfo.emoji_policy || 'limited',
              },
              risk_guidelines: riskGuidelines,
              industry_level: packInfo.industry_level || 'core',
              sort_order: parseInt(packInfo.sort_order) || 0,
              updated_at: new Date().toISOString(),
            })
            .eq('id', packId);
        } else {
          // Create new
          const { data: newPack, error } = await supabase
            .from('industry_global_packs')
            .insert({
              industry_code: packInfo.code,
              category_id: packInfo.category_code,
              target_audience: packInfo.target_audience || 'B2C',
              brand_voice_base: {
                tone_of_voice: packInfo.tone_of_voice || '',
                formality_level: packInfo.formality_level || 'semi_formal',
                language_style: packInfo.language_style || '',
                cta_policy: packInfo.cta_policy || '',
                allow_emoji: packInfo.allow_emoji === 'true',
                emoji_policy: packInfo.emoji_policy || 'limited',
              },
              risk_guidelines: riskGuidelines,
              industry_level: packInfo.industry_level || 'core',
              parent_pack_id: packInfo.parent_pack_code || null,
              sort_order: parseInt(packInfo.sort_order) || 0,
            })
            .select('id')
            .single();

          if (error) throw error;
          packId = newPack.id;
        }
      } else if (!existingPack) {
        // Create new pack
        const { data: newPack, error } = await supabase
          .from('industry_global_packs')
          .insert({
            industry_code: packInfo.code,
            category_id: packInfo.category_code,
            target_audience: packInfo.target_audience || 'B2C',
            brand_voice_base: {
              tone_of_voice: packInfo.tone_of_voice || '',
              formality_level: packInfo.formality_level || 'semi_formal',
              language_style: packInfo.language_style || '',
              cta_policy: packInfo.cta_policy || '',
              allow_emoji: packInfo.allow_emoji === 'true',
              emoji_policy: packInfo.emoji_policy || 'limited',
            },
            risk_guidelines: riskGuidelines,
            industry_level: packInfo.industry_level || 'core',
            parent_pack_id: packInfo.parent_pack_code || null,
            sort_order: parseInt(packInfo.sort_order) || 0,
          })
          .select('id')
          .single();

        if (error) throw error;
        packId = newPack.id;
      } else {
        // Skip - don't import
        setImportResult({
          success: false,
          message: 'Import bị bỏ qua vì đã tồn tại pack với mã này',
          details,
        });
        setStep('done');
        return;
      }

      // Step 2: Import translations with glossary
      setProgress({ current: 2, total: 10, currentStep: 'Import bản dịch...' });
      if (parseResult.translations.length > 0) {
        for (const trans of parseResult.translations) {
          // Build glossary object from keys/values
          const glossaryKeys = trans.glossary_keys?.split(';').map(k => k.trim()).filter(Boolean) || [];
          const glossaryValues = trans.glossary_values?.split(';').map(v => v.trim()).filter(Boolean) || [];
          const glossary = glossaryKeys.reduce((acc, key, i) => ({
            ...acc,
            [key]: glossaryValues[i] || '',
          }), {} as Record<string, string>);

          const { error } = await supabase
            .from('industry_pack_translations')
            .upsert({
              global_pack_id: packId,
              language_code: trans.language_code,
              name: trans.name,
              short_name: trans.short_name || null,
              preferred_terms: trans.preferred_words?.split(',').map(w => w.trim()).filter(Boolean) || [],
              forbidden_terms: trans.forbidden_words?.split(',').map(w => w.trim()).filter(Boolean) || [],
              glossary: Object.keys(glossary).length > 0 ? glossary : null,
            }, {
              onConflict: 'global_pack_id,language_code',
            });
          if (!error) details.translations++;
        }
      }

      // Step 3: Import forbidden terms (using type assertion for tables not in generated types)
      setProgress({ current: 3, total: 10, currentStep: 'Import thuật ngữ cấm...' });
      if (parseResult.forbiddenTerms.length > 0) {
        for (const term of parseResult.forbiddenTerms) {
          const { error } = await (supabase
            .from('industry_forbidden_terms' as any)
            .upsert({
              global_pack_id: packId,
              term: term.term,
              reason: term.reason || null,
            }, {
              onConflict: 'global_pack_id,term',
            }) as any);
          if (!error) details.forbiddenTerms++;
        }
      }

      // Step 4: Import compliance rules
      setProgress({ current: 4, total: 10, currentStep: 'Import quy tắc tuân thủ...' });
      if (parseResult.complianceRules.length > 0) {
        for (const rule of parseResult.complianceRules) {
          const { error } = await (supabase
            .from('industry_compliance_rules' as any)
            .upsert({
              global_pack_id: packId,
              rule_id: rule.rule_id,
              rule_text: rule.rule_text,
              category: rule.category || 'general',
              severity: rule.severity || 'warning',
            }, {
              onConflict: 'global_pack_id,rule_id',
            }) as any);
          if (!error) details.complianceRules++;
        }
      }

      // Step 5: Import claim restrictions
      setProgress({ current: 5, total: 10, currentStep: 'Import giới hạn claim...' });
      if (parseResult.claimRestrictions.length > 0) {
        for (const claim of parseResult.claimRestrictions) {
          const { error } = await (supabase
            .from('industry_claim_restrictions' as any)
            .upsert({
              global_pack_id: packId,
              forbidden_claim: claim.forbidden_claim,
              suggested_alternative: claim.suggested_alternative,
              severity: claim.severity || 'warning',
            }, {
              onConflict: 'global_pack_id,forbidden_claim',
            }) as any);
          if (!error) details.claimRestrictions++;
        }
      }

      // Step 6: Import argument patterns
      setProgress({ current: 6, total: 10, currentStep: 'Import mẫu lập luận...' });
      if (parseResult.argumentPatterns.length > 0) {
        for (const pattern of parseResult.argumentPatterns) {
          const { error } = await (supabase
            .from('industry_argument_patterns' as any)
            .upsert({
              global_pack_id: packId,
              type: pattern.type,
              pattern: pattern.pattern,
              category: pattern.category || 'general',
            }, {
              onConflict: 'global_pack_id,pattern',
            }) as any);
          if (!error) details.argumentPatterns++;
        }
      }

      // Step 7: Import system rules
      setProgress({ current: 7, total: 10, currentStep: 'Import quy tắc hệ thống...' });
      if (parseResult.systemRules.length > 0) {
        for (const rule of parseResult.systemRules) {
          const { error } = await (supabase
            .from('industry_system_rules' as any)
            .upsert({
              global_pack_id: packId,
              rule: rule.rule,
              priority: rule.priority || 'medium',
            }, {
              onConflict: 'global_pack_id,rule',
            }) as any);
          if (!error) details.systemRules++;
        }
      }

      // Step 8: Import jurisdictions with extended fields
      setProgress({ current: 8, total: 10, currentStep: 'Import hồ sơ quốc gia...' });
      if (parseResult.jurisdictions.length > 0) {
        for (const jurisdiction of parseResult.jurisdictions) {
          const { error } = await supabase
            .from('industry_jurisdiction_profiles')
            .upsert({
              global_pack_id: packId,
              jurisdiction_code: jurisdiction.jurisdiction_code,
              additional_forbidden_terms: jurisdiction.additional_forbidden_terms?.split(';').map(t => t.trim()).filter(Boolean) || [],
              modified_compliance_rules: jurisdiction.modified_compliance_rules ? JSON.parse(jurisdiction.modified_compliance_rules) : null,
              disclaimer: jurisdiction.notes || null,
              validity_status: jurisdiction.validity_status || 'current',
              last_verified_date: jurisdiction.last_verified_date || null,
              industry_trends: jurisdiction.industry_trends?.split(';').map(t => t.trim()).filter(Boolean) || [],
            }, {
              onConflict: 'global_pack_id,jurisdiction_code',
            });
          if (!error) details.jurisdictions++;
        }
      }

      // Step 9: Import key regulations (store in resolved_rules of jurisdiction profiles)
      setProgress({ current: 9, total: 10, currentStep: 'Import quy định pháp luật...' });
      if (parseResult.keyRegulations.length > 0) {
        // Group regulations by jurisdiction
        const regulationsByJurisdiction = parseResult.keyRegulations.reduce((acc, reg) => {
          const code = reg.jurisdiction_code?.toUpperCase();
          if (code) {
            if (!acc[code]) acc[code] = [];
            acc[code].push({
              regulation_name: reg.regulation_name,
              effective_date: reg.effective_date,
              summary: reg.summary || '',
              source_url: reg.source_url || '',
              validity_status: reg.validity_status || 'current',
            });
          }
          return acc;
        }, {} as Record<string, any[]>);

        // Update each jurisdiction profile with key regulations
        for (const [jurisdictionCode, regulations] of Object.entries(regulationsByJurisdiction)) {
          // Get current resolved_rules
          const { data: profile } = await supabase
            .from('industry_jurisdiction_profiles')
            .select('resolved_rules')
            .eq('global_pack_id', packId)
            .eq('jurisdiction_code', jurisdictionCode)
            .single();

          const currentRules = (profile?.resolved_rules as Record<string, any>) || {};
          const updatedRules = {
            ...currentRules,
            key_regulations: regulations,
          };

          await supabase
            .from('industry_jurisdiction_profiles')
            .update({ resolved_rules: updatedRules })
            .eq('global_pack_id', packId)
            .eq('jurisdiction_code', jurisdictionCode);

          details.keyRegulations += regulations.length;
        }
      }

      // Step 10: Import personas with Extended PRO fields
      setProgress({ current: 10, total: 10, currentStep: 'Import personas...' });
      if (parseResult.personas.length > 0) {
        // First, get existing personas for this pack to enable update logic
        const { data: existingPersonas } = await supabase
          .from('industry_personas_v2')
          .select('id, name')
          .eq('global_pack_id', packId);
        
        const existingPersonaMap = new Map(
          (existingPersonas || []).map(p => [p.name.toLowerCase().trim(), p.id])
        );

        for (const persona of parseResult.personas) {
          // Parse JSON fields safely
          const parseJSON = (str: string | undefined) => {
            if (!str || str.trim() === '') return null;
            try { return JSON.parse(str); } catch { return null; }
          };

          const personaData = {
            global_pack_id: packId,
            name: persona.name,
            description: persona.description || null,
            age_range: persona.age_range || null,
            gender: persona.gender || 'all',
            income_level: persona.income_level || 'medium',
            education_level: persona.education_level || null,
            occupation: persona.occupation || null,
            location_type: persona.location_type || 'urban',
            family_status: persona.family_status || null,
            pain_points: persona.pain_points?.split(';').map(p => p.trim()).filter(Boolean) || [],
            goals: persona.goals?.split(';').map(g => g.trim()).filter(Boolean) || [],
            objections: persona.objections?.split(';').map(o => o.trim()).filter(Boolean) || [],
            values: persona.values?.split(';').map(v => v.trim()).filter(Boolean) || [],
            interests: persona.interests?.split(';').map(i => i.trim()).filter(Boolean) || [],
            buying_motivation: persona.buying_motivation?.split(';').map(m => m.trim()).filter(Boolean) || [],
            preferred_channels: persona.preferred_channels?.split(';').map(c => c.trim()).filter(Boolean) || [],
            communication_style: persona.communication_style || 'direct',
            response_tone_hints: persona.response_tone_hints?.split(';').map(h => h.trim()).filter(Boolean) || [],
            sort_order: parseInt(persona.sort_order) || 0,
            // Extended PRO fields
            lifestyle: persona.lifestyle || null,
            tech_savviness: persona.tech_savviness || null,
            price_sensitivity: persona.price_sensitivity || null,
            purchase_frequency: persona.purchase_frequency || null,
            decision_factors: persona.decision_factors?.split(';').map(d => d.trim()).filter(Boolean) || [],
            personality_traits: persona.personality_traits?.split(';').map(t => t.trim()).filter(Boolean) || [],
            social_platforms: persona.social_platforms?.split(';').map(s => s.trim()).filter(Boolean) || [],
            content_consumption: persona.content_consumption?.split(';').map(c => c.trim()).filter(Boolean) || [],
            trigger_words: persona.trigger_words?.split(';').map(w => w.trim()).filter(Boolean) || [],
            persona_type: persona.persona_type || 'primary',
            // New v2.2 Extended PRO fields (JSON parsed)
            avatar_url: persona.avatar_url || null,
            segment_size: persona.segment_size ? parseFloat(persona.segment_size) : null,
            priority_score: persona.priority_score ? parseInt(persona.priority_score) : null,
            device_usage: parseJSON(persona.device_usage),
            content_preferences: parseJSON(persona.content_preferences),
            journey_stages: parseJSON(persona.journey_stages),
            country_variants: parseJSON(persona.country_variants),
            is_active: true,
          };

          const existingId = existingPersonaMap.get(persona.name.toLowerCase().trim());
          
          if (existingId && conflictAction === 'merge') {
            // Update existing persona
            const { error } = await supabase
              .from('industry_personas_v2')
              .update({
                ...personaData,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingId);
            if (!error) details.personas++;
          } else if (!existingId) {
            // Insert new persona
            const { error } = await supabase
              .from('industry_personas_v2')
              .insert(personaData);
            if (!error) details.personas++;
          }
        }
      }

      setImportResult({
        success: true,
        packId,
        packCode: packInfo.code,
        message: `Import thành công Industry Pack "${packInfo.code}"`,
        details,
      });
      setStep('done');

      toast({
        title: 'Import thành công!',
        description: `Đã import Industry Pack "${packInfo.code}" với đầy đủ dữ liệu.`,
      });

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Lỗi import',
        description: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi import dữ liệu',
        variant: 'destructive',
      });
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Đã xảy ra lỗi',
        details,
      });
      setStep('done');
    } finally {
      setIsProcessing(false);
    }
  }, [parseResult, existingPack, conflictAction, toast]);

  const getSummary = useCallback(() => {
    if (!parseResult) return null;

    return {
      packCode: parseResult.packInfo?.code || 'N/A',
      translations: parseResult.translations.length,
      forbiddenTerms: parseResult.forbiddenTerms.length,
      complianceRules: parseResult.complianceRules.length,
      claimRestrictions: parseResult.claimRestrictions.length,
      argumentPatterns: parseResult.argumentPatterns.length,
      systemRules: parseResult.systemRules.length,
      jurisdictions: parseResult.jurisdictions.length,
      keyRegulations: parseResult.keyRegulations.length,
      personas: parseResult.personas.length,
      totalErrors: errors.length,
      totalWarnings: warnings.length,
    };
  }, [parseResult, errors, warnings]);

  return {
    step,
    file,
    sheetData,
    parseResult,
    errors,
    warnings,
    isProcessing,
    progress,
    importResult,
    existingPack,
    conflictAction,
    setStep,
    setConflictAction,
    handleFileSelect,
    checkConflicts,
    importData,
    reset,
    getSummary,
  };
}
