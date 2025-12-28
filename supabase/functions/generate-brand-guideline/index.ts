import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Color to tone mapping
const COLOR_TONE_MAP: Record<string, string> = {
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

interface IndustryTargetData {
  code: string;
  target_audience: 'B2B' | 'B2C' | 'both';
  translations: { name: string; language_code: string }[];
}

// Cache for industry target mapping (per-request caching)
let cachedIndustryTargetMap: Map<string, 'B2B' | 'B2C' | 'both'> | null = null;

// Fetch industry target mapping from database with caching
async function fetchIndustryTargetMap(supabase: any): Promise<Map<string, 'B2B' | 'B2C' | 'both'>> {
  // Return cached map if available
  if (cachedIndustryTargetMap) {
    console.log(`Using cached industry target map (${cachedIndustryTargetMap.size} entries)`);
    return cachedIndustryTargetMap;
  }

  const targetMap = new Map<string, 'B2B' | 'B2C' | 'both'>();
  
  try {
    // Fetch all industry templates with their translations
    const { data: templates, error } = await supabase
      .from('industry_templates')
      .select(`
        code,
        target_audience,
        industry_template_translations(name, language_code)
      `)
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching industry templates:', error);
      return targetMap;
    }
    
    if (templates) {
      for (const template of templates) {
        const target = template.target_audience as 'B2B' | 'B2C' | 'both';
        
        // Map by code
        targetMap.set(template.code, target);
        
        // Map by translated names
        const translations = template.industry_template_translations as { name: string; language_code: string }[] | null;
        if (translations) {
          for (const trans of translations) {
            targetMap.set(trans.name, target);
          }
        }
      }
    }
    
    console.log(`Loaded ${targetMap.size} industry target mappings from database`);
    
    // Cache the result
    cachedIndustryTargetMap = targetMap;
  } catch (err) {
    console.error('Failed to fetch industry target map:', err);
  }
  
  return targetMap;
}

// Clear cache (call at start of each request)
function clearIndustryTargetCache() {
  cachedIndustryTargetMap = null;
}

async function detectTargetAudience(
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

function getColorToneSuggestion(color: string): string {
  if (!color) return '';
  
  // Normalize color to uppercase
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
const FIELD_LABELS: Record<string, string> = {
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
const FIELD_IMPACT: Record<string, string> = {
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
const FIELD_WEIGHTS: Record<string, number> = {
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

interface BrandCompletenessResult {
  score: number; // 0-100
  level: 'insufficient' | 'basic' | 'good' | 'excellent';
  missingRequired: string[];
  missingCore: string[];
  missingRecommended: string[];
  missingOptional: string[];
  canGenerate: boolean;
  filledFields: string[];
}

function checkBrandCompleteness(data: {
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
}): BrandCompletenessResult {
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

function buildInsufficientDataResponse(completeness: BrandCompletenessResult) {
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

function buildCompletenessMetadata(completeness: BrandCompletenessResult) {
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

// ============= END BRAND COMPLETENESS CHECKER =============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      brand_name,
      industry,
      primary_color,
      has_logo,
      tone_of_voice,
      formality_level,
      brand_positioning,
      language_style,
      preferred_words,
      forbidden_words,
      // New fields for richer context
      products,
      customer_personas,
      selected_channels,
      brand_template_id,
    } = await req.json();

    // Fetch products if brand_template_id provided but no products passed
    let productList = products || [];
    if (brand_template_id && productList.length === 0) {
      const { data: fetchedProducts } = await supabase
        .from('brand_products')
        .select(`
          name, 
          description, 
          category, 
          sku,
          price_display,
          benefits, 
          unique_selling_points, 
          target_audience,
          pain_points_solved,
          keywords,
          suggested_content_angles,
          best_channels,
          is_featured
        `)
        .eq('brand_template_id', brand_template_id)
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('sort_order', { ascending: true })
        .limit(10);
      
      if (fetchedProducts) {
        productList = fetchedProducts;
      }
    }

    // Fetch customer personas if brand_template_id provided
    let personaList = customer_personas || [];
    if (brand_template_id && personaList.length === 0) {
      const { data: fetchedPersonas } = await supabase
        .from('customer_personas')
        .select(`
          name, 
          age_range, 
          gender,
          occupation, 
          income_level,
          location,
          pain_points, 
          desires, 
          interests,
          values,
          objections,
          buying_triggers,
          preferred_channels,
          information_sources,
          typical_funnel_stage,
          is_primary
        `)
        .eq('brand_template_id', brand_template_id)
        .order('is_primary', { ascending: false })
        .limit(5);
      
      if (fetchedPersonas) {
        personaList = fetchedPersonas;
      }
    }

    // ===== CHECK BRAND COMPLETENESS =====
    const completeness = checkBrandCompleteness({
      brand_name,
      tone_of_voice,
      industry,
      brand_positioning,
      formality_level,
      products: productList,
      customer_personas: personaList,
      preferred_words,
      forbidden_words,
      primary_color,
      selected_channels,
      language_style,
    });

    console.log(`Brand completeness: score=${completeness.score}, level=${completeness.level}, canGenerate=${completeness.canGenerate}`);

    // If insufficient data, return early with helpful response
    if (!completeness.canGenerate) {
      console.log('Insufficient brand data, returning early without AI call');
      return new Response(
        JSON.stringify(buildInsufficientDataResponse(completeness)),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    // Detect target audience from industry (now from database)
    const targetAudience = await detectTargetAudience(industry || [], supabase);
    
    // Get color tone suggestion
    const colorToneSuggestion = getColorToneSuggestion(primary_color || '');

    // Separate featured and regular products
    const featuredProducts = productList.filter((p: any) => p.is_featured);
    const regularProducts = productList.filter((p: any) => !p.is_featured);

    // Build detailed product context
    const buildProductDetail = (p: any, isFeatured: boolean) => {
      const lines = [
        `${isFeatured ? '⭐ ' : '• '}${p.name}${p.category ? ` [${p.category}]` : ''}${isFeatured ? ' (SẢN PHẨM CHỦ LỰC)' : ''}`,
      ];
      
      if (p.description) {
        lines.push(`   Mô tả: ${p.description}`);
      }
      if (p.unique_selling_points?.length) {
        lines.push(`   USP: ${p.unique_selling_points.join('; ')}`);
      }
      if (p.benefits?.length) {
        lines.push(`   Lợi ích: ${p.benefits.join('; ')}`);
      }
      if (p.pain_points_solved?.length) {
        lines.push(`   Vấn đề giải quyết: ${p.pain_points_solved.join('; ')}`);
      }
      if (p.target_audience) {
        lines.push(`   Đối tượng: ${p.target_audience}`);
      }
      if (p.keywords?.length) {
        lines.push(`   Từ khóa: ${p.keywords.join(', ')}`);
      }
      if (p.suggested_content_angles?.length) {
        lines.push(`   Góc content gợi ý: ${p.suggested_content_angles.join(', ')}`);
      }
      if (p.price_display) {
        lines.push(`   Giá: ${p.price_display}`);
      }
      
      return lines.join('\n');
    };

    const productContext = productList.length > 0 
      ? [
          ...(featuredProducts.length > 0 ? ['--- SẢN PHẨM CHỦ LỰC ---'] : []),
          ...featuredProducts.map((p: any) => buildProductDetail(p, true)),
          ...(regularProducts.length > 0 ? ['\n--- SẢN PHẨM KHÁC ---'] : []),
          ...regularProducts.map((p: any) => buildProductDetail(p, false)),
        ].join('\n\n')
      : 'Chưa có thông tin sản phẩm/dịch vụ';

    // Build detailed persona context
    const buildPersonaDetail = (p: any, isPrimary: boolean) => {
      const lines = [
        `${isPrimary ? '⭐ ' : '• '}${p.name}${isPrimary ? ' (PERSONA CHÍNH)' : ''}`,
      ];
      
      const demographics = [
        p.age_range,
        p.gender,
        p.occupation,
        p.income_level,
        p.location,
      ].filter(Boolean);
      if (demographics.length) {
        lines.push(`   Nhân khẩu học: ${demographics.join(', ')}`);
      }
      if (p.pain_points?.length) {
        lines.push(`   Pain points: ${p.pain_points.join('; ')}`);
      }
      if (p.desires?.length) {
        lines.push(`   Mong muốn: ${p.desires.join('; ')}`);
      }
      if (p.objections?.length) {
        lines.push(`   Rào cản mua hàng: ${p.objections.join('; ')}`);
      }
      if (p.buying_triggers?.length) {
        lines.push(`   Trigger mua hàng: ${p.buying_triggers.join('; ')}`);
      }
      if (p.interests?.length) {
        lines.push(`   Sở thích: ${p.interests.join(', ')}`);
      }
      if (p.values?.length) {
        lines.push(`   Giá trị quan trọng: ${p.values.join(', ')}`);
      }
      if (p.information_sources?.length) {
        lines.push(`   Nguồn thông tin: ${p.information_sources.join(', ')}`);
      }
      if (p.preferred_channels?.length) {
        lines.push(`   Kênh ưa thích: ${p.preferred_channels.join(', ')}`);
      }
      if (p.typical_funnel_stage) {
        lines.push(`   Giai đoạn funnel: ${p.typical_funnel_stage}`);
      }
      
      return lines.join('\n');
    };

    const primaryPersonas = personaList.filter((p: any) => p.is_primary);
    const otherPersonas = personaList.filter((p: any) => !p.is_primary);

    const personaContext = personaList.length > 0
      ? [
          ...(primaryPersonas.length > 0 ? ['--- PERSONA CHÍNH ---'] : []),
          ...primaryPersonas.map((p: any) => buildPersonaDetail(p, true)),
          ...(otherPersonas.length > 0 ? ['\n--- PERSONA PHỤ ---'] : []),
          ...otherPersonas.map((p: any) => buildPersonaDetail(p, false)),
        ].join('\n\n')
      : null;

    // Build channels context
    const channelsContext = selected_channels?.length > 0
      ? selected_channels.join(', ')
      : 'Facebook, Instagram, Website';
    
    // Extract key product insights for system prompt
    const allUSPs = productList.flatMap((p: any) => p.unique_selling_points || []).filter(Boolean);
    const allBenefits = productList.flatMap((p: any) => p.benefits || []).filter(Boolean);
    const allPainPoints = productList.flatMap((p: any) => p.pain_points_solved || []).filter(Boolean);
    const featuredProductNames = featuredProducts.map((p: any) => p.name);
    const allContentAngles = productList.flatMap((p: any) => p.suggested_content_angles || []).filter(Boolean);

    // Build product highlight summary for system prompt
    const productHighlightSummary = productList.length > 0 ? `
THÔNG TIN SẢN PHẨM CẦN TÍCH HỢP:
${featuredProductNames.length > 0 ? `• Sản phẩm chủ lực: ${featuredProductNames.join(', ')}` : ''}
${allUSPs.length > 0 ? `• USP chính: ${[...new Set(allUSPs)].slice(0, 5).join('; ')}` : ''}
${allBenefits.length > 0 ? `• Lợi ích: ${[...new Set(allBenefits)].slice(0, 5).join('; ')}` : ''}
${allPainPoints.length > 0 ? `• Vấn đề giải quyết: ${[...new Set(allPainPoints)].slice(0, 5).join('; ')}` : ''}
${allContentAngles.length > 0 ? `• Góc content gợi ý: ${[...new Set(allContentAngles)].slice(0, 5).join('; ')}` : ''}
` : '';

    // Build persona summary for system prompt
    const primaryPersona = personaList.find((p: any) => p.is_primary) || personaList[0];
    const personaSummary = primaryPersona ? `
KHÁCH HÀNG MỤC TIÊU CHÍNH:
• Persona: ${primaryPersona.name}
${primaryPersona.pain_points?.length ? `• Pain points: ${primaryPersona.pain_points.slice(0, 3).join('; ')}` : ''}
${primaryPersona.desires?.length ? `• Mong muốn: ${primaryPersona.desires.slice(0, 3).join('; ')}` : ''}
${primaryPersona.objections?.length ? `• Rào cản: ${primaryPersona.objections.slice(0, 2).join('; ')}` : ''}
${primaryPersona.buying_triggers?.length ? `• Trigger mua: ${primaryPersona.buying_triggers.slice(0, 2).join('; ')}` : ''}
` : '';

    // Enhanced system prompt with product integration instructions
    const systemPrompt = `BẠN LÀ CHUYÊN GIA BRAND STRATEGIST VIỆT NAM với 15 năm kinh nghiệm xây dựng Brand Voice cho doanh nghiệp.

NHIỆM VỤ: Tạo Brand Writing Guideline STRUCTURED và ACTIONABLE bằng tiếng Việt.

QUY TẮC BẮT BUỘC:
1. KHÔNG dùng từ chung chung: "năng động", "sáng tạo", "hiệu quả", "chất lượng cao", "uy tín", "chuyên nghiệp" nếu không gắn với hành động cụ thể
2. Mỗi nguyên tắc phải là HÀNH ĐỘNG RÕ RÀNG mà copywriter/AI có thể làm theo ngay
3. Guideline phải phản ánh ĐẶC THÙ NGÀNH + SẢN PHẨM + ĐỐI TƯỢNG KHÁCH HÀNG cụ thể
4. Ưu tiên các quy tắc thực tế về: Cách xưng hô, Cấu trúc câu, CTA, Từ ngữ nên/cấm dùng, Emoji/hashtag

QUAN TRỌNG - TÍCH HỢP SẢN PHẨM VÀO GUIDELINE:
1. Guideline PHẢI phản ánh đặc thù của sản phẩm/dịch vụ (USP, benefits, pain points)
2. Ví dụ content (examples) PHẢI đề cập đến sản phẩm cụ thể của brand, KHÔNG được dùng ví dụ chung chung
3. CTA templates PHẢI liên quan đến hành động mua/dùng thử sản phẩm thực tế
4. Nếu có sản phẩm ⭐ CHỦ LỰC, ưu tiên tạo ví dụ về sản phẩm này
5. Các nguyên tắc DOS phải hướng dẫn cách highlight USP và benefits trong content
6. Phải có hướng dẫn cách address pain points của khách hàng thông qua sản phẩm
${productHighlightSummary}${personaSummary}
CÁCH VIẾT GUIDELINE TỐT:
- ❌ "Viết content chuyên nghiệp" → ✅ "Mở đầu bằng số liệu/fact cụ thể, không dùng câu cảm thán"
- ❌ "Thể hiện sự uy tín" → ✅ "Đề cập năm kinh nghiệm/số lượng khách hàng trong mỗi bài"
- ❌ "Tạo sự gần gũi" → ✅ "Xưng 'mình/bạn', thêm câu hỏi tương tác cuối bài"
- ❌ "Giới thiệu sản phẩm" → ✅ "Mở đầu bằng pain point, giải pháp bằng USP cụ thể, kết bằng CTA rõ ràng"

OUTPUT STRUCTURE:
- core_principle: Nguyên tắc cốt lõi liên quan đến SẢN PHẨM và GIÁ TRỊ mang lại
- writing_style: Mô tả cách viết tổng quan (tone, sentence length, vocabulary level)
- dos: 4-6 điều NÊN làm cụ thể, trong đó ít nhất 2 điều về cách highlight sản phẩm
- donts: 3-5 điều KHÔNG NÊN làm
- examples: Ví dụ tốt và xấu ĐỀ CẬP SẢN PHẨM CỤ THỂ
- cta_templates: 2-3 mẫu CTA phù hợp với SẢN PHẨM CỤ THỂ
- product_messaging: Hướng dẫn cách nhắc đến sản phẩm trong content`;

    // Enhanced user prompt with more context
    const userPrompt = `TẠO BRAND WRITING GUIDELINE CHO:

═══ THÔNG TIN THƯƠNG HIỆU ═══
• Tên: ${brand_name}
• Ngành: ${(industry || []).join(', ') || 'Chưa xác định'}
• Đối tượng: ${targetAudience === 'B2B' ? 'Doanh nghiệp (B2B)' : targetAudience === 'B2C' ? 'Người tiêu dùng (B2C)' : 'Cả B2B và B2C'}
• Định vị: ${brand_positioning || 'Chưa xác định'}

═══ BRAND VOICE HIỆN TẠI ═══
• Tone of Voice: ${(tone_of_voice || []).join(', ') || 'Chưa xác định'}
• Mức độ trang trọng: ${formality_level === 'formal' ? 'Trang trọng' : formality_level === 'semi_formal' ? 'Bán trang trọng' : formality_level === 'casual' ? 'Thân mật' : formality_level === 'friendly' ? 'Gần gũi' : 'Chưa xác định'}
• Phong cách ngôn ngữ: ${(language_style || []).join(', ') || 'Chưa xác định'}
• Từ nên dùng: ${(preferred_words || []).slice(0, 10).join(', ') || 'Chưa có'}
• Từ cấm: ${(forbidden_words || []).slice(0, 10).join(', ') || 'Chưa có'}

═══ SẢN PHẨM/DỊCH VỤ (QUAN TRỌNG - PHẢI TÍCH HỢP VÀO GUIDELINE) ═══
${productContext}

⚠️ LƯU Ý: Guideline PHẢI giúp viết content HIGHLIGHT các USP và benefits ở trên. Ví dụ content PHẢI đề cập đến sản phẩm cụ thể, KHÔNG được dùng ví dụ chung chung!

═══ KHÁCH HÀNG MỤC TIÊU ═══
${personaContext || `Đối tượng ${targetAudience === 'B2B' ? 'doanh nghiệp cần giải pháp chuyên nghiệp' : 'người tiêu dùng cần sản phẩm/dịch vụ phù hợp nhu cầu cá nhân'}`}

═══ KÊNH TRUYỀN THÔNG CHÍNH ═══
${channelsContext}

═══ VISUAL IDENTITY ═══
• Màu chủ đạo: ${primary_color || 'Chưa có'} ${colorToneSuggestion ? `→ Gợi ý tone: ${colorToneSuggestion}` : ''}
• Có logo: ${has_logo ? 'Có (cần hướng dẫn đặt logo)' : 'Không'}

═══ YÊU CẦU ═══
Tạo guideline CHI TIẾT với:
1. core_principle: Nguyên tắc cốt lõi GẮN VỚI SẢN PHẨM/GIÁ TRỊ mang lại
2. writing_style: Mô tả phong cách viết phù hợp với ngành và đối tượng
3. dos: 4-6 nguyên tắc NÊN làm (ít nhất 2 điều về cách highlight sản phẩm)
4. donts: 3-5 điều KHÔNG NÊN làm (với lý do)
5. examples: 1 ví dụ tốt + 1 ví dụ xấu ĐỀ CẬP SẢN PHẨM CỤ THỂ
6. cta_templates: 2-3 mẫu CTA phù hợp VỚI SẢN PHẨM
7. product_messaging: Hướng dẫn cách nhắc sản phẩm tự nhiên trong content`;

    console.log('Calling Lovable AI for enhanced brand guideline generation...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_brand_guideline',
            description: 'Tạo Brand Writing Guideline có cấu trúc với dos/donts và ví dụ',
            parameters: {
              type: 'object',
              properties: {
                core_principle: {
                  type: 'string',
                  description: 'Nguyên tắc cốt lõi 1-2 câu định hướng toàn bộ content (VD: "Trở thành người bạn đồng hành đáng tin cậy trong hành trình...")'
                },
                writing_style: {
                  type: 'object',
                  description: 'Phong cách viết tổng quan',
                  properties: {
                    tone: { type: 'string', description: 'Mô tả tone voice chính (VD: "Thân thiện như nói chuyện với bạn bè, không lên lớp")' },
                    sentence_structure: { type: 'string', description: 'Cấu trúc câu (VD: "Ngắn gọn, tối đa 20 từ/câu, ưu tiên câu chủ động")' },
                    vocabulary_level: { type: 'string', description: 'Cấp độ từ vựng (VD: "Đơn giản, tránh thuật ngữ chuyên môn trừ khi cần thiết")' },
                    addressing: { type: 'string', description: 'Cách xưng hô (VD: "Xưng mình/bạn với B2C, tôi/quý vị với B2B")' }
                  },
                  required: ['tone', 'sentence_structure', 'vocabulary_level', 'addressing'],
                  additionalProperties: false
                },
                dos: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '4-6 điều NÊN làm cụ thể (VD: "Mở đầu bằng số liệu hoặc câu hỏi kích thích tò mò")'
                },
                donts: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '3-5 điều KHÔNG NÊN làm với lý do (VD: "Không dùng từ \'giá rẻ\' - thay bằng \'tiết kiệm\' hoặc \'hợp lý\'")'
                },
                examples: {
                  type: 'object',
                  description: 'Ví dụ đối chiếu - PHẢI đề cập đến sản phẩm cụ thể của brand',
                  properties: {
                    good: { type: 'string', description: '1 đoạn content mẫu ĐÚNG theo guideline, ĐỀ CẬP SẢN PHẨM CỤ THỂ (50-100 từ)' },
                    bad: { type: 'string', description: '1 đoạn content mẫu SAI để đối chiếu (50-100 từ)' },
                    good_explanation: { type: 'string', description: 'Giải thích ngắn gọn tại sao ví dụ tốt' },
                    bad_explanation: { type: 'string', description: 'Giải thích ngắn gọn tại sao ví dụ xấu' }
                  },
                  required: ['good', 'bad', 'good_explanation', 'bad_explanation'],
                  additionalProperties: false
                },
                cta_templates: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '2-3 mẫu CTA phù hợp với SẢN PHẨM CỤ THỂ (VD: "Đặt lịch tư vấn [tên sản phẩm] miễn phí", "Nhận báo giá [dịch vụ] trong 5 phút")'
                },
                product_messaging: {
                  type: 'object',
                  description: 'Hướng dẫn cách nhắc đến sản phẩm trong content',
                  properties: {
                    key_benefits_to_highlight: { 
                      type: 'array', 
                      items: { type: 'string' }, 
                      description: '3-5 lợi ích/USP cần nhấn mạnh trong mọi content'
                    },
                    product_mention_rules: { 
                      type: 'string',
                      description: 'Cách đề cập sản phẩm tự nhiên (VD: "Đề cập USP trong 50 từ đầu, không hard-sell")'
                    },
                    pain_point_addressing: {
                      type: 'string',
                      description: 'Cách address pain points của khách hàng (VD: "Mở đầu bằng pain point, giải pháp ở giữa, CTA cuối")'
                    },
                    benefit_framing: {
                      type: 'string',
                      description: 'Cách frame lợi ích (VD: "Nói về kết quả khách hàng đạt được, không nói về tính năng")'
                    },
                    featured_product_priority: {
                      type: 'string',
                      description: 'Cách ưu tiên sản phẩm chủ lực trong content'
                    }
                  },
                  required: ['key_benefits_to_highlight', 'product_mention_rules', 'pain_point_addressing'],
                  additionalProperties: false
                },
                emoji_guide: {
                  type: 'object',
                  description: 'Hướng dẫn sử dụng emoji (nếu allow_emoji)',
                  properties: {
                    recommended: { type: 'array', items: { type: 'string' }, description: 'Emoji nên dùng (3-5 emoji)' },
                    max_per_post: { type: 'number', description: 'Số emoji tối đa mỗi post' },
                    placement: { type: 'string', description: 'Vị trí đặt emoji (VD: "Đầu tiêu đề, cuối CTA")' }
                  },
                  required: ['recommended', 'max_per_post', 'placement'],
                  additionalProperties: false
                },
                hashtag_strategy: {
                  type: 'object',
                  description: 'Chiến lược hashtag',
                  properties: {
                    brand_hashtags: { type: 'array', items: { type: 'string' }, description: 'Hashtag thương hiệu gợi ý' },
                    content_hashtags: { type: 'array', items: { type: 'string' }, description: 'Hashtag nội dung phổ biến' },
                    max_hashtags: { type: 'number', description: 'Số hashtag tối đa' }
                  },
                  required: ['brand_hashtags', 'content_hashtags', 'max_hashtags'],
                  additionalProperties: false
                },
                suggested_brand_positioning: {
                  type: 'string',
                  enum: ['business', 'expert', 'community', 'personal'],
                  description: 'Gợi ý định vị thương hiệu'
                },
                suggested_formality_level: {
                  type: 'string',
                  enum: ['formal', 'semi_formal', 'casual', 'friendly'],
                  description: 'Gợi ý mức độ trang trọng'
                }
              },
              required: ['core_principle', 'writing_style', 'dos', 'donts', 'examples', 'cta_templates', 'product_messaging', 'suggested_brand_positioning', 'suggested_formality_level'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_brand_guideline' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Đã vượt giới hạn request, vui lòng thử lại sau.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Vui lòng nạp thêm credits để tiếp tục sử dụng AI.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      console.log('Enhanced brand guideline generated successfully');
      
      // Build legacy guideline text from structured data for backward compatibility
      const legacyGuideline = [
        result.core_principle,
        result.writing_style?.tone ? `Tone: ${result.writing_style.tone}` : '',
        result.writing_style?.addressing ? `Xưng hô: ${result.writing_style.addressing}` : '',
        ...(result.dos?.slice(0, 3).map((d: string) => `• ${d}`) || []),
      ].filter(Boolean).join('. ');
      
      return new Response(
        JSON.stringify({
          // Legacy fields for backward compatibility
          guideline: legacyGuideline,
          example_good: result.examples?.good || '',
          example_bad: result.examples?.bad || '',
          key_principles: result.dos?.slice(0, 5) || [],
          suggested_brand_positioning: result.suggested_brand_positioning,
          suggested_formality_level: result.suggested_formality_level,
          target_audience: targetAudience,
          color_tone_suggestion: colorToneSuggestion,
          
          // New structured fields
          structured_guideline: {
            core_principle: result.core_principle,
            writing_style: result.writing_style,
            dos: result.dos,
            donts: result.donts,
            examples: result.examples,
            cta_templates: result.cta_templates,
            product_messaging: result.product_messaging,
            emoji_guide: result.emoji_guide,
            hashtag_strategy: result.hashtag_strategy,
          },
          
          // Product integration metadata
          product_context: {
            featured_products: featuredProductNames,
            all_usps: [...new Set(allUSPs)].slice(0, 10),
            all_benefits: [...new Set(allBenefits)].slice(0, 10),
            all_pain_points: [...new Set(allPainPoints)].slice(0, 10),
            content_angles: [...new Set(allContentAngles)].slice(0, 10),
          },
          
          // Brand completeness metadata
          completeness: buildCompletenessMetadata(completeness),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback to content if no tool call
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      return new Response(
        JSON.stringify({
          guideline: content,
          example_good: '',
          example_bad: '',
          key_principles: [],
          suggested_brand_positioning: 'business',
          suggested_formality_level: 'semi_formal',
          target_audience: targetAudience,
          color_tone_suggestion: colorToneSuggestion,
          structured_guideline: null,
          completeness: buildCompletenessMetadata(completeness),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('No valid response from AI');

  } catch (error) {
    console.error('Error in generate-brand-guideline:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Lỗi không xác định' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
