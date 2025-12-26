import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

// Default suggestions with enhanced structure and scores
const DEFAULT_SUGGESTIONS: Record<ContentGoal, EnhancedTopicSuggestion[]> = {
  education: [
    {
      topic: 'Hướng dẫn từng bước cho người mới bắt đầu',
      category: 'evergreen',
      formats: ['carousel', 'script', 'multichannel'],
      estimatedEngagement: 'high',
      reasoning: 'Nội dung hướng dẫn luôn có giá trị lâu dài và được tìm kiếm nhiều',
      relatedKeywords: ['hướng dẫn', 'bắt đầu', 'cơ bản', 'tutorial'],
      bestTimeToPost: '9:00 - 11:00',
      scores: { brandFit: 80, trend: 65, competition: 75, engagement: 80 },
      topicType: 'solution',
      funnelStage: 'tofu',
      emotionalTone: 'educate',
    },
    {
      topic: '5 sai lầm phổ biến và cách tránh',
      category: 'evergreen',
      formats: ['carousel', 'multichannel'],
      estimatedEngagement: 'high',
      reasoning: 'Người dùng luôn muốn tránh sai lầm, dễ gây tương tác và chia sẻ',
      relatedKeywords: ['sai lầm', 'tránh', 'kinh nghiệm', 'bài học'],
      scores: { brandFit: 75, trend: 70, competition: 65, engagement: 85 },
      topicType: 'problem',
      funnelStage: 'tofu',
      emotionalTone: 'educate',
    },
    {
      topic: 'Checklist hoàn chỉnh cho năm 2025',
      category: 'seasonal',
      formats: ['carousel', 'multichannel'],
      estimatedEngagement: 'medium',
      reasoning: 'Checklist dễ lưu và chia sẻ, phù hợp đầu năm mới',
      relatedKeywords: ['checklist', '2025', 'kế hoạch', 'mục tiêu'],
      scores: { brandFit: 70, trend: 80, competition: 60, engagement: 70 },
      topicType: 'solution',
      funnelStage: 'mofu',
      emotionalTone: 'educate',
    },
  ],
  awareness: [
    {
      topic: 'Câu chuyện đằng sau thương hiệu',
      category: 'evergreen',
      formats: ['script', 'multichannel'],
      estimatedEngagement: 'high',
      reasoning: 'Storytelling tạo kết nối cảm xúc mạnh với khách hàng',
      relatedKeywords: ['câu chuyện', 'brand story', 'khởi nghiệp', 'hành trình'],
      scores: { brandFit: 95, trend: 60, competition: 80, engagement: 85 },
      topicType: 'story',
      funnelStage: 'tofu',
      emotionalTone: 'inspire',
    },
    {
      topic: 'Giá trị cốt lõi mà chúng tôi theo đuổi',
      category: 'evergreen',
      formats: ['carousel', 'multichannel'],
      estimatedEngagement: 'medium',
      reasoning: 'Giúp khách hàng hiểu và tin tưởng thương hiệu hơn',
      relatedKeywords: ['giá trị', 'core values', 'sứ mệnh', 'tầm nhìn'],
      scores: { brandFit: 90, trend: 55, competition: 70, engagement: 70 },
      topicType: 'story',
      funnelStage: 'mofu',
      emotionalTone: 'inspire',
    },
  ],
  engagement: [
    {
      topic: 'Bạn nghĩ gì về xu hướng này?',
      category: 'reactive',
      formats: ['multichannel'],
      estimatedEngagement: 'high',
      reasoning: 'Câu hỏi mở khuyến khích bình luận và thảo luận',
      relatedKeywords: ['xu hướng', 'ý kiến', 'bình luận', 'thảo luận'],
      scores: { brandFit: 70, trend: 85, competition: 50, engagement: 95 },
      topicType: 'data',
      funnelStage: 'tofu',
      emotionalTone: 'entertain',
    },
    {
      topic: 'Thử thách 7 ngày: Bạn có dám thử?',
      category: 'trending',
      formats: ['script', 'multichannel'],
      estimatedEngagement: 'high',
      reasoning: 'Challenges luôn viral và tạo FOMO',
      relatedKeywords: ['challenge', 'thử thách', '7 ngày', 'viral'],
      scores: { brandFit: 65, trend: 90, competition: 55, engagement: 90 },
      topicType: 'solution',
      funnelStage: 'mofu',
      emotionalTone: 'inspire',
    },
  ],
  expertise: [
    {
      topic: 'Phân tích chuyên sâu: Xu hướng thị trường 2025',
      category: 'seasonal',
      formats: ['carousel', 'script', 'multichannel'],
      estimatedEngagement: 'high',
      reasoning: 'Nội dung chuyên sâu xây dựng uy tín và được share nhiều',
      relatedKeywords: ['phân tích', 'xu hướng', 'thị trường', 'dự báo'],
      scores: { brandFit: 85, trend: 80, competition: 70, engagement: 80 },
      topicType: 'data',
      funnelStage: 'mofu',
      emotionalTone: 'educate',
    },
    {
      topic: 'Case study thành công từ thực tế',
      category: 'evergreen',
      formats: ['carousel', 'multichannel'],
      estimatedEngagement: 'high',
      reasoning: 'Case study là proof of concept tốt nhất',
      relatedKeywords: ['case study', 'thành công', 'khách hàng', 'kết quả'],
      scores: { brandFit: 80, trend: 65, competition: 75, engagement: 75 },
      topicType: 'story',
      funnelStage: 'bofu',
      emotionalTone: 'convince',
    },
  ],
  conversion: [
    {
      topic: 'Ưu đãi độc quyền: Chỉ còn 24 giờ',
      category: 'reactive',
      formats: ['multichannel'],
      estimatedEngagement: 'high',
      reasoning: 'FOMO và urgency thúc đẩy hành động nhanh',
      relatedKeywords: ['ưu đãi', 'giảm giá', 'flash sale', 'khuyến mãi'],
      scores: { brandFit: 75, trend: 70, competition: 60, engagement: 85 },
      topicType: 'solution',
      funnelStage: 'bofu',
      emotionalTone: 'convince',
    },
    {
      topic: 'Vì sao khách hàng chọn chúng tôi',
      category: 'evergreen',
      formats: ['carousel', 'script', 'multichannel'],
      estimatedEngagement: 'medium',
      reasoning: 'Social proof tăng niềm tin và conversion',
      relatedKeywords: ['testimonial', 'review', 'khách hàng', 'lý do'],
      scores: { brandFit: 85, trend: 60, competition: 65, engagement: 70 },
      topicType: 'story',
      funnelStage: 'bofu',
      emotionalTone: 'convince',
    },
  ],
};

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
  
  const prevParamsRef = useRef<string>('');

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

  // Filter by format if specified
  const filteredSuggestions = format
    ? sortedSuggestions.filter((s) => s.formats.includes(format))
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
  };
}
