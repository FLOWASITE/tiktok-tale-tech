// ============================================
// Quality-Context Auto-Balancer v1.0
// Automatically adjusts quality mode based on context richness
// More context = can use faster model, Less context = need quality model
// ============================================

import { QualityMode } from './channel-optimization.ts';

/**
 * Context richness score breakdown
 */
export interface ContextRichnessScore {
  /** Total score 0-100 */
  total: number;
  /** Brand context score (0-25) */
  brandScore: number;
  /** Persona context score (0-25) */
  personaScore: number;
  /** Research/web context score (0-20) */
  researchScore: number;
  /** Core content provided (0-20) */
  coreContentScore: number;
  /** Industry memory score (0-10) */
  industryScore: number;
  /** Context sources used */
  sources: string[];
  /** Recommendation */
  recommendation: QualityMode;
  /** Reasoning for recommendation */
  reasoning: string;
}

/**
 * Context thresholds for quality mode decisions
 */
const QUALITY_THRESHOLDS = {
  /** Rich context (70+): Use fast mode */
  FAST_THRESHOLD: 70,
  /** Medium context (40-69): Use balanced mode */
  BALANCED_THRESHOLD: 40,
  /** Low context (<40): Use quality mode */
  // Anything below BALANCED_THRESHOLD uses quality mode
};

/**
 * Weight multipliers for different context types
 */
const CONTEXT_WEIGHTS = {
  // Core Content is most valuable - direct source material
  coreContent: {
    present: 20,
    wordCountBonus: 0.005, // 0.5 point per 100 words, max 10 extra
    maxBonus: 10,
  },
  
  // Brand context - voice, guidelines, positioning
  brand: {
    hasTemplate: 8,
    hasVoice: 6,
    hasProducts: 4,
    hasCompetitors: 3,
    hasChannelOverrides: 4,
  },
  
  // Persona context - target audience understanding
  persona: {
    hasPersona: 10,
    hasPainPoints: 5,
    hasDesires: 5,
    hasCommunicationStyle: 3,
    hasObjections: 2,
  },
  
  // Research context - external data
  research: {
    webResearchEnabled: 8,
    learningContextAvailable: 6,
    knowledgeGraphAvailable: 6,
  },
  
  // Industry memory - compliance, rules
  industry: {
    hasIndustryPack: 5,
    hasComplianceRules: 3,
    hasForbiddenTerms: 2,
  },
};

/**
 * Minimum context requirements for fast mode
 * At least 2 of these must be true
 */
const FAST_MODE_REQUIREMENTS = [
  'hasCoreContent',
  'hasBrandVoice',
  'hasPersona',
  'hasResearch',
];

/**
 * Context indicators from form data
 */
export interface ContextIndicators {
  // Core Content
  hasCoreContent: boolean;
  coreContentWordCount: number;
  
  // Brand
  hasBrandTemplate: boolean;
  hasBrandVoice: boolean;
  hasProducts: boolean;
  hasCompetitors: boolean;
  hasChannelOverrides: boolean;
  
  // Persona
  hasPersona: boolean;
  personaHasPainPoints: boolean;
  personaHasDesires: boolean;
  personaHasCommunicationStyle: boolean;
  personaHasObjections: boolean;
  
  // Research
  webResearchEnabled: boolean;
  learningContextAvailable: boolean;
  knowledgeGraphAvailable: boolean;
  
  // Industry
  hasIndustryPack: boolean;
  hasComplianceRules: boolean;
  hasForbiddenTerms: boolean;
}

/**
 * Calculate context richness score
 */
export function calculateContextRichness(
  indicators: ContextIndicators
): ContextRichnessScore {
  let total = 0;
  const sources: string[] = [];
  
  // Core Content Score (max 30)
  let coreContentScore = 0;
  if (indicators.hasCoreContent) {
    coreContentScore += CONTEXT_WEIGHTS.coreContent.present;
    sources.push('Core Content');
    
    // Word count bonus
    const wordBonus = Math.min(
      indicators.coreContentWordCount * CONTEXT_WEIGHTS.coreContent.wordCountBonus,
      CONTEXT_WEIGHTS.coreContent.maxBonus
    );
    coreContentScore += wordBonus;
  }
  
  // Brand Score (max 25)
  let brandScore = 0;
  if (indicators.hasBrandTemplate) {
    brandScore += CONTEXT_WEIGHTS.brand.hasTemplate;
    sources.push('Brand Template');
  }
  if (indicators.hasBrandVoice) {
    brandScore += CONTEXT_WEIGHTS.brand.hasVoice;
  }
  if (indicators.hasProducts) {
    brandScore += CONTEXT_WEIGHTS.brand.hasProducts;
  }
  if (indicators.hasCompetitors) {
    brandScore += CONTEXT_WEIGHTS.brand.hasCompetitors;
  }
  if (indicators.hasChannelOverrides) {
    brandScore += CONTEXT_WEIGHTS.brand.hasChannelOverrides;
  }
  
  // Persona Score (max 25)
  let personaScore = 0;
  if (indicators.hasPersona) {
    personaScore += CONTEXT_WEIGHTS.persona.hasPersona;
    sources.push('Persona');
    
    if (indicators.personaHasPainPoints) {
      personaScore += CONTEXT_WEIGHTS.persona.hasPainPoints;
    }
    if (indicators.personaHasDesires) {
      personaScore += CONTEXT_WEIGHTS.persona.hasDesires;
    }
    if (indicators.personaHasCommunicationStyle) {
      personaScore += CONTEXT_WEIGHTS.persona.hasCommunicationStyle;
    }
    if (indicators.personaHasObjections) {
      personaScore += CONTEXT_WEIGHTS.persona.hasObjections;
    }
  }
  
  // Research Score (max 20)
  let researchScore = 0;
  if (indicators.webResearchEnabled) {
    researchScore += CONTEXT_WEIGHTS.research.webResearchEnabled;
    sources.push('Web Research');
  }
  if (indicators.learningContextAvailable) {
    researchScore += CONTEXT_WEIGHTS.research.learningContextAvailable;
    sources.push('Learning Context');
  }
  if (indicators.knowledgeGraphAvailable) {
    researchScore += CONTEXT_WEIGHTS.research.knowledgeGraphAvailable;
    sources.push('Knowledge Graph');
  }
  
  // Industry Score (max 10)
  let industryScore = 0;
  if (indicators.hasIndustryPack) {
    industryScore += CONTEXT_WEIGHTS.industry.hasIndustryPack;
    sources.push('Industry Pack');
  }
  if (indicators.hasComplianceRules) {
    industryScore += CONTEXT_WEIGHTS.industry.hasComplianceRules;
  }
  if (indicators.hasForbiddenTerms) {
    industryScore += CONTEXT_WEIGHTS.industry.hasForbiddenTerms;
  }
  
  // Total (cap at 100)
  total = Math.min(100, coreContentScore + brandScore + personaScore + researchScore + industryScore);
  
  // Determine recommendation
  let recommendation: QualityMode;
  let reasoning: string;
  
  if (total >= QUALITY_THRESHOLDS.FAST_THRESHOLD) {
    // Check if we have diverse sources (at least 2 major ones)
    const majorSources = sources.filter(s => 
      ['Core Content', 'Brand Template', 'Persona', 'Web Research'].includes(s)
    ).length;
    
    if (majorSources >= 2) {
      recommendation = 'fast';
      reasoning = `Rich context (${total}/100) với ${majorSources} nguồn chính → Dùng FAST mode để tiết kiệm`;
    } else {
      recommendation = 'balanced';
      reasoning = `High score nhưng thiếu diversity → BALANCED để đảm bảo chất lượng`;
    }
  } else if (total >= QUALITY_THRESHOLDS.BALANCED_THRESHOLD) {
    recommendation = 'balanced';
    reasoning = `Context trung bình (${total}/100) → BALANCED mode tối ưu tốc độ/chất lượng`;
  } else {
    recommendation = 'quality';
    reasoning = `Context hạn chế (${total}/100) → QUALITY mode để AI tự sáng tạo tốt hơn`;
  }
  
  return {
    total,
    brandScore,
    personaScore,
    researchScore,
    coreContentScore,
    industryScore,
    sources,
    recommendation,
    reasoning,
  };
}

/**
 * Build context indicators from form data and fetched data
 */
export function buildContextIndicators(options: {
  coreContent?: string | null;
  brandTemplate?: any;
  brandVoice?: any;
  persona?: any;
  industryMemory?: any;
  webResearchEnabled?: boolean;
  learningContext?: any;
  knowledgeGraph?: any;
}): ContextIndicators {
  const {
    coreContent,
    brandTemplate,
    brandVoice,
    persona,
    industryMemory,
    webResearchEnabled,
    learningContext,
    knowledgeGraph,
  } = options;
  
  // Count words in core content
  const coreContentWordCount = coreContent 
    ? coreContent.split(/\s+/).filter(Boolean).length 
    : 0;
  
  return {
    // Core Content
    hasCoreContent: !!coreContent && coreContentWordCount > 50,
    coreContentWordCount,
    
    // Brand
    hasBrandTemplate: !!brandTemplate,
    hasBrandVoice: !!(brandVoice?.tone_of_voice?.length || brandVoice?.formality_level),
    hasProducts: !!(brandTemplate?.products?.length),
    hasCompetitors: !!(brandTemplate?.competitors?.length),
    hasChannelOverrides: !!(brandTemplate?.channel_overrides),
    
    // Persona
    hasPersona: !!persona,
    personaHasPainPoints: !!(persona?.pain_points?.length),
    personaHasDesires: !!(persona?.desires?.length),
    personaHasCommunicationStyle: !!(persona?.communication_style),
    personaHasObjections: !!(persona?.objections?.length),
    
    // Research
    webResearchEnabled: !!webResearchEnabled,
    learningContextAvailable: !!(learningContext?.feedbacks?.length),
    knowledgeGraphAvailable: !!(knowledgeGraph?.primaryIndustry),
    
    // Industry
    hasIndustryPack: !!industryMemory,
    hasComplianceRules: !!(industryMemory?.compliance_rules?.length),
    hasForbiddenTerms: !!(industryMemory?.forbidden_terms?.length),
  };
}

/**
 * Get final quality mode considering user preference and context
 */
export function getAutoBalancedQualityMode(
  userQualityMode: QualityMode | undefined,
  contextIndicators: ContextIndicators,
  allowAutoBalance: boolean = true
): { mode: QualityMode; reason: string; contextScore: number } {
  const richness = calculateContextRichness(contextIndicators);
  
  // If user explicitly set quality mode, respect it unless context is very different
  if (userQualityMode) {
    // User wants fast but context is poor → warn but allow
    if (userQualityMode === 'fast' && richness.total < QUALITY_THRESHOLDS.BALANCED_THRESHOLD) {
      return {
        mode: allowAutoBalance ? 'balanced' : 'fast',
        reason: allowAutoBalance 
          ? `User yêu cầu FAST nhưng context hạn chế (${richness.total}/100) → Auto-adjust to BALANCED`
          : `User yêu cầu FAST, context ${richness.total}/100 (có thể ảnh hưởng chất lượng)`,
        contextScore: richness.total,
      };
    }
    
    // User wants quality but context is rich → can suggest faster
    if (userQualityMode === 'quality' && richness.total >= QUALITY_THRESHOLDS.FAST_THRESHOLD && allowAutoBalance) {
      return {
        mode: 'balanced',
        reason: `Context rất giàu (${richness.total}/100) → Có thể dùng BALANCED thay vì QUALITY để tiết kiệm`,
        contextScore: richness.total,
      };
    }
    
    // User preference is appropriate for context
    return {
      mode: userQualityMode,
      reason: `User yêu cầu ${userQualityMode.toUpperCase()}, context ${richness.total}/100`,
      contextScore: richness.total,
    };
  }
  
  // No user preference → use auto-balanced recommendation
  return {
    mode: richness.recommendation,
    reason: richness.reasoning,
    contextScore: richness.total,
  };
}

/**
 * Build context richness summary for logging/debugging
 */
export function buildContextRichnessSummary(
  indicators: ContextIndicators
): string {
  const richness = calculateContextRichness(indicators);
  
  const parts: string[] = [];
  parts.push(`Context Richness: ${richness.total}/100`);
  parts.push(`- Brand: ${richness.brandScore}/25`);
  parts.push(`- Persona: ${richness.personaScore}/25`);
  parts.push(`- Research: ${richness.researchScore}/20`);
  parts.push(`- Core Content: ${richness.coreContentScore}/30`);
  parts.push(`- Industry: ${richness.industryScore}/10`);
  parts.push(`Sources: ${richness.sources.join(', ') || 'None'}`);
  parts.push(`Recommendation: ${richness.recommendation.toUpperCase()}`);
  
  return parts.join('\n');
}

/**
 * Get cost estimate adjustment based on context
 * More context = potentially less tokens needed
 */
export function getContextCostMultiplier(
  contextIndicators: ContextIndicators
): number {
  const richness = calculateContextRichness(contextIndicators);
  
  // Rich context: AI needs fewer tokens to understand and generate
  if (richness.total >= 80) return 0.85; // 15% reduction
  if (richness.total >= 60) return 0.92; // 8% reduction
  if (richness.total >= 40) return 1.0;  // Standard
  if (richness.total >= 20) return 1.08; // 8% increase
  return 1.15; // 15% increase for very sparse context
}
