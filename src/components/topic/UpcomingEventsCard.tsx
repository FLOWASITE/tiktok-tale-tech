import { useState, useMemo } from 'react';
import { Calendar, Clock, Sparkles, ChevronRight, PartyPopper } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SEASONAL_EVENTS, SeasonalEvent } from '@/types/topicDiscovery';
import { cn } from '@/lib/utils';
import { differenceInDays, format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface UpcomingEventsCardProps {
  onGetSuggestions?: (event: SeasonalEvent) => void;
  onScheduleTopic?: (topic: string, eventDate: Date) => void;
  limit?: number;
}

const eventTypeConfig = {
  holiday: { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Lễ' },
  event: { color: 'text-violet-500', bg: 'bg-violet-500/10', label: 'Sự kiện' },
  campaign: { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Campaign' },
};

export function UpcomingEventsCard({
  onGetSuggestions,
  onScheduleTopic,
  limit = 3,
}: UpcomingEventsCardProps) {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

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

  const getUrgencyColor = (date: Date) => {
    const days = differenceInDays(date, new Date());
    if (days <= 3) return 'text-red-500 bg-red-500/10';
    if (days <= 7) return 'text-amber-500 bg-amber-500/10';
    return 'text-muted-foreground bg-muted';
  };

  if (upcomingEvents.length === 0) {
    return null;
  }

  const nearestEvent = upcomingEvents[0];
  const daysToNearest = differenceInDays(nearestEvent.date, new Date());

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Sự kiện sắp tới
          </CardTitle>
          {daysToNearest <= 7 && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              <Clock className="w-3 h-3 mr-1" />
              {getCountdown(nearestEvent.date)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {upcomingEvents.map((event) => {
          const config = eventTypeConfig[event.type];
          const isExpanded = expandedEventId === event.id;
          const countdown = getCountdown(event.date);
          const urgencyClass = getUrgencyColor(event.date);

          return (
            <div
              key={event.id}
              className="group rounded-lg border border-border/50 hover:border-primary/30 transition-all"
            >
              {/* Event Header */}
              <button
                className="w-full p-3 flex items-center gap-3 text-left"
                onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
              >
                <div className={cn('p-2 rounded-lg', config.bg)}>
                  <PartyPopper className={cn('w-4 h-4', config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{event.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(event.date, 'dd/MM/yyyy', { locale: vi })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn('text-xs', urgencyClass)}>
                    {countdown}
                  </Badge>
                  <ChevronRight className={cn(
                    'w-4 h-4 text-muted-foreground transition-transform',
                    isExpanded && 'rotate-90'
                  )} />
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 animate-fade-in">
                  <div className="text-xs text-muted-foreground mb-2">
                    Gợi ý topic cho sự kiện:
                  </div>
                  {event.suggestedTopics.slice(0, 3).map((topic, idx) => (
                    <button
                      key={idx}
                      className="w-full text-left p-2 rounded-md bg-muted/50 hover:bg-muted text-xs transition-colors group/topic"
                      onClick={() => onScheduleTopic?.(topic, event.date)}
                    >
                      <span className="line-clamp-2">{topic}</span>
                    </button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 mt-2"
                    onClick={() => onGetSuggestions?.(event)}
                  >
                    <Sparkles className="w-3 h-3" />
                    Lấy thêm gợi ý AI
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
