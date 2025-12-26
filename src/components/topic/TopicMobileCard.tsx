import React from 'react';
import { 
  Leaf, TrendingUp, Calendar, Zap, Sparkles, Clock, 
  BookmarkPlus, Play, CalendarPlus, Info, MoreVertical,
  Target, BarChart3, Users, Trophy, ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { EnhancedTopicSuggestion, TopicCategory, calculateOverallScore, SCORE_THRESHOLDS } from '@/types/topicDiscovery';

interface TopicMobileCardProps {
  topic: EnhancedTopicSuggestion;
  onSelect: (topic: EnhancedTopicSuggestion) => void;
  onSave?: (topic: EnhancedTopicSuggestion) => void;
  onSchedule?: (topic: EnhancedTopicSuggestion) => void;
  onShowExplanation?: (topic: EnhancedTopicSuggestion) => void;
}

const categoryConfig: Record<TopicCategory, { icon: typeof Leaf; gradient: string; bgClass: string; textClass: string; label: string }> = {
  evergreen: {
    icon: Leaf,
    gradient: 'from-emerald-500 to-teal-500',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    label: 'Evergreen',
  },
  trending: {
    icon: TrendingUp,
    gradient: 'from-orange-500 to-amber-500',
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-600 dark:text-orange-400',
    label: 'Trending',
  },
  seasonal: {
    icon: Calendar,
    gradient: 'from-purple-500 to-violet-500',
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-600 dark:text-purple-400',
    label: 'Seasonal',
  },
  reactive: {
    icon: Zap,
    gradient: 'from-red-500 to-rose-500',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-600 dark:text-red-400',
    label: 'Reactive',
  },
};

const scoreConfig = [
  { key: 'brandFit' as const, label: 'Brand', icon: Target },
  { key: 'trend' as const, label: 'Trend', icon: TrendingUp },
  { key: 'competition' as const, label: 'Cạnh tranh', icon: BarChart3 },
  { key: 'engagement' as const, label: 'Tương tác', icon: Users },
];

export function TopicMobileCard({
  topic,
  onSelect,
  onSave,
  onSchedule,
  onShowExplanation,
}: TopicMobileCardProps) {
  const config = categoryConfig[topic.category] || categoryConfig.evergreen;
  const CategoryIcon = config.icon;
  const overallScore = topic.scores ? calculateOverallScore(topic.scores) : null;

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Card
          className={cn(
            'relative transition-all duration-300 overflow-hidden cursor-pointer',
            'active:scale-[0.98] touch-manipulation',
            'border-border/50'
          )}
        >
          {/* Category gradient accent */}
          <div
            className={cn(
              'absolute top-0 left-0 right-0 h-1 rounded-t-lg bg-gradient-to-r',
              config.gradient
            )}
          />

          <div className="p-4 pt-5">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className={cn('rounded-lg shrink-0 p-2', config.bgClass)}>
                <CategoryIcon className={cn('w-4 h-4', config.textClass)} />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm line-clamp-2 mb-1.5">{topic.topic}</h4>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', config.bgClass, config.textClass)}>
                    {config.label}
                  </Badge>
                  {topic.pillar && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {topic.pillar}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Overall Score */}
              {overallScore !== null && (
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-md shrink-0',
                    'bg-gradient-to-br',
                    overallScore >= SCORE_THRESHOLDS.excellent ? 'from-emerald-500 to-teal-600' :
                    overallScore >= SCORE_THRESHOLDS.good ? 'from-amber-500 to-yellow-600' :
                    overallScore >= SCORE_THRESHOLDS.fair ? 'from-orange-500 to-amber-600' :
                    'from-red-500 to-rose-600'
                  )}
                >
                  {overallScore}
                </div>
              )}
            </div>

            {/* Swipe hint */}
            <div className="flex items-center justify-center mt-3 pt-2 border-t border-border/30">
              <ChevronUp className="w-4 h-4 text-muted-foreground animate-bounce" />
              <span className="text-[10px] text-muted-foreground ml-1">Vuốt lên để xem chi tiết</span>
            </div>
          </div>
        </Card>
      </DrawerTrigger>

      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-border/50 pb-4">
          <div className="flex items-start gap-3">
            <div className={cn('rounded-lg shrink-0 p-2.5', config.bgClass)}>
              <CategoryIcon className={cn('w-5 h-5', config.textClass)} />
            </div>
            <div className="flex-1">
              <DrawerTitle className="text-left text-base font-semibold leading-tight">
                {topic.topic}
              </DrawerTitle>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant="outline" className={cn('text-[10px]', config.bgClass, config.textClass)}>
                  {config.label}
                </Badge>
                {topic.pillar && (
                  <Badge variant="secondary" className="text-[10px]">
                    {topic.pillar}
                  </Badge>
                )}
                {topic.topicType && (
                  <Badge variant="outline" className="text-[10px]">
                    {topic.topicType}
                  </Badge>
                )}
              </div>
            </div>
            {overallScore !== null && (
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white shadow-lg shrink-0',
                  'bg-gradient-to-br',
                  overallScore >= SCORE_THRESHOLDS.excellent ? 'from-emerald-500 to-teal-600' :
                  overallScore >= SCORE_THRESHOLDS.good ? 'from-amber-500 to-yellow-600' :
                  overallScore >= SCORE_THRESHOLDS.fair ? 'from-orange-500 to-amber-600' :
                  'from-red-500 to-rose-600'
                )}
              >
                <span className="text-lg font-bold">{overallScore}</span>
                <span className="text-[8px] -mt-0.5">điểm</span>
              </div>
            )}
          </div>
        </DrawerHeader>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Scores Grid */}
          {topic.scores && (
            <div className="grid grid-cols-2 gap-2">
              {scoreConfig.map(({ key, label, icon: Icon }) => {
                const value = topic.scores![key];
                return (
                  <div 
                    key={key}
                    className={cn(
                      'p-3 rounded-lg border border-border/50 flex items-center gap-2',
                      value >= SCORE_THRESHOLDS.excellent ? 'bg-emerald-500/5' :
                      value >= SCORE_THRESHOLDS.good ? 'bg-amber-500/5' :
                      'bg-muted/30'
                    )}
                  >
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                      <p className={cn(
                        'text-sm font-semibold',
                        value >= SCORE_THRESHOLDS.excellent ? 'text-emerald-600' :
                        value >= SCORE_THRESHOLDS.good ? 'text-amber-600' :
                        'text-foreground'
                      )}>
                        {value}/100
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reasoning */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase">Lý do gợi ý</h4>
            <p className="text-sm text-foreground leading-relaxed bg-muted/30 rounded-lg p-3">
              {topic.reasoning}
            </p>
          </div>

          {/* Keywords */}
          {topic.relatedKeywords && topic.relatedKeywords.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase">Từ khóa liên quan</h4>
              <div className="flex flex-wrap gap-1.5">
                {topic.relatedKeywords.map((kw) => (
                  <Badge key={kw} variant="outline" className="text-xs px-2">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Best time */}
          {topic.bestTimeToPost && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
              <Clock className="w-4 h-4" />
              <span>Thời điểm tốt nhất: {topic.bestTimeToPost}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 pt-2 border-t border-border/50 flex gap-2 safe-area-bottom">
          <DrawerClose asChild>
            <Button 
              className="flex-1 gap-2"
              onClick={() => onSelect(topic)}
            >
              <Play className="w-4 h-4" />
              Sử dụng ngay
            </Button>
          </DrawerClose>
          {onSave && (
            <DrawerClose asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onSave(topic)}
              >
                <BookmarkPlus className="w-4 h-4" />
              </Button>
            </DrawerClose>
          )}
          {onSchedule && (
            <DrawerClose asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onSchedule(topic)}
              >
                <CalendarPlus className="w-4 h-4" />
              </Button>
            </DrawerClose>
          )}
          {onShowExplanation && (
            <DrawerClose asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onShowExplanation(topic)}
              >
                <Info className="w-4 h-4" />
              </Button>
            </DrawerClose>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
