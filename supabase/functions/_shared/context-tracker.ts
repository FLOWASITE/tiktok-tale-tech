// Context Tracker - Tracks which context sources are actually used in AI responses
// This enables realtime context badges on the frontend

export type ContextBadgeType = 
  | 'compliance' 
  | 'top-performer' 
  | 'persona-fit' 
  | 'product-linked' 
  | 'journey' 
  | 'brand-voice' 
  | 'glossary'
  | 'personalized'
  | 'memory'
  | 'trending'
  | 'evergreen'
  | 'rag-enhanced'
  | 'web-search';

export interface ContextBadge {
  type: ContextBadgeType;
  label: string;
  detail?: string; // Additional context (e.g., journey stage name, persona name)
  confidence?: number; // 0-1 confidence score
}

export interface ContextMetadata {
  badges: ContextBadge[];
  sources: {
    industryMemory: boolean;
    learningContext: boolean;
    brandContext: boolean;
    personasContext: boolean;
    productsContext: boolean;
    journeyMessaging: boolean;
    sampleTexts: boolean;
    glossary: boolean;
    ragResults: boolean;
    userPreferences: boolean;
    sessionMemory: boolean;
    webSearch: boolean;
  };
  prompt_tokens_estimate?: number;
  context_richness_score?: number; // 0-100 score based on available context
}

interface ContextTrackerOptions {
  industryMemory?: any;
  learningContext?: any;
  brandContext?: any;
  personasContext?: string[];
  productsContext?: string[];
  journeyMessaging?: any[];
  sampleTexts?: Record<string, string> | null;
  industryGlossary?: any[];
  ragResults?: any[];
  userPreferences?: any;
  sessionMemory?: any;
  webSearchResults?: any[];
}

/**
 * Build context metadata based on available context sources
 */
export function buildContextMetadata(options: ContextTrackerOptions): ContextMetadata {
  const badges: ContextBadge[] = [];
  const sources = {
    industryMemory: false,
    learningContext: false,
    brandContext: false,
    personasContext: false,
    productsContext: false,
    journeyMessaging: false,
    sampleTexts: false,
    glossary: false,
    ragResults: false,
    userPreferences: false,
    sessionMemory: false,
    webSearch: false,
  };

  // Track industry memory / compliance
  if (options.industryMemory) {
    sources.industryMemory = true;
    badges.push({
      type: 'compliance',
      label: 'Compliance',
      detail: options.industryMemory.name || options.industryMemory.code,
      confidence: 1.0,
    });
  }

  // Track learning context (top performers)
  if (options.learningContext) {
    sources.learningContext = true;
    const lc = options.learningContext;
    
    if (lc.topPerformers?.length > 0 || lc.performanceInsights?.length > 0) {
      badges.push({
        type: 'top-performer',
        label: 'Top Performer',
        detail: lc.topPerformers?.length > 0 
          ? `${lc.topPerformers.length} patterns` 
          : `${lc.performanceInsights?.length || 0} insights`,
        confidence: 0.9,
      });
    }

    // Check for trending/evergreen from learning
    if (lc.seasonalRelevance) {
      badges.push({
        type: 'trending',
        label: 'Trending',
        detail: 'Seasonal relevance',
        confidence: 0.8,
      });
    }

    if (lc.evergreenThemes?.length > 0) {
      badges.push({
        type: 'evergreen',
        label: 'Evergreen',
        detail: `${lc.evergreenThemes.length} themes`,
        confidence: 0.85,
      });
    }
  }

  // Track brand context
  if (options.brandContext) {
    sources.brandContext = true;
    badges.push({
      type: 'brand-voice',
      label: 'Brand Voice',
      detail: options.brandContext.brandName,
      confidence: 1.0,
    });
  }

  // Track personas
  if (options.personasContext && options.personasContext.length > 0) {
    sources.personasContext = true;
    badges.push({
      type: 'persona-fit',
      label: 'Persona-fit',
      detail: `${options.personasContext.length} persona(s)`,
      confidence: 0.95,
    });
  }

  // Track products
  if (options.productsContext && options.productsContext.length > 0) {
    sources.productsContext = true;
    badges.push({
      type: 'product-linked',
      label: 'Product',
      detail: `${options.productsContext.length} product(s)`,
      confidence: 0.95,
    });
  }

  // Track journey stage messaging
  if (options.journeyMessaging && options.journeyMessaging.length > 0) {
    sources.journeyMessaging = true;
    const primaryStage = options.journeyMessaging[0]?.journey_stage;
    badges.push({
      type: 'journey',
      label: 'Journey',
      detail: primaryStage || 'Multi-stage',
      confidence: 0.9,
    });
  }

  // Track sample texts
  if (options.sampleTexts && Object.keys(options.sampleTexts).length > 0) {
    sources.sampleTexts = true;
    // Sample texts contribute to brand voice, already tracked
  }

  // Track glossary
  if (options.industryGlossary && options.industryGlossary.length > 0) {
    sources.glossary = true;
    badges.push({
      type: 'glossary',
      label: 'Glossary',
      detail: `${options.industryGlossary.length} terms`,
      confidence: 0.85,
    });
  }

  // Track RAG results
  if (options.ragResults && options.ragResults.length > 0) {
    sources.ragResults = true;
    badges.push({
      type: 'rag-enhanced',
      label: 'RAG-enhanced',
      detail: `${options.ragResults.length} references`,
      confidence: 0.9,
    });
  }

  // Track user preferences (personalization)
  if (options.userPreferences) {
    sources.userPreferences = true;
    const prefs = options.userPreferences;
    if (prefs.preferredTone || prefs.skillLevel || prefs.stylePatterns?.length > 0) {
      badges.push({
        type: 'personalized',
        label: 'Personalized',
        detail: prefs.skillLevel || 'User adapted',
        confidence: 0.85,
      });
    }
  }

  // Track cross-session memory
  if (options.sessionMemory) {
    sources.sessionMemory = true;
    const mem = options.sessionMemory;
    if (mem.insights?.length > 0 || mem.corrections?.length > 0) {
      badges.push({
        type: 'memory',
        label: 'Memory',
        detail: `${mem.insights?.length || 0} insights`,
        confidence: 0.9,
      });
    }
  }

  // Track web search results
  if (options.webSearchResults && options.webSearchResults.length > 0) {
    sources.webSearch = true;
    badges.push({
      type: 'web-search',
      label: 'Web Search',
      detail: `${options.webSearchResults.length} results`,
      confidence: 0.95,
    });
  }

  // Calculate context richness score (0-100)
  const activeSourcesCount = Object.values(sources).filter(Boolean).length;
  const maxSources = Object.keys(sources).length;
  const context_richness_score = Math.round((activeSourcesCount / maxSources) * 100);

  return {
    badges,
    sources,
    context_richness_score,
  };
}

/**
 * Serialize context metadata for SSE streaming
 */
export function serializeContextMetadata(metadata: ContextMetadata): string {
  return JSON.stringify({
    type: 'context_metadata',
    ...metadata,
  });
}

/**
 * Build a concise context summary for logging
 */
export function summarizeContext(metadata: ContextMetadata): string {
  const activeSources = Object.entries(metadata.sources)
    .filter(([_, active]) => active)
    .map(([name, _]) => name);
  
  return `Context: ${activeSources.join(', ')} (${metadata.badges.length} badges, richness: ${metadata.context_richness_score}%)`;
}
