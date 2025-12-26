import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Star, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTopicHistory, TopicHistoryItem } from '@/hooks/useTopicHistory';
import { ContentGoal } from '@/types/multichannel';
import { cn } from '@/lib/utils';

interface SimilarSuccessTopicsProps {
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  onSelectTopic: (topic: string, goal?: ContentGoal) => void;
  limit?: number;
}

export function SimilarSuccessTopics({ 
  brandTemplateId,
  contentGoal,
  onSelectTopic,
  limit = 5
}: SimilarSuccessTopicsProps) {
  const navigate = useNavigate();

  const { topPerformers, isLoading } = useTopicHistory({
    brandTemplateId,
    contentGoal,
    enabled: true,
  });

  // Get top performers with good performance
  const successfulTopics = useMemo(() => {
    return topPerformers
      .filter(item => item.performanceScore && item.performanceScore >= 70)
      .slice(0, limit);
  }, [topPerformers, limit]);

  const handleSelectTopic = (topic: TopicHistoryItem) => {
    onSelectTopic(topic.topic, topic.contentGoal);
  };

  const handleReuseAsSimilar = (topic: TopicHistoryItem) => {
    // Navigate to create new content inspired by this topic
    navigate('/multichannel', {
      state: {
        prefillTopic: `Tương tự: ${topic.topic}`,
        prefillGoal: topic.contentGoal,
        fromTopics: true,
        inspirationTopicId: topic.id,
      }
    });
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) {
      return (
        <Badge className="bg-emerald-500 text-white gap-1">
          <Star className="w-3 h-3 fill-current" />
          {score}
        </Badge>
      );
    }
    if (score >= 80) {
      return (
        <Badge className="bg-amber-500 text-white gap-1">
          <TrendingUp className="w-3 h-3" />
          {score}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <TrendingUp className="w-3 h-3" />
        {score}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className="gradient-card border-border/50">
        <CardContent className="py-6 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
              <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (successfulTopics.length === 0) {
    return null;
  }

  return (
    <Card className="gradient-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          Topics đã thành công
          <Badge variant="secondary" className="ml-auto text-xs">
            {successfulTopics.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {successfulTopics.map((topic, index) => (
          <div 
            key={topic.id}
            className={cn(
              'group flex items-center gap-3 p-3 rounded-lg',
              'bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer',
              index === 0 && 'bg-emerald-500/5 border border-emerald-500/20'
            )}
            onClick={() => handleSelectTopic(topic)}
          >
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
              index === 0 && 'bg-emerald-500 text-white',
              index === 1 && 'bg-muted-foreground/20 text-muted-foreground',
              index === 2 && 'bg-amber-700/20 text-amber-700',
              index > 2 && 'bg-muted text-muted-foreground'
            )}>
              {index + 1}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                {topic.topic}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px] h-5">
                  {topic.category}
                </Badge>
                {topic.pillar && (
                  <span className="text-[10px] text-muted-foreground">
                    {topic.pillar}
                  </span>
                )}
              </div>
            </div>

            {topic.performanceScore && getPerformanceBadge(topic.performanceScore)}

            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                handleReuseAsSimilar(topic);
              }}
            >
              <Sparkles className="w-4 h-4" />
            </Button>
          </div>
        ))}

        {successfulTopics.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs mt-2"
            onClick={() => navigate('/topics', { state: { tab: 'performance' } })}
          >
            Xem tất cả hiệu suất
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
