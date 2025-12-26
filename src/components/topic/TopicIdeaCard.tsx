import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Leaf, TrendingUp, Calendar, Zap, Sparkles, Clock, 
  BookmarkPlus, BookmarkCheck, Play, CalendarPlus, Info, ImageIcon, Video, Layers,
  Target, BarChart3, Users, Trophy, Flame, Gift, Star, X, Clapperboard, GripVertical, type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { EnhancedTopicSuggestion, TopicCategory, TopicFormat, calculateOverallScore, getScoreColor, SCORE_THRESHOLDS } from '@/types/topicDiscovery';
import { TopicQuickPreview } from './TopicQuickPreview';

interface TopicIdeaCardProps {
  topic: EnhancedTopicSuggestion;
  onSelect: (topic: EnhancedTopicSuggestion) => void;
  onSave?: (topic: EnhancedTopicSuggestion) => void;
  onSchedule?: (topic: EnhancedTopicSuggestion) => void;
  onShowExplanation?: (topic: EnhancedTopicSuggestion) => void;
  onRemove?: (topic: EnhancedTopicSuggestion) => void;
  onCreateScript?: (topic: EnhancedTopicSuggestion) => void;
  isSelected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  selectable?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  isDraft?: boolean;
  brandTemplateId?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, topic: EnhancedTopicSuggestion) => void;
  onDragEnd?: (e: React.DragEvent) => void;
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

const formatIcons: Record<TopicFormat, LucideIcon> = {
  carousel: ImageIcon,
  script: Video,
  multichannel: Layers,
};

const scoreConfig = [
  { key: 'brandFit' as const, label: 'Brand', icon: Target, description: 'Phù hợp với brand positioning' },
  { key: 'trend' as const, label: 'Trend', icon: TrendingUp, description: 'Mức độ trending hiện tại' },
  { key: 'competition' as const, label: 'Cạnh tranh', icon: BarChart3, description: 'Ít cạnh tranh = điểm cao' },
  { key: 'engagement' as const, label: 'Tương tác', icon: Users, description: 'Tiềm năng engagement' },
];

// Event icon mapping for seasonal/reactive topics
const getEventIcon = (eventName?: string) => {
  if (!eventName) return null;
  const lowerEvent = eventName.toLowerCase();
  if (lowerEvent.includes('tết') || lowerEvent.includes('new year')) return Gift;
  if (lowerEvent.includes('valentine')) return Star;
  if (lowerEvent.includes('black friday') || lowerEvent.includes('sale')) return Flame;
  if (lowerEvent.includes('deadline') || lowerEvent.includes('quyết toán')) return Clock;
  return Calendar;
};

export function TopicIdeaCard({
  topic,
  onSelect,
  onSave,
  onSchedule,
  onShowExplanation,
  onRemove,
  onCreateScript,
  isSelected,
  disabled,
  compact = false,
  selectable = false,
  checked = false,
  onCheckedChange,
  isDraft = true,
  brandTemplateId,
  draggable = false,
  onDragStart,
  onDragEnd,
}: TopicIdeaCardProps) {
  const navigate = useNavigate();
  const config = categoryConfig[topic.category] || categoryConfig.evergreen;
  const CategoryIcon = config.icon;
  const EventIcon = getEventIcon(topic.relatedEvent);

  const overallScore = topic.scores ? calculateOverallScore(topic.scores) : null;
  const scoreColorClass = overallScore !== null ? getScoreColor(overallScore) : 'slate';

  // Check if topic supports script format
  const supportsScript = topic.formats.includes('script');

  const handleCreateScript = () => {
    if (onCreateScript) {
      onCreateScript(topic);
    } else {
      // Default: navigate to script creation with topic
      const params = new URLSearchParams({ topic: topic.topic });
      if (brandTemplateId) params.set('brandId', brandTemplateId);
      navigate(`/scripts?${params.toString()}`);
    }
  };

  const getScoreBarColor = (value: number) => {
    if (value >= SCORE_THRESHOLDS.excellent) return 'bg-emerald-500';
    if (value >= SCORE_THRESHOLDS.good) return 'bg-amber-500';
    if (value >= SCORE_THRESHOLDS.fair) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getScoreGradient = (value: number) => {
    if (value >= SCORE_THRESHOLDS.excellent) return 'from-emerald-500 to-teal-400';
    if (value >= SCORE_THRESHOLDS.good) return 'from-amber-500 to-yellow-400';
    if (value >= SCORE_THRESHOLDS.fair) return 'from-orange-500 to-amber-400';
    return 'from-red-500 to-rose-400';
  };

  // Format event date for display
  const formatEventDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (draggable && onDragStart) {
      e.dataTransfer.setData('application/json', JSON.stringify(topic));
      e.dataTransfer.effectAllowed = 'move';
      onDragStart(e, topic);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (onDragEnd) {
      onDragEnd(e);
    }
  };

  const cardContent = (
    <Card
      className={cn(
        'group relative transition-all duration-300 cursor-pointer overflow-hidden',
        'hover:shadow-lg hover:-translate-y-0.5',
        'border-border/50 hover:border-primary/30',
        isSelected && 'ring-2 ring-primary border-primary',
        checked && 'ring-2 ring-primary/50 bg-primary/5',
        disabled && 'opacity-50 cursor-not-allowed',
        draggable && 'cursor-grab active:cursor-grabbing',
        compact ? 'p-3' : 'p-4'
      )}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        if (selectable && onCheckedChange) {
          e.stopPropagation();
          onCheckedChange(!checked);
        } else if (!disabled) {
          onSelect(topic);
        }
      }}
    >
      {/* Category gradient accent */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-1 rounded-t-lg bg-gradient-to-r',
          config.gradient
        )}
      />

      {/* Drag Handle */}
      {draggable && (
        <div className="absolute top-1/2 -left-0.5 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="p-1 rounded-r bg-muted/80 backdrop-blur-sm">
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Checkbox for selection mode */}
      {selectable && (
        <div 
          className="absolute top-3 left-3 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={checked}
            onCheckedChange={(val) => onCheckedChange?.(!!val)}
            className="bg-background"
          />
        </div>
      )}

      {/* Header */}
      <div className={cn('flex items-start gap-3', compact ? 'mb-2' : 'mb-3', selectable && 'pl-6', draggable && !selectable && 'pl-2')}>
        <div className={cn('rounded-lg shrink-0', config.bgClass, compact ? 'p-1.5' : 'p-2')}>
          <CategoryIcon className={cn(config.textClass, compact ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className={cn('font-medium line-clamp-2 mb-1', compact ? 'text-xs' : 'text-sm')}>{topic.topic}</h4>
          
          {/* Category, Event & Pillar badges */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', config.bgClass, config.textClass)}>
              {config.label}
            </Badge>
            
            {/* Seasonal Event Badge */}
            {topic.relatedEvent && EventIcon && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className="text-[10px] px-1.5 py-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 gap-0.5 animate-pulse"
                    >
                      <EventIcon className="w-2.5 h-2.5" />
                      {formatEventDate(topic.eventDate)}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {topic.relatedEvent}
                    </p>
                    {topic.eventDate && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Ngày: {topic.eventDate}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {topic.pillar && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {topic.pillar}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Scores with animation */}
      {topic.scores && (
        <div className="space-y-1.5 mb-3">
          {scoreConfig.map(({ key, label, icon: Icon, description }) => {
            const value = topic.scores![key];
            return (
              <TooltipProvider key={key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r',
                            getScoreGradient(value)
                          )}
                          style={{ 
                            width: `${value}%`,
                            animationDelay: `${scoreConfig.findIndex(s => s.key === key) * 100}ms`
                          }}
                        />
                      </div>
                      <span className={cn(
                        'text-[10px] font-medium w-6 text-right',
                        value >= SCORE_THRESHOLDS.excellent ? 'text-emerald-600 dark:text-emerald-400' :
                        value >= SCORE_THRESHOLDS.good ? 'text-amber-600 dark:text-amber-400' :
                        'text-red-600 dark:text-red-400'
                      )}>
                        {value}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[200px]">
                    <p className="text-xs font-medium">{label}: {value}/100</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      )}

      {/* Format compatibility */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-muted-foreground">Phù hợp:</span>
        <div className="flex gap-1">
          {topic.formats.map((format) => {
            const FormatIcon = formatIcons[format];
            if (!FormatIcon) return null;
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
      {topic.relatedKeywords && topic.relatedKeywords.length > 0 && (
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

      {/* Reasoning button - opens explanation dialog */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 px-2 text-[10px] gap-1"
          onClick={(e) => {
            e.stopPropagation();
            if (onShowExplanation) {
              onShowExplanation(topic);
            }
          }}
        >
          <Info className="w-3 h-3" />
          Tại sao?
        </Button>

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
                    {isDraft ? (
                      <BookmarkCheck className="w-3.5 h-3.5" />
                    ) : (
                      <BookmarkPlus className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isDraft ? 'Giữ lại' : 'Lưu'}</TooltipContent>
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

          {/* Create Script button - only show if format includes script */}
          {supportsScript && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateScript();
                    }}
                  >
                    <Clapperboard className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tạo Script</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

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

      {/* Overall score badge - enhanced */}
      {overallScore !== null && (
        <div className="absolute -top-2 -right-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg ring-2 ring-background',
                    'bg-gradient-to-br',
                    overallScore >= SCORE_THRESHOLDS.excellent ? 'from-emerald-500 to-teal-600' :
                    overallScore >= SCORE_THRESHOLDS.good ? 'from-amber-500 to-yellow-600' :
                    overallScore >= SCORE_THRESHOLDS.fair ? 'from-orange-500 to-amber-600' :
                    'from-red-500 to-rose-600'
                  )}
                >
                  {overallScore}
                </div>
              </TooltipTrigger>
              <TooltipContent side="left">
                <div className="space-y-1">
                  <p className="text-xs font-medium flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    Điểm tổng hợp: {overallScore}/100
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {overallScore >= SCORE_THRESHOLDS.excellent && 'Xuất sắc - Nên triển khai ngay'}
                    {overallScore >= SCORE_THRESHOLDS.good && overallScore < SCORE_THRESHOLDS.excellent && 'Tốt - Đáng để thử'}
                    {overallScore >= SCORE_THRESHOLDS.fair && overallScore < SCORE_THRESHOLDS.good && 'Khá - Cần cân nhắc'}
                    {overallScore < SCORE_THRESHOLDS.fair && 'Thấp - Không ưu tiên'}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-3 right-12">
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-primary-foreground" />
          </div>
        </div>
      )}
    </Card>
  );

  // Wrap with HoverCard for detailed preview using TopicQuickPreview
  return (
    <HoverCard openDelay={300} closeDelay={150}>
      <HoverCardTrigger asChild>
        {cardContent}
      </HoverCardTrigger>
      <HoverCardContent 
        side="right" 
        align="start" 
        className="p-0 w-auto border-0 shadow-none bg-transparent animate-in fade-in-0 zoom-in-95 slide-in-from-left-2 duration-200"
        sideOffset={12}
      >
        <TopicQuickPreview
          topic={topic}
          brandTemplateId={brandTemplateId}
          onCreateContent={(format) => {
            if (format === 'script') {
              handleCreateScript();
            } else {
              onSelect(topic);
            }
          }}
          className="animate-in fade-in-0 zoom-in-95 duration-300"
        />
      </HoverCardContent>
    </HoverCard>
  );
}
