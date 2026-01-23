import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles, 
  RefreshCw, 
  Check, 
  TrendingUp,
  Lightbulb,
  Target,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentGoal, CONTENT_GOALS } from '@/types/multichannel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TopicSuggestion {
  topic: string;
  reason?: string;
  type?: 'trending' | 'evergreen' | 'seasonal';
}

interface InlineTopicSuggestionsProps {
  brandTemplateId?: string;
  contentGoal: ContentGoal;
  onSelectTopic: (topic: string) => void;
  disabled?: boolean;
  className?: string;
}

export function InlineTopicSuggestions({
  brandTemplateId,
  contentGoal,
  onSelectTopic,
  disabled,
  className,
}: InlineTopicSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const fetchSuggestions = useCallback(async (forceRefresh = false) => {
    if (!contentGoal) return;
    
    setIsLoading(true);
    setSelectedIndex(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('topic-ai', {
        body: {
          action: 'trending',
          brandTemplateId,
          contentGoal,
          limit: 5,
          forceRefresh,
        },
      });

      if (error) throw error;

      if (data?.topics && Array.isArray(data.topics)) {
        setSuggestions(data.topics.map((t: string | TopicSuggestion) => 
          typeof t === 'string' ? { topic: t } : t
        ));
      } else if (data?.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      } else {
        // Fallback suggestions based on content goal
        const fallbackSuggestions = getFallbackSuggestions(contentGoal);
        setSuggestions(fallbackSuggestions);
      }
      
      setHasLoaded(true);
    } catch (error) {
      console.error('Error fetching topic suggestions:', error);
      // Use fallback on error
      const fallbackSuggestions = getFallbackSuggestions(contentGoal);
      setSuggestions(fallbackSuggestions);
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [brandTemplateId, contentGoal]);

  // Auto-fetch when contentGoal changes
  useEffect(() => {
    if (contentGoal && !hasLoaded) {
      fetchSuggestions();
    }
  }, [contentGoal, hasLoaded, fetchSuggestions]);

  // Reset when contentGoal changes
  useEffect(() => {
    setHasLoaded(false);
    setSuggestions([]);
  }, [contentGoal]);

  const handleSelect = (suggestion: TopicSuggestion, index: number) => {
    setSelectedIndex(index);
    onSelectTopic(suggestion.topic);
    toast.success('Đã chọn chủ đề', {
      description: 'Chủ đề đã được điền vào form',
    });
  };

  const handleRefresh = () => {
    fetchSuggestions(true);
  };

  const goalInfo = CONTENT_GOALS.find(g => g.value === contentGoal);
  const GoalIcon = goalInfo?.icon || Target;

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4 animate-pulse text-primary" />
          <span>Đang tìm ý tưởng...</span>
        </div>
        <div className="grid gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!hasLoaded || suggestions.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchSuggestions()}
          disabled={disabled}
          className="gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Gợi ý chủ đề cho "{goalInfo?.label || 'mục tiêu này'}"
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <GoalIcon className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">
            Gợi ý cho <span className="font-medium text-foreground">{goalInfo?.label}</span>
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={disabled || isLoading}
          className="h-8 px-2 text-xs gap-1.5"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          Làm mới
        </Button>
      </div>

      {/* Suggestions Grid */}
      <div className="grid gap-2">
        {suggestions.map((suggestion, index) => (
          <Card
            key={index}
            className={cn(
              "p-3 cursor-pointer transition-all duration-200",
              "hover:bg-accent/50 hover:border-primary/30",
              "group",
              selectedIndex === index && "bg-primary/10 border-primary/50",
              disabled && "opacity-50 pointer-events-none"
            )}
            onClick={() => handleSelect(suggestion, index)}
          >
            <div className="flex items-start gap-3">
              {/* Type Icon */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                suggestion.type === 'trending' && "bg-rose-500/10 text-rose-500",
                suggestion.type === 'evergreen' && "bg-emerald-500/10 text-emerald-500",
                suggestion.type === 'seasonal' && "bg-amber-500/10 text-amber-500",
                !suggestion.type && "bg-primary/10 text-primary"
              )}>
                {suggestion.type === 'trending' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <Lightbulb className="w-4 h-4" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug line-clamp-2">
                  {suggestion.topic}
                </p>
                {suggestion.reason && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {suggestion.reason}
                  </p>
                )}
              </div>

              {/* Action */}
              <div className={cn(
                "shrink-0 transition-opacity",
                selectedIndex === index ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}>
                {selectedIndex === index ? (
                  <Badge variant="default" className="gap-1 bg-primary">
                    <Check className="w-3 h-3" />
                    Đã chọn
                  </Badge>
                ) : (
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Type Badge */}
            {suggestion.type && (
              <div className="mt-2 pl-11">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    suggestion.type === 'trending' && "border-rose-500/30 text-rose-500",
                    suggestion.type === 'evergreen' && "border-emerald-500/30 text-emerald-500",
                    suggestion.type === 'seasonal' && "border-amber-500/30 text-amber-500"
                  )}
                >
                  {suggestion.type === 'trending' && 'Đang hot'}
                  {suggestion.type === 'evergreen' && 'Evergreen'}
                  {suggestion.type === 'seasonal' && 'Theo mùa'}
                </Badge>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Hint */}
      <p className="text-xs text-muted-foreground text-center">
        Click vào chủ đề để chọn, hoặc nhập thủ công ở tab "Nhập nhanh"
      </p>
    </div>
  );
}

// Fallback suggestions when API fails
function getFallbackSuggestions(contentGoal: ContentGoal): TopicSuggestion[] {
  const suggestions: Record<ContentGoal, TopicSuggestion[]> = {
    education: [
      { topic: 'Hướng dẫn từng bước cho người mới bắt đầu', type: 'evergreen' },
      { topic: '5 sai lầm phổ biến và cách tránh', type: 'evergreen' },
      { topic: 'Giải thích đơn giản về [khái niệm phức tạp]', type: 'evergreen' },
    ],
    awareness: [
      { topic: 'Câu chuyện thương hiệu: Từ ý tưởng đến hiện thực', type: 'evergreen' },
      { topic: 'Tại sao chúng tôi khác biệt', type: 'evergreen' },
      { topic: 'Giới thiệu giải pháp mới cho vấn đề cũ', type: 'trending' },
    ],
    engagement: [
      { topic: 'Bạn thuộc nhóm nào? [Quiz tương tác]', type: 'trending' },
      { topic: 'Chia sẻ trải nghiệm của bạn', type: 'evergreen' },
      { topic: 'Hỏi đáp với chuyên gia', type: 'evergreen' },
    ],
    expertise: [
      { topic: 'Phân tích chuyên sâu xu hướng 2024', type: 'trending' },
      { topic: 'Case study: Từ vấn đề đến giải pháp', type: 'evergreen' },
      { topic: 'Nghiên cứu mới nhất trong ngành', type: 'trending' },
    ],
    conversion: [
      { topic: 'So sánh chi tiết các lựa chọn', type: 'evergreen' },
      { topic: 'Ưu đãi độc quyền cho [nhóm khách hàng]', type: 'seasonal' },
      { topic: 'Lý do khách hàng chọn chúng tôi', type: 'evergreen' },
    ],
  };

  return suggestions[contentGoal] || suggestions.education;
}
