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

export interface ImportLogEntry {
  step: number;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  startTime?: number;
  endTime?: number;
  count?: number;
  error?: string;
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
  const [progress, setProgress] = useState<ImportProgress>({ current: 0, total: 10, currentStep: '' });
  const [importLogs, setImportLogs] = useState<ImportLogEntry[]>([]);
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
    setProgress({ current: 0, total: 10, currentStep: '' });
    setImportLogs([]);
    setImportResult(null);
    setExistingPack(null);
    setConflictAction('merge');
  }, []);

  const parseExcelFile = useCallback(async (file: File): Promise<void> => {
    setIsProcessing(true);
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];
    const parsedSheets: ParsedSheetData[] = [];

    console.log('[ExcelImport] Starting to parse file:', file.name, file.size, file.type);

    try {
      const buffer = await file.arrayBuffer();
      console.log('[ExcelImport] File buffer loaded, size:', buffer.byteLength);
      
      const workbook = XLSX.read(buffer, { type: 'array' });
      console.log('[ExcelImport] Workbook parsed, sheets:', workbook.SheetNames);

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

    // Initialize import logs
    const stepNames = [
      'Tạo Industry Pack',
      'Import bản dịch',
      'Import thuật ngữ cấm',
      'Import quy tắc tuân thủ',
      'Import giới hạn claim',
      'Import mẫu lập luận',
      'Import quy tắc hệ thống',
      'Import hồ sơ quốc gia',
      'Import quy định pháp luật',
      'Import personas',
    ];

    const initialLogs: ImportLogEntry[] = stepNames.map((name, i) => ({
      step: i + 1,
      name,
      status: 'pending' as const,
    }));
    setImportLogs(initialLogs);

    const updateLog = (step: number, updates: Partial<ImportLogEntry>) => {
      setImportLogs(prev => prev.map(log => 
        log.step === step ? { ...log, ...updates } : log
      ));
    };

    const startStep = (step: number) => {
      updateLog(step, { status: 'running', startTime: Date.now() });
      setProgress({ current: step, total: 10, currentStep: stepNames[step - 1] });
    };

    const completeStep = (step: number, count?: number) => {
      updateLog(step, { status: 'success', endTime: Date.now(), count });
    };

    const failStep = (step: number, error: string) => {
      updateLog(step, { status: 'error', endTime: Date.now(), error });
    };

    try {
      const packInfo = parseResult.packInfo;
      let packId: string;

      // Step 1: Create or update global pack with Risk Guidelines + All JSONB data
      startStep(1);

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

      // Build brand_voice from pack info
      const globalBrandVoice = {
        tone_of_voice: packInfo.tone_of_voice || '',
        formality_level: packInfo.formality_level || 'semi_formal',
        language_style: packInfo.language_style || '',
        cta_policy: packInfo.cta_policy || '',
        allow_emoji: packInfo.allow_emoji === 'true',
        emoji_policy: packInfo.emoji_policy || 'limited',
      };

      // Build terminology from forbidden terms
      const globalTerminology = {
        forbidden_terms: parseResult.forbiddenTerms.map(t => ({
          term: t.term,
          reason: t.reason || null,
        })),
      };

      // Build compliance rules array
      const globalComplianceRules = parseResult.complianceRules.map(r => ({
        rule_id: r.rule_id,
        rule_text: r.rule_text,
        category: r.category || 'general',
        severity: r.severity || 'warning',
      }));

      // Build claim restrictions array
      const globalClaimRestrictions = parseResult.claimRestrictions.map(c => ({
        forbidden_claim: c.forbidden_claim,
        suggested_alternative: c.suggested_alternative,
        severity: c.severity || 'warning',
      }));

      // Build argument patterns
      const globalArgumentPatterns = {
        valid: parseResult.argumentPatterns
          .filter(p => p.type === 'valid')
          .map(p => ({ pattern: p.pattern, category: p.category || 'general' })),
        forbidden: parseResult.argumentPatterns
          .filter(p => p.type === 'forbidden')
          .map(p => ({ pattern: p.pattern, category: p.category || 'general' })),
      };

      // Build system rules array
      const globalSystemRules = parseResult.systemRules.map(r => ({
        rule: r.rule,
        priority: r.priority || 'medium',
      }));

      // Prepare related_industries array
      const relatedIndustries = packInfo.related_industries?.split(';').map(i => i.trim()).filter(Boolean) || [];

      // Look up parent_pack_id if parent_pack_code provided
      let parentPackId: string | null = null;
      if (packInfo.parent_pack_code) {
        const { data: parentPack } = await supabase
          .from('industry_global_packs')
          .select('id')
          .eq('industry_code', packInfo.parent_pack_code)
          .single();
        parentPackId = parentPack?.id || null;
      }

      // Look up category_id from category_code
      let categoryId: string | null = null;
      if (packInfo.category_code) {
        const { data: category } = await supabase
          .from('industry_categories')
          .select('id')
          .eq('code', packInfo.category_code)
          .single();
        categoryId = category?.id || null;
      }

      const packData = {
        industry_code: packInfo.code,
        category_id: categoryId,
        target_audience: packInfo.target_audience || 'B2C',
        global_brand_voice: globalBrandVoice,
        global_terminology: globalTerminology,
        global_compliance_rules: globalComplianceRules,
        global_claim_restrictions: globalClaimRestrictions,
        global_argument_patterns: globalArgumentPatterns,
        global_system_rules: globalSystemRules,
        risk_guidelines: riskGuidelines,
        related_industries: relatedIndustries,
        industry_level: packInfo.industry_level || 'core',
        parent_pack_id: parentPackId,
        sort_order: parseInt(packInfo.sort_order) || 0,
      };

      if (existingPack && conflictAction !== 'skip') {
        if (conflictAction === 'replace') {
          // Delete existing and recreate
          await supabase.from('industry_global_packs').delete().eq('id', existingPack.id);
        }
        
        if (conflictAction === 'merge') {
          packId = existingPack.id;
          // Update existing pack - merge JSONB data
          const { data: currentPack } = await supabase
            .from('industry_global_packs')
            .select('global_terminology, global_compliance_rules, global_claim_restrictions, global_argument_patterns, global_system_rules')
            .eq('id', existingPack.id)
            .single();

          // Merge arrays and objects
          const mergedTerminology = {
            forbidden_terms: [
              ...((currentPack?.global_terminology as any)?.forbidden_terms || []),
              ...globalTerminology.forbidden_terms,
            ].filter((v, i, a) => a.findIndex(t => t.term === v.term) === i), // Remove duplicates
          };

          const mergedComplianceRules = [
            ...((currentPack?.global_compliance_rules as any[]) || []),
            ...globalComplianceRules,
          ].filter((v, i, a) => a.findIndex(t => t.rule_id === v.rule_id) === i);

          const mergedClaimRestrictions = [
            ...((currentPack?.global_claim_restrictions as any[]) || []),
            ...globalClaimRestrictions,
          ].filter((v, i, a) => a.findIndex(t => t.forbidden_claim === v.forbidden_claim) === i);

          const existingPatterns = (currentPack?.global_argument_patterns as any) || { valid: [], forbidden: [] };
          const mergedPatterns = {
            valid: [...(existingPatterns.valid || []), ...globalArgumentPatterns.valid]
              .filter((v, i, a) => a.findIndex(t => t.pattern === v.pattern) === i),
            forbidden: [...(existingPatterns.forbidden || []), ...globalArgumentPatterns.forbidden]
              .filter((v, i, a) => a.findIndex(t => t.pattern === v.pattern) === i),
          };

          const mergedSystemRules = [
            ...((currentPack?.global_system_rules as any[]) || []),
            ...globalSystemRules,
          ].filter((v, i, a) => a.findIndex(t => t.rule === v.rule) === i);

          await supabase
            .from('industry_global_packs')
            .update({
              category_id: categoryId,
              target_audience: packInfo.target_audience || 'B2C',
              global_brand_voice: globalBrandVoice,
              global_terminology: mergedTerminology,
              global_compliance_rules: mergedComplianceRules,
              global_claim_restrictions: mergedClaimRestrictions,
              global_argument_patterns: mergedPatterns,
              global_system_rules: mergedSystemRules,
              risk_guidelines: riskGuidelines,
              related_industries: relatedIndustries,
              industry_level: packInfo.industry_level || 'core',
              sort_order: parseInt(packInfo.sort_order) || 0,
              updated_at: new Date().toISOString(),
            })
            .eq('id', packId);
        } else {
          // Create new (after replace deleted)
          const { data: newPack, error } = await supabase
            .from('industry_global_packs')
            .insert(packData)
            .select('id')
            .single();

          if (error) throw error;
          packId = newPack.id;
        }
      } else if (!existingPack) {
        // Create new pack
        const { data: newPack, error } = await supabase
          .from('industry_global_packs')
          .insert(packData)
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

      completeStep(1, 1);

      // Update counts for forbidden terms, compliance, etc. (already in pack)
      details.forbiddenTerms = parseResult.forbiddenTerms.length;
      details.complianceRules = parseResult.complianceRules.length;
      details.claimRestrictions = parseResult.claimRestrictions.length;
      details.argumentPatterns = parseResult.argumentPatterns.length;
      details.systemRules = parseResult.systemRules.length;

      // Step 2: Import translations with glossary
      startStep(2);
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
      completeStep(2, details.translations);

      // Step 3: Mark forbidden terms (already saved in Step 1)
      startStep(3);
      completeStep(3, details.forbiddenTerms);

      // Step 4: Mark compliance rules (already saved in Step 1)
      startStep(4);
      completeStep(4, details.complianceRules);

      // Step 5: Mark claim restrictions (already saved in Step 1)
      startStep(5);
      completeStep(5, details.claimRestrictions);

      // Step 6: Mark argument patterns (already saved in Step 1)
      startStep(6);
      completeStep(6, details.argumentPatterns);

      // Step 7: Mark system rules (already saved in Step 1)
      startStep(7);
      completeStep(7, details.systemRules);

      // Step 8: Import jurisdictions - store extended fields in resolved_rules JSONB
      startStep(8);
      if (parseResult.jurisdictions.length > 0) {
        for (const jurisdiction of parseResult.jurisdictions) {
          // Build resolved_rules with all extended fields
          const resolvedRules = {
            additional_forbidden_terms: jurisdiction.additional_forbidden_terms?.split(';').map(t => t.trim()).filter(Boolean) || [],
            modified_compliance_rules: jurisdiction.modified_compliance_rules ? (() => {
              try { return JSON.parse(jurisdiction.modified_compliance_rules); } catch { return null; }
            })() : null,
            industry_trends: jurisdiction.industry_trends?.split(';').map(t => t.trim()).filter(Boolean) || [],
            notes: jurisdiction.notes || null,
          };

          const { error } = await supabase
            .from('industry_jurisdiction_profiles')
            .upsert({
              global_pack_id: packId,
              jurisdiction_code: jurisdiction.jurisdiction_code,
              resolved_rules: resolvedRules,
              disclaimer: jurisdiction.notes || null,
              validity_status: jurisdiction.validity_status || 'current',
              last_verified_date: jurisdiction.last_verified_date || null,
            }, {
              onConflict: 'global_pack_id,jurisdiction_code',
            });
          if (!error) details.jurisdictions++;
        }
      }
      completeStep(8, details.jurisdictions);

      // Step 9: Import key regulations (store in resolved_rules of jurisdiction profiles)
      startStep(9);
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
      completeStep(9, details.keyRegulations);

      // Step 10: Import personas with Extended PRO fields
      startStep(10);
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

          // Build content_preferences with extended PRO fields merged in
          const baseContentPrefs = parseJSON(persona.content_preferences) || {};
          const contentPreferences = {
            ...baseContentPrefs,
            trigger_words: persona.trigger_words?.split(';').map(w => w.trim()).filter(Boolean) || [],
            segment_size: persona.segment_size ? parseFloat(persona.segment_size) : null,
            priority_score: persona.priority_score ? parseInt(persona.priority_score) : null,
            persona_type: persona.persona_type || 'primary',
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
            // Extended PRO fields that exist in schema
            lifestyle: persona.lifestyle || null,
            tech_savviness: persona.tech_savviness || null,
            price_sensitivity: persona.price_sensitivity || null,
            purchase_frequency: persona.purchase_frequency || null,
            decision_factors: persona.decision_factors?.split(';').map(d => d.trim()).filter(Boolean) || [],
            personality_traits: persona.personality_traits?.split(';').map(t => t.trim()).filter(Boolean) || [],
            social_platforms: persona.social_platforms?.split(';').map(s => s.trim()).filter(Boolean) || [],
            content_consumption: persona.content_consumption?.split(';').map(c => c.trim()).filter(Boolean) || [],
            avatar_url: persona.avatar_url || null,
            // JSONB fields with extended data merged
            device_usage: parseJSON(persona.device_usage),
            content_preferences: contentPreferences,
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
      completeStep(10, details.personas);

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
    importLogs,
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
