import { useState, useRef, useCallback, memo, useMemo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TopicSuggestionPanel } from '@/components/TopicSuggestionPanel';
import { Lightbulb, ChevronDown, Flame, TrendingUp, Gift, Zap, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnhancedTopicSuggestion } from '@/types/topicDiscovery';
import type { ContentGoal } from '@/types/multichannel';

const QUICK_ACTIONS = [
  {
    icon: <Flame className="w-3 h-3" />,
    label: 'Viral tuần này',
    topics: [
      'Top xu hướng viral đang được chia sẻ nhiều nhất tuần này',
      'Hiện tượng mạng tuần này và góc nhìn chuyên gia',
      'Nội dung triệu view tuần này: Phân tích yếu tố thành công',
      'Chủ đề hot nhất tuần này trên mạng xã hội',
    ],
  },
  {
    icon: <TrendingUp className="w-3 h-3" />,
    label: 'Theo trend',
    topics: [
      'Bắt trend mới nhất: Phân tích và ứng dụng cho thương hiệu',
      'Xu hướng nội dung đang lên ngôi trên mạng xã hội',
      'Trend mới nhất trong ngành: Cơ hội cho thương hiệu',
      'Phân tích xu hướng nội dung đang hot và cách áp dụng',
    ],
  },
  {
    icon: <Gift className="w-3 h-3" />,
    label: 'Mùa lễ hội',
    topics: [
      'Chiến lược nội dung mùa lễ hội sắp tới',
      'Ý tưởng marketing theo sự kiện và ngày lễ trong tháng',
      'Nội dung theo mùa: Kết nối thương hiệu với dịp đặc biệt',
      'Kế hoạch nội dung cho mùa lễ hội và sự kiện lớn',
    ],
  },
  {
    icon: <Zap className="w-3 h-3" />,
    label: 'So sánh A vs B',
    topics: [
      'So sánh phương pháp truyền thống vs hiện đại trong ngành',
      'Đối đầu: Giải pháp A vs Giải pháp B — đâu là lựa chọn tốt hơn?',
      'So sánh chi tiết: Ưu nhược điểm của 2 xu hướng đang hot',
      'A vs B: Phân tích chuyên sâu giúp bạn chọn đúng',
    ],
  },
];

/** Memoized wrapper to prevent TopicSuggestionPanel from re-rendering on category toggle */
const MemoizedSuggestionPanel = memo(TopicSuggestionPanel);

interface TopicIdeaHubProps {
  suggestions: string[] | EnhancedTopicSuggestion[];
  source: 'ai' | 'cache' | 'fallback';
  isLoading: boolean;
  onSelect: (topic: string) => void;
  /** Called when user picks a topic from quick-action chips (skips auto-refine) */
  onQuickActionSelect?: (topic: string) => void;
  onRefresh: () => void;
  onSave?: (suggestion: EnhancedTopicSuggestion) => void;
  onFeedback?: (suggestion: EnhancedTopicSuggestion, feedback: 'positive' | 'negative') => void;
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  disabled?: boolean;
  showEnhancedInfo?: boolean;
  showNavigateToTopics?: boolean;
}

export function TopicIdeaHub({
  suggestions,
  source,
  isLoading,
  onSelect,
  onQuickActionSelect,
  onRefresh,
  onSave,
  onFeedback,
  contentGoal,
  disabled = false,
  showEnhancedInfo = true,
  showNavigateToTopics = false,
}: TopicIdeaHubProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [lastSelectedTopic, setLastSelectedTopic] = useState<string | null>(null);
  const selectionTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleCategoryClick = (label: string) => {
    setActiveCategory(activeCategory === label ? null : label);
  };

  const handleQuickTopicSelect = useCallback((topic: string) => {
    if (onQuickActionSelect) {
      onQuickActionSelect(topic);
    } else {
      onSelect(topic);
    }
    // Visual feedback
    setLastSelectedTopic(topic);
    clearTimeout(selectionTimerRef.current);
    selectionTimerRef.current = setTimeout(() => {
      setLastSelectedTopic(null);
      // Collapse category list after feedback so textarea becomes visible
      setActiveCategory(null);
    }, 800);

    // Trigger suggestion refresh so user sees new related suggestions
    setTimeout(() => onRefresh(), 100);

    // Scroll the topic textarea into view (sits above this component)
    requestAnimationFrame(() => {
      const textarea = document.querySelector<HTMLTextAreaElement>('[data-topic-input]');
      textarea?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [onQuickActionSelect, onSelect, onRefresh]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-sm font-medium",
              "hover:bg-muted/40 transition-colors",
              "text-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-primary" />
              <span>Ý tưởng chủ đề</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                Gợi ý
              </Badge>
            </div>
            <ChevronDown className={cn(
              "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3">
            {/* Quick action chips */}
            <div className="flex gap-1.5 flex-wrap mb-2">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.label}
                  type="button"
                  variant={activeCategory === action.label ? "default" : "outline"}
                  size="sm"
                  disabled={disabled}
                  onClick={() => handleCategoryClick(action.label)}
                  className="h-6 text-[10px] whitespace-nowrap gap-1 rounded-full px-2.5 border-border/60 hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            </div>

            {/* Expanded topics for active category */}
            {activeCategory && (
              <div className="flex flex-col gap-1 mb-2 pl-2 border-l-2 border-primary/30">
                {QUICK_ACTIONS.find(a => a.label === activeCategory)?.topics.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleQuickTopicSelect(topic)}
                    className={cn(
                      "text-left text-[11px] py-1.5 px-2 rounded-md flex items-center gap-1.5 transition-all duration-200 active:scale-[0.97]",
                      lastSelectedTopic === topic
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    {lastSelectedTopic === topic ? (
                      <Check className="w-3 h-3 shrink-0 text-primary" />
                    ) : (
                      <span className="shrink-0">→</span>
                    )}
                    {topic}
                  </button>
                ))}
              </div>
            )}

            <MemoizedSuggestionPanel
              suggestions={suggestions}
              source={source}
              isLoading={isLoading}
              onSelect={onSelect}
              onRefresh={onRefresh}
              onSave={onSave}
              onFeedback={onFeedback}
              disabled={disabled}
              showEnhancedInfo={showEnhancedInfo}
              showNavigateToTopics={showNavigateToTopics}
              contentGoal={contentGoal}
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
