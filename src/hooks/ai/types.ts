/**
 * Shared AI types and error codes
 * Re-exports topic types from the source of truth to avoid duplication
 */

// Re-export all topic-related types from the source of truth
export type {
  TopicCategory,
  TopicFormat,
  EngagementLevel,
  SortOption,
  TopicScores,
  EnhancedTopicSuggestion,
  TopicType,
  FunnelStage,
  EmotionalTone,
  SearchIntent,
  ClusterRole,
  ContentTier,
  MediaOwnership,
  TopicDataSource,
  SuggestedKeywords,
  ContentSeries,
  TopicHistoryItem,
  ContentPillar,
  SeasonalEvent,
} from '@/types/topicDiscovery';

// Re-export utility function
export { calculateOverallScore } from '@/types/topicDiscovery';

// ============== AI ERROR TYPES ==============
export type AIErrorCode = 'CREDITS_EXHAUSTED' | 'RATE_LIMIT' | 'UNKNOWN';

export interface AIHookState {
  isLoading: boolean;
  error: string | null;
  errorCode: AIErrorCode | null;
}

export interface AIRequestOptions {
  brandTemplateId?: string;
  organizationId?: string;
  signal?: AbortSignal;
}

// ============== TOPIC REFINEMENT TYPES ==============
export interface RefinedTopic {
  topic: string;
  angle: string;
  hook: string;
  targetPersona?: string;
  targetPersonaId?: string;
  productFit?: string;
  productFitId?: string;
  suggestedJourneyStage?: 'awareness' | 'consideration' | 'decision' | 'loyalty';
  suggestedContentAngle?: string;
}

export interface RefineContextUsed {
  hasPersonas: boolean;
  hasProducts: boolean;
  hasIndustryMemory: boolean;
  hasLearningContext: boolean;
}

// ============== TOPIC INTELLIGENCE TYPES ==============
export interface TopicGap {
  pillar: string;
  gapType: 'missing' | 'underperforming' | 'overdue';
  severity: 'high' | 'medium' | 'low';
  reason: string;
  suggestedTopics: string[];
  priority: number;
}

export interface TopicCluster {
  clusterId: string;
  clusterName: string;
  topics: string[];
  topKeywords: string[];
  avgPerformance: number;
}

export interface KeywordExpansion {
  lsiKeywords: string[];
  trendingKeywords: string[];
  longTailKeywords: string[];
  competitorKeywords: string[];
  keywordClusters: { theme: string; keywords: string[] }[];
}

export interface TopicRefinementIntel {
  original: string;
  refinedVersions: {
    topic: string;
    improvement: string;
    angle: string;
    brandFitScore: number;
  }[];
  bestChoice: string;
  reasoning: string;
}

export interface GapAnalysisResult {
  gaps: TopicGap[];
  insights: string;
  recommendations: string[];
}

export interface ClusterAnalysisResult {
  clusters: TopicCluster[];
  unclustered: string[];
  summary: string;
}

// ============== TOPIC RECOMMENDATIONS TYPES ==============
export interface TrendingMatch {
  topic: string;
  velocityScore: number;
  source: 'web_search' | 'curated_event' | 'curated_news';
}

export interface NextBestTopic {
  topic: string;
  reason: string;
  confidence: number;
  pillar: string;
  suggestedFormat: string;
  timing: string;
  trendingMatch?: TrendingMatch | null;
}

export interface WeeklyPlanItem {
  day: string;
  topic: string;
  pillar: string;
  format: string;
  reason: string;
  priority: number;
  isTrendingBased?: boolean;
  trendingSource?: string | null;
}

export interface WeeklyPlan {
  weeklyPlan: WeeklyPlanItem[];
  weekTheme: string;
  insights: string;
  trendingTopicsUsed?: number;
}

export interface TopicConflict {
  topics: string[];
  type: 'duplicate' | 'contradiction' | 'cannibalization' | 'timing';
  severity: 'high' | 'medium' | 'low';
  explanation: string;
  resolution: string;
}

export interface ConflictCheckResult {
  conflicts: TopicConflict[];
  summary: string;
}

export interface LearningResult {
  learnings: string[];
  adjustments: {
    preferMore: string[];
    preferLess: string[];
    avoidPatterns: string[];
  };
  confidenceBoost: number;
}

// ============== TRENDING TOPICS TYPES ==============
export interface TrendingTopic {
  id: string;
  topic: string;
  category: string;
  velocity_score: number;
  peak_status: 'rising' | 'peaking' | 'declining';
  peak_prediction: string;
  related_keywords: string[];
  engagement_potential: number;
  competition_level: 'low' | 'medium' | 'high';
  suggested_angles: string[];
  source: string;
  created_at: string;
  expires_at: string;
}

// ============== AUDIENCE SUGGESTION TYPES ==============
export interface SuggestAudienceResult {
  success: boolean;
  matchedPersonaId?: string;
  matchedPersonaName?: string;
  matchScore: number;
  suggestedAudience: string;
  reasoning: string;
  keyCharacteristics: string[];
  alternativePersonaIds?: string[];
  alternativePersonaNames?: string[];
}
