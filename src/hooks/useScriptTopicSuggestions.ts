import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VideoType } from '@/types/script';
import { 
  EnhancedTopicSuggestion, 
  TopicScores, 
  SortOption,
  calculateOverallScore 
} from '@/types/topicDiscovery';

interface ScriptTopicSuggestionsResult {
  suggestions: EnhancedTopicSuggestion[];
  source: 'ai' | 'cache' | 'fallback';
  error?: string;
}

interface UseScriptTopicSuggestionsOptions {
  videoType: VideoType;
  brandTemplateId?: string;
  industry?: string;
  enabled?: boolean;
}

// Map video types to content goals for the AI
const VIDEO_TYPE_TO_GOAL: Record<VideoType, string> = {
  expert_share: 'expertise',
  analyze_explain: 'education', 
  warning_mistake: 'education',
  quick_qa: 'engagement',
};

// Default scores for fallback suggestions
const DEFAULT_SCORES: TopicScores = {
  brandFit: 60,
  trend: 50,
  competition: 55,
  engagement: 65,
};

const DEFAULT_SUGGESTIONS: Record<VideoType, EnhancedTopicSuggestion[]> = {
  expert_share: [
    {
      topic: '5 bí quyết thành công mà chuyên gia không tiết lộ',
      category: 'evergreen',
      formats: ['script'],
      estimatedEngagement: 'high',
      reasoning: 'Nội dung "insider secrets" luôn thu hút sự tò mò của người xem',
      relatedKeywords: ['bí quyết', 'thành công', 'chuyên gia'],
      scores: { brandFit: 70, trend: 55, competition: 60, engagement: 80 },
    },
    {
      topic: 'Xu hướng mới nhất trong ngành năm 2024',
      category: 'trending',
      formats: ['script'],
      estimatedEngagement: 'high',
      reasoning: 'Nội dung cập nhật xu hướng luôn được quan tâm đầu năm',
      relatedKeywords: ['xu hướng', '2024', 'mới nhất'],
      scores: { brandFit: 65, trend: 85, competition: 40, engagement: 75 },
    },
    {
      topic: 'Case study: Từ thất bại đến thành công',
      category: 'evergreen',
      formats: ['script'],
      estimatedEngagement: 'high',
      reasoning: 'Câu chuyện thực tế tạo sự đồng cảm và tin tưởng',
      relatedKeywords: ['case study', 'thất bại', 'thành công'],
      scores: { brandFit: 75, trend: 50, competition: 65, engagement: 85 },
    },
    {
      topic: 'Kinh nghiệm 10 năm gói gọn trong 60 giây',
      category: 'evergreen',
      formats: ['script'],
      estimatedEngagement: 'medium',
      reasoning: 'Format ngắn gọn, dễ tiếp thu, phù hợp video ngắn',
      relatedKeywords: ['kinh nghiệm', 'tips', 'nhanh'],
      scores: { brandFit: 60, trend: 60, competition: 55, engagement: 70 },
    },
  ],
  analyze_explain: [
    {
      topic: 'Giải thích đơn giản: Cách hoạt động của...',
      category: 'evergreen',
      formats: ['script'],
      estimatedEngagement: 'medium',
      reasoning: 'Nội dung giáo dục dễ hiểu luôn có giá trị lâu dài',
      relatedKeywords: ['giải thích', 'hướng dẫn', 'cách'],
      scores: { brandFit: 70, trend: 45, competition: 70, engagement: 65 },
    },
    {
      topic: 'So sánh A vs B: Đâu là lựa chọn tốt hơn?',
      category: 'evergreen',
      formats: ['script'],
      estimatedEngagement: 'high',
      reasoning: 'So sánh giúp người xem quyết định, tạo tranh luận trong comments',
      relatedKeywords: ['so sánh', 'review', 'nên chọn'],
      scores: { brandFit: 65, trend: 60, competition: 50, engagement: 80 },
    },
    {
      topic: 'Phân tích chi tiết: Ưu và nhược điểm',
      category: 'evergreen',
      formats: ['script'],
      estimatedEngagement: 'medium',
      reasoning: 'Phân tích khách quan tạo uy tín cho người xem',
      relatedKeywords: ['phân tích', 'ưu nhược', 'đánh giá'],
      scores: { brandFit: 70, trend: 50, competition: 60, engagement: 70 },
    },
  ],
  warning_mistake: [
    {
      topic: '5 sai lầm phổ biến người mới thường mắc phải',
      category: 'evergreen',
      formats: ['script'],
      estimatedEngagement: 'high',
      reasoning: 'Nội dung cảnh báo tạo FOMO, người xem muốn tránh sai lầm',
      relatedKeywords: ['sai lầm', 'tránh', 'người mới'],
      scores: { brandFit: 75, trend: 55, competition: 45, engagement: 90 },
    },
    {
      topic: 'Đừng làm điều này nếu bạn muốn thành công',
      category: 'evergreen',
      formats: ['script'],
      estimatedEngagement: 'high',
      reasoning: 'Tiêu đề negative tạo sự tò mò, CTR cao',
      relatedKeywords: ['đừng', 'cảnh báo', 'sai lầm'],
      scores: { brandFit: 70, trend: 50, competition: 50, engagement: 85 },
    },
    {
      topic: 'Tôi đã mất tiền triệu vì sai lầm này',
      category: 'evergreen',
      formats: ['script'],
      estimatedEngagement: 'high',
      reasoning: 'Câu chuyện cá nhân + số tiền cụ thể tạo impact mạnh',
      relatedKeywords: ['mất tiền', 'sai lầm', 'bài học'],
      scores: { brandFit: 65, trend: 60, competition: 55, engagement: 88 },
    },
  ],
  quick_qa: [
    {
      topic: 'Trả lời câu hỏi hay nhất của followers',
      category: 'reactive',
      formats: ['script'],
      estimatedEngagement: 'high',
      reasoning: 'Tương tác trực tiếp với khán giả tạo gắn kết cộng đồng',
      relatedKeywords: ['Q&A', 'hỏi đáp', 'followers'],
      scores: { brandFit: 80, trend: 65, competition: 70, engagement: 85 },
    },
    {
      topic: 'FAQ: Những thắc mắc phổ biến nhất',
      category: 'evergreen',
      formats: ['script'],
      estimatedEngagement: 'medium',
      reasoning: 'Giải đáp thắc mắc giúp tiết kiệm thời gian support',
      relatedKeywords: ['FAQ', 'câu hỏi', 'thắc mắc'],
      scores: { brandFit: 75, trend: 45, competition: 65, engagement: 70 },
    },
    {
      topic: 'Đúng hay sai? Giải đáp hiểu lầm phổ biến',
      category: 'evergreen',
      formats: ['script'],
      estimatedEngagement: 'high',
      reasoning: 'Format quiz tạo tương tác, người xem muốn kiểm tra hiểu biết',
      relatedKeywords: ['đúng sai', 'hiểu lầm', 'myth'],
      scores: { brandFit: 70, trend: 55, competition: 60, engagement: 80 },
    },
  ],
};

export function useScriptTopicSuggestions({
  videoType,
  brandTemplateId,
  industry,
  enabled = true,
}: UseScriptTopicSuggestionsOptions) {
  // Show defaults immediately for instant perceived loading
  const [suggestions, setSuggestions] = useState<EnhancedTopicSuggestion[]>(DEFAULT_SUGGESTIONS[videoType]);
  const [source, setSource] = useState<'ai' | 'cache' | 'fallback'>('fallback');
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false); // Separate state for background AI
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('overall');
  const [minScore, setMinScore] = useState(0);
  
  const prevParamsRef = useRef<string>('');
  
  const fetchSuggestions = useCallback(async () => {
    if (!enabled) return;
    
    // Don't show main loading - we have defaults showing
    setIsEnhancing(true);
    setError(null);
    
    try {
      const contentGoal = VIDEO_TYPE_TO_GOAL[videoType];
      
      const { data, error: functionError } = await supabase.functions.invoke<ScriptTopicSuggestionsResult>(
        'generate-topic-suggestions',
        {
          body: {
            industry,
            contentGoal,
            brandTemplateId,
            format: 'script',
            context: 'script',
          },
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data?.suggestions && data.suggestions.length > 0) {
        // Ensure all suggestions have proper structure
        const normalizedSuggestions: EnhancedTopicSuggestion[] = data.suggestions.map(s => ({
          topic: s.topic,
          category: s.category || 'evergreen',
          pillar: s.pillar,
          formats: s.formats || ['script'],
          estimatedEngagement: s.estimatedEngagement || 'medium',
          reasoning: s.reasoning || 'AI đề xuất dựa trên brand và ngành của bạn',
          relatedKeywords: s.relatedKeywords || [],
          bestTimeToPost: s.bestTimeToPost,
          scores: s.scores || DEFAULT_SCORES,
        }));
        
        setSuggestions(normalizedSuggestions);
        setSource(data.source);
      } else {
        setSuggestions(DEFAULT_SUGGESTIONS[videoType]);
        setSource('fallback');
      }

      if (data?.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error('Error fetching script topic suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch suggestions');
      setSuggestions(DEFAULT_SUGGESTIONS[videoType]);
      setSource('fallback');
    } finally {
      setIsEnhancing(false);
    }
  }, [industry, videoType, brandTemplateId, enabled]);

  // Show defaults immediately, then fetch AI suggestions in background
  useEffect(() => {
    // Always show defaults immediately when videoType changes
    setSuggestions(DEFAULT_SUGGESTIONS[videoType]);
    setSource('fallback');

    if (!enabled) {
      return;
    }

    const paramsKey = `script:${videoType}:${industry || ''}:${brandTemplateId || ''}`;
    
    if (paramsKey === prevParamsRef.current) return;
    prevParamsRef.current = paramsKey;
    
    // Reduced debounce from 500ms to 300ms
    const timer = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(timer);
  }, [industry, videoType, brandTemplateId, enabled, fetchSuggestions]);

  const refresh = useCallback(() => {
    prevParamsRef.current = '';
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Sorted suggestions
  const sortedSuggestions = useMemo(() => {
    let result = [...suggestions];
    
    // Filter by min score
    if (minScore > 0) {
      result = result.filter(s => {
        if (!s.scores) return true;
        return calculateOverallScore(s.scores) >= minScore;
      });
    }
    
    // Sort
    result.sort((a, b) => {
      if (!a.scores || !b.scores) return 0;
      
      if (sortBy === 'overall') {
        return calculateOverallScore(b.scores) - calculateOverallScore(a.scores);
      }
      return (b.scores[sortBy] || 0) - (a.scores[sortBy] || 0);
    });
    
    return result;
  }, [suggestions, sortBy, minScore]);

  return {
    suggestions: sortedSuggestions,
    allSuggestions: suggestions,
    source,
    isLoading,
    isEnhancing, // New: shows AI is working in background
    error,
    refresh,
    sortBy,
    setSortBy,
    minScore,
    setMinScore,
  };
}
