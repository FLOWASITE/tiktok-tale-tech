/**
 * Persona Fit Scorer
 * 
 * Evaluates how well generated content aligns with the selected persona's characteristics:
 * - Pain points addressed
 * - Desires/goals mentioned
 * - Communication style match
 * - Objection handling
 * - Buying triggers used
 * 
 * Returns a 0-100 fit score with detailed breakdown.
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export interface PersonaData {
  id: string;
  name: string;
  occupation?: string;
  ageRange?: string;
  gender?: string;
  painPoints?: string[];
  desires?: string[];
  objections?: string[];
  buyingTriggers?: string[];
  communicationStyle?: string;
  preferredChannels?: string[];
  techSavviness?: string;
  buyingMotivation?: string[];
}

export interface PersonaFitResult {
  overallScore: number;  // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: PersonaFitBreakdown;
  matchedElements: PersonaMatchedElements;
  suggestions: string[];
  personaName: string;
  personaId: string;
}

export interface PersonaFitBreakdown {
  painPointsScore: number;      // 0-30
  desiresScore: number;         // 0-25
  communicationScore: number;   // 0-20
  objectionsScore: number;      // 0-15
  triggersScore: number;        // 0-10
}

export interface PersonaMatchedElements {
  painPointsAddressed: string[];
  desiresReferenced: string[];
  objectionsHandled: string[];
  triggersUsed: string[];
  toneMatch: boolean;
}

// ============================================
// SCORING WEIGHTS
// ============================================

const SCORING_WEIGHTS = {
  painPoints: 30,       // Max 30 points - most important
  desires: 25,          // Max 25 points
  communication: 20,    // Max 20 points
  objections: 15,       // Max 15 points
  triggers: 10,         // Max 10 points
} as const;

// Grade thresholds
const GRADE_THRESHOLDS = {
  A: 85,
  B: 70,
  C: 55,
  D: 40,
  F: 0,
} as const;

// Communication style keywords mapping
const COMMUNICATION_STYLE_KEYWORDS: Record<string, string[]> = {
  formal: ['kính thưa', 'quý khách', 'trân trọng', 'kính mời', 'đề xuất', 'xin phép', 'thưa'],
  friendly: ['bạn', 'mình', 'đấy', 'nhé', 'nha', 'à', 'ơi', 'cùng'],
  professional: ['chuyên gia', 'giải pháp', 'tối ưu', 'hiệu quả', 'chiến lược', 'phương pháp'],
  casual: ['ok', 'oke', 'luôn', 'chill', 'xịn', 'đỉnh', 'ngon', 'sốc'],
  emotional: ['thấu hiểu', 'đồng cảm', 'lo lắng', 'hạnh phúc', 'yên tâm', 'tin tưởng', 'an tâm'],
  direct: ['ngay', 'lập tức', 'hôm nay', 'liên hệ', 'đăng ký', 'mua ngay', 'inbox'],
  analytical: ['số liệu', 'data', 'phân tích', 'nghiên cứu', 'thống kê', '%', 'tăng trưởng'],
  storytelling: ['câu chuyện', 'hành trình', 'từng', 'đã', 'trước đây', 'bây giờ', 'thay đổi'],
};

// ============================================
// MAIN SCORING FUNCTION
// ============================================

export function calculatePersonaFit(
  generatedContent: string,
  persona: PersonaData
): PersonaFitResult {
  const contentLower = generatedContent.toLowerCase();
  
  // Calculate each dimension
  const painPointsResult = scorePainPoints(contentLower, persona.painPoints || []);
  const desiresResult = scoreDesires(contentLower, persona.desires || []);
  const communicationResult = scoreCommunicationStyle(contentLower, persona.communicationStyle);
  const objectionsResult = scoreObjections(contentLower, persona.objections || []);
  const triggersResult = scoreTriggers(contentLower, persona.buyingTriggers || []);
  
  // Calculate breakdown scores
  const breakdown: PersonaFitBreakdown = {
    painPointsScore: painPointsResult.score,
    desiresScore: desiresResult.score,
    communicationScore: communicationResult.score,
    objectionsScore: objectionsResult.score,
    triggersScore: triggersResult.score,
  };
  
  // Calculate overall score
  const overallScore = Math.round(
    breakdown.painPointsScore +
    breakdown.desiresScore +
    breakdown.communicationScore +
    breakdown.objectionsScore +
    breakdown.triggersScore
  );
  
  // Determine grade
  const grade = getGrade(overallScore);
  
  // Build matched elements
  const matchedElements: PersonaMatchedElements = {
    painPointsAddressed: painPointsResult.matched,
    desiresReferenced: desiresResult.matched,
    objectionsHandled: objectionsResult.matched,
    triggersUsed: triggersResult.matched,
    toneMatch: communicationResult.toneMatch,
  };
  
  // Generate suggestions for improvement
  const suggestions = generateSuggestions(breakdown, persona, matchedElements);
  
  return {
    overallScore,
    grade,
    breakdown,
    matchedElements,
    suggestions,
    personaName: persona.name,
    personaId: persona.id,
  };
}

// ============================================
// SCORING HELPERS
// ============================================

interface ScoringResult {
  score: number;
  matched: string[];
  total: number;
}

function scorePainPoints(content: string, painPoints: string[]): ScoringResult {
  if (!painPoints.length) {
    return { score: SCORING_WEIGHTS.painPoints, matched: [], total: 0 }; // Full score if no pain points defined
  }
  
  const matched = painPoints.filter(point => {
    const keywords = extractKeywords(point);
    return keywords.some(kw => content.includes(kw.toLowerCase()));
  });
  
  const ratio = matched.length / painPoints.length;
  const score = Math.round(ratio * SCORING_WEIGHTS.painPoints);
  
  return { score, matched, total: painPoints.length };
}

function scoreDesires(content: string, desires: string[]): ScoringResult {
  if (!desires.length) {
    return { score: SCORING_WEIGHTS.desires, matched: [], total: 0 };
  }
  
  const matched = desires.filter(desire => {
    const keywords = extractKeywords(desire);
    return keywords.some(kw => content.includes(kw.toLowerCase()));
  });
  
  const ratio = matched.length / desires.length;
  const score = Math.round(ratio * SCORING_WEIGHTS.desires);
  
  return { score, matched, total: desires.length };
}

function scoreObjections(content: string, objections: string[]): ScoringResult {
  if (!objections.length) {
    return { score: SCORING_WEIGHTS.objections, matched: [], total: 0 };
  }
  
  const matched = objections.filter(objection => {
    const keywords = extractKeywords(objection);
    // Check if content addresses/refutes the objection
    return keywords.some(kw => content.includes(kw.toLowerCase()));
  });
  
  const ratio = matched.length / objections.length;
  const score = Math.round(ratio * SCORING_WEIGHTS.objections);
  
  return { score, matched, total: objections.length };
}

function scoreTriggers(content: string, triggers: string[]): ScoringResult {
  if (!triggers.length) {
    return { score: SCORING_WEIGHTS.triggers, matched: [], total: 0 };
  }
  
  const matched = triggers.filter(trigger => {
    const keywords = extractKeywords(trigger);
    return keywords.some(kw => content.includes(kw.toLowerCase()));
  });
  
  const ratio = matched.length / triggers.length;
  const score = Math.round(ratio * SCORING_WEIGHTS.triggers);
  
  return { score, matched, total: triggers.length };
}

interface CommunicationResult {
  score: number;
  toneMatch: boolean;
  detectedStyle: string | null;
}

function scoreCommunicationStyle(
  content: string,
  preferredStyle?: string
): CommunicationResult {
  if (!preferredStyle) {
    return { score: SCORING_WEIGHTS.communication, toneMatch: true, detectedStyle: null };
  }
  
  const styleNormalized = preferredStyle.toLowerCase().replace(/[_-]/g, '');
  
  // Detect style matches
  let matchCount = 0;
  let detectedStyle: string | null = null;
  let maxMatches = 0;
  
  for (const [style, keywords] of Object.entries(COMMUNICATION_STYLE_KEYWORDS)) {
    const matches = keywords.filter(kw => content.includes(kw)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedStyle = style;
    }
    
    // Check if this matches preferred style
    if (styleNormalized.includes(style) || style.includes(styleNormalized)) {
      matchCount = matches;
    }
  }
  
  // Calculate score based on match intensity
  const toneMatch = detectedStyle === styleNormalized || 
                    styleNormalized.includes(detectedStyle || '') ||
                    (detectedStyle?.includes(styleNormalized) ?? false);
  
  // Score: base score + bonus for style match
  let score = Math.min(matchCount * 4, SCORING_WEIGHTS.communication);
  if (toneMatch) {
    score = Math.max(score, SCORING_WEIGHTS.communication * 0.75);
  }
  
  return { 
    score: Math.round(score), 
    toneMatch, 
    detectedStyle 
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function extractKeywords(phrase: string): string[] {
  // Remove common stop words and extract meaningful keywords
  const stopWords = new Set([
    'và', 'của', 'cho', 'với', 'trong', 'trên', 'dưới', 'về', 'đến', 'từ',
    'là', 'có', 'được', 'những', 'các', 'một', 'này', 'đó', 'khi', 'nếu',
    'the', 'a', 'an', 'of', 'for', 'with', 'in', 'on', 'to', 'from', 'and', 'or'
  ]);
  
  const words = phrase
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  // Also extract 2-word phrases for better matching
  const phrases: string[] = [];
  const originalWords = phrase.toLowerCase().split(/\s+/);
  for (let i = 0; i < originalWords.length - 1; i++) {
    phrases.push(`${originalWords[i]} ${originalWords[i + 1]}`);
  }
  
  return [...words, ...phrases].filter((v, i, a) => a.indexOf(v) === i);
}

function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= GRADE_THRESHOLDS.A) return 'A';
  if (score >= GRADE_THRESHOLDS.B) return 'B';
  if (score >= GRADE_THRESHOLDS.C) return 'C';
  if (score >= GRADE_THRESHOLDS.D) return 'D';
  return 'F';
}

function generateSuggestions(
  breakdown: PersonaFitBreakdown,
  persona: PersonaData,
  matched: PersonaMatchedElements
): string[] {
  const suggestions: string[] = [];
  
  // Pain points suggestions
  if (breakdown.painPointsScore < SCORING_WEIGHTS.painPoints * 0.6) {
    const unaddressed = (persona.painPoints || [])
      .filter(p => !matched.painPointsAddressed.includes(p))
      .slice(0, 2);
    if (unaddressed.length > 0) {
      suggestions.push(`Đề cập thêm pain points: "${unaddressed.join('", "')}"`);
    }
  }
  
  // Desires suggestions
  if (breakdown.desiresScore < SCORING_WEIGHTS.desires * 0.6) {
    const unreferenced = (persona.desires || [])
      .filter(d => !matched.desiresReferenced.includes(d))
      .slice(0, 2);
    if (unreferenced.length > 0) {
      suggestions.push(`Nhấn mạnh mong muốn: "${unreferenced.join('", "')}"`);
    }
  }
  
  // Communication style suggestions
  if (breakdown.communicationScore < SCORING_WEIGHTS.communication * 0.5 && persona.communicationStyle) {
    suggestions.push(`Điều chỉnh tone về phong cách "${persona.communicationStyle}"`);
  }
  
  // Objection suggestions
  if (breakdown.objectionsScore < SCORING_WEIGHTS.objections * 0.5) {
    const unhandled = (persona.objections || [])
      .filter(o => !matched.objectionsHandled.includes(o))
      .slice(0, 1);
    if (unhandled.length > 0) {
      suggestions.push(`Phản bác objection: "${unhandled[0]}"`);
    }
  }
  
  // Trigger suggestions
  if (breakdown.triggersScore < SCORING_WEIGHTS.triggers * 0.5) {
    const unused = (persona.buyingTriggers || [])
      .filter(t => !matched.triggersUsed.includes(t))
      .slice(0, 1);
    if (unused.length > 0) {
      suggestions.push(`Sử dụng trigger: "${unused[0]}"`);
    }
  }
  
  return suggestions.slice(0, 3); // Max 3 suggestions
}

// ============================================
// AGGREGATE SCORING FOR MULTI-CHANNEL
// ============================================

export interface MultiChannelPersonaFitResult {
  averageScore: number;
  averageGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  channelScores: Record<string, PersonaFitResult>;
  topSuggestions: string[];
  overallMatchedElements: PersonaMatchedElements;
}

export function calculateMultiChannelPersonaFit(
  channelContents: Record<string, string>,
  persona: PersonaData
): MultiChannelPersonaFitResult {
  const channelScores: Record<string, PersonaFitResult> = {};
  let totalScore = 0;
  let channelCount = 0;
  
  // Aggregate matched elements
  const allPainPoints = new Set<string>();
  const allDesires = new Set<string>();
  const allObjections = new Set<string>();
  const allTriggers = new Set<string>();
  let anyToneMatch = false;
  
  // Collect all suggestions
  const allSuggestions: string[] = [];
  
  for (const [channel, content] of Object.entries(channelContents)) {
    if (!content) continue;
    
    const result = calculatePersonaFit(content, persona);
    channelScores[channel] = result;
    totalScore += result.overallScore;
    channelCount++;
    
    // Aggregate matches
    result.matchedElements.painPointsAddressed.forEach(p => allPainPoints.add(p));
    result.matchedElements.desiresReferenced.forEach(d => allDesires.add(d));
    result.matchedElements.objectionsHandled.forEach(o => allObjections.add(o));
    result.matchedElements.triggersUsed.forEach(t => allTriggers.add(t));
    if (result.matchedElements.toneMatch) anyToneMatch = true;
    
    allSuggestions.push(...result.suggestions);
  }
  
  const averageScore = channelCount > 0 ? Math.round(totalScore / channelCount) : 0;
  const averageGrade = getGrade(averageScore);
  
  // Dedupe suggestions by similarity
  const uniqueSuggestions = [...new Set(allSuggestions)].slice(0, 5);
  
  return {
    averageScore,
    averageGrade,
    channelScores,
    topSuggestions: uniqueSuggestions,
    overallMatchedElements: {
      painPointsAddressed: Array.from(allPainPoints),
      desiresReferenced: Array.from(allDesires),
      objectionsHandled: Array.from(allObjections),
      triggersUsed: Array.from(allTriggers),
      toneMatch: anyToneMatch,
    },
  };
}

// ============================================
// PROMPT INJECTION - Boost persona fit during generation
// ============================================

export function buildPersonaFitBoostPrompt(persona: PersonaData): string {
  if (!persona.painPoints?.length && !persona.desires?.length) {
    return '';
  }
  
  const parts: string[] = [
    '\n## 🎯 PERSONA FIT OPTIMIZATION (Score được tính tự động)',
  ];
  
  if (persona.painPoints?.length) {
    parts.push(`### Pain Points PHẢI đề cập (30 điểm):`);
    parts.push(persona.painPoints.map((p, i) => `${i + 1}. ${p}`).join('\n'));
  }
  
  if (persona.desires?.length) {
    parts.push(`\n### Mong muốn PHẢI nhắc đến (25 điểm):`);
    parts.push(persona.desires.map((d, i) => `${i + 1}. ${d}`).join('\n'));
  }
  
  if (persona.objections?.length) {
    parts.push(`\n### Objections NÊN phản bác (15 điểm):`);
    parts.push(persona.objections.slice(0, 3).map((o, i) => `${i + 1}. ${o}`).join('\n'));
  }
  
  if (persona.buyingTriggers?.length) {
    parts.push(`\n### Buying Triggers NÊN sử dụng (10 điểm):`);
    parts.push(persona.buyingTriggers.slice(0, 3).map((t, i) => `${i + 1}. ${t}`).join('\n'));
  }
  
  if (persona.communicationStyle) {
    parts.push(`\n### Phong cách giao tiếp (20 điểm): ${persona.communicationStyle}`);
  }
  
  parts.push('\n⚡ Nội dung được chấm điểm Persona Fit Score (0-100). Điểm A (≥85) = tối ưu cho persona.');
  
  return parts.join('\n');
}
