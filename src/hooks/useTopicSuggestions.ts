import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContentGoal } from '@/types/multichannel';

interface EnhancedTopicSuggestion {
  topic: string;
  category?: string;
  pillar?: string;
  reasoning?: string;
  formats?: string[];
  relatedKeywords?: string[];
  bestTimeToPost?: string;
  scores?: Record<string, number>;
  estimatedEngagement?: string;
}

interface TopicSuggestionsResult {
  suggestions: EnhancedTopicSuggestion[] | string[];
  source: 'ai' | 'cache' | 'fallback';
  error?: string;
}

interface UseTopicSuggestionsOptions {
  industry?: string;
  contentGoal: ContentGoal;
  brandTemplateId?: string;
  enabled?: boolean;
}

const DEFAULT_SUGGESTIONS: Record<ContentGoal, string[]> = {
  education: [
    'Hướng dẫn từng bước cho người mới bắt đầu',
    '5 sai lầm phổ biến và cách tránh',
    'Kiến thức cơ bản cần nắm vững',
    'Checklist hoàn chỉnh cho năm 2024',
    'So sánh các phương pháp phổ biến',
    'Giải đáp thắc mắc thường gặp',
  ],
  awareness: [
    'Câu chuyện đằng sau thương hiệu',
    'Giá trị cốt lõi mà chúng tôi theo đuổi',
    'Điều gì làm nên sự khác biệt',
    'Hành trình phát triển của chúng tôi',
    'Sứ mệnh và tầm nhìn doanh nghiệp',
    'Văn hóa công ty độc đáo',
  ],
  engagement: [
    'Bạn nghĩ gì về xu hướng này?',
    'Chia sẻ trải nghiệm của bạn với chúng tôi',
    'Thử thách 7 ngày: Bạn có dám thử?',
    'Vote cho lựa chọn yêu thích của bạn',
    'Caption hay nhất nhận quà hot',
    'Kể tên 3 điều bạn muốn thay đổi',
  ],
  expertise: [
    'Phân tích chuyên sâu: Xu hướng thị trường 2024',
    'Case study thành công từ thực tế',
    'Bí quyết chỉ chuyên gia mới biết',
    'Dự báo: Điều gì sẽ thay đổi trong năm tới',
    'Góc nhìn chuyên gia về vấn đề nóng',
    'Nghiên cứu mới nhất trong ngành',
  ],
  conversion: [
    'Ưu đãi độc quyền: Chỉ còn 24 giờ',
    'Vì sao khách hàng chọn chúng tôi',
    'So sánh: Tại sao giải pháp này tốt hơn',
    'Khách hàng nói gì sau khi sử dụng',
    'Miễn phí trải nghiệm: Bắt đầu ngay',
    'Kết quả thực tế sau 30 ngày sử dụng',
  ],
};

export function useTopicSuggestions({
  industry,
  contentGoal,
  brandTemplateId,
  enabled = true,
}: UseTopicSuggestionsOptions) {
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS[contentGoal]);
  const [source, setSource] = useState<'ai' | 'cache' | 'fallback'>('fallback');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track previous values to detect changes
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
            industry,
            contentGoal,
            brandTemplateId,
          },
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data?.suggestions && data.suggestions.length > 0) {
        // Handle both string[] and EnhancedTopicSuggestion[] responses
        const extractedTopics = data.suggestions.map((s: string | EnhancedTopicSuggestion) => 
          typeof s === 'string' ? s : s.topic
        );
        setSuggestions(extractedTopics);
        setSource(data.source);
      } else {
        // Fallback to defaults
        setSuggestions(DEFAULT_SUGGESTIONS[contentGoal]);
        setSource('fallback');
      }

      if (data?.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error('Error fetching topic suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch suggestions');
      // Use defaults on error
      setSuggestions(DEFAULT_SUGGESTIONS[contentGoal]);
      setSource('fallback');
    } finally {
      setIsLoading(false);
    }
  }, [industry, contentGoal, brandTemplateId, enabled]);

  // Debounced effect to fetch suggestions when params change
  useEffect(() => {
    if (!enabled) {
      setSuggestions(DEFAULT_SUGGESTIONS[contentGoal]);
      setSource('fallback');
      return;
    }

    const paramsKey = `${industry || ''}:${contentGoal}:${brandTemplateId || ''}`;
    
    // Only fetch if params actually changed
    if (paramsKey === prevParamsRef.current) return;
    prevParamsRef.current = paramsKey;
    
    // Debounce to avoid rapid API calls
    const timer = setTimeout(() => {
      fetchSuggestions();
    }, 500);

    return () => clearTimeout(timer);
  }, [industry, contentGoal, brandTemplateId, enabled, fetchSuggestions]);

  const refresh = useCallback(() => {
    // Force refetch by clearing cache key
    prevParamsRef.current = '';
    fetchSuggestions();
  }, [fetchSuggestions]);

  return {
    suggestions,
    source,
    isLoading,
    error,
    refresh,
  };
}
