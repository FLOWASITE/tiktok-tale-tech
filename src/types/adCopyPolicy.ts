import { PolicyWarning } from './adCopy';

export interface PlatformPolicyRule {
  id: string;
  platform: string[];
  category: 'content' | 'format' | 'legal' | 'engagement';
  name: string;
  description: string;
  check: (text: string) => boolean;
  severity: 'error' | 'warning' | 'info';
  fixHint?: string;
}

export interface PolicyCheckResult {
  field: string;
  text: string;
  issues: PolicyIssue[];
  score: number; // 0-100
}

export interface PolicyIssue {
  ruleId: string;
  ruleName: string;
  category: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  fixHint?: string;
  aiSuggestion?: string;
}

export interface ComplianceReport {
  overallScore: number;
  fields: PolicyCheckResult[];
  criticalIssues: number;
  warnings: number;
  suggestions: number;
  platform: string;
  passedChecks: number;
  totalChecks: number;
}

// Platform-specific policy rules
export const PLATFORM_POLICY_RULES: PlatformPolicyRule[] = [
  // === Content Policy ===
  {
    id: 'no_misleading_claims',
    platform: ['meta_feed', 'meta_story', 'google_rsa', 'tiktok', 'zalo_oa', 'zalo_message', 'zalo_article', 'linkedin'],
    category: 'legal',
    name: 'Tuyên bố gây hiểu lầm',
    description: 'Không được dùng "100%", "đảm bảo", "cam kết" không có căn cứ',
    check: (text) => /100%|đảm bảo|cam kết|chắc chắn|tuyệt đối/i.test(text),
    severity: 'error',
    fixHint: 'Thay bằng các cụm từ mềm hơn như "hỗ trợ", "giúp", "có thể"',
  },
  {
    id: 'no_medical_claims',
    platform: ['meta_feed', 'meta_story', 'google_rsa', 'tiktok', 'zalo_oa', 'zalo_message', 'zalo_article', 'linkedin'],
    category: 'legal',
    name: 'Tuyên bố y tế',
    description: 'Không được tuyên bố chữa bệnh, điều trị',
    check: (text) => /chữa bệnh|điều trị|khỏi bệnh|trị dứt điểm|đặc trị/i.test(text),
    severity: 'error',
    fixHint: 'Thay bằng "hỗ trợ sức khỏe", "bổ sung dinh dưỡng"',
  },
  {
    id: 'no_weight_loss_claims',
    platform: ['meta_feed', 'meta_story', 'tiktok', 'zalo_oa', 'zalo_message'],
    category: 'legal',
    name: 'Tuyên bố giảm cân',
    description: 'Không được hứa giảm X kg trong Y ngày',
    check: (text) => /giảm \d+\s*(kg|cân|kí)/i.test(text),
    severity: 'error',
    fixHint: 'Mô tả lợi ích sức khỏe tổng quan thay vì con số cụ thể',
  },
  {
    id: 'no_income_claims',
    platform: ['meta_feed', 'meta_story', 'google_rsa', 'linkedin', 'zalo_oa', 'zalo_message'],
    category: 'legal',
    name: 'Tuyên bố thu nhập',
    description: 'Không được hứa kiếm X triệu/ngày',
    check: (text) => /kiếm \d+\s*(triệu|tr|k|nghìn|ngàn)|thu nhập \d+/i.test(text),
    severity: 'error',
    fixHint: 'Chia sẻ câu chuyện thành công thay vì hứa hẹn con số',
  },
  
  // === Format Policy ===
  {
    id: 'excessive_caps',
    platform: ['meta_feed', 'meta_story', 'google_rsa', 'tiktok', 'zalo_oa', 'zalo_message', 'zalo_article', 'linkedin'],
    category: 'format',
    name: 'Quá nhiều chữ hoa',
    description: 'Hơn 50% là chữ viết hoa',
    check: (text) => {
      const letters = text.match(/[a-zA-Z]/g) || [];
      const upper = text.match(/[A-Z]/g) || [];
      return letters.length > 0 && upper.length / letters.length > 0.5;
    },
    severity: 'warning',
    fixHint: 'Giảm chữ viết hoa, chỉ dùng cho tên riêng hoặc từ khóa quan trọng',
  },
  {
    id: 'excessive_punctuation',
    platform: ['meta_feed', 'meta_story', 'google_rsa', 'tiktok', 'zalo_oa', 'zalo_message', 'zalo_article', 'linkedin'],
    category: 'format',
    name: 'Dấu câu thừa',
    description: 'Quá nhiều !!! hoặc ???',
    check: (text) => /[!?]{3,}/.test(text),
    severity: 'warning',
    fixHint: 'Dùng tối đa 1-2 dấu câu liên tiếp',
  },
  {
    id: 'excessive_emoji',
    platform: ['linkedin', 'google_rsa'],
    category: 'format',
    name: 'Quá nhiều emoji',
    description: 'LinkedIn/Google ưa thích nội dung chuyên nghiệp',
    check: (text) => {
      const emojiCount = (text.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}]/gu) || []).length;
      return emojiCount > 3;
    },
    severity: 'info',
    fixHint: 'Giới hạn 1-2 emoji hoặc bỏ hoàn toàn',
  },
  
  // === Engagement Policy ===
  {
    id: 'weak_cta',
    platform: ['meta_feed', 'meta_story', 'tiktok', 'zalo_oa', 'zalo_message', 'zalo_article'],
    category: 'engagement',
    name: 'CTA yếu',
    description: 'Thiếu lời kêu gọi hành động rõ ràng',
    check: (text) => {
      const ctaPatterns = /mua ngay|đăng ký|tìm hiểu|xem thêm|liên hệ|click|nhấn|bấm|đặt hàng|tham gia|inbox|nhắn tin/i;
      return !ctaPatterns.test(text);
    },
    severity: 'info',
    fixHint: 'Thêm CTA rõ ràng như "Đăng ký ngay", "Tìm hiểu thêm"',
  },
  {
    id: 'clickbait',
    platform: ['meta_feed', 'meta_story', 'tiktok', 'linkedin', 'zalo_article'],
    category: 'content',
    name: 'Clickbait',
    description: 'Nội dung câu view có thể bị hạn chế reach',
    check: (text) => /bạn sẽ không tin|shock|gây sốc|bí mật|tiết lộ|mẹo hay|không ai biết/i.test(text),
    severity: 'warning',
    fixHint: 'Dùng tiêu đề mô tả giá trị thực tế của sản phẩm/dịch vụ',
  },
  {
    id: 'urgency_overuse',
    platform: ['meta_feed', 'google_rsa', 'tiktok', 'zalo_oa', 'zalo_message'],
    category: 'content',
    name: 'Lạm dụng urgency',
    description: 'Quá nhiều cụm từ tạo khẩn cấp giả',
    check: (text) => {
      const urgencyPatterns = /chỉ còn|nhanh lên|số lượng có hạn|hết hàng|cuối cùng|khẩn cấp|gấp|ngay bây giờ/gi;
      const matches = text.match(urgencyPatterns) || [];
      return matches.length >= 2;
    },
    severity: 'info',
    fixHint: 'Giới hạn 1 cụm từ urgency, tập trung vào giá trị',
  },
  
  // === Platform-Specific ===
  {
    id: 'google_trademark',
    platform: ['google_rsa'],
    category: 'legal',
    name: 'Nhãn hiệu trong quảng cáo Google',
    description: 'Cẩn thận khi dùng tên thương hiệu khác',
    check: (text) => /iphone|samsung|facebook|google|microsoft|apple/i.test(text),
    severity: 'warning',
    fixHint: 'Xác minh bạn có quyền sử dụng nhãn hiệu này',
  },
  {
    id: 'linkedin_hashtag_overuse',
    platform: ['linkedin'],
    category: 'format',
    name: 'Quá nhiều hashtag LinkedIn',
    description: 'LinkedIn khuyến nghị 3-5 hashtag',
    check: (text) => {
      const hashtagCount = (text.match(/#\w+/g) || []).length;
      return hashtagCount > 5;
    },
    severity: 'info',
    fixHint: 'Giảm còn 3-5 hashtag phù hợp nhất',
  },
  {
    id: 'tiktok_long_text',
    platform: ['tiktok'],
    category: 'format',
    name: 'Text quá dài cho TikTok',
    description: 'TikTok ưa nội dung ngắn gọn, dễ đọc nhanh',
    check: (text) => text.length > 100,
    severity: 'info',
    fixHint: 'Rút gọn còn dưới 100 ký tự cho overlay text',
  },
  
  // === Zalo-Specific ===
  {
    id: 'zalo_competitor_mention',
    platform: ['zalo_oa', 'zalo_message', 'zalo_article'],
    category: 'legal',
    name: 'Nhắc đến đối thủ',
    description: 'Zalo không cho phép so sánh trực tiếp với đối thủ',
    check: (text) => /grab|be|shopee|lazada|tiki|sendo|facebook|messenger/i.test(text),
    severity: 'error',
    fixHint: 'Tập trung vào USP của bạn thay vì so sánh với đối thủ',
  },
  {
    id: 'zalo_phone_format',
    platform: ['zalo_message'],
    category: 'format',
    name: 'Định dạng số điện thoại',
    description: 'Số điện thoại nên theo format VN chuẩn',
    check: (text) => /\b\d{10,11}\b/.test(text) && !/\b0\d{9,10}\b/.test(text),
    severity: 'info',
    fixHint: 'Dùng format 0xxx xxx xxx cho số điện thoại VN',
  },
  {
    id: 'zalo_informal_language',
    platform: ['zalo_message'],
    category: 'content',
    name: 'Ngôn ngữ phù hợp',
    description: 'Zalo Message nên dùng ngôn ngữ thân thiện, conversational',
    check: (text) => /kính thưa|trân trọng|quý khách hàng|quý công ty/i.test(text),
    severity: 'info',
    fixHint: 'Dùng ngôn ngữ thân thiện hơn: "bạn", "mình", emoji nhẹ nhàng',
  },
  {
    id: 'zalo_article_seo',
    platform: ['zalo_article'],
    category: 'engagement',
    name: 'Tiêu đề SEO-friendly',
    description: 'Tiêu đề bài viết nên chứa keyword chính',
    check: (text) => text.length < 30 || text.length > 100,
    severity: 'info',
    fixHint: 'Tiêu đề lý tưởng 30-70 ký tự, chứa keyword quan trọng',
  },
];

// Calculate compliance score
export function calculateComplianceScore(issues: PolicyIssue[]): number {
  if (issues.length === 0) return 100;
  
  let deduction = 0;
  issues.forEach(issue => {
    switch (issue.severity) {
      case 'error': deduction += 25; break;
      case 'warning': deduction += 10; break;
      case 'info': deduction += 3; break;
    }
  });
  
  return Math.max(0, 100 - deduction);
}

// Run policy check on text
export function checkPolicies(
  text: string,
  field: string,
  platform: string
): PolicyCheckResult {
  const applicableRules = PLATFORM_POLICY_RULES.filter(
    rule => rule.platform.includes(platform)
  );
  
  const issues: PolicyIssue[] = [];
  
  applicableRules.forEach(rule => {
    if (rule.check(text)) {
      issues.push({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        message: rule.description,
        severity: rule.severity,
        fixHint: rule.fixHint,
      });
    }
  });
  
  return {
    field,
    text,
    issues,
    score: calculateComplianceScore(issues),
  };
}

// Generate full compliance report
export function generateComplianceReport(
  variations: { primary_text?: string; headline?: string; description?: string }[],
  platform: string
): ComplianceReport {
  const allFields: PolicyCheckResult[] = [];
  let totalChecks = 0;
  let passedChecks = 0;
  
  variations.forEach((variation, idx) => {
    const fields = ['primary_text', 'headline', 'description'] as const;
    
    fields.forEach(field => {
      const text = variation[field];
      if (text) {
        const result = checkPolicies(text, `Variation ${String.fromCharCode(65 + idx)} - ${field}`, platform);
        allFields.push(result);
        
        const applicableRules = PLATFORM_POLICY_RULES.filter(r => r.platform.includes(platform));
        totalChecks += applicableRules.length;
        passedChecks += applicableRules.length - result.issues.length;
      }
    });
  });
  
  const allIssues = allFields.flatMap(f => f.issues);
  const criticalIssues = allIssues.filter(i => i.severity === 'error').length;
  const warnings = allIssues.filter(i => i.severity === 'warning').length;
  const suggestions = allIssues.filter(i => i.severity === 'info').length;
  
  const overallScore = allFields.length > 0
    ? Math.round(allFields.reduce((sum, f) => sum + f.score, 0) / allFields.length)
    : 100;
  
  return {
    overallScore,
    fields: allFields,
    criticalIssues,
    warnings,
    suggestions,
    platform,
    passedChecks,
    totalChecks,
  };
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

export function getSeverityColor(severity: 'error' | 'warning' | 'info'): string {
  switch (severity) {
    case 'error': return 'text-red-500 bg-red-500/10';
    case 'warning': return 'text-yellow-600 bg-yellow-500/10';
    case 'info': return 'text-blue-500 bg-blue-500/10';
  }
}

export function getSeverityIcon(severity: 'error' | 'warning' | 'info'): string {
  switch (severity) {
    case 'error': return '❌';
    case 'warning': return '⚠️';
    case 'info': return '💡';
  }
}
