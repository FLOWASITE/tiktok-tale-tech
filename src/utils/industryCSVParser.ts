import Papa from 'papaparse';

// ============================================
// Industry CSV Parser Utility
// ============================================

export interface IndustryInfoRow {
  industry_code: string;
  country_code: string;
  category_code: string;
  name_vi: string;
  name_en: string;
  target_audience: 'B2B' | 'B2C' | 'both';
  tone_of_voice: string;
  formality_level: 'formal' | 'semi_formal' | 'casual';
  language_style: string;
  cta_policy: string;
  allow_emoji: string;
}

export interface ForbiddenTermRow {
  industry_code: string;
  term: string;
  reason: string;
}

export interface PreferredWordRow {
  industry_code: string;
  language_code: string;
  word: string;
  context: string;
}

export interface ForbiddenWordRow {
  industry_code: string;
  language_code: string;
  word: string;
  alternative: string;
}

export interface ComplianceRuleRow {
  industry_code: string;
  rule: string;
  category: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ClaimRestrictionRow {
  industry_code: string;
  claim: string;
  alternative: string;
}

export interface ArgumentPatternRow {
  industry_code: string;
  type: 'valid' | 'forbidden';
  pattern: string;
}

export interface SystemRuleRow {
  industry_code: string;
  rule: string;
  priority: string;
}

export interface ParsedCSVData {
  industryInfo: IndustryInfoRow[];
  forbiddenTerms: ForbiddenTermRow[];
  preferredWords: PreferredWordRow[];
  forbiddenWords: ForbiddenWordRow[];
  complianceRules: ComplianceRuleRow[];
  claimRestrictions: ClaimRestrictionRow[];
  argumentPatterns: ArgumentPatternRow[];
  systemRules: SystemRuleRow[];
}

export interface ValidationError {
  file: string;
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface ParseResult {
  data: ParsedCSVData;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Required columns for each CSV type
const REQUIRED_COLUMNS: Record<string, string[]> = {
  industry_info: ['industry_code', 'country_code', 'category_code', 'name_vi', 'name_en', 'target_audience'],
  forbidden_terms: ['industry_code', 'term'],
  preferred_words: ['industry_code', 'language_code', 'word'],
  forbidden_words: ['industry_code', 'language_code', 'word'],
  compliance_rules: ['industry_code', 'rule', 'severity'],
  claim_restrictions: ['industry_code', 'claim', 'alternative'],
  argument_patterns: ['industry_code', 'type', 'pattern'],
  system_rules: ['industry_code', 'rule'],
};

// Valid enum values
const VALID_TARGET_AUDIENCE = ['B2B', 'B2C', 'both'];
const VALID_FORMALITY = ['formal', 'semi_formal', 'casual'];
const VALID_SEVERITY = ['error', 'warning', 'info'];
const VALID_PATTERN_TYPE = ['valid', 'forbidden'];

/**
 * Detect file type from filename
 */
export function detectFileType(filename: string): keyof typeof REQUIRED_COLUMNS | null {
  const name = filename.toLowerCase().replace('.csv', '');
  
  if (name.includes('industry_info') || name.includes('industry-info')) return 'industry_info';
  if (name.includes('forbidden_term') || name.includes('forbidden-term')) return 'forbidden_terms';
  if (name.includes('preferred_word') || name.includes('preferred-word')) return 'preferred_words';
  if (name.includes('forbidden_word') || name.includes('forbidden-word')) return 'forbidden_words';
  if (name.includes('compliance_rule') || name.includes('compliance-rule')) return 'compliance_rules';
  if (name.includes('claim_restriction') || name.includes('claim-restriction')) return 'claim_restrictions';
  if (name.includes('argument_pattern') || name.includes('argument-pattern')) return 'argument_patterns';
  if (name.includes('system_rule') || name.includes('system-rule')) return 'system_rules';
  
  return null;
}

/**
 * Parse a single CSV file
 */
export function parseCSVFile<T>(file: File): Promise<{ data: T[]; errors: Papa.ParseError[] }> {
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
 * Validate industry_info rows
 */
function validateIndustryInfo(rows: IndustryInfoRow[], errors: ValidationError[], warnings: ValidationError[]) {
  rows.forEach((row, index) => {
    const rowNum = index + 2; // Account for header row
    
    // Required field validation
    if (!row.industry_code?.trim()) {
      errors.push({ file: 'industry_info', row: rowNum, field: 'industry_code', message: 'Industry code is required' });
    } else if (!/^[a-z0-9_]+$/.test(row.industry_code)) {
      errors.push({ file: 'industry_info', row: rowNum, field: 'industry_code', message: 'Industry code must be lowercase alphanumeric with underscores', value: row.industry_code });
    }
    
    if (!row.country_code?.trim()) {
      errors.push({ file: 'industry_info', row: rowNum, field: 'country_code', message: 'Country code is required' });
    }
    
    if (!row.category_code?.trim()) {
      errors.push({ file: 'industry_info', row: rowNum, field: 'category_code', message: 'Category code is required' });
    }
    
    if (!row.name_vi?.trim()) {
      errors.push({ file: 'industry_info', row: rowNum, field: 'name_vi', message: 'Vietnamese name is required' });
    }
    
    if (!row.name_en?.trim()) {
      warnings.push({ file: 'industry_info', row: rowNum, field: 'name_en', message: 'English name is missing' });
    }
    
    // Enum validation
    if (row.target_audience && !VALID_TARGET_AUDIENCE.includes(row.target_audience)) {
      errors.push({ file: 'industry_info', row: rowNum, field: 'target_audience', message: `Invalid target audience. Must be: ${VALID_TARGET_AUDIENCE.join(', ')}`, value: row.target_audience });
    }
    
    if (row.formality_level && !VALID_FORMALITY.includes(row.formality_level)) {
      errors.push({ file: 'industry_info', row: rowNum, field: 'formality_level', message: `Invalid formality level. Must be: ${VALID_FORMALITY.join(', ')}`, value: row.formality_level });
    }
  });
}

/**
 * Validate forbidden terms rows
 */
function validateForbiddenTerms(rows: ForbiddenTermRow[], errors: ValidationError[], warnings: ValidationError[]) {
  rows.forEach((row, index) => {
    const rowNum = index + 2;
    
    if (!row.industry_code?.trim()) {
      errors.push({ file: 'forbidden_terms', row: rowNum, field: 'industry_code', message: 'Industry code is required' });
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
 * Validate preferred/forbidden words rows
 */
function validateWordRows(rows: (PreferredWordRow | ForbiddenWordRow)[], fileType: string, errors: ValidationError[], warnings: ValidationError[]) {
  rows.forEach((row, index) => {
    const rowNum = index + 2;
    
    if (!row.industry_code?.trim()) {
      errors.push({ file: fileType, row: rowNum, field: 'industry_code', message: 'Industry code is required' });
    }
    
    if (!row.language_code?.trim()) {
      errors.push({ file: fileType, row: rowNum, field: 'language_code', message: 'Language code is required' });
    }
    
    if (!row.word?.trim()) {
      errors.push({ file: fileType, row: rowNum, field: 'word', message: 'Word is required' });
    }
  });
}

/**
 * Validate compliance rules rows
 */
function validateComplianceRules(rows: ComplianceRuleRow[], errors: ValidationError[], warnings: ValidationError[]) {
  rows.forEach((row, index) => {
    const rowNum = index + 2;
    
    if (!row.industry_code?.trim()) {
      errors.push({ file: 'compliance_rules', row: rowNum, field: 'industry_code', message: 'Industry code is required' });
    }
    
    if (!row.rule?.trim()) {
      errors.push({ file: 'compliance_rules', row: rowNum, field: 'rule', message: 'Rule is required' });
    }
    
    if (row.severity && !VALID_SEVERITY.includes(row.severity)) {
      errors.push({ file: 'compliance_rules', row: rowNum, field: 'severity', message: `Invalid severity. Must be: ${VALID_SEVERITY.join(', ')}`, value: row.severity });
    }
  });
}

/**
 * Validate claim restrictions rows
 */
function validateClaimRestrictions(rows: ClaimRestrictionRow[], errors: ValidationError[], warnings: ValidationError[]) {
  rows.forEach((row, index) => {
    const rowNum = index + 2;
    
    if (!row.industry_code?.trim()) {
      errors.push({ file: 'claim_restrictions', row: rowNum, field: 'industry_code', message: 'Industry code is required' });
    }
    
    if (!row.claim?.trim()) {
      errors.push({ file: 'claim_restrictions', row: rowNum, field: 'claim', message: 'Claim is required' });
    }
    
    if (!row.alternative?.trim()) {
      warnings.push({ file: 'claim_restrictions', row: rowNum, field: 'alternative', message: 'Alternative is recommended' });
    }
  });
}

/**
 * Validate argument patterns rows
 */
function validateArgumentPatterns(rows: ArgumentPatternRow[], errors: ValidationError[], warnings: ValidationError[]) {
  rows.forEach((row, index) => {
    const rowNum = index + 2;
    
    if (!row.industry_code?.trim()) {
      errors.push({ file: 'argument_patterns', row: rowNum, field: 'industry_code', message: 'Industry code is required' });
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
function validateSystemRules(rows: SystemRuleRow[], errors: ValidationError[], warnings: ValidationError[]) {
  rows.forEach((row, index) => {
    const rowNum = index + 2;
    
    if (!row.industry_code?.trim()) {
      errors.push({ file: 'system_rules', row: rowNum, field: 'industry_code', message: 'Industry code is required' });
    }
    
    if (!row.rule?.trim()) {
      errors.push({ file: 'system_rules', row: rowNum, field: 'rule', message: 'Rule is required' });
    }
  });
}

/**
 * Check if required columns exist in parsed data
 */
function checkRequiredColumns(headers: string[], fileType: string): string[] {
  const required = REQUIRED_COLUMNS[fileType] || [];
  const missing = required.filter(col => !headers.includes(col));
  return missing;
}

/**
 * Parse and validate multiple CSV files
 */
export async function parseAndValidateCSVFiles(files: File[]): Promise<ParseResult> {
  const result: ParseResult = {
    data: {
      industryInfo: [],
      forbiddenTerms: [],
      preferredWords: [],
      forbiddenWords: [],
      complianceRules: [],
      claimRestrictions: [],
      argumentPatterns: [],
      systemRules: [],
    },
    errors: [],
    warnings: [],
  };

  for (const file of files) {
    const fileType = detectFileType(file.name);
    
    if (!fileType) {
      result.errors.push({
        file: file.name,
        row: 0,
        field: 'filename',
        message: `Cannot determine file type from filename. Expected: industry_info, forbidden_terms, preferred_words, forbidden_words, compliance_rules, claim_restrictions, argument_patterns, system_rules`,
      });
      continue;
    }

    try {
      const parsed = await parseCSVFile<Record<string, string>>(file);
      
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
        const missingCols = checkRequiredColumns(headers, fileType);
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
        case 'industry_info':
          result.data.industryInfo = parsed.data as unknown as IndustryInfoRow[];
          validateIndustryInfo(result.data.industryInfo, result.errors, result.warnings);
          break;
        case 'forbidden_terms':
          result.data.forbiddenTerms = parsed.data as unknown as ForbiddenTermRow[];
          validateForbiddenTerms(result.data.forbiddenTerms, result.errors, result.warnings);
          break;
        case 'preferred_words':
          result.data.preferredWords = parsed.data as unknown as PreferredWordRow[];
          validateWordRows(result.data.preferredWords, 'preferred_words', result.errors, result.warnings);
          break;
        case 'forbidden_words':
          result.data.forbiddenWords = parsed.data as unknown as ForbiddenWordRow[];
          validateWordRows(result.data.forbiddenWords, 'forbidden_words', result.errors, result.warnings);
          break;
        case 'compliance_rules':
          result.data.complianceRules = parsed.data as unknown as ComplianceRuleRow[];
          validateComplianceRules(result.data.complianceRules, result.errors, result.warnings);
          break;
        case 'claim_restrictions':
          result.data.claimRestrictions = parsed.data as unknown as ClaimRestrictionRow[];
          validateClaimRestrictions(result.data.claimRestrictions, result.errors, result.warnings);
          break;
        case 'argument_patterns':
          result.data.argumentPatterns = parsed.data as unknown as ArgumentPatternRow[];
          validateArgumentPatterns(result.data.argumentPatterns, result.errors, result.warnings);
          break;
        case 'system_rules':
          result.data.systemRules = parsed.data as unknown as SystemRuleRow[];
          validateSystemRules(result.data.systemRules, result.errors, result.warnings);
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
 * Get unique industry codes from parsed data
 */
export function getUniqueIndustryCodes(data: ParsedCSVData): string[] {
  const codes = new Set<string>();
  
  data.industryInfo.forEach(row => codes.add(row.industry_code));
  data.forbiddenTerms.forEach(row => codes.add(row.industry_code));
  data.preferredWords.forEach(row => codes.add(row.industry_code));
  data.forbiddenWords.forEach(row => codes.add(row.industry_code));
  data.complianceRules.forEach(row => codes.add(row.industry_code));
  data.claimRestrictions.forEach(row => codes.add(row.industry_code));
  data.argumentPatterns.forEach(row => codes.add(row.industry_code));
  data.systemRules.forEach(row => codes.add(row.industry_code));
  
  return Array.from(codes).filter(Boolean).sort();
}

/**
 * Group data by industry code
 */
export function groupDataByIndustryCode(data: ParsedCSVData) {
  const grouped: Record<string, {
    info: IndustryInfoRow | null;
    forbiddenTerms: ForbiddenTermRow[];
    preferredWords: PreferredWordRow[];
    forbiddenWords: ForbiddenWordRow[];
    complianceRules: ComplianceRuleRow[];
    claimRestrictions: ClaimRestrictionRow[];
    argumentPatterns: ArgumentPatternRow[];
    systemRules: SystemRuleRow[];
  }> = {};

  const codes = getUniqueIndustryCodes(data);
  
  codes.forEach(code => {
    grouped[code] = {
      info: data.industryInfo.find(r => r.industry_code === code) || null,
      forbiddenTerms: data.forbiddenTerms.filter(r => r.industry_code === code),
      preferredWords: data.preferredWords.filter(r => r.industry_code === code),
      forbiddenWords: data.forbiddenWords.filter(r => r.industry_code === code),
      complianceRules: data.complianceRules.filter(r => r.industry_code === code),
      claimRestrictions: data.claimRestrictions.filter(r => r.industry_code === code),
      argumentPatterns: data.argumentPatterns.filter(r => r.industry_code === code),
      systemRules: data.systemRules.filter(r => r.industry_code === code),
    };
  });

  return grouped;
}
