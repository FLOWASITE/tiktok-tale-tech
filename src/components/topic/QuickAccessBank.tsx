import { Star, Clock, ArrowRight, Bookmark, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface TopicItem {
  id: string;
  topic: string;
  pillar?: string;
  performanceScore?: number;
  isFavorite?: boolean;
  createdAt?: string;
}

interface QuickAccessBankProps {
  favorites: TopicItem[];
  recentTopics: TopicItem[];
  topPerformers: TopicItem[];
  onSelectTopic: (topic: string) => void;
  onViewAll?: () => void;
}

export function QuickAccessBank({
  favorites,
  recentTopics,
  topPerformers,
  onSelectTopic,
  onViewAll,
}: QuickAccessBankProps) {
  const renderTopicItem = (item: TopicItem, showScore?: boolean) => (
    <button
      key={item.id}
      className="w-full text-left p-2.5 rounded-lg hover:bg-muted/80 transition-colors group flex items-start gap-2"
      onClick={() => onSelectTopic(item.topic)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
          {item.topic}
        </p>
        {item.pillar && (
          <span className="text-xs text-muted-foreground">{item.pillar}</span>
        )}
      </div>
      {showScore && item.performanceScore && (
        <Badge 
          variant="outline" 
          className={cn(
            'shrink-0 text-xs',
            item.performanceScore >= 80 ? 'text-emerald-500 border-emerald-500/30' :
            item.performanceScore >= 60 ? 'text-amber-500 border-amber-500/30' :
            'text-muted-foreground'
          )}
        >
          {item.performanceScore}%
        </Badge>
      )}
      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );

  const hasContent = favorites.length > 0 || recentTopics.length > 0 || topPerformers.length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-500" />
            Truy cập nhanh
          </CardTitle>
          {onViewAll && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onViewAll}>
              Xem tất cả
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Tabs defaultValue="favorites" className="w-full">
          <TabsList className="w-full h-8 p-0.5 bg-muted/50">
            <TabsTrigger value="favorites" className="flex-1 h-7 text-xs gap-1">
              <Star className="w-3 h-3" />
              Yêu thích
              {favorites.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {favorites.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex-1 h-7 text-xs gap-1">
              <Clock className="w-3 h-3" />
              Gần đây
            </TabsTrigger>
            <TabsTrigger value="top" className="flex-1 h-7 text-xs gap-1">
              <TrendingUp className="w-3 h-3" />
              Top
            </TabsTrigger>
          </TabsList>

          <TabsContent value="favorites" className="mt-2">
            <ScrollArea className="h-[180px]">
              {favorites.length > 0 ? (
                <div className="space-y-1">
                  {favorites.slice(0, 5).map(item => renderTopicItem(item))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  <Star className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                  Chưa có topic yêu thích
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="recent" className="mt-2">
            <ScrollArea className="h-[180px]">
              {recentTopics.length > 0 ? (
                <div className="space-y-1">
                  {recentTopics.slice(0, 5).map(item => renderTopicItem(item))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                  Chưa có topic gần đây
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="top" className="mt-2">
            <ScrollArea className="h-[180px]">
              {topPerformers.length > 0 ? (
                <div className="space-y-1">
                  {topPerformers.slice(0, 5).map(item => renderTopicItem(item, true))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Chưa có topics nổi bật
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
