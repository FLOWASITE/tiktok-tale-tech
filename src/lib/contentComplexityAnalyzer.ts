/**
 * Content Complexity Analyzer
 * Detects whether a user's image description requires structured layout
 * (infographic, multi-card, precise positioning) vs simple illustration.
 */

export type ComplexityScore = 'simple' | 'moderate' | 'complex';

export interface ComplexityAnalysis {
  textBlocks: number;
  structuredElements: number;
  spatialConstraints: number;
  iconRequirements: number;
  score: ComplexityScore;
  warnings: string[];
}

// Vietnamese + English patterns for structured content detection
const TEXT_BLOCK_PATTERNS = [
  /tiêu đề|headline|banner|header|footer/gi,
  /thẻ thông tin|info card|card|badge/gi,
  /label|nhãn|chú thích|caption/gi,
  /CTA|nút|button/gi,
  /slogan|tagline|khẩu hiệu/gi,
];

const STRUCTURED_ELEMENT_PATTERNS = [
  /\d+\s*(?:thẻ|card|box|ô|khung|mục|item)/gi,
  /grid|lưới|bảng|table|danh sách|list/gi,
  /infographic|poster|flyer|banner/gi,
  /biểu đồ|chart|graph|diagram/gi,
  /timeline|quy trình|process|step/gi,
];

const SPATIAL_PATTERNS = [
  /bên trái|bên phải|phía trên|phía dưới/gi,
  /left|right|top|bottom/gi,
  /trung tâm|center|giữa/gi,
  /góc|corner/gi,
  /khu vực|area|phần|section|zone/gi,
];

const ICON_PATTERNS = [
  /icon|biểu tượng|symbol|hình tượng/gi,
  /emoji|sticker/gi,
  /✓|✗|•|►|★|→|☎|📧|🌐/g,
];

function countPatternMatches(text: string, patterns: RegExp[]): number {
  let count = 0;
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
}

/**
 * Analyze content description for complexity
 */
export function analyzeContentComplexity(description: string): ComplexityAnalysis {
  if (!description || description.trim().length < 20) {
    return { textBlocks: 0, structuredElements: 0, spatialConstraints: 0, iconRequirements: 0, score: 'simple', warnings: [] };
  }

  const text = description.toLowerCase();

  const textBlocks = countPatternMatches(text, TEXT_BLOCK_PATTERNS);
  const structuredElements = countPatternMatches(text, STRUCTURED_ELEMENT_PATTERNS);
  const spatialConstraints = countPatternMatches(text, SPATIAL_PATTERNS);
  const iconRequirements = countPatternMatches(text, ICON_PATTERNS);

  // Also count bullet points / numbered items as structured elements
  const bulletCount = (text.match(/^[\s]*[•\-\*►]\s/gm) || []).length;
  const numberedCount = (text.match(/^[\s]*\d+[\.\)]\s/gm) || []).length;
  const totalStructured = structuredElements + Math.floor((bulletCount + numberedCount) / 3);

  // Scoring logic
  const totalSignals = textBlocks + totalStructured * 2 + spatialConstraints + iconRequirements;
  const warnings: string[] = [];

  let score: ComplexityScore = 'simple';

  if (totalSignals >= 8 || totalStructured >= 3 || (textBlocks >= 4 && spatialConstraints >= 3)) {
    score = 'complex';
    warnings.push('Yêu cầu có nhiều text blocks và bố cục phức tạp');
    if (totalStructured >= 2) warnings.push('Có các thành phần cấu trúc (cards, grid, list)');
    if (iconRequirements >= 3) warnings.push('Cần nhiều icon/biểu tượng nhất quán');
  } else if (totalSignals >= 4 || totalStructured >= 2 || spatialConstraints >= 3) {
    score = 'moderate';
    if (spatialConstraints >= 3) warnings.push('Có nhiều yêu cầu về vị trí cụ thể');
  }

  // Long description with many specific requirements
  if (description.length > 500 && score === 'moderate') {
    score = 'complex';
    warnings.push('Mô tả rất chi tiết — AI có thể không đáp ứng chính xác mọi yêu cầu');
  }

  return {
    textBlocks,
    structuredElements: totalStructured,
    spatialConstraints,
    iconRequirements,
    score,
    warnings,
  };
}
