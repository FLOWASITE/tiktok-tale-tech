// ============================================
// Quality-Context Balancer Types
// Frontend types for auto-balancing quality mode
// ============================================

export type QualityMode = 'fast' | 'balanced' | 'quality';

/**
 * Context richness score breakdown
 */
export interface ContextRichnessScore {
  total: number;
  brandScore: number;
  personaScore: number;
  researchScore: number;
  coreContentScore: number;
  industryScore: number;
  sources: string[];
  recommendation: QualityMode;
  reasoning: string;
}

/**
 * Context indicators from form data
 */
export interface ContextIndicators {
  hasCoreContent: boolean;
  coreContentWordCount: number;
  hasBrandTemplate: boolean;
  hasBrandVoice: boolean;
  hasProducts: boolean;
  hasCompetitors: boolean;
  hasChannelOverrides: boolean;
  hasPersona: boolean;
  personaHasPainPoints: boolean;
  personaHasDesires: boolean;
  personaHasCommunicationStyle: boolean;
  personaHasObjections: boolean;
  webResearchEnabled: boolean;
  learningContextAvailable: boolean;
  knowledgeGraphAvailable: boolean;
  hasIndustryPack: boolean;
  hasComplianceRules: boolean;
  hasForbiddenTerms: boolean;
}

/**
 * Auto-balance result
 */
export interface AutoBalanceResult {
  mode: QualityMode;
  reason: string;
  contextScore: number;
}

/**
 * Quality mode display info
 */
export const QUALITY_MODE_INFO: Record<QualityMode, {
  label: string;
  vietnameseLabel: string;
  description: string;
  icon: string;
  color: string;
  speedMultiplier: number;
  costMultiplier: number;
}> = {
  fast: {
    label: 'Fast',
    vietnameseLabel: 'Nhanh',
    description: 'Tối ưu tốc độ, phù hợp khi có nhiều context',
    icon: '⚡',
    color: 'yellow',
    speedMultiplier: 0.5,
    costMultiplier: 0.75,
  },
  balanced: {
    label: 'Balanced',
    vietnameseLabel: 'Cân bằng',
    description: 'Cân bằng giữa tốc độ và chất lượng',
    icon: '⚖️',
    color: 'blue',
    speedMultiplier: 1.0,
    costMultiplier: 1.0,
  },
  quality: {
    label: 'Quality',
    vietnameseLabel: 'Chất lượng',
    description: 'Tối ưu chất lượng, cần khi context hạn chế',
    icon: '✨',
    color: 'purple',
    speedMultiplier: 1.5,
    costMultiplier: 1.25,
  },
};

/**
 * Quality mode thresholds
 */
export const QUALITY_THRESHOLDS = {
  FAST_THRESHOLD: 70,      // Rich context (70+): Use fast mode
  BALANCED_THRESHOLD: 40,  // Medium context (40-69): Use balanced mode
  // Below 40: Use quality mode
};

/**
 * Context weight definitions for transparency
 */
export const CONTEXT_WEIGHTS = {
  coreContent: { max: 30, label: 'Core Content' },
  brand: { max: 25, label: 'Brand Context' },
  persona: { max: 25, label: 'Persona Data' },
  research: { max: 20, label: 'Research/Web' },
  industry: { max: 10, label: 'Industry Pack' },
};

/**
 * Calculate context richness score (client-side simplified version)
 */
export function calculateContextRichness(
  indicators: Partial<ContextIndicators>
): ContextRichnessScore {
  let total = 0;
  const sources: string[] = [];
  
  // Core Content (max 30)
  let coreContentScore = 0;
  if (indicators.hasCoreContent) {
    coreContentScore = 20;
    sources.push('Core Content');
    const wordBonus = Math.min((indicators.coreContentWordCount || 0) * 0.005, 10);
    coreContentScore += wordBonus;
  }
  
  // Brand (max 25)
  let brandScore = 0;
  if (indicators.hasBrandTemplate) {
    brandScore += 8;
    sources.push('Brand Template');
  }
  if (indicators.hasBrandVoice) brandScore += 6;
  if (indicators.hasProducts) brandScore += 4;
  if (indicators.hasCompetitors) brandScore += 3;
  if (indicators.hasChannelOverrides) brandScore += 4;
  
  // Persona (max 25)
  let personaScore = 0;
  if (indicators.hasPersona) {
    personaScore += 10;
    sources.push('Persona');
    if (indicators.personaHasPainPoints) personaScore += 5;
    if (indicators.personaHasDesires) personaScore += 5;
    if (indicators.personaHasCommunicationStyle) personaScore += 3;
    if (indicators.personaHasObjections) personaScore += 2;
  }
  
  // Research (max 20)
  let researchScore = 0;
  if (indicators.webResearchEnabled) {
    researchScore += 8;
    sources.push('Web Research');
  }
  if (indicators.learningContextAvailable) {
    researchScore += 6;
    sources.push('Learning Context');
  }
  if (indicators.knowledgeGraphAvailable) {
    researchScore += 6;
    sources.push('Knowledge Graph');
  }
  
  // Industry (max 10)
  let industryScore = 0;
  if (indicators.hasIndustryPack) {
    industryScore += 5;
    sources.push('Industry Pack');
    if (indicators.hasComplianceRules) industryScore += 3;
    if (indicators.hasForbiddenTerms) industryScore += 2;
  }
  
  total = Math.min(100, coreContentScore + brandScore + personaScore + researchScore + industryScore);
  
  // Determine recommendation
  let recommendation: QualityMode;
  let reasoning: string;
  
  const majorSources = sources.filter(s => 
    ['Core Content', 'Brand Template', 'Persona', 'Web Research'].includes(s)
  ).length;
  
  if (total >= QUALITY_THRESHOLDS.FAST_THRESHOLD && majorSources >= 2) {
    recommendation = 'fast';
    reasoning = `Rich context (${total}/100) với ${majorSources} nguồn chính → FAST mode`;
  } else if (total >= QUALITY_THRESHOLDS.BALANCED_THRESHOLD) {
    recommendation = 'balanced';
    reasoning = `Context trung bình (${total}/100) → BALANCED mode`;
  } else {
    recommendation = 'quality';
    reasoning = `Context hạn chế (${total}/100) → QUALITY mode để AI sáng tạo tốt hơn`;
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
 * Build context indicators from form state
 */
export function buildContextIndicatorsFromForm(options: {
  coreContent?: string | null;
  brandTemplateId?: string | null;
  brandVoice?: any;
  personaId?: string | null;
  persona?: any;
  industryId?: string | null;
  webResearchEnabled?: boolean;
}): Partial<ContextIndicators> {
  const coreContentWordCount = options.coreContent 
    ? options.coreContent.split(/\s+/).filter(Boolean).length 
    : 0;
    
  return {
    hasCoreContent: !!options.coreContent && coreContentWordCount > 50,
    coreContentWordCount,
    hasBrandTemplate: !!options.brandTemplateId,
    hasBrandVoice: !!(options.brandVoice?.tone_of_voice?.length || options.brandVoice?.formality_level),
    hasProducts: false, // Would need to check brand template
    hasCompetitors: false,
    hasChannelOverrides: false,
    hasPersona: !!options.personaId || !!options.persona,
    personaHasPainPoints: !!(options.persona?.pain_points?.length),
    personaHasDesires: !!(options.persona?.desires?.length),
    personaHasCommunicationStyle: !!(options.persona?.communication_style),
    personaHasObjections: !!(options.persona?.objections?.length),
    webResearchEnabled: !!options.webResearchEnabled,
    learningContextAvailable: false, // Set by backend
    knowledgeGraphAvailable: !!options.industryId,
    hasIndustryPack: !!options.industryId,
    hasComplianceRules: false,
    hasForbiddenTerms: false,
  };
}
