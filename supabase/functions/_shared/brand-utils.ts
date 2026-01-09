// ============================================
// Brand Shared Utilities
// Common utilities for brand-related edge functions
// ============================================

// Color to tone mapping
export const COLOR_TONE_MAP: Record<string, string> = {
  // Reds & Oranges - Urgency, energy
  '#FF0000': 'CTA mạnh, tạo cảm giác cấp bách, năng lượng cao',
  '#FF4500': 'CTA mạnh, tạo cảm giác cấp bách, năng lượng cao',
  '#FF6347': 'Thân thiện nhưng mạnh mẽ, khuyến khích hành động',
  '#FFA500': 'Thân thiện, lạc quan, dễ tiếp cận',
  '#FF8C00': 'Năng động, tích cực, khuyến khích hành động',
  
  // Blues - Trust, professionalism
  '#0000FF': 'Tin cậy, chuyên nghiệp, ưu tiên dữ liệu và số liệu',
  '#1E90FF': 'Tin cậy, hiện đại, chuyên nghiệp',
  '#4169E1': 'Tin cậy, uy tín, chuyên nghiệp cao',
  '#000080': 'Uy quyền, cao cấp, chuyên nghiệp truyền thống',
  '#87CEEB': 'Nhẹ nhàng, an tâm, thân thiện',
  
  // Greens - Growth, safety
  '#008000': 'An toàn, tăng trưởng, bền vững, tin cậy',
  '#228B22': 'Tự nhiên, bền vững, tăng trưởng',
  '#32CD32': 'Tích cực, phát triển, năng động',
  '#00FF00': 'Mới mẻ, sáng tạo, năng động',
  '#2E8B57': 'Ổn định, đáng tin cậy, chuyên nghiệp',
  
  // Blacks & Grays - Premium, minimal
  '#000000': 'Cao cấp, tối giản, uy quyền, chuyên nghiệp',
  '#333333': 'Cao cấp, chuyên nghiệp, sang trọng',
  '#666666': 'Trung tính, chuyên nghiệp, dễ kết hợp',
  '#808080': 'Trung tính, ổn định, chuyên nghiệp',
  
  // Purples - Luxury, creativity
  '#800080': 'Sang trọng, sáng tạo, độc đáo',
  '#9932CC': 'Sáng tạo, độc đáo, cao cấp',
  '#8B008B': 'Cao cấp, bí ẩn, thu hút',
  
  // Yellows - Friendly, optimistic
  '#FFD700': 'Lạc quan, thân thiện, thu hút chú ý',
  '#FFFF00': 'Năng động, vui vẻ, thu hút',
  '#FFA07A': 'Ấm áp, thân thiện, dễ gần',
  
  // Pinks - Warm, approachable
  '#FFC0CB': 'Nhẹ nhàng, thân thiện, ấm áp',
  '#FF69B4': 'Năng động, trẻ trung, thu hút',
  
  // Browns - Earthy, reliable
  '#8B4513': 'Truyền thống, đáng tin cậy, chắc chắn',
  '#A0522D': 'Tự nhiên, ấm áp, đáng tin cậy',
};

// Cache for industry target mapping (per-request caching)
let cachedIndustryTargetMap: Map<string, 'B2B' | 'B2C' | 'both'> | null = null;

/**
 * Fetch industry target mapping from database with caching
 */
export async function fetchIndustryTargetMap(supabase: any): Promise<Map<string, 'B2B' | 'B2C' | 'both'>> {
  if (cachedIndustryTargetMap) {
    console.log(`[brand-utils] Using cached industry target map (${cachedIndustryTargetMap.size} entries)`);
    return cachedIndustryTargetMap;
  }

  const targetMap = new Map<string, 'B2B' | 'B2C' | 'both'>();
  
  try {
    const { data: templates, error } = await supabase
      .from('industry_templates')
      .select(`
        code,
        target_audience,
        industry_template_translations(name, language_code)
      `)
      .eq('is_active', true);
    
    if (error) {
      console.error('[brand-utils] Error fetching industry templates:', error);
      return targetMap;
    }
    
    if (templates) {
      for (const template of templates) {
        const target = template.target_audience as 'B2B' | 'B2C' | 'both';
        targetMap.set(template.code, target);
        
        const translations = template.industry_template_translations as { name: string; language_code: string }[] | null;
        if (translations) {
          for (const trans of translations) {
            targetMap.set(trans.name, target);
          }
        }
      }
    }
    
    console.log(`[brand-utils] Loaded ${targetMap.size} industry target mappings`);
    cachedIndustryTargetMap = targetMap;
  } catch (err) {
    console.error('[brand-utils] Failed to fetch industry target map:', err);
  }
  
  return targetMap;
}

/**
 * Clear industry target cache (call at start of each request if needed)
 */
export function clearIndustryTargetCache(): void {
  cachedIndustryTargetMap = null;
}

/**
 * Detect target audience from industry list
 */
export async function detectTargetAudience(
  industries: string[],
  supabase: any
): Promise<'B2B' | 'B2C' | 'both'> {
  if (!industries || industries.length === 0) return 'B2B';
  
  const industryTargetMap = await fetchIndustryTargetMap(supabase);
  
  let b2bCount = 0;
  let b2cCount = 0;
  let bothCount = 0;
  
  for (const industry of industries) {
    const target = industryTargetMap.get(industry);
    if (target === 'B2B') b2bCount++;
    else if (target === 'B2C') b2cCount++;
    else if (target === 'both') bothCount++;
    else b2bCount++; // Default to B2B for unknown industries
  }
  
  if (b2bCount > b2cCount && b2bCount > bothCount) return 'B2B';
  if (b2cCount > b2bCount && b2cCount > bothCount) return 'B2C';
  return 'both';
}

/**
 * Get color tone suggestion from hex color
 */
export function getColorToneSuggestion(color: string): string {
  if (!color) return '';
  
  const normalizedColor = color.toUpperCase();
  
  // Direct match
  if (COLOR_TONE_MAP[normalizedColor]) {
    return COLOR_TONE_MAP[normalizedColor];
  }
  
  // Parse hex to RGB for approximate matching
  const hex = normalizedColor.replace('#', '');
  if (hex.length !== 6) return '';
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Approximate color category
  if (r > 200 && g < 100 && b < 100) return 'CTA mạnh, tạo cảm giác cấp bách, năng lượng cao';
  if (r > 200 && g > 150 && b < 100) return 'Thân thiện, lạc quan, dễ tiếp cận';
  if (r < 100 && g < 100 && b > 150) return 'Tin cậy, chuyên nghiệp, ưu tiên dữ liệu và số liệu';
  if (r < 100 && g > 150 && b < 100) return 'An toàn, tăng trưởng, bền vững, tin cậy';
  if (r < 80 && g < 80 && b < 80) return 'Cao cấp, tối giản, uy quyền, chuyên nghiệp';
  if (r > 200 && g > 200 && b < 100) return 'Lạc quan, thân thiện, thu hút chú ý';
  if (r > 150 && g < 100 && b > 150) return 'Sang trọng, sáng tạo, độc đáo';
  
  return 'Chuyên nghiệp, cân bằng';
}

// ============= BRAND COMPLETENESS CHECKER =============

// Field labels for user-friendly messages (Vietnamese)
export const FIELD_LABELS: Record<string, string> = {
  brand_name: 'Tên thương hiệu',
  tone_of_voice: 'Giọng điệu thương hiệu',
  industry: 'Ngành nghề',
  brand_positioning: 'Định vị thương hiệu',
  formality_level: 'Mức độ trang trọng',
  products: 'Sản phẩm/Dịch vụ',
  customer_personas: 'Chân dung khách hàng',
  preferred_words: 'Từ khóa ưu tiên',
  forbidden_words: 'Từ cấm sử dụng',
  primary_color: 'Màu sắc thương hiệu',
  selected_channels: 'Kênh truyền thông',
  language_style: 'Phong cách ngôn ngữ',
  has_logo: 'Logo thương hiệu',
};

// Impact descriptions when field is missing
export const FIELD_IMPACT: Record<string, string> = {
  products: 'Guideline sẽ thiếu hướng dẫn viết về sản phẩm cụ thể, ví dụ content sẽ chung chung',
  customer_personas: 'Content có thể không đúng đối tượng mục tiêu, tone voice không phù hợp',
  tone_of_voice: 'Giọng điệu sẽ mang tính chung chung, thiếu đặc trưng thương hiệu',
  industry: 'Thiếu ngữ cảnh ngành nghề, quy tắc compliance, thuật ngữ chuyên môn',
  brand_positioning: 'Thiếu định hướng chiến lược, nội dung có thể không nhất quán',
  formality_level: 'Không xác định được cách xưng hô và mức độ trang trọng phù hợp',
  preferred_words: 'Thiếu từ khóa đặc trưng thương hiệu trong content',
  forbidden_words: 'Có thể dùng từ không phù hợp với brand',
  primary_color: 'Thiếu gợi ý tone phù hợp với visual identity',
};

// Field weights for score calculation
export const FIELD_WEIGHTS: Record<string, number> = {
  brand_name: 20,        // Required - highest weight
  industry: 12,          // Core
  tone_of_voice: 12,     // Core  
  brand_positioning: 10, // Core
  formality_level: 8,    // Core
  products: 15,          // Recommended - very important
  customer_personas: 12, // Recommended - very important
  preferred_words: 5,    // Recommended
  forbidden_words: 3,    // Optional
  primary_color: 3,      // Optional
  selected_channels: 0,  // Optional (not weighted)
};

export interface BrandCompletenessInput {
  brand_name?: string;
  tone_of_voice?: string[];
  industry?: string[];
  brand_positioning?: string;
  formality_level?: string;
  products?: any[];
  customer_personas?: any[];
  preferred_words?: string[];
  forbidden_words?: string[];
  primary_color?: string;
  selected_channels?: string[];
  language_style?: string[];
}

export interface BrandCompletenessResult {
  score: number; // 0-100
  level: 'insufficient' | 'basic' | 'good' | 'excellent';
  missingRequired: string[];
  missingCore: string[];
  missingRecommended: string[];
  missingOptional: string[];
  canGenerate: boolean;
  filledFields: string[];
}

/**
 * Check brand completeness and return structured result
 */
export function checkBrandCompleteness(data: BrandCompletenessInput): BrandCompletenessResult {
  const missingRequired: string[] = [];
  const missingCore: string[] = [];
  const missingRecommended: string[] = [];
  const missingOptional: string[] = [];
  const filledFields: string[] = [];
  
  // Check required fields
  if (!data.brand_name?.trim()) {
    missingRequired.push('brand_name');
  } else {
    filledFields.push('brand_name');
  }
  
  // Check core fields
  if (!data.tone_of_voice?.length) {
    missingCore.push('tone_of_voice');
  } else {
    filledFields.push('tone_of_voice');
  }
  
  if (!data.industry?.length) {
    missingCore.push('industry');
  } else {
    filledFields.push('industry');
  }
  
  if (!data.brand_positioning?.trim()) {
    missingCore.push('brand_positioning');
  } else {
    filledFields.push('brand_positioning');
  }
  
  if (!data.formality_level) {
    missingCore.push('formality_level');
  } else {
    filledFields.push('formality_level');
  }
  
  // Check recommended fields
  if (!data.products?.length) {
    missingRecommended.push('products');
  } else {
    filledFields.push('products');
  }
  
  if (!data.customer_personas?.length) {
    missingRecommended.push('customer_personas');
  } else {
    filledFields.push('customer_personas');
  }
  
  if (!data.preferred_words?.length) {
    missingRecommended.push('preferred_words');
  } else {
    filledFields.push('preferred_words');
  }
  
  // Check optional fields
  if (!data.forbidden_words?.length) {
    missingOptional.push('forbidden_words');
  } else {
    filledFields.push('forbidden_words');
  }
  
  if (!data.primary_color?.trim()) {
    missingOptional.push('primary_color');
  } else {
    filledFields.push('primary_color');
  }
  
  // Calculate weighted score
  const maxScore = Object.values(FIELD_WEIGHTS).reduce((a, b) => a + b, 0);
  let earnedScore = 0;
  
  for (const field of filledFields) {
    earnedScore += FIELD_WEIGHTS[field] || 0;
  }
  
  const score = Math.round((earnedScore / maxScore) * 100);
  
  // Determine level based on score and missing fields
  let level: 'insufficient' | 'basic' | 'good' | 'excellent';
  if (missingRequired.length > 0 || score < 20) {
    level = 'insufficient';
  } else if (score < 45) {
    level = 'basic';
  } else if (score < 70) {
    level = 'good';
  } else {
    level = 'excellent';
  }
  
  // Can generate if: no missing required AND score >= 20
  const canGenerate = missingRequired.length === 0 && score >= 20;
  
  return {
    score,
    level,
    missingRequired,
    missingCore,
    missingRecommended,
    missingOptional,
    canGenerate,
    filledFields,
  };
}

/**
 * Build insufficient data response for API
 */
export function buildInsufficientDataResponse(completeness: BrandCompletenessResult) {
  const suggestions: string[] = [];
  
  if (completeness.missingRequired.length > 0) {
    suggestions.push('Vui lòng bổ sung các thông tin bắt buộc: ' + 
      completeness.missingRequired.map(f => FIELD_LABELS[f]).join(', '));
  }
  
  if (completeness.missingCore.length > 0) {
    suggestions.push('Thêm thông tin cơ bản để guideline chính xác hơn: ' + 
      completeness.missingCore.slice(0, 3).map(f => FIELD_LABELS[f]).join(', '));
  }
  
  if (completeness.missingRecommended.includes('products')) {
    suggestions.push('Thêm sản phẩm/dịch vụ để guideline bao gồm cách viết về sản phẩm cụ thể');
  }
  
  if (completeness.missingRecommended.includes('customer_personas')) {
    suggestions.push('Thêm Customer Persona để tone phù hợp đối tượng mục tiêu');
  }
  
  return {
    error: 'insufficient_data',
    message: 'Không đủ thông tin để tạo Brand Guideline chất lượng',
    completeness: {
      score: completeness.score,
      level: completeness.level,
      missing_required: completeness.missingRequired.map(f => ({
        field: f,
        label: FIELD_LABELS[f],
        impact: 'Bắt buộc phải có để tạo guideline'
      })),
      missing_core: completeness.missingCore.map(f => ({
        field: f,
        label: FIELD_LABELS[f],
        impact: FIELD_IMPACT[f] || 'Ảnh hưởng đến chất lượng guideline'
      })),
      missing_recommended: completeness.missingRecommended.map(f => ({
        field: f,
        label: FIELD_LABELS[f],
        impact: FIELD_IMPACT[f] || 'Guideline sẽ chung chung hơn'
      })),
      filled_fields: completeness.filledFields.map(f => FIELD_LABELS[f]),
    },
    suggestions,
  };
}

/**
 * Build completeness metadata for successful response
 */
export function buildCompletenessMetadata(completeness: BrandCompletenessResult) {
  const allMissing = [
    ...completeness.missingCore,
    ...completeness.missingRecommended,
  ];
  
  const improvementTips: string[] = [];
  
  if (completeness.missingRecommended.includes('products')) {
    improvementTips.push('Thêm sản phẩm/dịch vụ để guideline bao gồm ví dụ cụ thể về sản phẩm');
  }
  if (completeness.missingRecommended.includes('customer_personas')) {
    improvementTips.push('Thêm Customer Persona để tone và cách xưng hô phù hợp hơn');
  }
  if (completeness.missingCore.includes('tone_of_voice')) {
    improvementTips.push('Chọn Tone of Voice để xác định giọng điệu đặc trưng thương hiệu');
  }
  if (completeness.missingCore.includes('industry')) {
    improvementTips.push('Chọn ngành nghề để thêm thuật ngữ và quy tắc compliance phù hợp');
  }
  if (completeness.missingCore.includes('brand_positioning')) {
    improvementTips.push('Thêm định vị thương hiệu để content có định hướng rõ ràng');
  }
  if (completeness.missingRecommended.includes('preferred_words')) {
    improvementTips.push('Thêm từ khóa ưu tiên để content có đặc trưng thương hiệu');
  }
  
  return {
    score: completeness.score,
    level: completeness.level,
    level_label: completeness.level === 'insufficient' ? 'Thiếu thông tin' :
                 completeness.level === 'basic' ? 'Cơ bản' :
                 completeness.level === 'good' ? 'Tốt' : 'Xuất sắc',
    missing_fields: allMissing.map(f => ({
      field: f,
      label: FIELD_LABELS[f],
      impact: FIELD_IMPACT[f] || 'Ảnh hưởng đến chất lượng guideline'
    })),
    filled_count: completeness.filledFields.length,
    total_count: completeness.filledFields.length + allMissing.length + completeness.missingOptional.length,
    improvement_tips: improvementTips,
  };
}
