import { useState } from 'react';
import { 
  TrendingUp, Sparkles, Calendar, Lightbulb, 
  MessageSquare, Video, Images, Send, RefreshCw,
  Loader2, ChevronRight, Flame, Target, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ContentGoal } from '@/types/multichannel';
import { useTrendingTopics, TrendingTopic } from '@/hooks/useTrendingTopics';
import { useTopicRecommendations } from '@/hooks/useTopicRecommendations';
import { useEnhancedTopicSuggestions } from '@/hooks/useEnhancedTopicSuggestions';
import { useCuratedEvents } from '@/hooks/useCuratedEvents';

interface DiscoveryTabProps {
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  onInjectPrompt: (prompt: string) => void;
  onSendMessage: (message: string) => void;
  onCreateContent: (topic: string, format: 'multichannel' | 'script' | 'carousel') => void;
  className?: string;
}

// Haptic feedback helper
function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  if ('vibrate' in navigator) {
    const durations = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(durations[type]);
  }
}

// Peak status badge
function PeakBadge({ status }: { status: 'rising' | 'peaking' | 'declining' }) {
  const config = {
    rising: { label: 'Đang lên', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
    peaking: { label: 'Đỉnh điểm', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    declining: { label: 'Giảm', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
  };
  return (
    <Badge variant="outline" className={cn('text-[9px] h-4 px-1.5', config[status].color)}>
      {config[status].label}
    </Badge>
  );
}

// Trending Topic Card
function TrendingCard({ 
  topic, 
  onInject, 
  onSend, 
  onCreate,
  index 
}: { 
  topic: TrendingTopic; 
  onInject: () => void; 
  onSend: () => void;
  onCreate: (format: 'multichannel' | 'script' | 'carousel') => void;
  index: number;
}) {
  return (
    <div 
      className={cn(
        "p-2.5 rounded-lg bg-gradient-to-r from-orange-500/5 to-red-500/5 border border-orange-500/20",
        "hover:border-orange-500/40 transition-all group animate-in fade-in-0 duration-200"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          <span className="text-xs font-medium truncate">{topic.topic}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline" className="text-[9px] h-4 px-1 border-orange-500/30 text-orange-600">
            {topic.velocity_score}%
          </Badge>
          <PeakBadge status={topic.peak_status} />
        </div>
      </div>
      
      {topic.suggested_angles && topic.suggested_angles.length > 0 && (
        <p className="text-[10px] text-muted-foreground mb-2 line-clamp-1">
          💡 {topic.suggested_angles[0]}
        </p>
      )}
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="ghost"
          className="h-5 text-[9px] px-1.5 gap-0.5"
          onClick={() => { triggerHaptic('light'); onInject(); }}
        >
          <ChevronRight className="w-2.5 h-2.5" />
          Inject
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 text-[9px] px-1.5 gap-0.5"
          onClick={() => { triggerHaptic('medium'); onSend(); }}
        >
          <Send className="w-2.5 h-2.5" />
          Hỏi AI
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="secondary"
          className="h-5 text-[9px] px-1.5"
          onClick={() => { triggerHaptic('medium'); onCreate('multichannel'); }}
        >
          <MessageSquare className="w-2.5 h-2.5" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-5 text-[9px] px-1.5"
          onClick={() => { triggerHaptic('medium'); onCreate('script'); }}
        >
          <Video className="w-2.5 h-2.5" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-5 text-[9px] px-1.5"
          onClick={() => { triggerHaptic('medium'); onCreate('carousel'); }}
        >
          <Images className="w-2.5 h-2.5" />
        </Button>
      </div>
    </div>
  );
}

// Quick Suggestion Card
function SuggestionCard({ 
  suggestion, 
  onInject, 
  onSend, 
  onCreate,
  index 
}: { 
  suggestion: { topic: string; reason?: string; score?: number }; 
  onInject: () => void; 
  onSend: () => void;
  onCreate: (format: 'multichannel' | 'script' | 'carousel') => void;
  index: number;
}) {
  return (
    <div 
      className={cn(
        "p-2.5 rounded-lg bg-gradient-to-r from-primary/5 to-violet-500/5 border border-primary/20",
        "hover:border-primary/40 transition-all group animate-in fade-in-0 duration-200"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Lightbulb className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium truncate">{suggestion.topic}</span>
        </div>
        {suggestion.score && (
          <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-primary/30 text-primary">
            {Math.round(suggestion.score)}%
          </Badge>
        )}
      </div>
      
      {suggestion.reason && (
        <p className="text-[10px] text-muted-foreground mb-2 line-clamp-1">{suggestion.reason}</p>
      )}
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="ghost"
          className="h-5 text-[9px] px-1.5 gap-0.5"
          onClick={() => { triggerHaptic('light'); onInject(); }}
        >
          <ChevronRight className="w-2.5 h-2.5" />
          Inject
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 text-[9px] px-1.5 gap-0.5"
          onClick={() => { triggerHaptic('medium'); onSend(); }}
        >
          <Send className="w-2.5 h-2.5" />
          Hỏi AI
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="secondary"
          className="h-5 text-[9px] px-1.5"
          onClick={() => { triggerHaptic('medium'); onCreate('multichannel'); }}
        >
          <MessageSquare className="w-2.5 h-2.5" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-5 text-[9px] px-1.5"
          onClick={() => { triggerHaptic('medium'); onCreate('script'); }}
        >
          <Video className="w-2.5 h-2.5" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-5 text-[9px] px-1.5"
          onClick={() => { triggerHaptic('medium'); onCreate('carousel'); }}
        >
          <Images className="w-2.5 h-2.5" />
        </Button>
      </div>
    </div>
  );
}

// Event Card
function EventCard({ 
  event, 
  onInject, 
  onSend,
  index 
}: { 
  event: { name: string; event_date: string; suggested_topics?: string[] }; 
  onInject: (topic: string) => void; 
  onSend: (topic: string) => void;
  index: number;
}) {
  const daysUntil = Math.ceil((new Date(event.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  return (
    <div 
      className={cn(
        "p-2.5 rounded-lg bg-gradient-to-r from-green-500/5 to-emerald-500/5 border border-green-500/20",
        "hover:border-green-500/40 transition-all animate-in fade-in-0 duration-200"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-green-600 shrink-0" />
          <span className="text-xs font-medium">{event.name}</span>
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            "text-[9px] h-4 px-1.5",
            daysUntil <= 7 ? "border-orange-500/30 text-orange-600" : "border-green-500/30 text-green-600"
          )}
        >
          {daysUntil <= 0 ? 'Hôm nay' : `${daysUntil} ngày`}
        </Badge>
      </div>
      
      {event.suggested_topics && event.suggested_topics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {event.suggested_topics.slice(0, 2).map((topic, idx) => (
            <button
              key={idx}
              onClick={() => { triggerHaptic('light'); onInject(topic); }}
              className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-700 hover:bg-green-500/20 transition-colors"
            >
              {topic}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Section skeleton
function SectionSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
    </div>
  );
}

export function DiscoveryTab({
  brandTemplateId,
  contentGoal,
  onInjectPrompt,
  onSendMessage,
  onCreateContent,
  className,
}: DiscoveryTabProps) {
  const [refreshing, setRefreshing] = useState(false);
  
  // Fetch data from hooks
  const { 
    topics: trendingTopics, 
    isLoading: trendingLoading, 
    refresh: refreshTrending 
  } = useTrendingTopics({ brandTemplateId });
  
  const { 
    nextBest, 
    isLoading: nextBestLoading, 
    getNextBestTopic 
  } = useTopicRecommendations({ brandTemplateId });
  
  const { 
    suggestions, 
    isLoading: suggestionsLoading,
    refresh: refreshSuggestions
  } = useEnhancedTopicSuggestions({ 
    brandTemplateId, 
    contentGoal,
    enabled: true 
  });
  
  const { events, isLoading: eventsLoading } = useCuratedEvents();
  
  // Refresh all data
  const handleRefreshAll = async () => {
    setRefreshing(true);
    triggerHaptic('medium');
    
    await Promise.all([
      refreshTrending?.(),
      refreshSuggestions?.(),
      getNextBestTopic?.(),
    ]);
    
    setRefreshing(false);
  };
  
  const isLoading = trendingLoading || nextBestLoading || suggestionsLoading || eventsLoading;
  
  // Format upcoming events (next 30 days)
  const upcomingEvents = events
    ?.filter(e => {
      const daysUntil = Math.ceil((new Date(e.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= 30;
    })
    .slice(0, 3) || [];
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-gradient-to-br from-primary to-violet-600">
            <Zap className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-medium">Khám phá</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={handleRefreshAll}
          disabled={refreshing}
        >
          <RefreshCw className={cn("w-3 h-3", refreshing && "animate-spin")} />
          Làm mới
        </Button>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Next Best Topic */}
          {nextBest && (
            <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">Topic phù hợp nhất</span>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-r from-primary/10 via-violet-500/10 to-primary/10 border border-primary/30">
                <p className="text-sm font-medium mb-1">{nextBest.topic}</p>
                {nextBest.reason && (
                  <p className="text-[11px] text-muted-foreground mb-2">{nextBest.reason}</p>
                )}
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-6 text-[10px] gap-1"
                    onClick={() => { triggerHaptic('medium'); onSendMessage(`Phân tích chi tiết về topic: ${nextBest.topic}`); }}
                  >
                    <Send className="w-2.5 h-2.5" />
                    Hỏi AI
                  </Button>
                  <Button
                    size="sm"
                    className="h-6 text-[10px] gap-1"
                    onClick={() => { triggerHaptic('heavy'); onCreateContent(nextBest.topic, 'multichannel'); }}
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    Tạo ngay
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Trending Topics */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-medium">Trending hot</span>
              {trendingLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </div>
            
            {trendingLoading ? (
              <SectionSkeleton />
            ) : trendingTopics.length > 0 ? (
              <div className="space-y-2">
                {trendingTopics.slice(0, 4).map((topic, index) => (
                  <TrendingCard
                    key={topic.id}
                    topic={topic}
                    index={index}
                    onInject={() => onInjectPrompt(topic.topic)}
                    onSend={() => onSendMessage(`Cho tôi ý tưởng content về: ${topic.topic}`)}
                    onCreate={(format) => onCreateContent(topic.topic, format)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Chưa có trending topics</p>
              </div>
            )}
          </div>
          
          {/* Quick Suggestions */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium">Gợi ý nhanh</span>
              {suggestionsLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </div>
            
            {suggestionsLoading ? (
              <SectionSkeleton />
            ) : suggestions && suggestions.length > 0 ? (
              <div className="space-y-2">
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <SuggestionCard
                    key={suggestion.topic}
                    suggestion={{
                      topic: suggestion.topic,
                      reason: suggestion.reasoning,
                      score: suggestion.scores ? Math.round((suggestion.scores.brandFit + suggestion.scores.trend + suggestion.scores.competition + suggestion.scores.engagement) / 4) : undefined,
                    }}
                    index={index}
                    onInject={() => onInjectPrompt(suggestion.topic)}
                    onSend={() => onSendMessage(`Gợi ý content về: ${suggestion.topic}`)}
                    onCreate={(format) => onCreateContent(suggestion.topic, format)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Chưa có gợi ý</p>
              </div>
            )}
          </div>
          
          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs font-medium">Sự kiện sắp tới</span>
              </div>
              
              <div className="space-y-2">
                {upcomingEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index}
                    onInject={(topic) => onInjectPrompt(topic)}
                    onSend={(topic) => onSendMessage(`Gợi ý content cho sự kiện ${event.name}: ${topic}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
