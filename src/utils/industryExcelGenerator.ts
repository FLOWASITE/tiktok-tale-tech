/**
 * Industry Import Excel Generator
 * Generates a single Excel file with multiple sheets for complete Industry Pack import
 */

import * as XLSX from 'xlsx';

// Template data structure
interface TemplateColumn {
  name: string;
  required: boolean;
  example: string;
  description: string;
}

// All sheet definitions for a complete Industry Pack
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
    ],
  },
  translations: {
    title: '2. Translations',
    columns: [
      { name: 'language_code', required: true, example: 'vi', description: 'Mã ngôn ngữ (vi, en)' },
      { name: 'name', required: true, example: 'Thực phẩm & Đồ uống', description: 'Tên đầy đủ' },
      { name: 'short_name', required: false, example: 'F&B', description: 'Tên ngắn' },
      { name: 'preferred_words', required: false, example: 'tươi ngon, chất lượng, dinh dưỡng', description: 'Từ ưu tiên (phẩy cách)' },
      { name: 'forbidden_words', required: false, example: 'rẻ mạt, ế ẩm', description: 'Từ cấm (phẩy cách)' },
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
      { name: 'jurisdiction_code', required: true, example: 'VN', description: 'Mã quốc gia (VN, US, SG...)' },
      { name: 'additional_forbidden_terms', required: false, example: 'số 1;tốt nhất', description: 'Từ cấm thêm (dấu ;)' },
      { name: 'modified_compliance_rules', required: false, example: '{"rule_id":"new_text"}', description: 'Quy tắc sửa đổi (JSON)' },
      { name: 'notes', required: false, example: 'Tuân thủ Luật ATTP 2010', description: 'Ghi chú' },
    ],
  },
  personas: {
    title: '9. Personas',
    columns: [
      { name: 'name', required: true, example: 'Người nội trợ', description: 'Tên persona' },
      { name: 'description', required: false, example: 'Phụ nữ nội trợ 30-45 tuổi', description: 'Mô tả' },
      { name: 'age_range', required: false, example: '30-45', description: 'Độ tuổi' },
      { name: 'gender', required: false, example: 'female', description: 'male, female, all' },
      { name: 'income_level', required: false, example: 'medium', description: 'low, medium, high, very_high' },
      { name: 'education_level', required: false, example: 'bachelor', description: 'high_school, college, bachelor, master, doctorate' },
      { name: 'occupation', required: false, example: 'Nội trợ', description: 'Nghề nghiệp' },
      { name: 'location_type', required: false, example: 'urban', description: 'urban, suburban, rural' },
      { name: 'family_status', required: false, example: 'married_with_kids', description: 'single, married_no_kids, married_with_kids, empty_nest' },
      { name: 'pain_points', required: false, example: 'Thiếu thời gian;Lo lắng dinh dưỡng', description: 'Pain points (dấu ;)' },
      { name: 'goals', required: false, example: 'Gia đình khỏe mạnh;Tiết kiệm thời gian', description: 'Mục tiêu (dấu ;)' },
      { name: 'objections', required: false, example: 'Giá cao;Chưa tin tưởng thương hiệu mới', description: 'Phản đối (dấu ;)' },
      { name: 'values', required: false, example: 'Sức khỏe gia đình;Chất lượng', description: 'Giá trị (dấu ;)' },
      { name: 'interests', required: false, example: 'Nấu ăn;Dinh dưỡng;Mẹo vặt', description: 'Sở thích (dấu ;)' },
      { name: 'buying_motivation', required: false, example: 'An toàn cho gia đình;Tiện lợi', description: 'Động lực mua (dấu ;)' },
      { name: 'preferred_channels', required: false, example: 'facebook;zalo;youtube', description: 'Kênh ưa thích (dấu ;)' },
      { name: 'communication_style', required: false, example: 'emotional', description: 'direct, emotional, analytical, consultative, storytelling' },
      { name: 'response_tone_hints', required: false, example: 'empathetic;friendly;reassuring', description: 'Gợi ý tone (dấu ;)' },
      { name: 'sort_order', required: false, example: '1', description: 'Thứ tự hiển thị' },
    ],
  },
};

/**
 * Create sheet data with headers, description row, and example row
 */
function createSheetData(columns: TemplateColumn[]): unknown[][] {
  // Row 1: Headers
  const headers = columns.map(col => col.required ? `${col.name} *` : col.name);
  
  // Row 2: Description (for reference)
  const descriptions = columns.map(col => col.description);
  
  // Row 3: Example data
  const examples = columns.map(col => col.example);
  
  // Row 4+: Empty rows for user data
  const emptyRow = columns.map(() => '');
  
  return [
    headers,
    descriptions,
    examples,
    emptyRow,
    emptyRow,
    emptyRow,
  ];
}

/**
 * Create instructions sheet
 */
function createInstructionsSheet(): unknown[][] {
  return [
    ['📋 HƯỚNG DẪN SỬ DỤNG TEMPLATE IMPORT INDUSTRY PACK'],
    [''],
    ['🎯 MỤC ĐÍCH'],
    ['Template này cho phép bạn import toàn bộ dữ liệu của MỘT Industry Pack vào hệ thống.'],
    ['Tất cả các sheet trong file này liên quan đến CÙNG MỘT industry code.'],
    [''],
    ['📑 CÁC SHEET TRONG FILE'],
    ['1. Pack Info - Thông tin cơ bản của ngành (bắt buộc)'],
    ['2. Translations - Bản dịch đa ngôn ngữ'],
    ['3. Forbidden Terms - Thuật ngữ cấm sử dụng'],
    ['4. Compliance Rules - Quy tắc tuân thủ pháp luật'],
    ['5. Claim Restrictions - Giới hạn về claim quảng cáo'],
    ['6. Argument Patterns - Mẫu lập luận hợp lệ/cấm'],
    ['7. System Rules - Quy tắc hệ thống cho AI'],
    ['8. Jurisdictions - Hồ sơ theo quốc gia/vùng lãnh thổ'],
    ['9. Personas - Chân dung khách hàng mục tiêu'],
    [''],
    ['⚠️ QUY TẮC QUAN TRỌNG'],
    ['• Dòng 1: Header (tên cột có * là bắt buộc)'],
    ['• Dòng 2: Mô tả cột (tham khảo, xóa trước khi import)'],
    ['• Dòng 3: Ví dụ mẫu (tham khảo, xóa hoặc thay đổi)'],
    ['• Dòng 4+: Dữ liệu thực tế của bạn'],
    [''],
    ['• Các trường array sử dụng dấu ; để phân cách'],
    ['  Ví dụ: "value1;value2;value3"'],
    [''],
    ['• Sheet "Pack Info" chỉ cần 1 dòng dữ liệu'],
    ['• Các sheet khác có thể có nhiều dòng'],
    [''],
    ['✅ TRƯỚC KHI IMPORT'],
    ['1. Xóa dòng 2 (mô tả) ở tất cả các sheet'],
    ['2. Thay thế hoặc xóa dòng 3 (ví dụ)'],
    ['3. Điền dữ liệu thực tế từ dòng 3 trở đi'],
    ['4. Kiểm tra tất cả các trường bắt buộc (*) đã có giá trị'],
    ['5. Lưu file với định dạng .xlsx'],
  ];
}

/**
 * Generate and download the complete Excel template
 */
export function downloadIndustryPackTemplate(industryCode?: string) {
  const workbook = XLSX.utils.book_new();
  
  // Add instructions sheet first
  const instructionsData = createInstructionsSheet();
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
  
  // Set column width for instructions
  instructionsSheet['!cols'] = [{ wch: 80 }];
  
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Hướng dẫn');
  
  // Add each data sheet
  Object.entries(SHEETS).forEach(([key, sheet]) => {
    const data = createSheetData(sheet.columns);
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths based on content
    worksheet['!cols'] = sheet.columns.map(col => ({
      wch: Math.max(col.name.length, col.example.length, col.description.length / 2, 15)
    }));
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.title);
  });
  
  // Generate filename
  const filename = industryCode 
    ? `industry_pack_${industryCode}.xlsx`
    : `industry_pack_template.xlsx`;
  
  // Download
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
