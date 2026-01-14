/**
 * Excel Import Validation Utilities v2.2
 * Enhanced validation for Industry Pack import with Risk Guidelines, Key Regulations, and Extended Personas
 */

// Valid ISO language codes for translations
export const VALID_LANGUAGE_CODES = ['vi', 'en', 'zh', 'ja', 'ko', 'th', 'id', 'ms', 'fr', 'de', 'es', 'pt', 'ru', 'ar'];

// Valid ISO country codes for jurisdictions
export const VALID_JURISDICTION_CODES = [
  'VN', 'US', 'SG', 'MY', 'TH', 'ID', 'PH', 'JP', 'KR', 'CN', 'TW', 'HK',
  'AU', 'NZ', 'GB', 'DE', 'FR', 'IT', 'ES', 'PT', 'NL', 'BE', 'AT', 'CH',
  'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'IN', 'AE', 'SA', 'ZA', 'NG',
];

// Valid enum values
export const VALID_SEVERITY = ['error', 'warning', 'info'];
export const VALID_FORMALITY_LEVEL = ['formal', 'semi_formal', 'casual'];
export const VALID_INDUSTRY_LEVEL = ['core', 'sub'];
export const VALID_TARGET_AUDIENCE = ['B2B', 'B2C', 'both'];
export const VALID_PRIORITY = ['critical', 'high', 'medium', 'low'];
export const VALID_PATTERN_TYPE = ['valid', 'forbidden'];
export const VALID_VALIDITY_STATUS = ['current', 'superseded', 'pending'];
export const VALID_EMOJI_POLICY = ['none', 'limited', 'moderate', 'frequent'];

// Persona enum values
export const VALID_GENDER = ['male', 'female', 'all'];
export const VALID_INCOME_LEVEL = ['low', 'medium', 'high', 'very_high'];
export const VALID_EDUCATION_LEVEL = ['high_school', 'college', 'bachelor', 'master', 'doctorate'];
export const VALID_LOCATION_TYPE = ['urban', 'suburban', 'rural'];
export const VALID_FAMILY_STATUS = ['single', 'married', 'married_no_kids', 'married_with_kids', 'empty_nest'];
export const VALID_TECH_SAVVINESS = ['low', 'medium', 'high'];
export const VALID_PRICE_SENSITIVITY = ['low', 'medium', 'high'];
export const VALID_PURCHASE_FREQUENCY = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
export const VALID_COMMUNICATION_STYLE = ['direct', 'emotional', 'analytical', 'consultative', 'storytelling'];
export const VALID_PERSONA_TYPE = ['primary', 'secondary', 'tertiary'];

export interface ValidationError {
  sheet: string;
  row: number;
  column: string;
  message: string;
  value?: string;
}

export interface ValidationWarning {
  sheet: string;
  row: number;
  message: string;
}

// Helper: Validate date format YYYY-MM-DD
function isValidDateFormat(dateStr: string): boolean {
  if (!dateStr || dateStr.trim() === '') return true;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr.trim())) return false;
  const date = new Date(dateStr.trim());
  return !isNaN(date.getTime());
}

// Helper: Validate JSON string
function isValidJSON(str: string): boolean {
  if (!str || str.trim() === '') return true;
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

// Helper: Validate number in range
function isValidNumberInRange(value: string | number, min: number, max: number): boolean {
  if (value === undefined || value === null || value === '') return true;
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
}

// Helper: Validate non-negative number
function isNonNegativeNumber(value: string | number): boolean {
  if (value === undefined || value === null || value === '') return true;
  const num = Number(value);
  return !isNaN(num) && num >= 0;
}

// Helper: Validate URL format
function isValidURL(url: string): boolean {
  if (!url || url.trim() === '') return true;
  return /^https?:\/\/.+/.test(url.trim());
}

/**
 * Validate language code
 */
export function validateLanguageCode(value: string): boolean {
  return VALID_LANGUAGE_CODES.includes(value.toLowerCase().trim());
}

/**
 * Validate jurisdiction code
 */
export function validateJurisdictionCode(value: string): boolean {
  return VALID_JURISDICTION_CODES.includes(value.toUpperCase().trim());
}

/**
 * Validate enum value
 */
export function validateEnum(value: string, validValues: string[]): boolean {
  if (!value || value.trim() === '') return true;
  return validValues.includes(value.toLowerCase().trim());
}

/**
 * Validate pack info sheet data (Enhanced with Risk Guidelines)
 */
export function validatePackInfo(
  packInfo: Record<string, string> | null,
  sheetName: string
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!packInfo) return { errors, warnings };

  // Required field
  if (!packInfo.code) {
    errors.push({
      sheet: sheetName,
      row: 3,
      column: 'code',
      message: 'Thiếu mã ngành (code) - bắt buộc',
    });
  }

  // Validate formality_level
  if (packInfo.formality_level && !validateEnum(packInfo.formality_level, VALID_FORMALITY_LEVEL)) {
    errors.push({
      sheet: sheetName,
      row: 3,
      column: 'formality_level',
      message: `Mức độ trang trọng "${packInfo.formality_level}" không hợp lệ. Sử dụng: ${VALID_FORMALITY_LEVEL.join(', ')}`,
      value: packInfo.formality_level,
    });
  }

  // Validate industry_level
  if (packInfo.industry_level && !validateEnum(packInfo.industry_level, VALID_INDUSTRY_LEVEL)) {
    errors.push({
      sheet: sheetName,
      row: 3,
      column: 'industry_level',
      message: `Loại ngành "${packInfo.industry_level}" không hợp lệ. Sử dụng: ${VALID_INDUSTRY_LEVEL.join(', ')}`,
      value: packInfo.industry_level,
    });
  }

  // Validate target_audience
  if (packInfo.target_audience && !validateEnum(packInfo.target_audience, VALID_TARGET_AUDIENCE)) {
    errors.push({
      sheet: sheetName,
      row: 3,
      column: 'target_audience',
      message: `Đối tượng "${packInfo.target_audience}" không hợp lệ. Sử dụng: ${VALID_TARGET_AUDIENCE.join(', ')}`,
      value: packInfo.target_audience,
    });
  }

  // Validate emoji_policy
  if (packInfo.emoji_policy && !validateEnum(packInfo.emoji_policy, VALID_EMOJI_POLICY)) {
    warnings.push({
      sheet: sheetName,
      row: 3,
      message: `Emoji policy "${packInfo.emoji_policy}" không chuẩn. Nên dùng: ${VALID_EMOJI_POLICY.join(', ')}`,
    });
  }

  // Validate Risk Guidelines weights (non-negative numbers)
  const weightFields = ['weight_forbidden_term', 'weight_claim_restriction', 'weight_forbidden_pattern', 'weight_high_risk_keyword'];
  weightFields.forEach(field => {
    if (packInfo[field] && !isNonNegativeNumber(packInfo[field])) {
      errors.push({
        sheet: sheetName,
        row: 3,
        column: field,
        message: `${field} "${packInfo[field]}" phải là số không âm`,
        value: packInfo[field],
      });
    }
  });

  // Validate Risk Guidelines thresholds (non-negative numbers)
  const thresholdFields = ['threshold_low', 'threshold_medium', 'threshold_high', 'threshold_blocked'];
  thresholdFields.forEach(field => {
    if (packInfo[field] && !isNonNegativeNumber(packInfo[field])) {
      errors.push({
        sheet: sheetName,
        row: 3,
        column: field,
        message: `${field} "${packInfo[field]}" phải là số không âm`,
        value: packInfo[field],
      });
    }
  });

  return { errors, warnings };
}

/**
 * Validate translations sheet data (Enhanced with Glossary)
 */
export function validateTranslations(
  rows: Record<string, string>[],
  sheetName: string
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 3;
    const langCode = row.language_code;

    // Required field
    if (!langCode) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'language_code',
        message: 'Thiếu mã ngôn ngữ (language_code) - bắt buộc',
      });
    } else if (!validateLanguageCode(langCode)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'language_code',
        message: `Mã ngôn ngữ "${langCode}" không hợp lệ. Sử dụng: ${VALID_LANGUAGE_CODES.join(', ')}`,
        value: langCode,
      });
    }

    if (!row.name) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'name',
        message: 'Thiếu tên (name) - bắt buộc',
      });
    }

    // Validate glossary keys/values match
    const glossaryKeys = row.glossary_keys ? row.glossary_keys.split(';').filter(Boolean) : [];
    const glossaryValues = row.glossary_values ? row.glossary_values.split(';').filter(Boolean) : [];
    
    if (glossaryKeys.length !== glossaryValues.length && (glossaryKeys.length > 0 || glossaryValues.length > 0)) {
      warnings.push({
        sheet: sheetName,
        row: rowNum,
        message: `Số lượng Glossary Keys (${glossaryKeys.length}) không khớp với Values (${glossaryValues.length})`,
      });
    }
  });

  return { errors, warnings };
}

/**
 * Validate jurisdictions sheet data (Enhanced with validity_status, date, trends)
 */
export function validateJurisdictions(
  rows: Record<string, string>[],
  sheetName: string
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 3;
    const jurisdictionCode = row.jurisdiction_code;

    // Required field
    if (!jurisdictionCode) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'jurisdiction_code',
        message: 'Thiếu mã quốc gia (jurisdiction_code) - bắt buộc',
      });
    } else if (!validateJurisdictionCode(jurisdictionCode)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'jurisdiction_code',
        message: `Mã quốc gia "${jurisdictionCode}" không hợp lệ. Sử dụng ISO 2-letter: VN, US, SG...`,
        value: jurisdictionCode,
      });
    }

    // Validate JSON format for modified_compliance_rules
    if (row.modified_compliance_rules && !isValidJSON(row.modified_compliance_rules)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'modified_compliance_rules',
        message: 'JSON không hợp lệ cho modified_compliance_rules',
        value: row.modified_compliance_rules.substring(0, 50),
      });
    }

    // Validate validity_status
    if (row.validity_status && !validateEnum(row.validity_status, VALID_VALIDITY_STATUS)) {
      warnings.push({
        sheet: sheetName,
        row: rowNum,
        message: `Validity status "${row.validity_status}" không chuẩn. Nên dùng: ${VALID_VALIDITY_STATUS.join(', ')}`,
      });
    }

    // Validate date format
    if (row.last_verified_date && !isValidDateFormat(row.last_verified_date)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'last_verified_date',
        message: `Ngày "${row.last_verified_date}" không đúng format YYYY-MM-DD`,
        value: row.last_verified_date,
      });
    }
  });

  return { errors, warnings };
}

/**
 * Validate key regulations sheet data (NEW in v2.2)
 */
export function validateKeyRegulations(
  rows: Record<string, string>[],
  sheetName: string
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 3;

    // Required fields
    if (!row.jurisdiction_code) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'jurisdiction_code',
        message: 'Thiếu mã quốc gia (jurisdiction_code) - bắt buộc',
      });
    } else if (!validateJurisdictionCode(row.jurisdiction_code)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'jurisdiction_code',
        message: `Mã quốc gia "${row.jurisdiction_code}" không hợp lệ`,
        value: row.jurisdiction_code,
      });
    }

    if (!row.regulation_name) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'regulation_name',
        message: 'Thiếu tên quy định (regulation_name) - bắt buộc',
      });
    }

    if (!row.effective_date) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'effective_date',
        message: 'Thiếu ngày hiệu lực (effective_date) - bắt buộc',
      });
    } else if (!isValidDateFormat(row.effective_date)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'effective_date',
        message: `Ngày "${row.effective_date}" không đúng format YYYY-MM-DD`,
        value: row.effective_date,
      });
    }

    // Validate validity_status
    if (row.validity_status && !validateEnum(row.validity_status, VALID_VALIDITY_STATUS)) {
      warnings.push({
        sheet: sheetName,
        row: rowNum,
        message: `Status "${row.validity_status}" không chuẩn. Nên dùng: ${VALID_VALIDITY_STATUS.join(', ')}`,
      });
    }

    // Validate URL
    if (row.source_url && !isValidURL(row.source_url)) {
      warnings.push({
        sheet: sheetName,
        row: rowNum,
        message: `URL "${row.source_url}" không đúng format (cần http:// hoặc https://)`,
      });
    }
  });

  return { errors, warnings };
}

/**
 * Validate compliance rules sheet data
 */
export function validateComplianceRules(
  rows: Record<string, string>[],
  sheetName: string
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 3;

    if (!row.rule_id) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'rule_id',
        message: 'Thiếu mã quy tắc (rule_id) - bắt buộc',
      });
    }

    if (!row.rule_text) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'rule_text',
        message: 'Thiếu nội dung quy tắc (rule_text) - bắt buộc',
      });
    }

    if (row.severity && !validateEnum(row.severity, VALID_SEVERITY)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'severity',
        message: `Mức độ "${row.severity}" không hợp lệ. Sử dụng: ${VALID_SEVERITY.join(', ')}`,
        value: row.severity,
      });
    }
  });

  return { errors, warnings };
}

/**
 * Validate claim restrictions sheet data
 */
export function validateClaimRestrictions(
  rows: Record<string, string>[],
  sheetName: string
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 3;

    if (!row.forbidden_claim) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'forbidden_claim',
        message: 'Thiếu claim bị cấm (forbidden_claim) - bắt buộc',
      });
    }

    if (!row.suggested_alternative) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'suggested_alternative',
        message: 'Thiếu gợi ý thay thế (suggested_alternative) - bắt buộc',
      });
    }

    if (row.severity && !validateEnum(row.severity, VALID_SEVERITY)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'severity',
        message: `Mức độ "${row.severity}" không hợp lệ. Sử dụng: ${VALID_SEVERITY.join(', ')}`,
        value: row.severity,
      });
    }
  });

  return { errors, warnings };
}

/**
 * Validate argument patterns sheet data
 */
export function validateArgumentPatterns(
  rows: Record<string, string>[],
  sheetName: string
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 3;

    if (!row.type) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'type',
        message: 'Thiếu loại pattern (type) - bắt buộc',
      });
    } else if (!validateEnum(row.type, VALID_PATTERN_TYPE)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'type',
        message: `Loại pattern "${row.type}" không hợp lệ. Sử dụng: ${VALID_PATTERN_TYPE.join(', ')}`,
        value: row.type,
      });
    }

    if (!row.pattern) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'pattern',
        message: 'Thiếu mẫu lập luận (pattern) - bắt buộc',
      });
    }
  });

  return { errors, warnings };
}

/**
 * Validate system rules sheet data
 */
export function validateSystemRules(
  rows: Record<string, string>[],
  sheetName: string
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 3;

    if (!row.rule) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'rule',
        message: 'Thiếu quy tắc (rule) - bắt buộc',
      });
    }

    if (!row.priority) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'priority',
        message: 'Thiếu mức ưu tiên (priority) - bắt buộc',
      });
    } else if (!validateEnum(row.priority, VALID_PRIORITY)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'priority',
        message: `Mức ưu tiên "${row.priority}" không hợp lệ. Sử dụng: ${VALID_PRIORITY.join(', ')}`,
        value: row.priority,
      });
    }
  });

  return { errors, warnings };
}

/**
 * Validate forbidden terms sheet data
 */
export function validateForbiddenTerms(
  rows: Record<string, string>[],
  sheetName: string
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 3;

    if (!row.term) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'term',
        message: 'Thiếu thuật ngữ cấm (term) - bắt buộc',
      });
    }
  });

  return { errors, warnings };
}

/**
 * Validate personas sheet data (Enhanced PRO v2.2)
 */
export function validatePersonas(
  rows: Record<string, string>[],
  sheetName: string
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 3;

    // Required field
    if (!row.name) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'name',
        message: 'Thiếu tên persona (name) - bắt buộc',
      });
    }

    // Validate persona_type
    if (row.persona_type && !validateEnum(row.persona_type, VALID_PERSONA_TYPE)) {
      warnings.push({
        sheet: sheetName,
        row: rowNum,
        message: `Persona type "${row.persona_type}" không chuẩn. Nên dùng: ${VALID_PERSONA_TYPE.join(', ')}`,
      });
    }

    // Validate gender
    if (row.gender && !validateEnum(row.gender, VALID_GENDER)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'gender',
        message: `Giới tính "${row.gender}" không hợp lệ. Sử dụng: ${VALID_GENDER.join(', ')}`,
        value: row.gender,
      });
    }

    // Validate income_level
    if (row.income_level && !validateEnum(row.income_level, VALID_INCOME_LEVEL)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'income_level',
        message: `Mức thu nhập "${row.income_level}" không hợp lệ. Sử dụng: ${VALID_INCOME_LEVEL.join(', ')}`,
        value: row.income_level,
      });
    }

    // Validate education_level
    if (row.education_level && !validateEnum(row.education_level, VALID_EDUCATION_LEVEL)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'education_level',
        message: `Trình độ "${row.education_level}" không hợp lệ. Sử dụng: ${VALID_EDUCATION_LEVEL.join(', ')}`,
        value: row.education_level,
      });
    }

    // Validate location_type
    if (row.location_type && !validateEnum(row.location_type, VALID_LOCATION_TYPE)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'location_type',
        message: `Loại vị trí "${row.location_type}" không hợp lệ. Sử dụng: ${VALID_LOCATION_TYPE.join(', ')}`,
        value: row.location_type,
      });
    }

    // Validate family_status
    if (row.family_status && !validateEnum(row.family_status, VALID_FAMILY_STATUS)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'family_status',
        message: `Tình trạng gia đình "${row.family_status}" không hợp lệ. Sử dụng: ${VALID_FAMILY_STATUS.join(', ')}`,
        value: row.family_status,
      });
    }

    // Validate tech_savviness
    if (row.tech_savviness && !validateEnum(row.tech_savviness, VALID_TECH_SAVVINESS)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'tech_savviness',
        message: `Mức độ công nghệ "${row.tech_savviness}" không hợp lệ. Sử dụng: ${VALID_TECH_SAVVINESS.join(', ')}`,
        value: row.tech_savviness,
      });
    }

    // Validate price_sensitivity
    if (row.price_sensitivity && !validateEnum(row.price_sensitivity, VALID_PRICE_SENSITIVITY)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'price_sensitivity',
        message: `Độ nhạy giá "${row.price_sensitivity}" không hợp lệ. Sử dụng: ${VALID_PRICE_SENSITIVITY.join(', ')}`,
        value: row.price_sensitivity,
      });
    }

    // Validate purchase_frequency
    if (row.purchase_frequency && !validateEnum(row.purchase_frequency, VALID_PURCHASE_FREQUENCY)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'purchase_frequency',
        message: `Tần suất mua "${row.purchase_frequency}" không hợp lệ. Sử dụng: ${VALID_PURCHASE_FREQUENCY.join(', ')}`,
        value: row.purchase_frequency,
      });
    }

    // Validate communication_style
    if (row.communication_style && !validateEnum(row.communication_style, VALID_COMMUNICATION_STYLE)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'communication_style',
        message: `Phong cách giao tiếp "${row.communication_style}" không hợp lệ. Sử dụng: ${VALID_COMMUNICATION_STYLE.join(', ')}`,
        value: row.communication_style,
      });
    }

    // Enhanced PRO v2.2: Validate segment_size (0-100)
    if (row.segment_size && !isValidNumberInRange(row.segment_size, 0, 100)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'segment_size',
        message: `Segment size "${row.segment_size}" phải từ 0 đến 100`,
        value: row.segment_size,
      });
    }

    // Enhanced PRO v2.2: Validate priority_score (1-10)
    if (row.priority_score && !isValidNumberInRange(row.priority_score, 1, 10)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'priority_score',
        message: `Priority score "${row.priority_score}" phải từ 1 đến 10`,
        value: row.priority_score,
      });
    }

    // Enhanced PRO v2.2: Validate avatar_url
    if (row.avatar_url && !isValidURL(row.avatar_url)) {
      warnings.push({
        sheet: sheetName,
        row: rowNum,
        message: `Avatar URL "${row.avatar_url}" không đúng format`,
      });
    }

    // Enhanced PRO v2.2: Validate JSON fields
    const jsonFields = ['device_usage', 'content_preferences', 'journey_stages', 'country_variants'];
    jsonFields.forEach(field => {
      if (row[field] && !isValidJSON(row[field])) {
        errors.push({
          sheet: sheetName,
          row: rowNum,
          column: field,
          message: `${field} không phải JSON hợp lệ`,
          value: row[field].substring(0, 50),
        });
      }
    });
  });

  return { errors, warnings };
}

/**
 * Aggregate all validation results
 */
export function aggregateValidationResults(
  results: Array<{ errors: ValidationError[]; warnings: ValidationWarning[] }>
): { errors: ValidationError[]; warnings: ValidationWarning[]; isValid: boolean } {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];

  results.forEach(result => {
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  });

  return {
    errors: allErrors,
    warnings: allWarnings,
    isValid: allErrors.length === 0,
  };
}
