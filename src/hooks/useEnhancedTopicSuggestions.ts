import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContentGoal } from '@/types/multichannel';
import { EnhancedTopicSuggestion, TopicFormat, TopicCategory, EngagementLevel } from '@/types/topicDiscovery';

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

// Default suggestions with enhanced structure
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
    },
    {
      topic: '5 sai lầm phổ biến và cách tránh',
      category: 'evergreen',
      formats: ['carousel', 'multichannel'],
      estimatedEngagement: 'high',
      reasoning: 'Người dùng luôn muốn tránh sai lầm, dễ gây tương tác và chia sẻ',
      relatedKeywords: ['sai lầm', 'tránh', 'kinh nghiệm', 'bài học'],
    },
    {
      topic: 'Checklist hoàn chỉnh cho năm 2025',
      category: 'seasonal',
      formats: ['carousel', 'multichannel'],
      estimatedEngagement: 'medium',
      reasoning: 'Checklist dễ lưu và chia sẻ, phù hợp đầu năm mới',
      relatedKeywords: ['checklist', '2025', 'kế hoạch', 'mục tiêu'],
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
    },
    {
      topic: 'Giá trị cốt lõi mà chúng tôi theo đuổi',
      category: 'evergreen',
      formats: ['carousel', 'multichannel'],
      estimatedEngagement: 'medium',
      reasoning: 'Giúp khách hàng hiểu và tin tưởng thương hiệu hơn',
      relatedKeywords: ['giá trị', 'core values', 'sứ mệnh', 'tầm nhìn'],
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
    },
    {
      topic: 'Thử thách 7 ngày: Bạn có dám thử?',
      category: 'trending',
      formats: ['script', 'multichannel'],
      estimatedEngagement: 'high',
      reasoning: 'Challenges luôn viral và tạo FOMO',
      relatedKeywords: ['challenge', 'thử thách', '7 ngày', 'viral'],
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
    },
    {
      topic: 'Case study thành công từ thực tế',
      category: 'evergreen',
      formats: ['carousel', 'multichannel'],
      estimatedEngagement: 'high',
      reasoning: 'Case study là proof of concept tốt nhất',
      relatedKeywords: ['case study', 'thành công', 'khách hàng', 'kết quả'],
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
    },
    {
      topic: 'Vì sao khách hàng chọn chúng tôi',
      category: 'evergreen',
      formats: ['carousel', 'script', 'multichannel'],
      estimatedEngagement: 'medium',
      reasoning: 'Social proof tăng niềm tin và conversion',
      relatedKeywords: ['testimonial', 'review', 'khách hàng', 'lý do'],
    },
  ],
};

export function useEnhancedTopicSuggestions({
  brandTemplateId,
  contentGoal,
  format,
  enabled = true,
}: UseEnhancedTopicSuggestionsOptions) {
  const [suggestions, setSuggestions] = useState<EnhancedTopicSuggestion[]>(
    DEFAULT_SUGGESTIONS[contentGoal] || []
  );
  const [source, setSource] = useState<'ai' | 'cache' | 'fallback'>('fallback');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const prevParamsRef = useRef<string>('');

  const fetchSuggestions = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke<TopicSuggestionsResult>(
        'generate-topic-suggestions',
        {
          body: {
            contentGoal,
            brandTemplateId,
            format,
            enhanced: true, // Request enhanced format
          },
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data?.suggestions && data.suggestions.length > 0) {
        // Transform simple suggestions to enhanced format if needed
        const enhancedSuggestions: EnhancedTopicSuggestion[] = data.suggestions.map((s: any) => {
          if (typeof s === 'string') {
            // Simple string format - convert to enhanced
            return {
              topic: s,
              category: 'evergreen' as TopicCategory,
              formats: ['carousel', 'script', 'multichannel'] as TopicFormat[],
              estimatedEngagement: 'medium' as EngagementLevel,
              reasoning: 'Gợi ý từ AI dựa trên brand context',
              relatedKeywords: [],
            };
          }
          return s as EnhancedTopicSuggestion;
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
      setIsLoading(false);
    }
  }, [brandTemplateId, contentGoal, format, enabled]);

  useEffect(() => {
    if (!enabled) {
      setSuggestions(DEFAULT_SUGGESTIONS[contentGoal] || []);
      setSource('fallback');
      return;
    }

    const paramsKey = `${contentGoal}:${brandTemplateId || ''}:${format || ''}`;

    if (paramsKey === prevParamsRef.current) return;
    prevParamsRef.current = paramsKey;

    const timer = setTimeout(() => {
      fetchSuggestions();
    }, 500);

    return () => clearTimeout(timer);
  }, [contentGoal, brandTemplateId, format, enabled, fetchSuggestions]);

  const refresh = useCallback(() => {
    prevParamsRef.current = '';
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Filter by format if specified
  const filteredSuggestions = format
    ? suggestions.filter((s) => s.formats.includes(format))
    : suggestions;

  return {
    suggestions: filteredSuggestions,
    allSuggestions: suggestions,
    source,
    isLoading,
    error,
    refresh,
  };
}
