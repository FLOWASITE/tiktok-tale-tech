import React from 'react';
import { 
  Leaf, TrendingUp, Calendar, Zap, Sparkles, Clock, 
  BookmarkPlus, Play, CalendarPlus, Info, Image, Video, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EnhancedTopicSuggestion, TopicCategory, TopicFormat } from '@/types/topicDiscovery';

interface TopicIdeaCardProps {
  topic: EnhancedTopicSuggestion;
  onSelect: (topic: EnhancedTopicSuggestion) => void;
  onSave?: (topic: EnhancedTopicSuggestion) => void;
  onSchedule?: (topic: EnhancedTopicSuggestion) => void;
  isSelected?: boolean;
  disabled?: boolean;
}

const categoryConfig: Record<TopicCategory, { icon: typeof Leaf; gradient: string; bgClass: string; textClass: string }> = {
  evergreen: {
    icon: Leaf,
    gradient: 'from-emerald-500 to-teal-500',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  trending: {
    icon: TrendingUp,
    gradient: 'from-orange-500 to-amber-500',
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-600 dark:text-orange-400',
  },
  seasonal: {
    icon: Calendar,
    gradient: 'from-purple-500 to-violet-500',
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-600 dark:text-purple-400',
  },
  reactive: {
    icon: Zap,
    gradient: 'from-red-500 to-rose-500',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-600 dark:text-red-400',
  },
};

const formatIcons: Record<TopicFormat, typeof Image> = {
  carousel: Image,
  script: Video,
  multichannel: Layers,
};

const engagementColors = {
  high: 'bg-emerald-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-400',
};

export function TopicIdeaCard({
  topic,
  onSelect,
  onSave,
  onSchedule,
  isSelected,
  disabled,
}: TopicIdeaCardProps) {
  const config = categoryConfig[topic.category];
  const CategoryIcon = config.icon;

  const overallScore = topic.scores
    ? Math.round(
        (topic.scores.brandFit + topic.scores.trend + topic.scores.competition + topic.scores.engagement) / 4
      )
    : null;

  return (
    <Card
      className={cn(
        'group relative p-4 transition-all duration-300 cursor-pointer',
        'hover:shadow-lg hover:-translate-y-0.5',
        'border-border/50 hover:border-primary/30',
        isSelected && 'ring-2 ring-primary border-primary',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={() => !disabled && onSelect(topic)}
    >
      {/* Category gradient accent */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-1 rounded-t-lg bg-gradient-to-r',
          config.gradient
        )}
      />

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn('p-2 rounded-lg', config.bgClass)}>
          <CategoryIcon className={cn('w-4 h-4', config.textClass)} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm line-clamp-2 mb-1">{topic.topic}</h4>
          
          {/* Category & Pillar badges */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', config.bgClass, config.textClass)}>
              {topic.category === 'evergreen' && 'Evergreen'}
              {topic.category === 'trending' && 'Trending'}
              {topic.category === 'seasonal' && 'Seasonal'}
              {topic.category === 'reactive' && 'Reactive'}
            </Badge>
            {topic.pillar && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {topic.pillar}
              </Badge>
            )}
          </div>
        </div>

        {/* Engagement indicator */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center gap-1">
                <div className={cn('w-3 h-3 rounded-full', engagementColors[topic.estimatedEngagement])} />
                <span className="text-[10px] text-muted-foreground">
                  {topic.estimatedEngagement === 'high' && 'Cao'}
                  {topic.estimatedEngagement === 'medium' && 'TB'}
                  {topic.estimatedEngagement === 'low' && 'Thấp'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs">Dự đoán tương tác: {topic.estimatedEngagement}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Scores (if available) */}
      {topic.scores && (
        <div className="grid grid-cols-4 gap-1 mb-3">
          {[
            { label: 'Brand', value: topic.scores.brandFit },
            { label: 'Trend', value: topic.scores.trend },
            { label: 'Cạnh tranh', value: topic.scores.competition },
            { label: 'Tương tác', value: topic.scores.engagement },
          ].map((score) => (
            <div key={score.label} className="text-center">
              <div className="text-[10px] text-muted-foreground mb-0.5">{score.label}</div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    score.value >= 70 ? 'bg-emerald-500' : score.value >= 40 ? 'bg-amber-500' : 'bg-red-500'
                  )}
                  style={{ width: `${score.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Format compatibility */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-muted-foreground">Phù hợp:</span>
        <div className="flex gap-1">
          {topic.formats.map((format) => {
            const FormatIcon = formatIcons[format];
            return (
              <TooltipProvider key={format}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-1 rounded bg-muted/50">
                      <FormatIcon className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {format === 'carousel' && 'Carousel'}
                      {format === 'script' && 'Video Script'}
                      {format === 'multichannel' && 'Đa kênh'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {topic.bestTimeToPost && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
            <Clock className="w-3 h-3" />
            {topic.bestTimeToPost}
          </div>
        )}
      </div>

      {/* Keywords */}
      {topic.relatedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {topic.relatedKeywords.slice(0, 4).map((keyword) => (
            <Badge key={keyword} variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/30">
              {keyword}
            </Badge>
          ))}
          {topic.relatedKeywords.length > 4 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/30">
              +{topic.relatedKeywords.length - 4}
            </Badge>
          )}
        </div>
      )}

      {/* Reasoning tooltip */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1">
                <Info className="w-3 h-3" />
                Tại sao?
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[280px]">
              <p className="text-xs leading-relaxed">{topic.reasoning}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
          {onSave && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSave(topic);
                    }}
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Lưu</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(topic);
                  }}
                >
                  <Play className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sử dụng ngay</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {onSchedule && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSchedule(topic);
                    }}
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Lên lịch</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Overall score badge */}
      {overallScore !== null && (
        <div className="absolute -top-2 -right-2">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg',
              overallScore >= 70 ? 'bg-emerald-500' : overallScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
            )}
          >
            {overallScore}
          </div>
        </div>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-primary-foreground" />
          </div>
        </div>
      )}
    </Card>
  );
}
