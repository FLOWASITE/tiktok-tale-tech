import Papa from 'papaparse';

// ============================================
// Industry CSV Parser V2 - For Global Packs Schema
// ============================================

// Row types matching the new v2 schema
export interface GlobalPackInfoRow {
  code: string;
  category_code: string;
  target_audience: 'B2B' | 'B2C' | 'both';
  tone_of_voice: string;
  formality_level: 'formal' | 'semi_formal' | 'casual';
  language_style: string;
  cta_policy: string;
  allow_emoji: string;
}

export interface TranslationRow {
  code: string;
  language_code: string;
  name: string;
  short_name?: string;
  preferred_words?: string; // comma-separated
  forbidden_words?: string; // comma-separated
}

export interface ForbiddenTermRow {
  code: string;
  term: string;
  reason: string;
}

export interface ComplianceRuleRow {
  code: string;
  rule_id: string;
  rule_text: string;
  category: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ClaimRestrictionRow {
  code: string;
  forbidden_claim: string;
  suggested_alternative: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ArgumentPatternRow {
  code: string;
  type: 'valid' | 'forbidden';
  pattern: string;
  category?: string;
}

export interface SystemRuleRow {
  code: string;
  rule: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface JurisdictionProfileRow {
  code: string;
  jurisdiction_code: string;
  additional_forbidden_terms?: string; // comma-separated
  modified_compliance_rules?: string; // JSON string
  notes?: string;
}

export interface ParsedCSVDataV2 {
  globalPackInfo: GlobalPackInfoRow[];
  translations: TranslationRow[];
  forbiddenTerms: ForbiddenTermRow[];
  complianceRules: ComplianceRuleRow[];
  claimRestrictions: ClaimRestrictionRow[];
  argumentPatterns: ArgumentPatternRow[];
  systemRules: SystemRuleRow[];
  jurisdictionProfiles: JurisdictionProfileRow[];
}

export interface ValidationError {
  file: string;
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface ParseResultV2 {
  data: ParsedCSVDataV2;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Required columns for each CSV type
const REQUIRED_COLUMNS_V2: Record<string, string[]> = {
  global_pack_info: ['code', 'category_code', 'target_audience'],
  translations: ['code', 'language_code', 'name'],
  forbidden_terms: ['code', 'term'],
  compliance_rules: ['code', 'rule_id', 'rule_text', 'severity'],
  claim_restrictions: ['code', 'forbidden_claim', 'suggested_alternative'],
  argument_patterns: ['code', 'type', 'pattern'],
  system_rules: ['code', 'rule', 'priority'],
  jurisdiction_profiles: ['code', 'jurisdiction_code'],
};

// Valid enum values
const VALID_TARGET_AUDIENCE = ['B2B', 'B2C', 'both'];
const VALID_FORMALITY = ['formal', 'semi_formal', 'casual'];
const VALID_SEVERITY = ['error', 'warning', 'info'];
const VALID_PATTERN_TYPE = ['valid', 'forbidden'];
const VALID_PRIORITY = ['critical', 'high', 'medium', 'low'];
const VALID_JURISDICTIONS = ['VN', 'US', 'SG', 'TH', 'ID', 'MY', 'PH', 'AU', 'EU', 'UK', 'JP', 'KR', 'TW', 'HK'];

/**
 * Detect file type from filename
 */
export function detectFileTypeV2(filename: string): keyof typeof REQUIRED_COLUMNS_V2 | null {
  const name = filename.toLowerCase().replace('.csv', '');
  
  if (name.includes('global_pack') || name.includes('global-pack') || name.includes('pack_info')) return 'global_pack_info';
  if (name.includes('translation')) return 'translations';
  if (name.includes('forbidden_term') || name.includes('forbidden-term')) return 'forbidden_terms';
  if (name.includes('compliance_rule') || name.includes('compliance-rule')) return 'compliance_rules';
  if (name.includes('claim_restriction') || name.includes('claim-restriction')) return 'claim_restrictions';
  if (name.includes('argument_pattern') || name.includes('argument-pattern')) return 'argument_patterns';
  if (name.includes('system_rule') || name.includes('system-rule')) return 'system_rules';
  if (name.includes('jurisdiction') || name.includes('profile')) return 'jurisdiction_profiles';
  
  return null;
}

/**
 * Parse a single CSV file
 */
export function parseCSVFileV2<T>(file: File): Promise<{ data: T[]; errors: Papa.ParseError[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (results) => {
        resolve({
          data: results.data,
          errors: results.errors,
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Validate global pack info rows
 */
function validateGlobalPackInfo(rows: GlobalPackInfoRow[], errors: ValidationError[], warnings: ValidationError[]) {
  rows.forEach((row, index) => {
    const rowNum = index + 2;
    
    if (!row.code?.trim()) {
      errors.push({ file: 'global_pack_info', row: rowNum, field: 'code', message: 'Pack code is required' });
    } else if (!/^[a-z0-9_]+$/.test(row.code)) {
      errors.push({ file: 'global_pack_info', row: rowNum, field: 'code', message: 'Pack code must be lowercase alphanumeric with underscores', value: row.code });
    }
    
    if (!row.category_code?.trim()) {
      errors.push({ file: 'global_pack_info', row: rowNum, field: 'category_code', message: 'Category code is required' });
    }
    
    if (row.target_audience && !VALID_TARGET_AUDIENCE.includes(row.target_audience)) {
      errors.push({ file: 'global_pack_info', row: rowNum, field: 'target_audience', message: `Invalid target audience. Must be: ${VALID_TARGET_AUDIENCE.join(', ')}`, value: row.target_audience });
    }
    
    if (row.formality_level && !VALID_FORMALITY.includes(row.formality_level)) {
      errors.push({ file: 'global_pack_info', row: rowNum, field: 'formality_level', message: `Invalid formality level. Must be: ${VALID_FORMALITY.join(', ')}`, value: row.formality_level });
    }
  });
}

/**
 * Validate translation rows
 */
function validateTranslations(rows: TranslationRow[], errors: ValidationError[], warnings: ValidationError[]) {
  rows.forEach((row, index) => {
    const rowNum = index + 2;
    
    if (!row.code?.trim()) {
      errors.push({ file: 'translations', row: rowNum, field: 'code', message: 'Pack code is required' });
    }
    
    if (!row.language_code?.trim()) {
      errors.push({ file: 'translations', row: rowNum, field: 'language_code', message: 'Language code is required' });
    }
    
    if (!row.name?.trim()) {
      errors.push({ file: 'translations', row: rowNum, field: 'name', message: 'Name is required' });
    }
  });
}

/**
 * Validate forbidden terms rows
 */
function validateForbiddenTermsV2(rows: ForbiddenTermRow[], errors: ValidationError[], warnings: ValidationError[]) {
  rows.forEach((row, index) => {
    const rowNum = index + 2;
    
    if (!row.code?.trim()) {
      errors.push({ file: 'forbidden_terms', row: rowNum, field: 'code', message: 'Pack code is required' });
    }
    
    if (!row.term?.trim()) {
      errors.push({ file: 'forbidden_terms', row: rowNum, field: 'term', message: 'Term is required' });
    }
    
    if (!row.reason?.trim()) {
      warnings.push({ file: 'forbidden_terms', row: rowNum, field: 'reason', message: 'Reason is recommended' });
    }
  });
}

/**
 * Validate compliance rules rows
 */
function validateComplianceRulesV2(rows: ComplianceRuleRow[], errors: ValidationError[], warnings: ValidationError[]) {
  rows.forEach((row, index) => {
    const rowNum = index + 2;
    
    if (!row.code?.trim()) {
      errors.push({ file: 'compliance_rules', row: rowNum, field: 'code', message: 'Pack code is required' });
    }
    
    if (!row.rule_id?.trim()) {
      errors.push({ file: 'compliance_rules', row: rowNum, field: 'rule_id', message: 'Rule ID is required' });
    }
    
    if (!row.rule_text?.trim()) {
      errors.push({ file: 'compliance_rules', row: rowNum, field: 'rule_text', message: 'Rule text is required' });
    }
    
    if (row.severity && !VALID_SEVERITY.includes(row.severity)) {
      errors.push({ file: 'compliance_rules', row: rowNum, field: 'severity', message: `Invalid severity. Must be: ${VALID_SEVERITY.join(', ')}`, value: row.severity });
    }
  });
}

/**
 * Validate claim restrictions rows
 */
function validateClaimRestrictionsV2(rows: ClaimRestrictionRow[], errors: ValidationError[], warnings: ValidationError[]) {
  rows.forEach((row, index) => {
    const rowNum = index + 2;
    
    if (!row.code?.trim()) {
      errors.push({ file: 'claim_restrictions', row: rowNum, field: 'code', message: 'Pack code is required' });
    }
    
    if (!row.forbidden_claim?.trim()) {
      errors.push({ file: 'claim_restrictions', row: rowNum, field: 'forbidden_claim', message: 'Forbidden claim is required' });
    }
    
    if (!row.suggested_alternative?.trim()) {
      warnings.push({ file: 'claim_restrictions', row: rowNum, field: 'suggested_alternative', message: 'Alternative is recommended' });
    }
  });
}

/**
 * Validate argument patterns rows
 */
function validateArgumentPatternsV2(rows: ArgumentPatternRow[], errors: ValidationError[], warnings: ValidationError[]) {
  rows.forEach((row, index) => {
    const rowNum = index + 2;
    
    if (!row.code?.trim()) {
      errors.push({ file: 'argument_patterns', row: rowNum, field: 'code', message: 'Pack code is required' });
    }
    
    if (!row.type?.trim()) {
      errors.push({ file: 'argument_patterns', row: rowNum, field: 'type', message: 'Type is required' });
    } else if (!VALID_PATTERN_TYPE.includes(row.type)) {
      errors.push({ file: 'argument_patterns', row: rowNum, field: 'type', message: `Invalid type. Must be: ${VALID_PATTERN_TYPE.join(', ')}`, value: row.type });
    }
    
    if (!row.pattern?.trim()) {
      errors.push({ file: 'argument_patterns', row: rowNum, field: 'pattern', message: 'Pattern is required' });
    }
  });
}

/**
 * Validate system rules rows
 */
function validateSystemRulesV2(rows: SystemRuleRow[], errors: ValidationError[], warnings: ValidationError[]) {
  rows.forEach((row, index) => {
    const rowNum = index + 2;
    
    if (!row.code?.trim()) {
      errors.push({ file: 'system_rules', row: rowNum, field: 'code', message: 'Pack code is required' });
    }
    
    if (!row.rule?.trim()) {
      errors.push({ file: 'system_rules', row: rowNum, field: 'rule', message: 'Rule is required' });
    }
    
    if (row.priority && !VALID_PRIORITY.includes(row.priority)) {
      errors.push({ file: 'system_rules', row: rowNum, field: 'priority', message: `Invalid priority. Must be: ${VALID_PRIORITY.join(', ')}`, value: row.priority });
    }
  });
}

/**
 * Validate jurisdiction profile rows
 */
function validateJurisdictionProfiles(rows: JurisdictionProfileRow[], errors: ValidationError[], warnings: ValidationError[]) {
  rows.forEach((row, index) => {
    const rowNum = index + 2;
    
    if (!row.code?.trim()) {
      errors.push({ file: 'jurisdiction_profiles', row: rowNum, field: 'code', message: 'Pack code is required' });
    }
    
    if (!row.jurisdiction_code?.trim()) {
      errors.push({ file: 'jurisdiction_profiles', row: rowNum, field: 'jurisdiction_code', message: 'Jurisdiction code is required' });
    } else if (!VALID_JURISDICTIONS.includes(row.jurisdiction_code)) {
      warnings.push({ file: 'jurisdiction_profiles', row: rowNum, field: 'jurisdiction_code', message: `Unknown jurisdiction: ${row.jurisdiction_code}` });
    }
  });
}

/**
 * Check if required columns exist in parsed data
 */
function checkRequiredColumnsV2(headers: string[], fileType: string): string[] {
  const required = REQUIRED_COLUMNS_V2[fileType] || [];
  const missing = required.filter(col => !headers.includes(col));
  return missing;
}

/**
 * Parse and validate multiple CSV files for v2 schema
 */
export async function parseAndValidateCSVFilesV2(files: File[]): Promise<ParseResultV2> {
  const result: ParseResultV2 = {
    data: {
      globalPackInfo: [],
      translations: [],
      forbiddenTerms: [],
      complianceRules: [],
      claimRestrictions: [],
      argumentPatterns: [],
      systemRules: [],
      jurisdictionProfiles: [],
    },
    errors: [],
    warnings: [],
  };

  for (const file of files) {
    const fileType = detectFileTypeV2(file.name);
    
    if (!fileType) {
      result.errors.push({
        file: file.name,
        row: 0,
        field: 'filename',
        message: `Cannot determine file type from filename. Expected: global_pack_info, translations, forbidden_terms, compliance_rules, claim_restrictions, argument_patterns, system_rules, jurisdiction_profiles`,
      });
      continue;
    }

    try {
      const parsed = await parseCSVFileV2<Record<string, string>>(file);
      
      // Check for Papa Parse errors
      if (parsed.errors.length > 0) {
        parsed.errors.forEach(err => {
          result.errors.push({
            file: file.name,
            row: err.row || 0,
            field: 'parse',
            message: err.message,
          });
        });
      }

      // Check required columns
      if (parsed.data.length > 0) {
        const headers = Object.keys(parsed.data[0]);
        const missingCols = checkRequiredColumnsV2(headers, fileType);
        if (missingCols.length > 0) {
          result.errors.push({
            file: file.name,
            row: 0,
            field: 'columns',
            message: `Missing required columns: ${missingCols.join(', ')}`,
          });
          continue;
        }
      }

      // Type-specific processing and validation
      switch (fileType) {
        case 'global_pack_info':
          result.data.globalPackInfo = parsed.data as unknown as GlobalPackInfoRow[];
          validateGlobalPackInfo(result.data.globalPackInfo, result.errors, result.warnings);
          break;
        case 'translations':
          result.data.translations = parsed.data as unknown as TranslationRow[];
          validateTranslations(result.data.translations, result.errors, result.warnings);
          break;
        case 'forbidden_terms':
          result.data.forbiddenTerms = parsed.data as unknown as ForbiddenTermRow[];
          validateForbiddenTermsV2(result.data.forbiddenTerms, result.errors, result.warnings);
          break;
        case 'compliance_rules':
          result.data.complianceRules = parsed.data as unknown as ComplianceRuleRow[];
          validateComplianceRulesV2(result.data.complianceRules, result.errors, result.warnings);
          break;
        case 'claim_restrictions':
          result.data.claimRestrictions = parsed.data as unknown as ClaimRestrictionRow[];
          validateClaimRestrictionsV2(result.data.claimRestrictions, result.errors, result.warnings);
          break;
        case 'argument_patterns':
          result.data.argumentPatterns = parsed.data as unknown as ArgumentPatternRow[];
          validateArgumentPatternsV2(result.data.argumentPatterns, result.errors, result.warnings);
          break;
        case 'system_rules':
          result.data.systemRules = parsed.data as unknown as SystemRuleRow[];
          validateSystemRulesV2(result.data.systemRules, result.errors, result.warnings);
          break;
        case 'jurisdiction_profiles':
          result.data.jurisdictionProfiles = parsed.data as unknown as JurisdictionProfileRow[];
          validateJurisdictionProfiles(result.data.jurisdictionProfiles, result.errors, result.warnings);
          break;
      }
    } catch (error) {
      result.errors.push({
        file: file.name,
        row: 0,
        field: 'parse',
        message: error instanceof Error ? error.message : 'Unknown parse error',
      });
    }
  }

  return result;
}

/**
 * Get unique pack codes from parsed data
 */
export function getUniquePackCodes(data: ParsedCSVDataV2): string[] {
  const codes = new Set<string>();
  
  data.globalPackInfo.forEach(row => codes.add(row.code));
  data.translations.forEach(row => codes.add(row.code));
  data.forbiddenTerms.forEach(row => codes.add(row.code));
  data.complianceRules.forEach(row => codes.add(row.code));
  data.claimRestrictions.forEach(row => codes.add(row.code));
  data.argumentPatterns.forEach(row => codes.add(row.code));
  data.systemRules.forEach(row => codes.add(row.code));
  data.jurisdictionProfiles.forEach(row => codes.add(row.code));
  
  return Array.from(codes).filter(Boolean).sort();
}

/**
 * Group data by pack code
 */
export function groupDataByPackCode(data: ParsedCSVDataV2) {
  const grouped: Record<string, {
    info: GlobalPackInfoRow | null;
    translations: TranslationRow[];
    forbiddenTerms: ForbiddenTermRow[];
    complianceRules: ComplianceRuleRow[];
    claimRestrictions: ClaimRestrictionRow[];
    argumentPatterns: ArgumentPatternRow[];
    systemRules: SystemRuleRow[];
    jurisdictionProfiles: JurisdictionProfileRow[];
  }> = {};

  const codes = getUniquePackCodes(data);
  
  codes.forEach(code => {
    grouped[code] = {
      info: data.globalPackInfo.find(r => r.code === code) || null,
      translations: data.translations.filter(r => r.code === code),
      forbiddenTerms: data.forbiddenTerms.filter(r => r.code === code),
      complianceRules: data.complianceRules.filter(r => r.code === code),
      claimRestrictions: data.claimRestrictions.filter(r => r.code === code),
      argumentPatterns: data.argumentPatterns.filter(r => r.code === code),
      systemRules: data.systemRules.filter(r => r.code === code),
      jurisdictionProfiles: data.jurisdictionProfiles.filter(r => r.code === code),
    };
  });

  return grouped;
}
