import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { ContentGoal } from '@/types/multichannel';
import { 
  EnhancedTopicSuggestion, 
  TopicFormat, 
  TopicCategory, 
  EngagementLevel, 
  SortOption,
  TopicScores,
  calculateOverallScore 
} from '@/types/topicDiscovery';
import { QUICK_START_TEMPLATES, QuickStartTemplate } from '@/types/quickStartTemplates';
import { toast } from 'sonner';

interface UseEnhancedTopicSuggestionsOptions {
  brandTemplateId?: string;
  contentGoal: ContentGoal;
  format?: TopicFormat;
  enabled?: boolean;
}

interface TopicSuggestionsResult {
  suggestions: EnhancedTopicSuggestion[];
  source: 'ai' | 'cache' | 'fallback';
  error?: string;
}

// Map funnel stage to topic category
function mapFunnelToCategory(funnelStage: string): TopicCategory {
  switch (funnelStage) {
    case 'tofu':
      return 'evergreen';
    case 'mofu':
      return 'trending';
    case 'bofu':
      return 'reactive';
    default:
      return 'evergreen';
  }
}

// Convert Quick Start Template to EnhancedTopicSuggestion
function templateToSuggestion(template: QuickStartTemplate, goal: ContentGoal): EnhancedTopicSuggestion {
  // Calculate scores based on funnel stage and emotional tone
  const baseScore = goal === 'conversion' ? 80 : 70;
  const engagementBoost = template.funnelStage === 'bofu' ? 10 : template.funnelStage === 'mofu' ? 5 : 0;
  const trendBoost = template.emotionalTone === 'entertain' ? 15 : template.emotionalTone === 'inspire' ? 10 : 0;
  
  return {
    topic: template.suggestedTopicTemplate,
    category: mapFunnelToCategory(template.funnelStage),
    formats: ['carousel', 'script', 'multichannel'] as TopicFormat[],
    estimatedEngagement: template.funnelStage === 'bofu' ? 'high' : 'medium' as EngagementLevel,
    reasoning: template.description,
    relatedKeywords: [],
    scores: { 
      brandFit: baseScore + 5, 
      trend: baseScore - 5 + trendBoost, 
      competition: baseScore - 10, 
      engagement: baseScore + engagementBoost 
    },
    topicType: template.emotionalTone === 'convince' ? 'solution' : 
               template.emotionalTone === 'inspire' ? 'story' : 
               template.emotionalTone === 'educate' ? 'solution' : 'data',
    funnelStage: template.funnelStage,
    emotionalTone: template.emotionalTone,
  };
}

// Generate DEFAULT_SUGGESTIONS from QUICK_START_TEMPLATES
const DEFAULT_SUGGESTIONS: Record<ContentGoal, EnhancedTopicSuggestion[]> = (
  Object.entries(QUICK_START_TEMPLATES) as [ContentGoal, QuickStartTemplate[]][]
).reduce((acc, [goal, templates]) => {
  acc[goal] = templates.map(t => templateToSuggestion(t, goal));
  return acc;
}, {} as Record<ContentGoal, EnhancedTopicSuggestion[]>);

// Sorting functions
function sortByOverall(a: EnhancedTopicSuggestion, b: EnhancedTopicSuggestion): number {
  const scoreA = a.scores ? calculateOverallScore(a.scores) : 0;
  const scoreB = b.scores ? calculateOverallScore(b.scores) : 0;
  return scoreB - scoreA;
}

function sortByField(field: keyof TopicScores) {
  return (a: EnhancedTopicSuggestion, b: EnhancedTopicSuggestion): number => {
    const scoreA = a.scores?.[field] || 0;
    const scoreB = b.scores?.[field] || 0;
    return scoreB - scoreA;
  };
}

export function useEnhancedTopicSuggestions({
  brandTemplateId,
  contentGoal,
  format,
  enabled = true,
}: UseEnhancedTopicSuggestionsOptions) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  
  // Show default suggestions immediately for instant perceived loading
  const [suggestions, setSuggestions] = useState<EnhancedTopicSuggestion[]>(
    DEFAULT_SUGGESTIONS[contentGoal] || []
  );
  const [source, setSource] = useState<'ai' | 'cache' | 'fallback'>('fallback');
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false); // Separate state for background AI loading
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('overall');
  const [minScore, setMinScore] = useState<number>(0);
  const [autoSavedCount, setAutoSavedCount] = useState(0);
  
  const prevParamsRef = useRef<string>('');
  const autoSavedTopicsRef = useRef<Set<string>>(new Set());

  const fetchSuggestions = useCallback(async () => {
    if (!enabled) return;

    // Don't show main loading state - we already have defaults
    setIsEnhancing(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke<TopicSuggestionsResult>(
        'generate-topic-suggestions',
        {
          body: {
            contentGoal,
            brandTemplateId,
            organizationId: currentOrganization?.id,
            format,
            enhanced: true,
          },
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data?.suggestions && data.suggestions.length > 0) {
        // Transform suggestions to ensure all have scores
        const enhancedSuggestions: EnhancedTopicSuggestion[] = data.suggestions.map((s: any) => {
          if (typeof s === 'string') {
            return {
              topic: s,
              category: 'evergreen' as TopicCategory,
              formats: ['carousel', 'script', 'multichannel'] as TopicFormat[],
              estimatedEngagement: 'medium' as EngagementLevel,
              reasoning: 'Gợi ý từ AI dựa trên brand context',
              relatedKeywords: [],
              scores: { brandFit: 70, trend: 60, competition: 65, engagement: 70 },
            };
          }
          // Ensure scores exist
          return {
            ...s,
            scores: s.scores || { brandFit: 70, trend: 60, competition: 65, engagement: 70 },
          } as EnhancedTopicSuggestion;
        });

        setSuggestions(enhancedSuggestions);
        setSource(data.source);
      } else {
        setSuggestions(DEFAULT_SUGGESTIONS[contentGoal] || []);
        setSource('fallback');
      }

      if (data?.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error('Error fetching enhanced topic suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch suggestions');
      setSuggestions(DEFAULT_SUGGESTIONS[contentGoal] || []);
      setSource('fallback');
    } finally {
      setIsEnhancing(false);
    }
  }, [brandTemplateId, contentGoal, format, enabled]);

  // Track if we've loaded AI suggestions at least once for current params
  const hasLoadedRef = useRef(false);
  
  useEffect(() => {
    const paramsKey = `${contentGoal}:${brandTemplateId || ''}:${format || ''}`;
    
    // If params changed, reset loaded flag and show defaults
    if (paramsKey !== prevParamsRef.current) {
      hasLoadedRef.current = false;
      setSuggestions(DEFAULT_SUGGESTIONS[contentGoal] || []);
      setSource('fallback');
    }
    
    // If not enabled, keep existing suggestions (don't reset to defaults)
    if (!enabled) {
      return;
    }

    // If already loaded for these params, don't fetch again
    if (paramsKey === prevParamsRef.current && hasLoadedRef.current) {
      return;
    }
    
    prevParamsRef.current = paramsKey;

    // Reduced debounce from 500ms to 300ms
    const timer = setTimeout(() => {
      fetchSuggestions().then(() => {
        hasLoadedRef.current = true;
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [contentGoal, brandTemplateId, format, enabled, fetchSuggestions]);

  const refresh = useCallback(() => {
    prevParamsRef.current = '';
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Sort and filter suggestions
  const sortedSuggestions = useMemo(() => {
    let result = [...suggestions];

    // Filter by minimum score
    if (minScore > 0) {
      result = result.filter((s) => {
        if (!s.scores) return false;
        return calculateOverallScore(s.scores) >= minScore;
      });
    }

    // Sort by selected option
    switch (sortBy) {
      case 'brandFit':
        result.sort(sortByField('brandFit'));
        break;
      case 'trend':
        result.sort(sortByField('trend'));
        break;
      case 'engagement':
        result.sort(sortByField('engagement'));
        break;
      case 'competition':
        result.sort(sortByField('competition'));
        break;
      case 'overall':
      default:
        result.sort(sortByOverall);
        break;
    }

    return result;
  }, [suggestions, sortBy, minScore]);

  // Filter by format if specified - use partial match for flexible format matching
  // e.g., "video script" should match "script", "carousel post" should match "carousel"
  const filteredSuggestions = format
    ? sortedSuggestions.filter((s) =>
        s.formats.some((f) => {
          const normalizedF = f.toLowerCase();
          const normalizedFormat = format.toLowerCase();
          return (
            normalizedF.includes(normalizedFormat) ||
            normalizedFormat.includes(normalizedF) ||
            normalizedF === normalizedFormat
          );
        })
      )
    : sortedSuggestions;

  // Computed stats
  const stats = useMemo(() => {
    const withScores = suggestions.filter((s) => s.scores);
    if (withScores.length === 0) return null;

    const overallScores = withScores.map((s) => calculateOverallScore(s.scores!));
    const averageScore = Math.round(overallScores.reduce((a, b) => a + b, 0) / overallScores.length);
    const topPerformers = withScores.filter((s) => calculateOverallScore(s.scores!) >= 75);

    return {
      averageScore,
      topPerformersCount: topPerformers.length,
      totalCount: suggestions.length,
    };
  }, [suggestions]);

  // Auto-save AI suggestions to topic_history as drafts
  const autoSaveSuggestions = useCallback(async (topics: EnhancedTopicSuggestion[]) => {
    if (!user || topics.length === 0) return;

    // Filter out already saved topics
    const newTopics = topics.filter(t => !autoSavedTopicsRef.current.has(t.topic));
    if (newTopics.length === 0) return;

    try {
      // Check which topics already exist in database
      const topicTexts = newTopics.map(t => t.topic);
      const { data: existing } = await supabase
        .from('topic_history')
        .select('topic')
        .in('topic', topicTexts)
        .eq('organization_id', currentOrganization?.id || '')
        .limit(100);

      const existingSet = new Set((existing || []).map(e => e.topic));
      const toInsert = newTopics.filter(t => !existingSet.has(t.topic));

      if (toInsert.length === 0) {
        // Mark as already saved
        newTopics.forEach(t => autoSavedTopicsRef.current.add(t.topic));
        return;
      }

      const insertData = toInsert.map(topic => ({
        topic: topic.topic,
        category: topic.category,
        content_goal: contentGoal,
        format: format || 'multichannel',
        pillar: topic.pillar || null,
        scores: topic.scores || {},
        related_keywords: topic.relatedKeywords || [],
        reasoning: topic.reasoning || null,
        usage_status: 'draft',
        was_used: false,
        is_favorite: false,
        user_id: user.id,
        organization_id: currentOrganization?.id || null,
        brand_template_id: brandTemplateId || null,
      }));

      const { error: insertError } = await supabase
        .from('topic_history')
        .insert(insertData);

      if (!insertError) {
        toInsert.forEach(t => autoSavedTopicsRef.current.add(t.topic));
        setAutoSavedCount(prev => prev + toInsert.length);
        toast.success(`Đã lưu ${toInsert.length} ý tưởng vào Kho`, {
          description: 'Bạn có thể xem trong Kho Ý tưởng',
          duration: 3000,
        });
      }
    } catch (err) {
      console.error('Error auto-saving suggestions:', err);
    }
  }, [user, currentOrganization?.id, brandTemplateId, contentGoal, format]);

  // Submit feedback for a suggestion
  const submitFeedback = useCallback(async (
    suggestion: EnhancedTopicSuggestion,
    feedback: 'positive' | 'negative'
  ) => {
    if (!user) return;

    try {
      // Find the topic in history or create one
      const { data: existing } = await supabase
        .from('topic_history')
        .select('id')
        .eq('topic', suggestion.topic)
        .eq('organization_id', currentOrganization?.id || '')
        .single();

      if (existing) {
        await supabase
          .from('topic_history')
          .update({ feedback })
          .eq('id', existing.id);
      } else {
        // Insert with feedback
        await supabase
          .from('topic_history')
          .insert({
            topic: suggestion.topic,
            category: suggestion.category,
            content_goal: contentGoal,
            format: format || 'multichannel',
            scores: suggestion.scores || {},
            reasoning: suggestion.reasoning || null,
            usage_status: 'suggested',
            was_used: false,
            is_favorite: false,
            feedback,
            user_id: user.id,
            organization_id: currentOrganization?.id || null,
            brand_template_id: brandTemplateId || null,
          });
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  }, [user, currentOrganization?.id, brandTemplateId, contentGoal, format]);

  // Save a single suggestion to topic bank
  const saveSuggestion = useCallback(async (suggestion: EnhancedTopicSuggestion) => {
    if (!user) return null;

    try {
      const { data, error: insertError } = await supabase
        .from('topic_history')
        .insert({
          topic: suggestion.topic,
          category: suggestion.category,
          content_goal: contentGoal,
          format: format || 'multichannel',
          pillar: suggestion.pillar || null,
          scores: suggestion.scores || {},
          related_keywords: suggestion.relatedKeywords || [],
          reasoning: suggestion.reasoning || null,
          usage_status: 'suggested',
          was_used: false,
          is_favorite: false,
          user_id: user.id,
          organization_id: currentOrganization?.id || null,
          brand_template_id: brandTemplateId || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      autoSavedTopicsRef.current.add(suggestion.topic);
      return data?.id;
    } catch (err) {
      console.error('Error saving suggestion:', err);
      return null;
    }
  }, [user, currentOrganization?.id, brandTemplateId, contentGoal, format]);

  return {
    suggestions: filteredSuggestions,
    allSuggestions: sortedSuggestions,
    source,
    isLoading,
    isEnhancing, // New: shows AI is working in background
    error,
    refresh,
    // Sorting controls
    sortBy,
    setSortBy,
    minScore,
    setMinScore,
    // Stats
    stats,
    // New: auto-save and feedback
    autoSavedCount,
    autoSaveSuggestions,
    submitFeedback,
    saveSuggestion,
  };
}
