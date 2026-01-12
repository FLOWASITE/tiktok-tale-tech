// ============================================
// Industry Export Utilities V2 - For Global Packs Schema
// ============================================

import type { 
  IndustryGlobalPack, 
  JurisdictionProfile, 
  IndustryPackTranslation 
} from '@/types/industryParkV2';

export interface ExportResultV2 {
  success: boolean;
  filename: string;
  format: 'csv' | 'json';
  rowCount: number;
  content?: string;
  error?: string;
}

// Helper to escape CSV values
function escapeCSV(value: string | null | undefined): string {
  if (!value) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export global pack info to CSV
 */
export function exportGlobalPackCSV(pack: IndustryGlobalPack): ExportResultV2 {
  const headers = ['industry_code', 'category_id', 'target_audience', 'is_active', 'version'];
  const row = [
    escapeCSV(pack.industry_code),
    escapeCSV(pack.category_id),
    escapeCSV(pack.target_audience),
    pack.is_active ? 'true' : 'false',
    String(pack.version),
  ];

  const content = [headers.join(','), row.join(',')].join('\n');
  const filename = `global-pack-${pack.industry_code}.csv`;

  return { success: true, filename, format: 'csv', rowCount: 1, content };
}

/**
 * Export compliance rules to CSV
 */
export function exportComplianceRulesCSV(pack: IndustryGlobalPack): ExportResultV2 {
  const rules = pack.global_compliance_rules || [];
  if (rules.length === 0) {
    return { success: false, filename: '', format: 'csv', rowCount: 0, error: 'No compliance rules to export' };
  }

  const headers = ['industry_code', 'rule', 'category', 'severity'];
  const rows = rules.map(r => [
    escapeCSV(pack.industry_code),
    escapeCSV(r.rule),
    escapeCSV(r.category || 'general'),
    escapeCSV(r.severity || 'medium'),
  ]);

  const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const filename = `compliance-rules-${pack.industry_code}.csv`;

  return { success: true, filename, format: 'csv', rowCount: rows.length, content };
}

/**
 * Export claim restrictions to CSV
 */
export function exportClaimRestrictionsCSV(pack: IndustryGlobalPack): ExportResultV2 {
  const restrictions = pack.global_claim_restrictions || [];
  if (restrictions.length === 0) {
    return { success: false, filename: '', format: 'csv', rowCount: 0, error: 'No claim restrictions to export' };
  }

  const headers = ['industry_code', 'claim', 'alternative', 'severity'];
  const rows = restrictions.map(r => [
    escapeCSV(pack.industry_code),
    escapeCSV(r.claim),
    escapeCSV(r.alternative),
    escapeCSV(r.severity || 'medium'),
  ]);

  const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const filename = `claim-restrictions-${pack.industry_code}.csv`;

  return { success: true, filename, format: 'csv', rowCount: rows.length, content };
}

/**
 * Export translations to CSV
 */
export function exportTranslationsCSV(pack: IndustryGlobalPack, translations: IndustryPackTranslation[]): ExportResultV2 {
  if (translations.length === 0) {
    return { success: false, filename: '', format: 'csv', rowCount: 0, error: 'No translations to export' };
  }

  const headers = ['industry_code', 'language_code', 'name', 'short_name'];
  const rows = translations.map(t => [
    escapeCSV(pack.industry_code),
    escapeCSV(t.language_code),
    escapeCSV(t.name),
    escapeCSV(t.short_name),
  ]);

  const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const filename = `translations-${pack.industry_code}.csv`;

  return { success: true, filename, format: 'csv', rowCount: rows.length, content };
}

/**
 * Export complete pack to JSON
 */
export function exportPackJSON(
  pack: IndustryGlobalPack,
  translations?: IndustryPackTranslation[],
  profiles?: JurisdictionProfile[]
): ExportResultV2 {
  const exportData = {
    industry_code: pack.industry_code,
    category_id: pack.category_id,
    target_audience: pack.target_audience,
    is_active: pack.is_active,
    version: pack.version,
    global_brand_voice: pack.global_brand_voice,
    global_terminology: pack.global_terminology,
    global_compliance_rules: pack.global_compliance_rules,
    global_claim_restrictions: pack.global_claim_restrictions,
    global_argument_patterns: pack.global_argument_patterns,
    global_system_rules: pack.global_system_rules,
    risk_guidelines: pack.risk_guidelines,
    translations: translations || [],
    jurisdiction_profiles: profiles || [],
    exported_at: new Date().toISOString(),
  };

  const content = JSON.stringify(exportData, null, 2);
  const filename = `industry-pack-${pack.industry_code}.json`;

  return { success: true, filename, format: 'json', rowCount: 1, content };
}

/**
 * Download helper
 */
export function downloadExportV2(result: ExportResultV2) {
  if (!result.success || !result.content) return false;

  const mimeType = result.format === 'json' ? 'application/json' : 'text/csv';
  const blob = new Blob([result.content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return true;
}

/**
 * Copy to clipboard helper
 */
export async function copyExportToClipboardV2(result: ExportResultV2): Promise<boolean> {
  if (!result.success || !result.content) return false;
  
  try {
    await navigator.clipboard.writeText(result.content);
    return true;
  } catch {
    return false;
  }
}
