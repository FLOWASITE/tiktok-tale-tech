import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TopicSuggestionPanel } from '@/components/TopicSuggestionPanel';
import { TopicBrainstormSheet } from '@/components/multichannel/TopicBrainstormSheet';
import { Lightbulb, ChevronDown, Flame, TrendingUp, Gift, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnhancedTopicSuggestion } from '@/types/topicDiscovery';
import type { ContentGoal } from '@/types/multichannel';

const QUICK_ACTIONS = [
  { icon: <Flame className="w-3 h-3" />, label: 'Viral tuần này', prompt: 'Gợi ý các chủ đề đang viral tuần này trong lĩnh vực của tôi, phù hợp để tạo nội dung thu hút tương tác cao.' },
  { icon: <TrendingUp className="w-3 h-3" />, label: 'Theo trend', prompt: 'Phân tích xu hướng nội dung đang hot trên mạng xã hội và gợi ý chủ đề theo trend phù hợp với thương hiệu của tôi.' },
  { icon: <Gift className="w-3 h-3" />, label: 'Mùa lễ hội', prompt: 'Gợi ý chủ đề nội dung theo mùa lễ hội, sự kiện sắp tới phù hợp để marketing.' },
  { icon: <Zap className="w-3 h-3" />, label: 'So sánh A vs B', prompt: 'Gợi ý các chủ đề dạng so sánh A vs B hấp dẫn trong lĩnh vực của tôi để tạo nội dung tương tác cao.' },
];

interface TopicIdeaHubProps {
  suggestions: string[] | EnhancedTopicSuggestion[];
  source: 'ai' | 'cache' | 'fallback';
  isLoading: boolean;
  onSelect: (topic: string) => void;
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
  onRefresh,
  onSave,
  onFeedback,
  brandTemplateId,
  contentGoal,
  disabled = false,
  showEnhancedInfo = true,
  showNavigateToTopics = false,
}: TopicIdeaHubProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showBrainstormSheet, setShowBrainstormSheet] = useState(false);
  const [brainstormPrompt, setBrainstormPrompt] = useState<string | undefined>();

  const handleQuickAction = (prompt: string) => {
    setBrainstormPrompt(prompt);
    setShowBrainstormSheet(true);
  };

  const handleTopicSelect = (topic: string) => {
    onSelect(topic);
    setShowBrainstormSheet(false);
  };

  return (
    <>
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
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => handleQuickAction(action.prompt)}
                    className="h-6 text-[10px] whitespace-nowrap gap-1 rounded-full px-2.5 border-border/60 hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </div>

              <TopicSuggestionPanel
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

      <TopicBrainstormSheet
        open={showBrainstormSheet}
        onOpenChange={setShowBrainstormSheet}
        brandTemplateId={brandTemplateId}
        contentGoal={contentGoal}
        initialPrompt={brainstormPrompt}
        onSelectTopic={handleTopicSelect}
      />
    </>
  );
}
