/**
 * Industry Import Template Generator
 * Generates downloadable CSV templates for Industry Park v2 import
 */

// Template data structure
interface TemplateColumn {
  name: string;
  required: boolean;
  example: string;
  description: string;
}

// All template definitions
const TEMPLATES: Record<string, { title: string; columns: TemplateColumn[] }> = {
  global_pack_info: {
    title: '1. Global Pack Info',
    columns: [
      { name: 'code', required: true, example: 'thuc_pham_thuc_uong', description: 'Mã ngành (lowercase, dấu _)' },
      { name: 'category_code', required: true, example: 'food_beverage', description: 'Mã danh mục' },
      { name: 'parent_pack_code', required: false, example: 'thuc_pham_thuc_uong', description: 'Mã ngành cha (cho sub-industry)' },
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
      { name: 'code', required: true, example: 'thuc_pham_thuc_uong', description: 'Mã ngành' },
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
      { name: 'code', required: true, example: 'thuc_pham_thuc_uong', description: 'Mã ngành' },
      { name: 'term', required: true, example: 'tuyệt đối an toàn', description: 'Thuật ngữ cấm' },
      { name: 'reason', required: false, example: 'Vi phạm quảng cáo thực phẩm', description: 'Lý do' },
    ],
  },
  compliance_rules: {
    title: '4. Compliance Rules',
    columns: [
      { name: 'code', required: true, example: 'thuc_pham_thuc_uong', description: 'Mã ngành' },
      { name: 'rule_id', required: true, example: 'food_ad_01', description: 'Mã quy tắc' },
      { name: 'rule_text', required: true, example: 'Không cam kết chữa bệnh', description: 'Nội dung quy tắc' },
      { name: 'category', required: false, example: 'advertising', description: 'Danh mục' },
      { name: 'severity', required: true, example: 'error', description: 'error, warning, info' },
    ],
  },
  claim_restrictions: {
    title: '5. Claim Restrictions',
    columns: [
      { name: 'code', required: true, example: 'thuc_pham_thuc_uong', description: 'Mã ngành' },
      { name: 'forbidden_claim', required: true, example: 'Chữa khỏi 100%', description: 'Claim bị cấm' },
      { name: 'suggested_alternative', required: true, example: 'Hỗ trợ cải thiện', description: 'Gợi ý thay thế' },
      { name: 'severity', required: false, example: 'error', description: 'error, warning, info' },
    ],
  },
  argument_patterns: {
    title: '6. Argument Patterns',
    columns: [
      { name: 'code', required: true, example: 'thuc_pham_thuc_uong', description: 'Mã ngành' },
      { name: 'type', required: true, example: 'valid', description: 'valid hoặc forbidden' },
      { name: 'pattern', required: true, example: 'Được chứng nhận bởi...', description: 'Mẫu lập luận' },
      { name: 'category', required: false, example: 'social_proof', description: 'Loại lập luận' },
    ],
  },
  system_rules: {
    title: '7. System Rules',
    columns: [
      { name: 'code', required: true, example: 'thuc_pham_thuc_uong', description: 'Mã ngành' },
      { name: 'rule', required: true, example: 'Luôn đề cập nguồn gốc sản phẩm', description: 'Quy tắc hệ thống' },
      { name: 'priority', required: true, example: 'high', description: 'critical, high, medium, low' },
    ],
  },
  jurisdiction_profiles: {
    title: '8. Jurisdiction Profiles',
    columns: [
      { name: 'code', required: true, example: 'thuc_pham_thuc_uong', description: 'Mã ngành' },
      { name: 'jurisdiction_code', required: true, example: 'VN', description: 'Mã quốc gia (VN, US, SG...)' },
      { name: 'additional_forbidden_terms', required: false, example: 'số 1, tốt nhất', description: 'Từ cấm thêm (phẩy cách)' },
      { name: 'modified_compliance_rules', required: false, example: '{"rule_id":"new_text"}', description: 'Quy tắc sửa đổi (JSON)' },
      { name: 'notes', required: false, example: 'Tuân thủ Luật ATTP 2010', description: 'Ghi chú' },
    ],
  },
  personas: {
    title: '9. Industry Personas',
    columns: [
      { name: 'code', required: true, example: 'thuc_pham_thuc_uong', description: 'Mã ngành (global_pack_id)' },
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
 * Generate CSV content for a template
 */
function generateCSVContent(templateKey: string): string {
  const template = TEMPLATES[templateKey];
  if (!template) return '';

  // Header row
  const headers = template.columns.map(col => col.name).join(',');
  
  // Example row
  const examples = template.columns.map(col => {
    // Escape commas in example values
    if (col.example.includes(',') || col.example.includes('"')) {
      return `"${col.example.replace(/"/g, '""')}"`;
    }
    return col.example;
  }).join(',');

  return `${headers}\n${examples}`;
}

/**
 * Generate README content explaining all templates
 */
function generateREADME(): string {
  let content = `# Industry Import Templates - Hướng dẫn sử dụng

## Tổng quan
Bộ template này cho phép bạn import tất cả thành phần của Industry Park v2.1 bao gồm:
- Global Pack Info (thông tin ngành)
- Translations (bản dịch)
- Forbidden Terms (thuật ngữ cấm)
- Compliance Rules (quy tắc tuân thủ)
- Claim Restrictions (giới hạn claim)
- Argument Patterns (mẫu lập luận)
- System Rules (quy tắc hệ thống)
- Jurisdiction Profiles (hồ sơ tài phán)
- Industry Personas (chân dung khách hàng ngành)

## Quy tắc chung
1. File phải ở định dạng CSV (UTF-8)
2. Tên file phải chứa keyword để hệ thống nhận diện (VD: global_pack_info.csv)
3. Các trường array dùng dấu ; để phân cách (VD: "value1;value2;value3")
4. Các trường required (*) bắt buộc phải có giá trị

---

`;

  Object.entries(TEMPLATES).forEach(([key, template]) => {
    content += `## ${template.title}\n`;
    content += `**File name:** ${key}.csv\n\n`;
    content += `| Cột | Bắt buộc | Ví dụ | Mô tả |\n`;
    content += `|-----|----------|-------|-------|\n`;
    
    template.columns.forEach(col => {
      const required = col.required ? '✅' : '';
      const example = col.example.replace(/\|/g, '\\|');
      content += `| ${col.name} | ${required} | ${example} | ${col.description} |\n`;
    });
    
    content += '\n---\n\n';
  });

  return content;
}

/**
 * Download a single CSV template
 */
export function downloadTemplate(templateKey: string) {
  const content = generateCSVContent(templateKey);
  if (!content) return;

  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${templateKey}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download all templates as a ZIP (using individual downloads for now)
 */
export function downloadAllTemplates() {
  Object.keys(TEMPLATES).forEach((key, index) => {
    setTimeout(() => {
      downloadTemplate(key);
    }, index * 300); // Stagger downloads to prevent browser blocking
  });
}

/**
 * Download README file
 */
export function downloadREADME() {
  const content = generateREADME();
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'INDUSTRY_IMPORT_README.md';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get template info for UI display
 */
export function getTemplateInfo() {
  return Object.entries(TEMPLATES).map(([key, template]) => ({
    key,
    title: template.title,
    columnCount: template.columns.length,
    requiredCount: template.columns.filter(c => c.required).length,
    columns: template.columns,
  }));
}

export { TEMPLATES };
