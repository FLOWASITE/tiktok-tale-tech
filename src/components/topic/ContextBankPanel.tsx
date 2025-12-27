import { useState } from 'react';
import { 
  Star, Clock, TrendingUp, Calendar, ChevronLeft, ChevronRight,
  Bookmark, ArrowRight, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { SeasonalEvent } from '@/types/topicDiscovery';

interface TopicItem {
  id: string;
  topic: string;
  pillar?: string;
  performanceScore?: number;
  isFavorite?: boolean;
  createdAt?: string;
}

interface ContextBankPanelProps {
  favorites: TopicItem[];
  recentTopics: TopicItem[];
  topPerformers: TopicItem[];
  upcomingEvents?: SeasonalEvent[];
  onInjectPrompt: (prompt: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ContextBankPanel({
  favorites,
  recentTopics,
  topPerformers,
  upcomingEvents = [],
  onInjectPrompt,
  isCollapsed = false,
  onToggleCollapse,
}: ContextBankPanelProps) {
  const [activeTab, setActiveTab] = useState('favorites');

  const handleTopicClick = (topic: string) => {
    onInjectPrompt(`Gợi ý content về: "${topic}"`);
  };

  const handleEventClick = (event: SeasonalEvent) => {
    onInjectPrompt(`Gợi ý các topic content cho sự kiện "${event.name}" vào ngày ${event.date.toLocaleDateString('vi-VN')}`);
  };

  const renderTopicItem = (item: TopicItem, showScore?: boolean) => (
    <button
      key={item.id}
      className="w-full text-left p-2 rounded-lg hover:bg-muted/80 transition-colors group flex items-start gap-2"
      onClick={() => handleTopicClick(item.topic)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">
          {item.topic}
        </p>
        {item.pillar && (
          <span className="text-[10px] text-muted-foreground">{item.pillar}</span>
        )}
      </div>
      {showScore && item.performanceScore && (
        <Badge 
          variant="outline" 
          className={cn(
            'shrink-0 text-[10px] h-5',
            item.performanceScore >= 80 ? 'text-emerald-500 border-emerald-500/30' :
            item.performanceScore >= 60 ? 'text-amber-500 border-amber-500/30' :
            'text-muted-foreground'
          )}
        >
          {item.performanceScore}%
        </Badge>
      )}
      <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
    </button>
  );

  const hasContent = favorites.length > 0 || recentTopics.length > 0 || topPerformers.length > 0;

  // Collapsed state - show toggle button only
  if (isCollapsed) {
    return (
      <TooltipProvider>
        <div className="flex flex-col items-center py-4 space-y-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onToggleCollapse}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Mở Context Bank</TooltipContent>
          </Tooltip>
          
          {favorites.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-1.5 rounded-lg bg-amber-500/10">
                  <Star className="w-4 h-4 text-amber-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{favorites.length} yêu thích</TooltipContent>
            </Tooltip>
          )}
          
          {recentTopics.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-1.5 rounded-lg bg-blue-500/10">
                  <Clock className="w-4 h-4 text-blue-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{recentTopics.length} gần đây</TooltipContent>
            </Tooltip>
          )}
          
          {topPerformers.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{topPerformers.length} top</TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card/50 border-r border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">Context Bank</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggleCollapse}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-3">
        {hasContent ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-8 p-0.5 bg-muted/50 mb-3">
              <TabsTrigger value="favorites" className="flex-1 h-7 text-[10px] gap-1 px-1">
                <Star className="w-3 h-3" />
                <span className="hidden sm:inline">Yêu thích</span>
                {favorites.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[9px] ml-0.5">
                    {favorites.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="recent" className="flex-1 h-7 text-[10px] gap-1 px-1">
                <Clock className="w-3 h-3" />
                <span className="hidden sm:inline">Gần đây</span>
              </TabsTrigger>
              <TabsTrigger value="top" className="flex-1 h-7 text-[10px] gap-1 px-1">
                <TrendingUp className="w-3 h-3" />
                <span className="hidden sm:inline">Top</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="favorites" className="mt-0 space-y-1">
              {favorites.length > 0 ? (
                favorites.slice(0, 8).map(item => renderTopicItem(item))
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  <Star className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
                  Chưa có topic yêu thích
                </div>
              )}
            </TabsContent>

            <TabsContent value="recent" className="mt-0 space-y-1">
              {recentTopics.length > 0 ? (
                recentTopics.slice(0, 8).map(item => renderTopicItem(item))
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
                  Chưa có topic gần đây
                </div>
              )}
            </TabsContent>

            <TabsContent value="top" className="mt-0 space-y-1">
              {topPerformers.length > 0 ? (
                topPerformers.slice(0, 8).map(item => renderTopicItem(item, true))
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  <TrendingUp className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
                  Chưa có topics nổi bật
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              Lưu và sử dụng topic để xây dựng context bank của bạn
            </p>
          </div>
        )}

        {/* Upcoming Events Section */}
        {upcomingEvents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-xs font-medium">Sự kiện sắp tới</span>
            </div>
            <div className="space-y-1.5">
              {upcomingEvents.slice(0, 3).map((event) => (
                <button
                  key={event.id}
                  className="w-full text-left p-2 rounded-lg hover:bg-muted/80 transition-colors group"
                  onClick={() => handleEventClick(event)}
                >
                  <p className="text-xs font-medium line-clamp-1 group-hover:text-primary transition-colors">
                    {event.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {event.date.toLocaleDateString('vi-VN')}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
