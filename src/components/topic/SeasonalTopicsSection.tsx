import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Flame, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentGoal } from '@/types/multichannel';
import { EVENT_TYPE_CONFIG, EventType } from '@/types/curatedData';
import { useCuratedEvents } from '@/hooks/useCuratedEvents';
import { cn } from '@/lib/utils';
import { differenceInDays, format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface SeasonalTopicsSectionProps {
  onSelectTopic: (topic: string, goal?: ContentGoal) => void;
  onScheduleTopic?: (topic: string, eventDate: Date) => void;
}

export function SeasonalTopicsSection({ 
  onSelectTopic, 
  onScheduleTopic 
}: SeasonalTopicsSectionProps) {
  const navigate = useNavigate();
  const { events, isLoading, getUpcomingEvents } = useCuratedEvents();

  // Get upcoming events from DB (within next 60 days)
  const upcomingEvents = useMemo(() => {
    const upcoming = getUpcomingEvents(60);
    const now = new Date();
    
    return upcoming.map(event => {
      const eventDate = new Date(event.event_date);
      const daysUntil = differenceInDays(eventDate, now);
      return { 
        ...event, 
        daysUntil,
        suggestedTopics: event.suggested_topics || []
      };
    });
  }, [events, getUpcomingEvents]);

  const handleSelectTopic = (topic: string) => {
    onSelectTopic(topic, 'engagement');
  };

  const handleScheduleTopic = (topic: string, eventDate: Date) => {
    if (onScheduleTopic) {
      onScheduleTopic(topic, eventDate);
    } else {
      navigate('/calendar', { 
        state: { 
          scheduleTopic: topic,
          scheduleGoal: 'engagement',
          suggestedDate: eventDate.toISOString(),
        } 
      });
    }
  };

  const getEventTypeColor = (type: string) => {
    const config = EVENT_TYPE_CONFIG[type as EventType];
    return config?.color || 'bg-primary/10 text-primary border-primary/20';
  };

  const getEventTypeLabel = (type: string) => {
    const config = EVENT_TYPE_CONFIG[type as EventType];
    return config?.label || 'Khác';
  };

  const getDaysUntilBadge = (daysUntil: number) => {
    if (daysUntil <= 7) {
      return (
        <Badge className="bg-red-500 text-white gap-1 animate-pulse">
          <Flame className="w-3 h-3" />
          Còn {daysUntil} ngày
        </Badge>
      );
    }
    if (daysUntil <= 14) {
      return (
        <Badge className="bg-amber-500 text-white gap-1">
          <Clock className="w-3 h-3" />
          Còn {daysUntil} ngày
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <Calendar className="w-3 h-3" />
        Còn {daysUntil} ngày
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className="gradient-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-red-500 to-pink-500">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            Sự kiện sắp tới
            <Loader2 className="w-4 h-4 ml-auto animate-spin text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex gap-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="min-w-[280px] h-[180px] rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (upcomingEvents.length === 0) {
    return (
      <Card className="gradient-card border-border/50 border-dashed">
        <CardContent className="py-6 text-center">
          <div className="text-4xl mb-3 opacity-80">📅</div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-red-500 to-pink-500">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <h4 className="font-medium text-sm">Không có sự kiện sắp tới</h4>
          </div>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Các gợi ý theo mùa sẽ xuất hiện khi có sự kiện đặc biệt trong 60 ngày tới.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gradient-card border-border/50 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-red-500 to-pink-500">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          Sự kiện sắp tới
          <Badge variant="secondary" className="ml-auto text-xs">
            {upcomingEvents.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="flex gap-4 p-4 pt-0">
            {upcomingEvents.map((event) => {
              const eventDate = new Date(event.event_date);
              return (
                <Card 
                  key={event.id} 
                  className={cn(
                    'min-w-[280px] max-w-[320px] flex-shrink-0 border-2 transition-all hover:shadow-lg',
                    event.daysUntil <= 7 && 'border-red-500/30 bg-red-500/5',
                    event.daysUntil > 7 && event.daysUntil <= 14 && 'border-amber-500/30 bg-amber-500/5'
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h4 className="font-semibold text-sm">{event.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {format(eventDate, 'EEEE, dd/MM', { locale: vi })}
                        </p>
                      </div>
                      {getDaysUntilBadge(event.daysUntil)}
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn('w-fit text-[10px]', getEventTypeColor(event.event_type))}
                    >
                      {getEventTypeLabel(event.event_type)}
                    </Badge>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {event.suggestedTopics.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Gợi ý nội dung:
                        </p>
                        <div className="space-y-1.5">
                          {event.suggestedTopics.slice(0, 2).map((topic, idx) => (
                            <div 
                              key={idx}
                              className="group flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                              onClick={() => handleSelectTopic(topic)}
                            >
                              <span className="text-xs flex-1 line-clamp-1">{topic}</span>
                              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : event.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                    ) : null}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-xs h-8"
                        onClick={() => handleScheduleTopic(
                          event.suggestedTopics[0] || event.name, 
                          eventDate
                        )}
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Lên lịch
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1 text-xs h-8"
                        onClick={() => handleSelectTopic(event.suggestedTopics[0] || event.name)}
                      >
                        Tạo ngay
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
