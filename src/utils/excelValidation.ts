/**
 * Excel Import Validation Utilities
 * Provides validation functions for Industry Pack import data
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
export const VALID_GENDER = ['male', 'female', 'all'];
export const VALID_INCOME_LEVEL = ['low', 'medium', 'high', 'very_high'];
export const VALID_EDUCATION_LEVEL = ['high_school', 'college', 'bachelor', 'master', 'doctorate'];
export const VALID_LOCATION_TYPE = ['urban', 'suburban', 'rural'];
export const VALID_FAMILY_STATUS = ['single', 'married_no_kids', 'married_with_kids', 'empty_nest'];
export const VALID_TECH_SAVVINESS = ['low', 'medium', 'high'];
export const VALID_PRICE_SENSITIVITY = ['low', 'medium', 'high'];
export const VALID_PURCHASE_FREQUENCY = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
export const VALID_COMMUNICATION_STYLE = ['direct', 'emotional', 'analytical', 'consultative', 'storytelling'];

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
  if (!value || value.trim() === '') return true; // Empty values are handled by required check
  return validValues.includes(value.toLowerCase().trim());
}

/**
 * Validate translations sheet data
 */
export function validateTranslations(
  rows: Record<string, string>[],
  sheetName: string
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 3; // Account for header and description rows
    const langCode = row.language_code;

    if (langCode && !validateLanguageCode(langCode)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'language_code',
        message: `Mã ngôn ngữ "${langCode}" không hợp lệ. Sử dụng: ${VALID_LANGUAGE_CODES.join(', ')}`,
        value: langCode,
      });
    }
  });

  return { errors, warnings };
}

/**
 * Validate jurisdictions sheet data
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

    if (jurisdictionCode && !validateJurisdictionCode(jurisdictionCode)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'jurisdiction_code',
        message: `Mã quốc gia "${jurisdictionCode}" không hợp lệ. Sử dụng ISO 2-letter: VN, US, SG...`,
        value: jurisdictionCode,
      });
    }

    // Validate JSON format for modified_compliance_rules
    if (row.modified_compliance_rules) {
      try {
        JSON.parse(row.modified_compliance_rules);
      } catch {
        errors.push({
          sheet: sheetName,
          row: rowNum,
          column: 'modified_compliance_rules',
          message: 'JSON không hợp lệ cho modified_compliance_rules',
          value: row.modified_compliance_rules.substring(0, 50),
        });
      }
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
    const severity = row.severity;

    if (severity && !validateEnum(severity, VALID_SEVERITY)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'severity',
        message: `Mức độ "${severity}" không hợp lệ. Sử dụng: ${VALID_SEVERITY.join(', ')}`,
        value: severity,
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
    const severity = row.severity;

    if (severity && !validateEnum(severity, VALID_SEVERITY)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'severity',
        message: `Mức độ "${severity}" không hợp lệ. Sử dụng: ${VALID_SEVERITY.join(', ')}`,
        value: severity,
      });
    }
  });

  return { errors, warnings };
}

/**
 * Validate pack info sheet data
 */
export function validatePackInfo(
  packInfo: Record<string, string> | null,
  sheetName: string
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!packInfo) return { errors, warnings };

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
    const type = row.type;

    if (type && !validateEnum(type, VALID_PATTERN_TYPE)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'type',
        message: `Loại pattern "${type}" không hợp lệ. Sử dụng: ${VALID_PATTERN_TYPE.join(', ')}`,
        value: type,
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
    const priority = row.priority;

    if (priority && !validateEnum(priority, VALID_PRIORITY)) {
      errors.push({
        sheet: sheetName,
        row: rowNum,
        column: 'priority',
        message: `Mức ưu tiên "${priority}" không hợp lệ. Sử dụng: ${VALID_PRIORITY.join(', ')}`,
        value: priority,
      });
    }
  });

  return { errors, warnings };
}

/**
 * Validate personas sheet data
 */
export function validatePersonas(
  rows: Record<string, string>[],
  sheetName: string
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 3;

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
  });

  return { errors, warnings };
}
