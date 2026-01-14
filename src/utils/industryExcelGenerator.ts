/**
 * Industry Import Excel Generator v2.2
 * Enhanced PRO with Risk Guidelines, Key Regulations, and Extended Personas
 * + Reference Sheet with dynamic data from database
 */

import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

// Reference data from database
interface ReferenceData {
  categories: Array<{ code: string; label: string }>;
  corePacks: Array<{ industry_code: string }>;
}

// Template data structure
interface TemplateColumn {
  name: string;
  required: boolean;
  example: string;
  description: string;
}

// All sheet definitions for a complete Industry Pack v2.2
const SHEETS: Record<string, { title: string; columns: TemplateColumn[] }> = {
  pack_info: {
    title: '1. Pack Info',
    columns: [
      { name: 'code', required: true, example: 'thuc_pham_thuc_uong', description: 'Mã ngành (lowercase, dấu _)' },
      { name: 'category_code', required: true, example: 'food_beverage', description: 'Mã danh mục' },
      { name: 'parent_pack_code', required: false, example: '', description: 'Mã ngành cha (cho sub-industry)' },
      { name: 'industry_level', required: false, example: 'core', description: 'core hoặc sub' },
      { name: 'sort_order', required: false, example: '1', description: 'Thứ tự hiển thị' },
      { name: 'target_audience', required: true, example: 'B2C', description: 'B2B, B2C hoặc both' },
      { name: 'tone_of_voice', required: false, example: 'Thân thiện, gần gũi', description: 'Giọng điệu thương hiệu' },
      { name: 'formality_level', required: false, example: 'semi_formal', description: 'formal, semi_formal, casual' },
      { name: 'language_style', required: false, example: 'Đời thường, dễ hiểu', description: 'Phong cách ngôn ngữ' },
      { name: 'cta_policy', required: false, example: 'Mạnh mẽ, rõ ràng', description: 'Chính sách CTA' },
      { name: 'allow_emoji', required: false, example: 'true', description: 'true hoặc false' },
      { name: 'emoji_policy', required: false, example: 'limited', description: 'none/limited/moderate/frequent' },
      { name: 'related_industries', required: false, example: 'health.fitness;health.medical', description: 'Ngành liên quan (dấu ;)' },
      { name: 'high_risk_keywords', required: false, example: 'cure;guaranteed;miracle', description: 'Từ khóa rủi ro cao (dấu ;)' },
      { name: 'weight_forbidden_term', required: false, example: '50', description: 'Điểm rủi ro forbidden term (default: 50)' },
      { name: 'weight_claim_restriction', required: false, example: '30', description: 'Điểm rủi ro claim (default: 30)' },
      { name: 'weight_forbidden_pattern', required: false, example: '20', description: 'Điểm rủi ro pattern (default: 20)' },
      { name: 'weight_high_risk_keyword', required: false, example: '15', description: 'Điểm rủi ro keyword (default: 15)' },
      { name: 'threshold_low', required: false, example: '0', description: 'Ngưỡng thấp (default: 0)' },
      { name: 'threshold_medium', required: false, example: '30', description: 'Ngưỡng TB (default: 30)' },
      { name: 'threshold_high', required: false, example: '60', description: 'Ngưỡng cao (default: 60)' },
      { name: 'threshold_blocked', required: false, example: '80', description: 'Ngưỡng chặn (default: 80)' },
    ],
  },
  translations: {
    title: '2. Translations',
    columns: [
      { name: 'language_code', required: true, example: 'vi', description: 'Mã ngôn ngữ (vi, en)' },
      { name: 'name', required: true, example: 'Thực phẩm & Đồ uống', description: 'Tên đầy đủ' },
      { name: 'short_name', required: false, example: 'F&B', description: 'Tên ngắn' },
      { name: 'preferred_words', required: false, example: 'tươi ngon, chất lượng', description: 'Từ ưu tiên (dấu ,)' },
      { name: 'forbidden_words', required: false, example: 'rẻ mạt, ế ẩm', description: 'Từ cấm (dấu ,)' },
      { name: 'glossary_keys', required: false, example: 'supplement;vitamin;dosage', description: 'Glossary keys (dấu ;)' },
      { name: 'glossary_values', required: false, example: 'thực phẩm bổ sung;vitamin;liều dùng', description: 'Glossary values (dấu ;)' },
    ],
  },
  forbidden_terms: {
    title: '3. Forbidden Terms',
    columns: [
      { name: 'term', required: true, example: 'tuyệt đối an toàn', description: 'Thuật ngữ cấm' },
      { name: 'reason', required: false, example: 'Vi phạm quảng cáo thực phẩm', description: 'Lý do' },
    ],
  },
  compliance_rules: {
    title: '4. Compliance Rules',
    columns: [
      { name: 'rule_id', required: true, example: 'food_ad_01', description: 'Mã quy tắc' },
      { name: 'rule_text', required: true, example: 'Không cam kết chữa bệnh', description: 'Nội dung quy tắc' },
      { name: 'category', required: false, example: 'advertising', description: 'Danh mục' },
      { name: 'severity', required: true, example: 'error', description: 'error, warning, info' },
    ],
  },
  claim_restrictions: {
    title: '5. Claim Restrictions',
    columns: [
      { name: 'forbidden_claim', required: true, example: 'Chữa khỏi 100%', description: 'Claim bị cấm' },
      { name: 'suggested_alternative', required: true, example: 'Hỗ trợ cải thiện', description: 'Gợi ý thay thế' },
      { name: 'severity', required: false, example: 'error', description: 'error, warning, info' },
    ],
  },
  argument_patterns: {
    title: '6. Argument Patterns',
    columns: [
      { name: 'type', required: true, example: 'valid', description: 'valid hoặc forbidden' },
      { name: 'pattern', required: true, example: 'Được chứng nhận bởi...', description: 'Mẫu lập luận' },
      { name: 'category', required: false, example: 'social_proof', description: 'Loại lập luận' },
    ],
  },
  system_rules: {
    title: '7. System Rules',
    columns: [
      { name: 'rule', required: true, example: 'Luôn đề cập nguồn gốc sản phẩm', description: 'Quy tắc hệ thống' },
      { name: 'priority', required: true, example: 'high', description: 'critical, high, medium, low' },
    ],
  },
  jurisdictions: {
    title: '8. Jurisdictions',
    columns: [
      { name: 'jurisdiction_code', required: true, example: 'VN', description: 'Mã quốc gia ISO (VN, US, SG...)' },
      { name: 'additional_forbidden_terms', required: false, example: 'số 1;tốt nhất', description: 'Từ cấm thêm (dấu ;)' },
      { name: 'modified_compliance_rules', required: false, example: '{"rule_id":"new_text"}', description: 'Quy tắc sửa đổi (JSON)' },
      { name: 'notes', required: false, example: 'Tuân thủ Luật ATTP 2010', description: 'Ghi chú' },
      { name: 'validity_status', required: false, example: 'current', description: 'current/superseded/pending' },
      { name: 'last_verified_date', required: false, example: '2024-01-15', description: 'Ngày xác minh (YYYY-MM-DD)' },
      { name: 'industry_trends', required: false, example: 'organic;personalized nutrition', description: 'Xu hướng ngành (dấu ;)' },
    ],
  },
  key_regulations: {
    title: '9. Key Regulations',
    columns: [
      { name: 'jurisdiction_code', required: true, example: 'VN', description: 'Mã quốc gia ISO' },
      { name: 'regulation_name', required: true, example: 'Nghị định 15/2018/NĐ-CP', description: 'Tên quy định' },
      { name: 'effective_date', required: true, example: '2018-02-02', description: 'Ngày hiệu lực (YYYY-MM-DD)' },
      { name: 'summary', required: false, example: 'Quy định về an toàn thực phẩm', description: 'Tóm tắt' },
      { name: 'source_url', required: false, example: 'https://...', description: 'URL nguồn' },
      { name: 'validity_status', required: false, example: 'current', description: 'current/superseded/pending' },
    ],
  },
  personas: {
    title: '10. Personas',
    columns: [
      { name: 'name', required: true, example: 'Người nội trợ', description: 'Tên persona' },
      { name: 'persona_type', required: false, example: 'primary', description: 'primary/secondary/tertiary' },
      { name: 'description', required: false, example: 'Phụ nữ nội trợ 30-45 tuổi', description: 'Mô tả' },
      { name: 'avatar_url', required: false, example: 'https://...', description: 'URL ảnh đại diện' },
      { name: 'age_range', required: false, example: '30-45', description: 'Độ tuổi' },
      { name: 'gender', required: false, example: 'female', description: 'male, female, all' },
      { name: 'income_level', required: false, example: 'medium', description: 'low, medium, high, very_high' },
      { name: 'education_level', required: false, example: 'bachelor', description: 'high_school, college, bachelor, master' },
      { name: 'occupation', required: false, example: 'Nội trợ', description: 'Nghề nghiệp' },
      { name: 'location_type', required: false, example: 'urban', description: 'urban, suburban, rural' },
      { name: 'family_status', required: false, example: 'married_with_kids', description: 'single, married, married_with_kids' },
      { name: 'lifestyle', required: false, example: 'Bận rộn, thực tế', description: 'Lối sống' },
      { name: 'tech_savviness', required: false, example: 'medium', description: 'low, medium, high' },
      { name: 'segment_size', required: false, example: '35', description: 'Kích thước phân khúc (0-100%)' },
      { name: 'priority_score', required: false, example: '8', description: 'Điểm ưu tiên (1-10)' },
      { name: 'price_sensitivity', required: false, example: 'medium', description: 'low, medium, high' },
      { name: 'purchase_frequency', required: false, example: 'weekly', description: 'daily, weekly, monthly, quarterly' },
      { name: 'pain_points', required: false, example: 'Thiếu thời gian;Lo lắng dinh dưỡng', description: 'Pain points (dấu ;)' },
      { name: 'goals', required: false, example: 'Gia đình khỏe mạnh', description: 'Mục tiêu (dấu ;)' },
      { name: 'objections', required: false, example: 'Giá cao;Chưa tin tưởng', description: 'Phản đối (dấu ;)' },
      { name: 'buying_motivation', required: false, example: 'An toàn cho gia đình', description: 'Động lực mua (dấu ;)' },
      { name: 'decision_factors', required: false, example: 'Giá;Chất lượng;Thương hiệu', description: 'Yếu tố quyết định (dấu ;)' },
      { name: 'preferred_channels', required: false, example: 'facebook;zalo;youtube', description: 'Kênh ưa thích (dấu ;)' },
      { name: 'communication_style', required: false, example: 'emotional', description: 'direct, emotional, analytical' },
      { name: 'response_tone_hints', required: false, example: 'empathetic;friendly', description: 'Gợi ý tone (dấu ;)' },
      { name: 'trigger_words', required: false, example: 'an toàn;tự nhiên;organic', description: 'Từ kích hoạt (dấu ;)' },
      { name: 'device_usage', required: false, example: '{"mobile":70,"desktop":20,"tablet":10}', description: 'JSON: % sử dụng thiết bị' },
      { name: 'content_preferences', required: false, example: '{"video":true,"blog":true}', description: 'JSON: loại nội dung ưa thích' },
      { name: 'journey_stages', required: false, example: '{"awareness":"...","decision":"..."}', description: 'JSON: hành trình khách hàng' },
      { name: 'country_variants', required: false, example: '{"VN":{"price_sensitivity":"high"}}', description: 'JSON: biến thể theo quốc gia' },
      { name: 'sort_order', required: false, example: '1', description: 'Thứ tự hiển thị' },
    ],
  },
};

/**
 * Create sheet data with headers, description row, and example row
 */
function createSheetData(columns: TemplateColumn[]): unknown[][] {
  const headers = columns.map(col => col.required ? `${col.name} *` : col.name);
  const descriptions = columns.map(col => col.description);
  const examples = columns.map(col => col.example);
  const emptyRow = columns.map(() => '');
  
  return [headers, descriptions, examples, emptyRow, emptyRow, emptyRow];
}

/**
 * Create instructions sheet v2.2
 */
function createInstructionsSheet(): unknown[][] {
  return [
    ['📋 HƯỚNG DẪN SỬ DỤNG TEMPLATE IMPORT INDUSTRY PACK v2.2'],
    [''],
    ['🎯 MỤC ĐÍCH'],
    ['Template này cho phép bạn import toàn bộ dữ liệu của MỘT Industry Pack vào hệ thống.'],
    [''],
    ['📑 CÁC SHEET TRONG FILE (10 sheets)'],
    ['1. Pack Info - Thông tin cơ bản + Risk Guidelines (bắt buộc)'],
    ['2. Translations - Bản dịch đa ngôn ngữ + Glossary'],
    ['3. Forbidden Terms - Thuật ngữ cấm sử dụng'],
    ['4. Compliance Rules - Quy tắc tuân thủ pháp luật'],
    ['5. Claim Restrictions - Giới hạn về claim quảng cáo'],
    ['6. Argument Patterns - Mẫu lập luận hợp lệ/cấm'],
    ['7. System Rules - Quy tắc hệ thống cho AI'],
    ['8. Jurisdictions - Hồ sơ theo quốc gia + Xu hướng ngành'],
    ['9. Key Regulations - Các quy định pháp lý quan trọng (MỚI v2.2)'],
    ['10. Personas - Chân dung khách hàng Enhanced PRO (MỚI v2.2)'],
    [''],
    ['⚠️ QUY TẮC QUAN TRỌNG'],
    ['• Dòng 1: Header (tên cột có * là bắt buộc)'],
    ['• Dòng 2: Mô tả cột (tham khảo, xóa trước khi import)'],
    ['• Dòng 3: Ví dụ mẫu (tham khảo, xóa hoặc thay đổi)'],
    ['• Dòng 4+: Dữ liệu thực tế của bạn'],
    [''],
    ['📝 ĐỊNH DẠNG DỮ LIỆU'],
    ['• Array fields: Dùng dấu ; để phân cách (VD: value1;value2;value3)'],
    ['• JSON fields: Nhập đúng format JSON (VD: {"key":"value"})'],
    ['• Date: YYYY-MM-DD (VD: 2024-01-15)'],
    ['• Language Code: ISO 639-1 (vi, en, zh, ja...)'],
    ['• Country Code: ISO 3166-1 (VN, US, SG, JP...)'],
    [''],
    ['🆕 TÍNH NĂNG MỚI v2.2'],
    ['• Risk Guidelines: Cấu hình đánh giá rủi ro nội dung trong Pack Info'],
    ['• Key Regulations: Quản lý quy định pháp lý theo quốc gia'],
    ['• Enhanced Personas: segment_size, priority_score, device_usage, journey_stages, country_variants'],
    ['• Glossary: Từ điển thuật ngữ trong Translations'],
    [''],
    ['✅ TRƯỚC KHI IMPORT'],
    ['1. Xóa dòng 2 (mô tả) ở tất cả các sheet'],
    ['2. Thay thế hoặc xóa dòng 3 (ví dụ)'],
    ['3. Điền dữ liệu thực tế từ dòng 3 trở đi'],
    ['4. Kiểm tra tất cả các trường bắt buộc (*) đã có giá trị'],
    ['5. Lưu file với định dạng .xlsx'],
    [''],
    ['📊 RISK GUIDELINES (trong Pack Info)'],
    ['• weight_*: Điểm số cho từng loại vi phạm'],
    ['• threshold_*: Ngưỡng để phân loại mức rủi ro (low/medium/high/blocked)'],
    ['• Mặc định: forbidden_term=50, claim=30, pattern=20, keyword=15'],
    ['• Ngưỡng mặc định: low=0, medium=30, high=60, blocked=80'],
  ];
}

// Enum values for reference
const ENUM_VALUES = {
  target_audience: ['B2B', 'B2C', 'both'],
  formality_level: ['formal', 'semi_formal', 'casual'],
  emoji_policy: ['none', 'limited', 'moderate', 'frequent'],
  industry_level: ['core', 'sub'],
  severity: ['error', 'warning', 'info'],
  priority: ['critical', 'high', 'medium', 'low'],
  validity_status: ['current', 'superseded', 'pending'],
  persona_type: ['primary', 'secondary', 'tertiary'],
  gender: ['male', 'female', 'all'],
  income_level: ['low', 'medium', 'high', 'very_high'],
  education_level: ['high_school', 'college', 'bachelor', 'master', 'phd'],
  location_type: ['urban', 'suburban', 'rural'],
  family_status: ['single', 'married', 'married_with_kids'],
  tech_savviness: ['low', 'medium', 'high'],
  price_sensitivity: ['low', 'medium', 'high'],
  purchase_frequency: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
  communication_style: ['direct', 'emotional', 'analytical'],
  argument_type: ['valid', 'forbidden'],
};

/**
 * Fetch reference data from database
 */
async function fetchReferenceData(): Promise<ReferenceData> {
  const [categoriesRes, corePacksRes] = await Promise.all([
    supabase
      .from('industry_categories')
      .select('code, label')
      .order('label'),
    supabase
      .from('industry_global_packs')
      .select('industry_code')
      .eq('industry_level', 'core')
      .order('industry_code'),
  ]);

  return {
    categories: (categoriesRes.data || []) as Array<{ code: string; label: string }>,
    corePacks: (corePacksRes.data || []) as Array<{ industry_code: string }>,
  };
}

/**
 * Create reference sheet with all valid values
 */
function createReferenceSheet(refData: ReferenceData): XLSX.WorkSheet {
  const data: unknown[][] = [
    ['📋 BẢNG THAM CHIẾU GIÁ TRỊ HỢP LỆ'],
    ['Sử dụng sheet này để tra cứu nhanh các giá trị hợp lệ khi nhập liệu'],
    [''],
    ['═══════════════════════════════════════════════════════════════'],
    ['📁 CATEGORY CODES (18 danh mục)'],
    ['═══════════════════════════════════════════════════════════════'],
    ['Code', 'Tên danh mục'],
  ];

  // Add categories
  refData.categories.forEach(cat => {
    data.push([cat.code, cat.label]);
  });

  data.push(['']);
  data.push(['═══════════════════════════════════════════════════════════════']);
  data.push(['🏭 PARENT_PACK_CODE (Core Industries - có thể làm ngành cha)']);
  data.push(['═══════════════════════════════════════════════════════════════']);
  data.push(['industry_code']);

  // Add core packs
  refData.corePacks.forEach(pack => {
    data.push([pack.industry_code]);
  });

  data.push(['']);
  data.push(['═══════════════════════════════════════════════════════════════']);
  data.push(['📝 ENUM VALUES (Giá trị hợp lệ cho các trường)']);
  data.push(['═══════════════════════════════════════════════════════════════']);
  data.push(['Trường', 'Giá trị hợp lệ']);

  // Add enum values
  Object.entries(ENUM_VALUES).forEach(([key, values]) => {
    data.push([key, values.join(', ')]);
  });

  data.push(['']);
  data.push(['═══════════════════════════════════════════════════════════════']);
  data.push(['📅 ĐỊNH DẠNG ĐẶC BIỆT']);
  data.push(['═══════════════════════════════════════════════════════════════']);
  data.push(['Loại', 'Ví dụ', 'Mô tả']);
  data.push(['Date', '2024-01-15', 'Định dạng YYYY-MM-DD']);
  data.push(['Language Code', 'vi, en, zh, ja, ko', 'Mã ngôn ngữ ISO 639-1']);
  data.push(['Country Code', 'VN, US, SG, JP, KR', 'Mã quốc gia ISO 3166-1']);
  data.push(['Array', 'value1;value2;value3', 'Dùng dấu ; phân cách']);
  data.push(['JSON', '{"key":"value"}', 'Đúng cú pháp JSON']);

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet['!cols'] = [{ wch: 35 }, { wch: 50 }, { wch: 40 }];
  
  return worksheet;
}

/**
 * Generate and download the complete Excel template (ASYNC version with reference data)
 */
export async function downloadIndustryPackTemplateAsync(industryCode?: string): Promise<void> {
  // Fetch reference data from database
  const refData = await fetchReferenceData();
  
  const workbook = XLSX.utils.book_new();
  
  // 1. Add Reference sheet FIRST
  const refSheet = createReferenceSheet(refData);
  XLSX.utils.book_append_sheet(workbook, refSheet, '0. Reference');
  
  // 2. Add instructions sheet
  const instructionsData = createInstructionsSheet();
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
  instructionsSheet['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Hướng dẫn');
  
  // 3. Add each data sheet
  Object.entries(SHEETS).forEach(([key, sheet]) => {
    const data = createSheetData(sheet.columns);
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!cols'] = sheet.columns.map(col => ({
      wch: Math.max(col.name.length, col.example.length, col.description.length / 2, 15)
    }));
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.title);
  });
  
  const filename = industryCode 
    ? `industry_pack_${industryCode}_v2.2.xlsx`
    : `industry_pack_template_v2.2.xlsx`;
  
  XLSX.writeFile(workbook, filename);
}

/**
 * Sync version for backward compatibility (no reference data)
 * @deprecated Use downloadIndustryPackTemplateAsync instead
 */
export function downloadIndustryPackTemplate(industryCode?: string) {
  const workbook = XLSX.utils.book_new();
  
  // Add instructions sheet first
  const instructionsData = createInstructionsSheet();
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
  instructionsSheet['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Hướng dẫn');
  
  // Add each data sheet
  Object.entries(SHEETS).forEach(([key, sheet]) => {
    const data = createSheetData(sheet.columns);
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!cols'] = sheet.columns.map(col => ({
      wch: Math.max(col.name.length, col.example.length, col.description.length / 2, 15)
    }));
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.title);
  });
  
  const filename = industryCode 
    ? `industry_pack_${industryCode}_v2.2.xlsx`
    : `industry_pack_template_v2.2.xlsx`;
  
  XLSX.writeFile(workbook, filename);
}

/**
 * Get sheet info for UI display
 */
export function getSheetInfo() {
  return Object.entries(SHEETS).map(([key, sheet]) => ({
    key,
    title: sheet.title,
    columnCount: sheet.columns.length,
    requiredCount: sheet.columns.filter(c => c.required).length,
    columns: sheet.columns,
  }));
}

export { SHEETS };
