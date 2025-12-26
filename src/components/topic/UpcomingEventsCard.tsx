import { useState, useMemo, useEffect } from 'react';
import { Calendar, Clock, Sparkles, ChevronRight, PartyPopper, Timer, Gift, Heart, Star, Flame, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { SEASONAL_EVENTS, SeasonalEvent } from '@/types/topicDiscovery';
import { cn } from '@/lib/utils';
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface UpcomingEventsCardProps {
  onGetSuggestions?: (event: SeasonalEvent) => void;
  onScheduleTopic?: (topic: string, eventDate: Date) => void;
  limit?: number;
  isGenerating?: boolean;
  isLoading?: boolean;
}

const eventTypeConfig = {
  holiday: { color: 'text-red-500', bg: 'bg-red-500/10', borderColor: 'border-red-500/30', icon: Gift, label: 'Lễ' },
  event: { color: 'text-violet-500', bg: 'bg-violet-500/10', borderColor: 'border-violet-500/30', icon: Star, label: 'Sự kiện' },
  campaign: { color: 'text-amber-500', bg: 'bg-amber-500/10', borderColor: 'border-amber-500/30', icon: Flame, label: 'Campaign' },
};

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function useCountdown(targetDate: Date): CountdownTime {
  const [countdown, setCountdown] = useState<CountdownTime>(() => calculateCountdown(targetDate));

  function calculateCountdown(date: Date): CountdownTime {
    const now = new Date();
    if (date <= now) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    
    const days = differenceInDays(date, now);
    const hours = differenceInHours(date, now) % 24;
    const minutes = differenceInMinutes(date, now) % 60;
    const seconds = differenceInSeconds(date, now) % 60;
    
    return { days, hours, minutes, seconds };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(calculateCountdown(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return countdown;
}

function CountdownTimer({ targetDate, compact = false }: { targetDate: Date; compact?: boolean }) {
  const { days, hours, minutes, seconds } = useCountdown(targetDate);
  
  if (days > 7) {
    return (
      <Badge variant="outline" className="text-xs bg-muted/50">
        <Timer className="w-3 h-3 mr-1" />
        {days} ngày
      </Badge>
    );
  }

  if (compact) {
    return (
      <Badge variant="destructive" className="text-xs font-mono animate-pulse">
        {days > 0 && `${days}d `}{String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {days > 0 && (
        <div className="text-center">
          <div className="text-lg font-bold text-primary">{days}</div>
          <div className="text-[10px] text-muted-foreground">ngày</div>
        </div>
      )}
      {days > 0 && <span className="text-muted-foreground">:</span>}
      <div className="text-center">
        <div className="text-lg font-bold text-primary">{String(hours).padStart(2, '0')}</div>
        <div className="text-[10px] text-muted-foreground">giờ</div>
      </div>
      <span className="text-muted-foreground animate-pulse">:</span>
      <div className="text-center">
        <div className="text-lg font-bold text-primary">{String(minutes).padStart(2, '0')}</div>
        <div className="text-[10px] text-muted-foreground">phút</div>
      </div>
      <span className="text-muted-foreground animate-pulse">:</span>
      <div className="text-center">
        <div className="text-lg font-bold text-primary">{String(seconds).padStart(2, '0')}</div>
        <div className="text-[10px] text-muted-foreground">giây</div>
      </div>
    </div>
  );
}

export function UpcomingEventsCard({
  onGetSuggestions,
  onScheduleTopic,
  limit = 3,
  isGenerating = false,
  isLoading = false,
}: UpcomingEventsCardProps) {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [selectedEventForAI, setSelectedEventForAI] = useState<SeasonalEvent | null>(null);

  // Get upcoming events sorted by date
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return SEASONAL_EVENTS
      .filter(event => event.date > now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, limit);
  }, [limit]);

  const getCountdown = (date: Date) => {
    const days = differenceInDays(date, new Date());
    if (days === 0) return 'Hôm nay!';
    if (days === 1) return 'Ngày mai';
    if (days <= 7) return `${days} ngày nữa`;
    if (days <= 30) return `${Math.ceil(days / 7)} tuần nữa`;
    return `${Math.ceil(days / 30)} tháng nữa`;
  };

  const getUrgencyLevel = (date: Date) => {
    const days = differenceInDays(date, new Date());
    if (days <= 3) return 'urgent';
    if (days <= 7) return 'warning';
    if (days <= 14) return 'soon';
    return 'normal';
  };

  const getUrgencyStyle = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'border-red-500/50 bg-red-500/5';
      case 'warning': return 'border-amber-500/50 bg-amber-500/5';
      case 'soon': return 'border-blue-500/50 bg-blue-500/5';
      default: return 'border-border/50';
    }
  };

  const handleGetAISuggestions = (event: SeasonalEvent) => {
    setSelectedEventForAI(event);
    onGetSuggestions?.(event);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="border-border/50 overflow-hidden">
        <div className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-1.5 w-full" />
          </div>
          <Skeleton className="h-9 w-full" />
        </div>
      </Card>
    );
  }

  if (upcomingEvents.length === 0) {
    return null;
  }

  const nearestEvent = upcomingEvents[0];
  const daysToNearest = differenceInDays(nearestEvent.date, new Date());
  const nearestConfig = eventTypeConfig[nearestEvent.type];
  const NearestIcon = nearestConfig.icon;

  // Calculate preparation progress (assume 30 days prep time)
  const prepDays = 30;
  const daysRemaining = Math.max(0, daysToNearest);
  const prepProgress = Math.max(0, Math.min(100, ((prepDays - daysRemaining) / prepDays) * 100));

  return (
    <Card className="border-border/50 overflow-hidden sticky top-4">
      {/* Featured Nearest Event */}
      <div className={cn(
        'relative p-4 bg-gradient-to-br',
        daysToNearest <= 7 
          ? 'from-red-500/10 via-orange-500/5 to-transparent' 
          : 'from-primary/10 via-primary/5 to-transparent'
      )}>
        {/* Decorative elements */}
        {daysToNearest <= 7 && (
          <div className="absolute top-2 right-2 animate-bounce">
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
        )}
        
        <div className="flex items-start gap-3 mb-3">
          <div className={cn('p-2.5 rounded-xl', nearestConfig.bg, 'shadow-sm')}>
            <NearestIcon className={cn('w-5 h-5', nearestConfig.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <Badge variant="outline" className={cn('text-[10px] mb-1', nearestConfig.color, nearestConfig.bg)}>
              {nearestConfig.label} sắp tới
            </Badge>
            <h4 className="font-semibold text-sm">{nearestEvent.name}</h4>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3" />
              {format(nearestEvent.date, 'EEEE, dd/MM/yyyy', { locale: vi })}
            </p>
          </div>
        </div>

        {/* Live Countdown */}
        <div className="flex justify-center py-3 px-2 rounded-lg bg-background/50 backdrop-blur-sm mb-3">
          <CountdownTimer targetDate={nearestEvent.date} />
        </div>

        {/* Preparation Progress */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Tiến độ chuẩn bị</span>
            <span className="font-medium">{Math.round(prepProgress)}%</span>
          </div>
          <Progress value={prepProgress} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground">
            {daysRemaining > 0 
              ? `Còn ${daysRemaining} ngày để chuẩn bị nội dung` 
              : 'Đã đến ngày sự kiện!'
            }
          </p>
        </div>

        {/* AI Suggestions Button */}
        <Button
          className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          size="sm"
          onClick={() => handleGetAISuggestions(nearestEvent)}
          disabled={isGenerating && selectedEventForAI?.id === nearestEvent.id}
        >
          {isGenerating && selectedEventForAI?.id === nearestEvent.id ? (
            <>
              <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Đang tạo gợi ý...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Lấy gợi ý AI cho sự kiện này
            </>
          )}
        </Button>

        {/* Quick Topic Suggestions */}
        {nearestEvent.suggestedTopics.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Gợi ý nhanh:</p>
            <div className="space-y-1.5">
              {nearestEvent.suggestedTopics.slice(0, 2).map((topic, idx) => (
                <button
                  key={idx}
                  className="w-full text-left p-2 rounded-md bg-background/50 hover:bg-background text-xs transition-colors group flex items-center gap-2"
                  onClick={() => onScheduleTopic?.(topic, nearestEvent.date)}
                >
                  <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="line-clamp-1 flex-1">{topic}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Other Upcoming Events */}
      {upcomingEvents.length > 1 && (
        <CardContent className="pt-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Sự kiện khác</p>
          {upcomingEvents.slice(1).map((event) => {
            const config = eventTypeConfig[event.type];
            const isExpanded = expandedEventId === event.id;
            const urgency = getUrgencyLevel(event.date);
            const Icon = config.icon;

            return (
              <div
                key={event.id}
                className={cn(
                  'rounded-lg border transition-all',
                  getUrgencyStyle(urgency),
                  isExpanded && 'shadow-sm'
                )}
              >
                {/* Event Header */}
                <button
                  className="w-full p-2.5 flex items-center gap-2.5 text-left"
                  onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                >
                  <div className={cn('p-1.5 rounded-lg', config.bg)}>
                    <Icon className={cn('w-3.5 h-3.5', config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{event.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(event.date, 'dd/MM', { locale: vi })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CountdownTimer targetDate={event.date} compact />
                    <ChevronRight className={cn(
                      'w-3.5 h-3.5 text-muted-foreground transition-transform',
                      isExpanded && 'rotate-90'
                    )} />
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-2.5 pb-2.5 space-y-2 animate-fade-in">
                    {event.suggestedTopics.slice(0, 2).map((topic, idx) => (
                      <button
                        key={idx}
                        className="w-full text-left p-2 rounded-md bg-muted/50 hover:bg-muted text-[11px] transition-colors"
                        onClick={() => onScheduleTopic?.(topic, event.date)}
                      >
                        <span className="line-clamp-2">{topic}</span>
                      </button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 h-7 text-xs"
                      onClick={() => handleGetAISuggestions(event)}
                      disabled={isGenerating && selectedEventForAI?.id === event.id}
                    >
                      <Sparkles className="w-3 h-3" />
                      Lấy gợi ý AI
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
