import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Flame, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { SEASONAL_EVENTS, SeasonalEvent } from '@/types/topicDiscovery';
import { ContentGoal } from '@/types/multichannel';
import { cn } from '@/lib/utils';
import { differenceInDays, format, isAfter, isBefore, addDays } from 'date-fns';
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

  // Filter upcoming events (within next 60 days)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const maxDate = addDays(now, 60);

    return SEASONAL_EVENTS
      .filter(event => {
        // For events that have passed this year, check next year
        let eventDate = event.date;
        if (isBefore(eventDate, now)) {
          eventDate = new Date(eventDate.getFullYear() + 1, eventDate.getMonth(), eventDate.getDate());
        }
        return isAfter(eventDate, now) && isBefore(eventDate, maxDate);
      })
      .map(event => {
        let eventDate = event.date;
        if (isBefore(eventDate, now)) {
          eventDate = new Date(eventDate.getFullYear() + 1, eventDate.getMonth(), eventDate.getDate());
        }
        const daysUntil = differenceInDays(eventDate, now);
        return { ...event, date: eventDate, daysUntil };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, []);

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

  const getEventTypeColor = (type: SeasonalEvent['type']) => {
    switch (type) {
      case 'holiday': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'event': return 'bg-pink-500/10 text-pink-600 border-pink-500/20';
      case 'campaign': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const getEventTypeLabel = (type: SeasonalEvent['type']) => {
    switch (type) {
      case 'holiday': return 'Lễ hội';
      case 'event': return 'Sự kiện';
      case 'campaign': return 'Chiến dịch';
      default: return 'Khác';
    }
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

  if (upcomingEvents.length === 0) {
    return null;
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
            {upcomingEvents.map((event) => (
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
                        {format(event.date, 'EEEE, dd/MM', { locale: vi })}
                      </p>
                    </div>
                    {getDaysUntilBadge(event.daysUntil)}
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn('w-fit text-[10px]', getEventTypeColor(event.type))}
                  >
                    {getEventTypeLabel(event.type)}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
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
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-xs h-8"
                      onClick={() => handleScheduleTopic(event.suggestedTopics[0], event.date)}
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      Lên lịch
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1 text-xs h-8"
                      onClick={() => handleSelectTopic(event.suggestedTopics[0])}
                    >
                      Tạo ngay
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
