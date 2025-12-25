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
  // Educational
  expert_share: 'expertise',
  tutorial_howto: 'education',
  analyze_explain: 'education', 
  listicle: 'education',
  // Engagement
  warning_mistake: 'education',
  quick_qa: 'engagement',
  myth_busting: 'engagement',
  before_after: 'engagement',
  // Entertainment
  story_pov: 'entertainment',
  day_in_life: 'entertainment',
  behind_scenes: 'entertainment',
  reaction: 'entertainment',
  // Commercial
  product_review: 'sales',
  case_study: 'sales',
  transformation: 'sales',
};

// Default scores for fallback suggestions
const DEFAULT_SCORES: TopicScores = {
  brandFit: 60,
  trend: 50,
  competition: 55,
  engagement: 65,
};

// Generate default suggestions for each video type
const createDefaultSuggestion = (topic: string, category: string, reasoning: string, keywords: string[]): EnhancedTopicSuggestion => ({
  topic,
  category: category as any,
  formats: ['script'],
  estimatedEngagement: 'high' as const,
  reasoning,
  relatedKeywords: keywords,
  scores: DEFAULT_SCORES,
});

const DEFAULT_SUGGESTIONS: Record<VideoType, EnhancedTopicSuggestion[]> = {
  expert_share: [
    createDefaultSuggestion('5 bí quyết thành công mà chuyên gia không tiết lộ', 'evergreen', 'Nội dung insider secrets thu hút sự tò mò', ['bí quyết', 'thành công']),
    createDefaultSuggestion('Kinh nghiệm 10 năm gói gọn trong 60 giây', 'evergreen', 'Format ngắn gọn dễ tiếp thu', ['kinh nghiệm', 'tips']),
  ],
  tutorial_howto: [
    createDefaultSuggestion('Hướng dẫn từ A-Z cho người mới bắt đầu', 'evergreen', 'Tutorial step-by-step dễ follow', ['hướng dẫn', 'tutorial']),
    createDefaultSuggestion('Cách làm nhanh trong 5 phút', 'evergreen', 'Quick tutorial tiết kiệm thời gian', ['nhanh', 'dễ']),
  ],
  analyze_explain: [
    createDefaultSuggestion('Giải thích đơn giản: Cách hoạt động của...', 'evergreen', 'Nội dung giáo dục dễ hiểu', ['giải thích', 'hướng dẫn']),
    createDefaultSuggestion('So sánh A vs B: Đâu là lựa chọn tốt hơn?', 'evergreen', 'So sánh giúp người xem quyết định', ['so sánh', 'review']),
  ],
  listicle: [
    createDefaultSuggestion('Top 5 điều bạn cần biết về...', 'evergreen', 'Format listicle dễ tiêu hóa', ['top', 'danh sách']),
    createDefaultSuggestion('7 tips không ai nói cho bạn', 'evergreen', 'Exclusive tips tạo giá trị', ['tips', 'mẹo']),
  ],
  warning_mistake: [
    createDefaultSuggestion('5 sai lầm phổ biến người mới thường mắc phải', 'evergreen', 'Nội dung cảnh báo tạo FOMO', ['sai lầm', 'tránh']),
    createDefaultSuggestion('Đừng làm điều này nếu bạn muốn thành công', 'evergreen', 'Tiêu đề negative tạo CTR cao', ['đừng', 'cảnh báo']),
  ],
  quick_qa: [
    createDefaultSuggestion('Trả lời câu hỏi hay nhất của followers', 'reactive', 'Tương tác trực tiếp với khán giả', ['Q&A', 'hỏi đáp']),
    createDefaultSuggestion('FAQ: Những thắc mắc phổ biến nhất', 'evergreen', 'Giải đáp thắc mắc phổ biến', ['FAQ', 'câu hỏi']),
  ],
  myth_busting: [
    createDefaultSuggestion('Sự thật đằng sau quan niệm sai lầm...', 'evergreen', 'Debunk myths thu hút tranh luận', ['myth', 'sự thật']),
    createDefaultSuggestion('Bạn đã bị lừa bởi điều này', 'evergreen', 'Shock value tạo click', ['sai lầm', 'hiểu lầm']),
  ],
  before_after: [
    createDefaultSuggestion('Sự thay đổi sau 30 ngày áp dụng...', 'evergreen', 'Before/after tạo visual impact', ['thay đổi', 'kết quả']),
    createDefaultSuggestion('Trước và sau khi biết điều này', 'evergreen', 'Transformation story cuốn hút', ['trước', 'sau']),
  ],
  story_pov: [
    createDefaultSuggestion('Câu chuyện của tôi: Từ số 0 đến...', 'evergreen', 'Personal story tạo kết nối', ['câu chuyện', 'hành trình']),
    createDefaultSuggestion('POV: Bạn là một người mới vào nghề', 'trending', 'POV format đang hot', ['POV', 'góc nhìn']),
  ],
  day_in_life: [
    createDefaultSuggestion('Một ngày làm việc của tôi', 'evergreen', 'Day in life tạo tò mò', ['một ngày', 'routine']),
    createDefaultSuggestion('Behind the scenes: Ngày thường của...', 'evergreen', 'Authentic content tạo trust', ['hậu trường', 'thực tế']),
  ],
  behind_scenes: [
    createDefaultSuggestion('Hậu trường sản xuất video này', 'evergreen', 'BTS content tạo connection', ['hậu trường', 'making of']),
    createDefaultSuggestion('Đây là cách chúng tôi làm việc', 'evergreen', 'Process reveal builds trust', ['quy trình', 'cách làm']),
  ],
  reaction: [
    createDefaultSuggestion('Phản ứng của tôi về trend...', 'reactive', 'Reaction content timely', ['phản ứng', 'trend']),
    createDefaultSuggestion('Ý kiến thật về điều đang viral', 'reactive', 'Hot take tạo engagement', ['ý kiến', 'viral']),
  ],
  product_review: [
    createDefaultSuggestion('Review trung thực: Có nên mua không?', 'evergreen', 'Honest review builds trust', ['review', 'đánh giá']),
    createDefaultSuggestion('Dùng thử và đánh giá sau 1 tháng', 'evergreen', 'Long-term review có giá trị', ['dùng thử', 'review']),
  ],
  case_study: [
    createDefaultSuggestion('Case study: Từ thất bại đến thành công', 'evergreen', 'Real case tạo uy tín', ['case study', 'thực tế']),
    createDefaultSuggestion('Phân tích chiến lược thành công của...', 'evergreen', 'Strategy breakdown educational', ['phân tích', 'chiến lược']),
  ],
  transformation: [
    createDefaultSuggestion('Hành trình biến đổi sau 6 tháng', 'evergreen', 'Transformation inspiring', ['biến đổi', 'kết quả']),
    createDefaultSuggestion('Kết quả thực tế sau khi áp dụng', 'evergreen', 'Results-driven content', ['kết quả', 'thành công']),
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
