import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TopicSuggestionPanel } from '@/components/TopicSuggestionPanel';
import { TopicAIChatbot } from '@/components/topic/TopicAIChatbot';
import { TopicBrainstormSheet } from '@/components/multichannel/TopicBrainstormSheet';
import { Lightbulb, Sparkles, ChevronDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { EnhancedTopicSuggestion } from '@/types/topicDiscovery';
import type { ContentGoal } from '@/types/multichannel';

interface TopicIdeaHubProps {
  // Suggestion list props
  suggestions: string[] | EnhancedTopicSuggestion[];
  source: 'ai' | 'cache' | 'fallback';
  isLoading: boolean;
  onSelect: (topic: string) => void;
  onRefresh: () => void;
  onSave?: (suggestion: EnhancedTopicSuggestion) => void;
  onFeedback?: (suggestion: EnhancedTopicSuggestion, feedback: 'positive' | 'negative') => void;
  // Chatbot props
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  // General
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
  const [activeTab, setActiveTab] = useState<'suggestions' | 'brainstorm'>('suggestions');
  const [showBrainstormSheet, setShowBrainstormSheet] = useState(false);
  const isMobile = useIsMobile();

  const handleTopicSelect = (topic: string) => {
    onSelect(topic);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
        {/* Header */}
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
                {activeTab === 'suggestions' ? 'Gợi ý' : 'AI Chat'}
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
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as 'suggestions' | 'brainstorm')}
            >
              <TabsList className="w-full h-8 mb-2">
                <TabsTrigger value="suggestions" className="flex-1 text-xs gap-1.5 h-7">
                  <Lightbulb className="w-3 h-3" />
                  Gợi ý nhanh
                </TabsTrigger>
                <TabsTrigger value="brainstorm" className="flex-1 text-xs gap-1.5 h-7">
                  <Sparkles className="w-3 h-3" />
                  Brainstorm AI
                </TabsTrigger>
              </TabsList>

              <TabsContent value="suggestions" className="mt-0">
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
              </TabsContent>

              <TabsContent value="brainstorm" className="mt-0">
                <div className="h-[280px] rounded-md border border-border/40 overflow-hidden">
                  <TopicAIChatbot
                    brandTemplateId={brandTemplateId}
                    contentGoal={contentGoal}
                    mode="embedded"
                    onTopicSelect={handleTopicSelect}
                    onNavigate={() => {}}
                    className="h-full border-0 rounded-none"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
