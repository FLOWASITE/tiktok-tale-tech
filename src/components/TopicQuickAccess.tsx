import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Lightbulb, Sparkles, ArrowRight, TrendingUp, 
  Calendar, Zap, Leaf, Play, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useEnhancedTopicSuggestions } from '@/hooks/useEnhancedTopicSuggestions';
import { useTopicHistory } from '@/hooks/useTopicHistory';
import { EnhancedTopicSuggestion, TopicCategory } from '@/types/topicDiscovery';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const categoryConfig: Record<TopicCategory, { icon: typeof Leaf; color: string; bgColor: string }> = {
  evergreen: { icon: Leaf, color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
  trending: { icon: TrendingUp, color: 'text-orange-600', bgColor: 'bg-orange-500/10' },
  seasonal: { icon: Calendar, color: 'text-purple-600', bgColor: 'bg-purple-500/10' },
  reactive: { icon: Zap, color: 'text-red-600', bgColor: 'bg-red-500/10' },
};

interface TopicQuickAccessProps {
  className?: string;
}

export function TopicQuickAccess({ className }: TopicQuickAccessProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const { 
    suggestions, 
    isLoading,
  } = useEnhancedTopicSuggestions({
    contentGoal: 'engagement',
    enabled: true,
  });

  const { saveTopic } = useTopicHistory({
    contentGoal: 'engagement',
    enabled: true,
  });

  const topSuggestions = useMemo(() => {
    return suggestions.slice(0, 3);
  }, [suggestions]);

  const handleUseTopic = async (topic: EnhancedTopicSuggestion) => {
    await saveTopic(topic, 'selected');
    navigate('/multichannel', { 
      state: { 
        prefillTopic: topic.topic,
        prefillGoal: 'engagement',
        fromTopics: true 
      } 
    });
  };

  return (
    <Card className={cn('gradient-card border-border/50', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-violet-500/20">
              <Lightbulb className="w-4 h-4 text-primary" />
            </div>
            <span>{t('app.dashboard.todayIdeas')}</span>
          </div>
          <Link to="/topics">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
              {t('app.dashboard.viewAll')}
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : topSuggestions.length === 0 ? (
          <div className="text-center py-6">
            <Sparkles className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">{t('app.dashboard.noSuggestions')}</p>
            <Button variant="link" size="sm" asChild className="mt-1">
              <Link to="/topics">{t('app.dashboard.exploreNow')}</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {topSuggestions.map((topic, index) => {
              const config = categoryConfig[topic.category as TopicCategory] ?? categoryConfig.evergreen;
              const CategoryIcon = config.icon;

              return (
                <div 
                  key={`${topic.topic}-${index}`}
                  className="group flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleUseTopic(topic)}
                >
                  <div className={cn('p-1.5 rounded-lg shrink-0', config.bgColor)}>
                    <CategoryIcon className={cn('w-3.5 h-3.5', config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                      {topic.topic}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                        {topic.category}
                      </Badge>
                      {topic.scores && (
                        <span className="text-[10px] text-muted-foreground">
                          {t('app.dashboard.score')}: {Math.round((topic.scores.brandFit + topic.scores.trend) / 2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleUseTopic(topic); }}
                  >
                    <Play className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
            
            <Link to="/topics" className="block mt-3">
              <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1">
                {t('app.dashboard.exploreMore')}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
