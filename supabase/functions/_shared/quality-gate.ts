// ============================================
// Quality Gate Module for Core Content Evaluation
// Post-generation quality check and scoring
// ============================================

import { BrandContext } from './types/chat-types.ts';
import { GeneratedOutline, CoreContentQualityMode } from './core-content-pipeline.ts';

// ============================================
// TYPES
// ============================================

export interface QualityMetrics {
  overall: number;  // 0-100
  breakdown: {
    structure: number;      // Has proper sections, headings
    proofElements: number;  // Has statistics, examples, citations
    brandAlignment: number; // Uses brand voice, terms, tone
    readability: number;    // Sentence length, complexity appropriate
    completeness: number;   // Covers outline points adequately
  };
  issues: string[];
  suggestions: string[];
  passesThreshold: boolean;
}

interface QualityCheckConfig {
  minWordCount?: number;
  maxWordCount?: number;
  minProofElements?: number;
  minSections?: number;
  threshold?: number;
}

const DEFAULT_CONFIG: QualityCheckConfig = {
  minWordCount: 600,
  maxWordCount: 2500,
  minProofElements: 3,
  minSections: 3,
  threshold: 65,
};

// ============================================
// CORE EVALUATION FUNCTIONS
// ============================================

/**
 * Count words in content
 */
function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Evaluate structure quality
 * Checks for proper headings, sections, formatting
 */
function evaluateStructure(content: string, outline?: GeneratedOutline | null): number {
  let score = 0;
  const issues: string[] = [];
  
  // Check for H2 headings
  const h2Matches = content.match(/^##\s+.+$/gm) || [];
  if (h2Matches.length >= 3) {
    score += 25;
  } else if (h2Matches.length >= 2) {
    score += 15;
  } else {
    issues.push('Thiếu cấu trúc heading rõ ràng');
  }
  
  // Check for H3 subheadings
  const h3Matches = content.match(/^###\s+.+$/gm) || [];
  if (h3Matches.length >= 2) {
    score += 15;
  }
  
  // Check for bullet points or numbered lists
  const listMatches = content.match(/^[\-\*•]\s+.+$|^\d+[\.\)]\s+.+$/gm) || [];
  if (listMatches.length >= 5) {
    score += 20;
  } else if (listMatches.length >= 3) {
    score += 10;
  }
  
  // Check for bold emphasis
  const boldMatches = content.match(/\*\*[^*]+\*\*/g) || [];
  if (boldMatches.length >= 5) {
    score += 15;
  } else if (boldMatches.length >= 2) {
    score += 8;
  }
  
  // Check if outline sections are covered
  if (outline?.sections) {
    let coveredSections = 0;
    for (const section of outline.sections) {
      const sectionTitle = section.title.toLowerCase();
      const contentLower = content.toLowerCase();
      if (contentLower.includes(sectionTitle) || 
          contentLower.includes(sectionTitle.split(' ').slice(0, 2).join(' '))) {
        coveredSections++;
      }
    }
    const coverageRatio = coveredSections / outline.sections.length;
    score += Math.round(coverageRatio * 25);
  } else {
    // No outline to compare, give base score
    score += 15;
  }
  
  return Math.min(100, score);
}

/**
 * Evaluate proof elements
 * Checks for statistics, citations, case studies, expert references
 */
function evaluateProofElements(content: string): { score: number; count: number; details: string[] } {
  let count = 0;
  const details: string[] = [];
  
  // Statistics patterns (numbers with context)
  const statPatterns = [
    /\d+%/g,                                    // Percentages
    /\$?\d+[\.,]?\d*\s*(triệu|tỷ|million|billion)/gi, // Currency amounts
    /\d+\/\d+/g,                               // Fractions
    /\d+x/gi,                                  // Multipliers
    /\d+\+?\s+(người|doanh nghiệp|khách hàng|công ty)/gi, // Counts with entities
  ];
  
  for (const pattern of statPatterns) {
    const matches = content.match(pattern) || [];
    if (matches.length > 0) {
      count += Math.min(matches.length, 3);
      details.push(`Số liệu: ${matches.slice(0, 2).join(', ')}`);
    }
  }
  
  // Citation patterns (sources, years, researchers)
  const citationPatterns = [
    /theo\s+(nghiên cứu|báo cáo|khảo sát)\s+của\s+[A-Z]/gi,
    /\((\d{4})\)/g,                            // Year citations
    /(Forbes|McKinsey|Harvard|Deloitte|Gartner|Nielsen|Statista)/gi,
    /theo\s+ông|bà\s+[A-Z]/gi,                 // Expert references
    /CEO|CFO|Founder|Giám đốc\s+[A-Z]/gi,
  ];
  
  for (const pattern of citationPatterns) {
    const matches = content.match(pattern) || [];
    if (matches.length > 0) {
      count += matches.length * 2; // Citations worth more
      details.push(`Nguồn trích dẫn được tìm thấy`);
    }
  }
  
  // Case study / example patterns
  const casePatterns = [
    /ví dụ(:|,)?\s/gi,
    /case study/gi,
    /câu chuyện\s+của/gi,
    /trường hợp\s+của/gi,
    /thực tế(:|,)/gi,
  ];
  
  for (const pattern of casePatterns) {
    const matches = content.match(pattern) || [];
    if (matches.length > 0) {
      count += matches.length;
      details.push(`Ví dụ/Case study được đề cập`);
    }
  }
  
  // Score calculation
  let score = 0;
  if (count >= 8) score = 100;
  else if (count >= 6) score = 85;
  else if (count >= 4) score = 70;
  else if (count >= 2) score = 50;
  else if (count >= 1) score = 30;
  else score = 0;
  
  return { score, count, details: [...new Set(details)] };
}

/**
 * Evaluate brand alignment
 * Checks if content uses brand voice, keywords, and tone
 */
function evaluateBrandAlignment(content: string, brandContext: BrandContext | null): number {
  if (!brandContext) return 70; // Neutral score if no brand context
  
  let score = 40; // Base score
  const contentLower = content.toLowerCase();
  
  // Check brand name mentions
  if (brandContext.brandName) {
    const brandMentions = (contentLower.match(new RegExp(brandContext.brandName.toLowerCase(), 'g')) || []).length;
    if (brandMentions >= 1 && brandMentions <= 5) {
      score += 15; // Mentioned appropriately
    } else if (brandMentions > 5) {
      score += 5; // Over-mentioned
    }
  }
  
  // Check tone of voice keywords
  if (brandContext.toneOfVoice?.length) {
    const toneMatches = brandContext.toneOfVoice.filter(tone => 
      contentLower.includes(tone.toLowerCase())
    ).length;
    score += Math.min(toneMatches * 5, 15);
  }
  
  // Check evergreen themes
  if (brandContext.evergreenThemes?.length) {
    const themeMatches = brandContext.evergreenThemes.filter(theme =>
      contentLower.includes(theme.toLowerCase())
    ).length;
    score += Math.min(themeMatches * 5, 15);
  }
  
  // Check content pillars
  if (brandContext.contentPillars?.length) {
    const pillarNames = brandContext.contentPillars.map((p: any) => 
      typeof p === 'string' ? p : p.name
    ).filter(Boolean);
    const pillarMatches = pillarNames.filter((name: string) =>
      contentLower.includes(name.toLowerCase())
    ).length;
    score += Math.min(pillarMatches * 5, 15);
  }
  
  return Math.min(100, score);
}

/**
 * Evaluate readability
 * Checks sentence length, complexity, paragraph structure
 */
function evaluateReadability(content: string): number {
  let score = 50; // Base score
  
  // Split into sentences
  const sentences = content.split(/[.!?。]\s*/);
  const validSentences = sentences.filter(s => s.trim().length > 10);
  
  if (validSentences.length === 0) return 30;
  
  // Calculate average sentence length
  const avgSentenceLength = validSentences.reduce((sum, s) => sum + countWords(s), 0) / validSentences.length;
  
  // Ideal: 15-25 words per sentence
  if (avgSentenceLength >= 12 && avgSentenceLength <= 30) {
    score += 25;
  } else if (avgSentenceLength >= 8 && avgSentenceLength <= 40) {
    score += 15;
  } else {
    score -= 10; // Too short or too long
  }
  
  // Check paragraph structure (separated by double newlines)
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 20);
  if (paragraphs.length >= 5) {
    score += 15;
  } else if (paragraphs.length >= 3) {
    score += 10;
  }
  
  // Bonus for varied sentence beginnings
  const sentenceStarts = validSentences.map(s => s.trim().split(' ')[0]?.toLowerCase() || '');
  const uniqueStarts = new Set(sentenceStarts);
  const varietyRatio = uniqueStarts.size / sentenceStarts.length;
  if (varietyRatio >= 0.7) {
    score += 10;
  }
  
  return Math.min(100, score);
}

/**
 * Evaluate completeness against outline
 */
function evaluateCompleteness(
  content: string, 
  outline: GeneratedOutline | null,
  targetWordCount: number
): number {
  let score = 40; // Base score
  const wordCount = countWords(content);
  
  // Word count check
  const wordRatio = wordCount / targetWordCount;
  if (wordRatio >= 0.85 && wordRatio <= 1.25) {
    score += 30;
  } else if (wordRatio >= 0.7 && wordRatio <= 1.5) {
    score += 15;
  } else {
    score -= 10;
  }
  
  // Check outline coverage
  if (outline?.sections) {
    const contentLower = content.toLowerCase();
    let bulletsCovered = 0;
    let totalBullets = 0;
    
    for (const section of outline.sections) {
      for (const bullet of section.bulletPoints) {
        totalBullets++;
        // Simple keyword matching
        const keywords = bullet.toLowerCase().split(' ').filter(w => w.length > 3);
        const matchedKeywords = keywords.filter(kw => contentLower.includes(kw));
        if (matchedKeywords.length >= keywords.length * 0.5) {
          bulletsCovered++;
        }
      }
    }
    
    if (totalBullets > 0) {
      const coverageRatio = bulletsCovered / totalBullets;
      score += Math.round(coverageRatio * 30);
    }
  } else {
    score += 20; // No outline to compare
  }
  
  return Math.min(100, score);
}

// ============================================
// MAIN EVALUATION FUNCTION
// ============================================

/**
 * Evaluate Core Content quality post-generation
 * Returns comprehensive quality metrics
 */
export function evaluateCoreContentQuality(
  content: string,
  brandContext: BrandContext | null,
  outline: GeneratedOutline | null,
  qualityMode: CoreContentQualityMode = 'balanced',
  config: QualityCheckConfig = {}
): QualityMetrics {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Adjust thresholds based on quality mode
  const modeMultipliers: Record<CoreContentQualityMode, number> = {
    fast: 0.85,
    balanced: 1.0,
    quality: 1.15,
  };
  const multiplier = modeMultipliers[qualityMode];
  
  // Word count check
  const wordCount = countWords(content);
  const targetWordCount = qualityMode === 'fast' ? 800 : qualityMode === 'balanced' ? 1200 : 1500;
  
  if (wordCount < mergedConfig.minWordCount!) {
    issues.push(`Độ dài quá ngắn (${wordCount} từ, cần ≥${mergedConfig.minWordCount})`);
    suggestions.push('Bổ sung thêm ví dụ, phân tích sâu hơn');
  }
  if (wordCount > mergedConfig.maxWordCount!) {
    issues.push(`Độ dài quá dài (${wordCount} từ, cần ≤${mergedConfig.maxWordCount})`);
    suggestions.push('Tinh gọn nội dung, loại bỏ phần lặp lại');
  }
  
  // Evaluate each dimension
  const structureScore = evaluateStructure(content, outline);
  
  const proofResult = evaluateProofElements(content);
  if (proofResult.count < mergedConfig.minProofElements!) {
    issues.push(`Thiếu proof elements (có ${proofResult.count}, cần ≥${mergedConfig.minProofElements})`);
    suggestions.push('Thêm số liệu thống kê, ví dụ thực tế, trích dẫn chuyên gia');
  }
  
  const brandScore = evaluateBrandAlignment(content, brandContext);
  if (brandScore < 50 && brandContext) {
    issues.push('Brand alignment yếu');
    suggestions.push('Lồng ghép brand voice và keywords tự nhiên hơn');
  }
  
  const readabilityScore = evaluateReadability(content);
  if (readabilityScore < 50) {
    issues.push('Readability cần cải thiện');
    suggestions.push('Chia câu ngắn hơn, tách đoạn rõ ràng hơn');
  }
  
  const completenessScore = evaluateCompleteness(content, outline, targetWordCount);
  if (completenessScore < 60 && outline) {
    issues.push('Chưa cover đủ các điểm trong outline');
    suggestions.push('Bổ sung nội dung cho các bullet points còn thiếu');
  }
  
  // Calculate weighted overall score
  const weights = {
    structure: 0.2,
    proofElements: 0.25,  // Proof is important for credibility
    brandAlignment: 0.2,
    readability: 0.15,
    completeness: 0.2,
  };
  
  const overall = Math.round(
    structureScore * weights.structure +
    proofResult.score * weights.proofElements +
    brandScore * weights.brandAlignment +
    readabilityScore * weights.readability +
    completenessScore * weights.completeness
  );
  
  // Adjust threshold based on mode
  const adjustedThreshold = Math.round(mergedConfig.threshold! * multiplier);
  const passesThreshold = overall >= adjustedThreshold;
  
  if (!passesThreshold) {
    suggestions.push(`Quality score (${overall}) thấp hơn threshold (${adjustedThreshold}). Xem xét refine.`);
  }
  
  return {
    overall,
    breakdown: {
      structure: structureScore,
      proofElements: proofResult.score,
      brandAlignment: brandScore,
      readability: readabilityScore,
      completeness: completenessScore,
    },
    issues,
    suggestions,
    passesThreshold,
  };
}

/**
 * Quick quality check - returns pass/fail only
 */
export function quickQualityCheck(
  content: string,
  threshold: number = 60
): boolean {
  const wordCount = countWords(content);
  if (wordCount < 400) return false;
  
  const structureScore = evaluateStructure(content, null);
  const proofResult = evaluateProofElements(content);
  const readabilityScore = evaluateReadability(content);
  
  const quickScore = (structureScore + proofResult.score + readabilityScore) / 3;
  return quickScore >= threshold;
}
