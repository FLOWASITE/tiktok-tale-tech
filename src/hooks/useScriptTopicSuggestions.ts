import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VideoType } from '@/types/script';

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

interface ScriptTopicSuggestionsResult {
  suggestions: EnhancedTopicSuggestion[] | string[];
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

const DEFAULT_SUGGESTIONS: Record<VideoType, string[]> = {
  expert_share: [
    '5 bí quyết thành công mà chuyên gia không tiết lộ',
    'Xu hướng mới nhất trong ngành năm 2024',
    'Case study: Từ thất bại đến thành công',
    'Kinh nghiệm 10 năm gói gọn trong 60 giây',
    'Góc nhìn chuyên gia về vấn đề đang hot',
    'Những điều tôi ước mình biết sớm hơn',
  ],
  analyze_explain: [
    'Giải thích đơn giản: Cách hoạt động của...',
    'Phân tích chi tiết: Ưu và nhược điểm',
    'So sánh A vs B: Đâu là lựa chọn tốt hơn?',
    'Bóc tách từng bước quy trình thực hiện',
    'Tại sao điều này lại quan trọng?',
    'Breakdown: Chiến lược đằng sau thành công',
  ],
  warning_mistake: [
    '5 sai lầm phổ biến người mới thường mắc phải',
    'Đừng làm điều này nếu bạn muốn thành công',
    'Cảnh báo: Những dấu hiệu bạn đang làm sai',
    'Tôi đã mất tiền triệu vì sai lầm này',
    'Stop! Kiểm tra lại ngay điều này',
    'Bẫy nguy hiểm mà 90% người không biết',
  ],
  quick_qa: [
    'Trả lời câu hỏi hay nhất của followers',
    'FAQ: Những thắc mắc phổ biến nhất',
    'Đúng hay sai? Giải đáp hiểu lầm phổ biến',
    'Hỏi nhanh đáp gọn: Tips thực tế',
    '60 giây giải quyết vấn đề của bạn',
    'Bạn hỏi - Chuyên gia trả lời',
  ],
};

export function useScriptTopicSuggestions({
  videoType,
  brandTemplateId,
  industry,
  enabled = true,
}: UseScriptTopicSuggestionsOptions) {
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS[videoType]);
  const [source, setSource] = useState<'ai' | 'cache' | 'fallback'>('fallback');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const prevParamsRef = useRef<string>('');
  
  const fetchSuggestions = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
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
            context: 'script', // Additional context for better suggestions
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
      setIsLoading(false);
    }
  }, [industry, videoType, brandTemplateId, enabled]);

  // Debounced effect to fetch suggestions when params change
  useEffect(() => {
    if (!enabled) {
      setSuggestions(DEFAULT_SUGGESTIONS[videoType]);
      setSource('fallback');
      return;
    }

    const paramsKey = `script:${videoType}:${industry || ''}:${brandTemplateId || ''}`;
    
    if (paramsKey === prevParamsRef.current) return;
    prevParamsRef.current = paramsKey;
    
    const timer = setTimeout(() => {
      fetchSuggestions();
    }, 500);

    return () => clearTimeout(timer);
  }, [industry, videoType, brandTemplateId, enabled, fetchSuggestions]);

  const refresh = useCallback(() => {
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
