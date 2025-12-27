import { useMemo } from 'react';
import { CalendarDays, ArrowRight, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCuratedEvents } from '@/hooks/useCuratedEvents';
import { CuratedEvent, EVENT_TYPE_CONFIG } from '@/types/curatedData';
import { cn } from '@/lib/utils';

interface SeasonalEventsPanelProps {
  onSelectEvent: (event: CuratedEvent) => void;
  maxEvents?: number;
  compact?: boolean;
}

const EVENT_EMOJI: Record<string, string> = {
  'holiday': '🎊',
  'campaign': '🎯',
  'industry_event': '💼',
  'awareness_day': '📅',
};

export function SeasonalEventsPanel({
  onSelectEvent,
  maxEvents = 5,
  compact = false,
}: SeasonalEventsPanelProps) {
  const { isLoading, getUpcomingEvents } = useCuratedEvents();

  const upcomingEvents = useMemo(() => {
    return getUpcomingEvents(60).slice(0, maxEvents);
  }, [getUpcomingEvents, maxEvents]);

  const getCountdown = (eventDate: string) => {
    const days = Math.ceil(
      (new Date(eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return 'Hôm nay';
    if (days === 1) return 'Ngày mai';
    return `${days} ngày`;
  };

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 px-1 mb-2">
          <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-medium text-muted-foreground">Sự kiện</span>
        </div>
        
        {isLoading ? (
          <div className="space-y-1">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full rounded" />
            ))}
          </div>
        ) : upcomingEvents.length > 0 ? (
          <div className="space-y-0.5">
            {upcomingEvents.map((event) => {
              const daysUntil = Math.ceil(
                (new Date(event.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              const isUrgent = daysUntil <= 7;
              const emoji = EVENT_EMOJI[event.event_type] || '📅';

              return (
                <Tooltip key={event.id}>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors",
                        isUrgent 
                          ? "bg-red-500/10 hover:bg-red-500/20" 
                          : "hover:bg-muted"
                      )}
                      onClick={() => onSelectEvent(event)}
                    >
                      <span className="text-sm">{emoji}</span>
                      <span className="flex-1 text-xs truncate">{event.name}</span>
                      <span className={cn(
                        "text-[10px] tabular-nums",
                        isUrgent ? "text-red-500 font-medium" : "text-muted-foreground"
                      )}>
                        {getCountdown(event.event_date)}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[200px]">
                    <p className="font-medium">{event.name}</p>
                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                    )}
                    {event.suggested_topics?.length > 0 && (
                      <p className="text-xs mt-1">
                        💡 {event.suggested_topics.slice(0, 2).join(', ')}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground text-center py-2">
            Không có sự kiện sắp tới
          </p>
        )}
      </div>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="p-1 rounded bg-amber-500/10">
            <CalendarDays className="h-3.5 w-3.5 text-amber-500" />
          </div>
          Sự kiện sắp đến
          {upcomingEvents.length > 0 && (
            <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px]">
              {upcomingEvents.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : upcomingEvents.length > 0 ? (
          <div className="space-y-2">
            {upcomingEvents.map((event) => {
              const daysUntil = Math.ceil(
                (new Date(event.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              const isUrgent = daysUntil <= 7;
              const eventConfig = EVENT_TYPE_CONFIG[event.event_type as keyof typeof EVENT_TYPE_CONFIG] 
                || EVENT_TYPE_CONFIG.holiday;
              const emoji = EVENT_EMOJI[event.event_type] || '📅';

              return (
                <Button
                  key={event.id}
                  variant="ghost"
                  className={cn(
                    "w-full h-auto p-3 justify-start text-left group",
                    isUrgent && "bg-red-500/5 hover:bg-red-500/10"
                  )}
                  onClick={() => onSelectEvent(event)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className={cn(
                      "p-2 rounded-lg shrink-0",
                      isUrgent ? "bg-red-500/10" : "bg-amber-500/10"
                    )}>
                      <span className="text-lg">{emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium line-clamp-1">{event.name}</p>
                        {isUrgent && (
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={cn(
                          "flex items-center gap-1 text-xs",
                          isUrgent ? "text-red-500 font-medium" : "text-muted-foreground"
                        )}>
                          <Clock className="w-3 h-3" />
                          {getCountdown(event.event_date)}
                        </div>
                        <Badge variant="outline" className={cn("h-4 px-1.5 text-[9px] border", eventConfig.color)}>
                          {eventConfig.label}
                        </Badge>
                      </div>
                      {event.suggested_topics?.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-1">
                          💡 {event.suggested_topics.slice(0, 2).join(' • ')}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                  </div>
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <CalendarDays className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              Không có sự kiện sắp tới
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
