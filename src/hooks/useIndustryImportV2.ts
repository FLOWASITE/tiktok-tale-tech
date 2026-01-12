import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  parseAndValidateCSVFilesV2,
  groupDataByPackCode,
  getUniquePackCodes,
  type ParseResultV2,
} from '@/utils/industryCSVParserV2';

// ============================================
// Industry Import Hook V2 - For Global Packs Schema
// ============================================

export type ImportStep = 'upload' | 'preview' | 'validate' | 'importing' | 'done';
export type ConflictAction = 'update' | 'skip' | 'new_only';

export interface ExistingPack {
  id: string;
  industry_code: string;
  version: string;
}

export interface ConflictInfo {
  packCode: string;
  existingId: string;
  existingVersion: string;
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

export function useIndustryImportV2() {
  const [step, setStep] = useState<ImportStep>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [parseResult, setParseResult] = useState<ParseResultV2 | null>(null);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [conflictAction, setConflictAction] = useState<ConflictAction>('update');
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleFileSelect = useCallback(async (selectedFiles: File[]) => {
    const csvFiles = selectedFiles.filter(f => f.name.toLowerCase().endsWith('.csv'));
    if (csvFiles.length === 0) {
      return { success: false, error: 'Please select CSV files' };
    }

    const oversizedFiles = csvFiles.filter(f => f.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      return { success: false, error: `Files too large (max 5MB): ${oversizedFiles.map(f => f.name).join(', ')}` };
    }

    setFiles(csvFiles);
    setIsProcessing(true);

    try {
      const result = await parseAndValidateCSVFilesV2(csvFiles);
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

  const checkConflicts = useCallback(async () => {
    if (!parseResult) return;

    setIsProcessing(true);
    try {
      const codes = getUniquePackCodes(parseResult.data);
      
      const { data: existingPacks, error } = await supabase
        .from('industry_global_packs')
        .select('id, industry_code, version')
        .in('industry_code', codes);

      if (error) throw error;

      const conflictList: ConflictInfo[] = [];
      
      codes.forEach(code => {
        const existing = existingPacks?.find(p => p.industry_code === code);
        if (existing) {
          conflictList.push({
            packCode: code,
            existingId: existing.id,
            existingVersion: existing.version,
            hasChanges: true,
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

  const importData = useCallback(async () => {
    if (!parseResult) return;

    setStep('importing');
    setIsProcessing(true);

    const grouped = groupDataByPackCode(parseResult.data);
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

    // Get category reference data
    const { data: categories } = await supabase
      .from('industry_categories')
      .select('id, code');

    const categoryMap = new Map(categories?.map(c => [c.code, c.id]) || []);

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
      const conflict = conflicts.find(c => c.packCode === code);
      
      if (conflict) {
        if (conflictAction === 'skip' || conflictAction === 'new_only') {
          importProgress.skipped++;
          continue;
        }
      }

      try {
        const categoryId = categoryMap.get(info.category_code);

        if (!categoryId) {
          errors.push(`${code}: Category not found: ${info.category_code}`);
          importProgress.failed++;
          continue;
        }

        // Build global_brand_voice JSON
        const globalBrandVoice = {
          tone_of_voice: info.tone_of_voice || 'professional',
          formality_level: info.formality_level || 'formal',
          language_style: info.language_style || 'clear',
          cta_policy: info.cta_policy || 'standard',
          allow_emoji: info.allow_emoji?.toLowerCase() === 'true' || info.allow_emoji === '1',
        };

        // Build global_terminology JSON
        const globalTerminology = {
          forbidden_terms: data.forbiddenTerms.map(t => ({
            term: t.term,
            reason: t.reason || '',
          })),
        };

        // Build global_compliance_rules JSON
        const globalComplianceRules = data.complianceRules.map(r => ({
          rule_id: r.rule_id,
          rule_text: r.rule_text,
          category: r.category || 'general',
          severity: r.severity || 'warning',
        }));

        // Build global_claim_restrictions JSON
        const globalClaimRestrictions = data.claimRestrictions.map(r => ({
          forbidden_claim: r.forbidden_claim,
          suggested_alternative: r.suggested_alternative,
          severity: r.severity || 'warning',
        }));

        // Build global_argument_patterns JSON
        const globalArgumentPatterns = {
          valid_patterns: data.argumentPatterns.filter(p => p.type === 'valid').map(p => ({
            pattern: p.pattern,
            category: p.category || 'general',
          })),
          forbidden_patterns: data.argumentPatterns.filter(p => p.type === 'forbidden').map(p => ({
            pattern: p.pattern,
            category: p.category || 'general',
          })),
        };

        // Build global_system_rules JSON
        const globalSystemRules = data.systemRules.map(r => r.rule);

        // Calculate new version
        const newVersion = conflict 
          ? `${parseInt(conflict.existingVersion || '1') + 1}.0`
          : '1.0';

        // Upsert global pack
        let packId: string;
        
        if (conflict && conflictAction === 'update') {
          // Update existing - increment version
          const { error: updateError } = await supabase
            .from('industry_global_packs')
            .update({
              category_id: categoryId,
              target_audience: info.target_audience || 'both',
              global_brand_voice: globalBrandVoice,
              global_terminology: globalTerminology,
              global_compliance_rules: globalComplianceRules,
              global_claim_restrictions: globalClaimRestrictions,
              global_argument_patterns: globalArgumentPatterns,
              global_system_rules: globalSystemRules,
              version: newVersion,
              updated_at: new Date().toISOString(),
            })
            .eq('id', conflict.existingId);

          if (updateError) throw updateError;
          packId = conflict.existingId;
        } else {
          // Insert new
          const { data: inserted, error: insertError } = await supabase
            .from('industry_global_packs')
            .insert({
              industry_code: code,
              category_id: categoryId,
              target_audience: info.target_audience || 'both',
              global_brand_voice: globalBrandVoice,
              global_terminology: globalTerminology,
              global_compliance_rules: globalComplianceRules,
              global_claim_restrictions: globalClaimRestrictions,
              global_argument_patterns: globalArgumentPatterns,
              global_system_rules: globalSystemRules,
              is_active: true,
              version: '1.0',
            })
            .select('id')
            .single();

          if (insertError) throw insertError;
          packId = inserted.id;
        }

        // Upsert translations
        for (const trans of data.translations) {
          const preferredTerms = trans.preferred_words?.split(',').map(w => w.trim()).filter(Boolean) || [];
          const forbiddenTerms = trans.forbidden_words?.split(',').map(w => w.trim()).filter(Boolean) || [];

          await supabase
            .from('industry_pack_translations')
            .upsert({
              global_pack_id: packId,
              language_code: trans.language_code,
              name: trans.name,
              short_name: trans.short_name || trans.name,
              preferred_terms: preferredTerms,
              forbidden_terms: forbiddenTerms,
              glossary: {},
            }, { onConflict: 'global_pack_id,language_code' });
        }

        // Upsert jurisdiction profiles
        for (const profile of data.jurisdictionProfiles) {
          await supabase
            .from('industry_jurisdiction_profiles')
            .upsert({
              global_pack_id: packId,
              jurisdiction_code: profile.jurisdiction_code,
              resolved_rules: {},
              validity_status: 'current',
            }, { onConflict: 'global_pack_id,jurisdiction_code' });
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
      imported: importProgress.succeeded - conflicts.filter(() => conflictAction === 'update').length,
      updated: conflictAction === 'update' ? conflicts.length : 0,
      skipped: importProgress.skipped,
      errors,
    });
    setStep('done');
    setIsProcessing(false);
  }, [parseResult, conflicts, conflictAction]);

  const getSummary = useCallback(() => {
    if (!parseResult) return null;

    const grouped = groupDataByPackCode(parseResult.data);
    const codes = Object.keys(grouped);

    return {
      totalPacks: codes.length,
      totalRecords: {
        globalPackInfo: parseResult.data.globalPackInfo.length,
        translations: parseResult.data.translations.length,
        forbiddenTerms: parseResult.data.forbiddenTerms.length,
        complianceRules: parseResult.data.complianceRules.length,
        claimRestrictions: parseResult.data.claimRestrictions.length,
        argumentPatterns: parseResult.data.argumentPatterns.length,
        systemRules: parseResult.data.systemRules.length,
        jurisdictionProfiles: parseResult.data.jurisdictionProfiles.length,
      },
      errors: parseResult.errors.length,
      warnings: parseResult.warnings.length,
      conflicts: conflicts.length,
    };
  }, [parseResult, conflicts]);

  return {
    step,
    files,
    parseResult,
    conflicts,
    conflictAction,
    progress,
    importResult,
    isProcessing,
    
    setStep,
    setConflictAction,
    handleFileSelect,
    checkConflicts,
    importData,
    reset,
    getSummary,
  };
}
