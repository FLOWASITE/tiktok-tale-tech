import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  parseAndValidateCSVFiles,
  groupDataByIndustryCode,
  getUniqueIndustryCodes,
  type ParsedCSVData,
  type ParseResult,
  type ValidationError,
  type IndustryInfoRow,
} from '@/utils/industryCSVParser';

// ============================================
// Industry Import Hook
// ============================================

export type ImportStep = 'upload' | 'preview' | 'validate' | 'importing' | 'done';
export type ConflictAction = 'update' | 'skip' | 'new_only';

export interface ExistingIndustry {
  id: string;
  code: string;
  country_code: string;
  category_id: string;
}

export interface ConflictInfo {
  industryCode: string;
  countryCode: string;
  existingId: string;
  hasChanges: boolean;
}

export interface ImportProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  currentItem: string;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export function useIndustryImport() {
  const [step, setStep] = useState<ImportStep>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [conflictAction, setConflictAction] = useState<ConflictAction>('update');
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setStep('upload');
    setFiles([]);
    setParseResult(null);
    setConflicts([]);
    setConflictAction('update');
    setProgress(null);
    setImportResult(null);
    setIsProcessing(false);
  }, []);

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(async (selectedFiles: File[]) => {
    // Validate file types
    const csvFiles = selectedFiles.filter(f => f.name.toLowerCase().endsWith('.csv'));
    if (csvFiles.length === 0) {
      return { success: false, error: 'Please select CSV files' };
    }

    // Check file sizes (max 5MB each)
    const oversizedFiles = csvFiles.filter(f => f.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      return { success: false, error: `Files too large (max 5MB): ${oversizedFiles.map(f => f.name).join(', ')}` };
    }

    setFiles(csvFiles);
    setIsProcessing(true);

    try {
      // Parse and validate files
      const result = await parseAndValidateCSVFiles(csvFiles);
      setParseResult(result);
      
      if (result.errors.length > 0) {
        setStep('validate');
      } else {
        setStep('preview');
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Parse error' };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Check for conflicts with existing data
   */
  const checkConflicts = useCallback(async () => {
    if (!parseResult) return;

    setIsProcessing(true);
    try {
      const codes = getUniqueIndustryCodes(parseResult.data);
      const grouped = groupDataByIndustryCode(parseResult.data);
      
      // Get existing templates
      const { data: existingTemplates, error } = await supabase
        .from('industry_templates')
        .select('id, code, country_id, category_id, countries!inner(code)')
        .in('code', codes);

      if (error) throw error;

      // Build conflict list
      const conflictList: ConflictInfo[] = [];
      
      codes.forEach(code => {
        const info = grouped[code]?.info;
        if (!info) return;

        const existing = existingTemplates?.find(t => 
          t.code === code && 
          (t.countries as { code: string })?.code === info.country_code
        );

        if (existing) {
          conflictList.push({
            industryCode: code,
            countryCode: info.country_code,
            existingId: existing.id,
            hasChanges: true, // Could do deep comparison here
          });
        }
      });

      setConflicts(conflictList);
      setStep('validate');
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [parseResult]);

  /**
   * Import data to database
   */
  const importData = useCallback(async () => {
    if (!parseResult) return;

    setStep('importing');
    setIsProcessing(true);

    const grouped = groupDataByIndustryCode(parseResult.data);
    const codes = Object.keys(grouped);
    
    const importProgress: ImportProgress = {
      total: codes.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      currentItem: '',
    };
    
    const errors: string[] = [];

    // Get reference data
    const [countriesRes, categoriesRes] = await Promise.all([
      supabase.from('countries').select('id, code'),
      supabase.from('industry_categories').select('id, code'),
    ]);

    const countryMap = new Map(countriesRes.data?.map(c => [c.code, c.id]) || []);
    const categoryMap = new Map(categoriesRes.data?.map(c => [c.code, c.id]) || []);

    for (const code of codes) {
      importProgress.currentItem = code;
      importProgress.processed++;
      setProgress({ ...importProgress });

      const data = grouped[code];
      const info = data.info;
      
      if (!info) {
        importProgress.skipped++;
        continue;
      }

      // Check if this is a conflict
      const conflict = conflicts.find(c => c.industryCode === code && c.countryCode === info.country_code);
      
      if (conflict) {
        if (conflictAction === 'skip') {
          importProgress.skipped++;
          continue;
        }
        if (conflictAction === 'new_only') {
          importProgress.skipped++;
          continue;
        }
      }

      try {
        const countryId = countryMap.get(info.country_code);
        const categoryId = categoryMap.get(info.category_code);

        if (!countryId) {
          errors.push(`${code}: Country not found: ${info.country_code}`);
          importProgress.failed++;
          continue;
        }

        if (!categoryId) {
          errors.push(`${code}: Category not found: ${info.category_code}`);
          importProgress.failed++;
          continue;
        }

        // Build forbidden_terms array
        const forbiddenTerms = data.forbiddenTerms.map(t => t.term);

        // Build compliance_rules JSON
        const complianceRules = data.complianceRules.map(r => ({
          rule: r.rule,
          category: r.category || 'general',
          severity: r.severity || 'warning',
        }));

        // Build claim_restrictions JSON
        const claimRestrictions = data.claimRestrictions.map(r => ({
          claim: r.claim,
          alternative: r.alternative,
        }));

        // Build argument_patterns JSON
        const argumentPatterns = {
          valid_patterns: data.argumentPatterns.filter(p => p.type === 'valid').map(p => p.pattern),
          forbidden_patterns: data.argumentPatterns.filter(p => p.type === 'forbidden').map(p => p.pattern),
        };

        // Build system_rules array
        const systemRules = data.systemRules.map(r => r.rule);

        // Build brand_voice JSON
        const brandVoice = {
          tone_of_voice: info.tone_of_voice || 'professional',
          formality_level: info.formality_level || 'formal',
          language_style: info.language_style || 'clear',
          cta_policy: info.cta_policy || 'standard',
          allow_emoji: info.allow_emoji?.toLowerCase() === 'true' || info.allow_emoji === '1',
        };

        // Upsert template
        let templateId: string;
        
        if (conflict && conflictAction === 'update') {
          // Update existing
          const { error: updateError } = await supabase
            .from('industry_templates')
            .update({
              category_id: categoryId,
              target_audience: info.target_audience || 'both',
              forbidden_terms: forbiddenTerms,
              compliance_rules: complianceRules,
              claim_restrictions: claimRestrictions,
              argument_patterns: argumentPatterns,
              system_rules: systemRules,
              brand_voice: brandVoice,
              updated_at: new Date().toISOString(),
            })
            .eq('id', conflict.existingId);

          if (updateError) throw updateError;
          templateId = conflict.existingId;
        } else {
          // Insert new
          const { data: inserted, error: insertError } = await supabase
            .from('industry_templates')
            .insert({
              code: code,
              country_id: countryId,
              category_id: categoryId,
              target_audience: info.target_audience || 'both',
              forbidden_terms: forbiddenTerms,
              compliance_rules: complianceRules,
              claim_restrictions: claimRestrictions,
              argument_patterns: argumentPatterns,
              system_rules: systemRules,
              brand_voice: brandVoice,
              is_active: true,
            })
            .select('id')
            .single();

          if (insertError) throw insertError;
          templateId = inserted.id;
        }

        // Upsert translations
        const preferredWordsVi = data.preferredWords.filter(w => w.language_code === 'vi').map(w => w.word);
        const forbiddenWordsVi = data.forbiddenWords.filter(w => w.language_code === 'vi').map(w => w.word);
        const preferredWordsEn = data.preferredWords.filter(w => w.language_code === 'en').map(w => w.word);
        const forbiddenWordsEn = data.forbiddenWords.filter(w => w.language_code === 'en').map(w => w.word);

        // Vietnamese translation
        await supabase
          .from('industry_template_translations')
          .upsert({
            industry_template_id: templateId,
            language_code: 'vi',
            name: info.name_vi,
            preferred_words: preferredWordsVi,
            forbidden_words: forbiddenWordsVi,
          }, { onConflict: 'industry_template_id,language_code' });

        // English translation
        if (info.name_en) {
          await supabase
            .from('industry_template_translations')
            .upsert({
              industry_template_id: templateId,
              language_code: 'en',
              name: info.name_en,
              preferred_words: preferredWordsEn,
              forbidden_words: forbiddenWordsEn,
            }, { onConflict: 'industry_template_id,language_code' });
        }

        importProgress.succeeded++;
      } catch (error) {
        console.error(`Error importing ${code}:`, error);
        errors.push(`${code}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        importProgress.failed++;
      }
    }

    setProgress(importProgress);
    setImportResult({
      success: errors.length === 0,
      imported: importProgress.succeeded - conflicts.filter(c => conflictAction === 'update').length,
      updated: conflictAction === 'update' ? conflicts.length : 0,
      skipped: importProgress.skipped,
      errors,
    });
    setStep('done');
    setIsProcessing(false);
  }, [parseResult, conflicts, conflictAction]);

  /**
   * Get summary statistics
   */
  const getSummary = useCallback(() => {
    if (!parseResult) return null;

    const grouped = groupDataByIndustryCode(parseResult.data);
    const codes = Object.keys(grouped);

    return {
      totalIndustries: codes.length,
      totalRecords: {
        industryInfo: parseResult.data.industryInfo.length,
        forbiddenTerms: parseResult.data.forbiddenTerms.length,
        preferredWords: parseResult.data.preferredWords.length,
        forbiddenWords: parseResult.data.forbiddenWords.length,
        complianceRules: parseResult.data.complianceRules.length,
        claimRestrictions: parseResult.data.claimRestrictions.length,
        argumentPatterns: parseResult.data.argumentPatterns.length,
        systemRules: parseResult.data.systemRules.length,
      },
      errors: parseResult.errors.length,
      warnings: parseResult.warnings.length,
      conflicts: conflicts.length,
    };
  }, [parseResult, conflicts]);

  return {
    // State
    step,
    files,
    parseResult,
    conflicts,
    conflictAction,
    progress,
    importResult,
    isProcessing,
    
    // Actions
    setStep,
    setConflictAction,
    handleFileSelect,
    checkConflicts,
    importData,
    reset,
    getSummary,
  };
}
