import React, { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  isBefore,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sparkles,
  Gift,
  Star,
  Megaphone,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SeasonalEvent, SEASONAL_EVENTS, ContentPillar } from '@/types/topicDiscovery';

interface ContentCalendarTopicViewProps {
  pillars?: ContentPillar[];
  onSelectDate?: (date: Date, event?: SeasonalEvent) => void;
  onSelectEvent?: (event: SeasonalEvent) => void;
  className?: string;
}

// Extended seasonal events with more Vietnamese holidays
const ALL_EVENTS: SeasonalEvent[] = [
  ...SEASONAL_EVENTS,
  {
    id: 'new-year',
    name: 'Năm mới Dương lịch',
    date: new Date(2025, 0, 1),
    type: 'holiday',
    suggestedTopics: [
      'Chào năm mới 2025 - Điều mới mẻ từ thương hiệu',
      'Mục tiêu năm mới cùng brand',
      'Nhìn lại hành trình 2024',
    ],
  },
  {
    id: 'mothers-day',
    name: 'Ngày của Mẹ',
    date: new Date(2025, 4, 11), // Second Sunday of May
    type: 'event',
    suggestedTopics: [
      'Tri ân Mẹ - Người phụ nữ vĩ đại',
      'Quà tặng ý nghĩa dành cho Mẹ',
      'Câu chuyện về Mẹ trong team',
    ],
  },
  {
    id: 'fathers-day',
    name: 'Ngày của Cha',
    date: new Date(2025, 5, 15), // Third Sunday of June
    type: 'event',
    suggestedTopics: [
      'Tri ân Cha - Người đàn ông thầm lặng',
      'Món quà dành cho Cha',
      'Khoảnh khắc đáng nhớ cùng Cha',
    ],
  },
  {
    id: 'independence-day',
    name: 'Quốc Khánh',
    date: new Date(2025, 8, 2),
    type: 'holiday',
    suggestedTopics: [
      'Chào mừng ngày Quốc Khánh 2/9',
      'Tự hào Việt Nam',
      'Ưu đãi mừng lễ Quốc Khánh',
    ],
  },
  {
    id: 'teachers-day',
    name: 'Ngày Nhà giáo',
    date: new Date(2025, 10, 20),
    type: 'holiday',
    suggestedTopics: [
      'Tri ân thầy cô - 20/11',
      'Những bài học quý giá',
      'Ưu đãi dành cho giáo viên',
    ],
  },
  {
    id: '11-11',
    name: 'Singles Day 11/11',
    date: new Date(2025, 10, 11),
    type: 'campaign',
    suggestedTopics: [
      'Đại tiệc siêu sale 11/11',
      'Mua sắm thả ga - Giá sốc toàn sàn',
      'Flash deal 11/11 chỉ 24h',
    ],
  },
  {
    id: '12-12',
    name: 'Super Sale 12/12',
    date: new Date(2025, 11, 12),
    type: 'campaign',
    suggestedTopics: [
      'Đại tiệc cuối năm 12/12',
      'Tổng kết năm - Sale khủng',
      'Countdown cuối năm',
    ],
  },
];

const eventTypeConfig = {
  holiday: { icon: Star, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  event: { icon: Gift, color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  campaign: { icon: Megaphone, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
};

// Default pillar distribution for the month
const DEFAULT_PILLAR_SCHEDULE = [
  { day: 1, pillar: 'product', label: 'Sản phẩm' },
  { day: 5, pillar: 'industry', label: 'Ngành nghề' },
  { day: 10, pillar: 'customer', label: 'Khách hàng' },
  { day: 15, pillar: 'behind-scenes', label: 'Hậu trường' },
  { day: 20, pillar: 'promotional', label: 'Khuyến mãi' },
  { day: 25, pillar: 'product', label: 'Sản phẩm' },
];

export function ContentCalendarTopicView({
  pillars = [],
  onSelectDate,
  onSelectEvent,
  className,
}: ContentCalendarTopicViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get events for the current month
  const monthEvents = useMemo(() => {
    return ALL_EVENTS.filter((event) => {
      const eventMonth = event.date.getMonth();
      const eventYear = event.date.getFullYear();
      return (
        eventMonth === currentMonth.getMonth() &&
        eventYear === currentMonth.getFullYear()
      );
    });
  }, [currentMonth]);

  // Get event for a specific day
  const getEventForDay = (date: Date): SeasonalEvent | undefined => {
    return ALL_EVENTS.find((event) => isSameDay(event.date, date));
  };

  // Get pillar suggestion for a day
  const getPillarForDay = (date: Date): { pillar: string; label: string } | undefined => {
    const dayOfMonth = date.getDate();
    return DEFAULT_PILLAR_SCHEDULE.find((s) => s.day === dayOfMonth);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    const event = getEventForDay(date);
    onSelectDate?.(date, event);
  };

  const handleEventClick = (event: SeasonalEvent) => {
    setSelectedDate(event.date);
    onSelectEvent?.(event);
  };

  return (
    <Card className={cn('p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-violet-500/20">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Lịch Nội dung</h3>
            <p className="text-xs text-muted-foreground">
              Sự kiện & gợi ý phân bổ pillars
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: vi })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day) => (
          <div key={day} className="text-center text-xs text-muted-foreground py-1">
            {day}
          </div>
        ))}

        {/* Empty cells for days before month start */}
        {Array.from({ length: monthStart.getDay() }).map((_, i) => (
          <div key={`empty-${i}`} className="h-10" />
        ))}

        {/* Calendar days */}
        {days.map((date) => {
          const event = getEventForDay(date);
          const pillar = getPillarForDay(date);
          const isPast = isBefore(date, new Date()) && !isToday(date);
          const EventIcon = event ? eventTypeConfig[event.type].icon : null;

          return (
            <TooltipProvider key={date.toISOString()}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleDayClick(date)}
                    className={cn(
                      'h-10 rounded-lg flex flex-col items-center justify-center relative transition-all',
                      'hover:bg-muted/50',
                      isToday(date) && 'ring-2 ring-primary ring-offset-1',
                      selectedDate && isSameDay(date, selectedDate) && 'bg-primary/10',
                      isPast && 'opacity-50'
                    )}
                  >
                    <span className="text-sm">{date.getDate()}</span>
                    {event && EventIcon && (
                      <EventIcon
                        className={cn('w-3 h-3 absolute -top-0.5 -right-0.5', eventTypeConfig[event.type].color)}
                      />
                    )}
                    {pillar && !event && (
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-violet-400" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="text-xs">
                    <p className="font-medium">
                      {format(date, 'EEEE, d MMMM', { locale: vi })}
                    </p>
                    {event && <p className="text-primary mt-1">{event.name}</p>}
                    {pillar && <p className="text-violet-500 mt-1">Pillar: {pillar.label}</p>}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      {/* Upcoming Events */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Sự kiện sắp tới
        </h4>
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {monthEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Không có sự kiện trong tháng này
              </p>
            ) : (
              monthEvents.map((event) => {
                const config = eventTypeConfig[event.type];
                const EventIcon = config.icon;

                return (
                  <div
                    key={event.id}
                    className={cn(
                      'p-3 rounded-lg cursor-pointer transition-all',
                      'hover:shadow-md border border-border/50',
                      config.bgColor
                    )}
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="flex items-start gap-3">
                      <EventIcon className={cn('w-5 h-5 mt-0.5', config.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="font-medium text-sm">{event.name}</h5>
                          <Badge variant="secondary" className="text-[10px]">
                            {format(event.date, 'd/M')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {event.suggestedTopics[0]}
                        </p>
                        {event.suggestedTopics.length > 1 && (
                          <p className="text-[10px] text-primary mt-1">
                            +{event.suggestedTopics.length - 1} gợi ý khác
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Legend */}
      <div className="border-t pt-3 mt-3 flex flex-wrap gap-3">
        {Object.entries(eventTypeConfig).map(([type, config]) => {
          const Icon = config.icon;
          return (
            <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className={cn('w-3 h-3', config.color)} />
              <span>
                {type === 'holiday' && 'Lễ/Tết'}
                {type === 'event' && 'Sự kiện'}
                {type === 'campaign' && 'Campaign'}
              </span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-violet-400" />
          <span>Content Pillar</span>
        </div>
      </div>

      {/* Selected Event Topics */}
      {selectedDate && getEventForDay(selectedDate) && (
        <div className="border-t pt-3 mt-3">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Gợi ý chủ đề cho {getEventForDay(selectedDate)?.name}
          </h4>
          <div className="space-y-1">
            {getEventForDay(selectedDate)?.suggestedTopics.map((topic, index) => (
              <div
                key={index}
                className="p-2 rounded bg-muted/50 text-sm cursor-pointer hover:bg-muted transition-colors"
                onClick={() => {
                  const event = getEventForDay(selectedDate);
                  if (event) onSelectEvent?.(event);
                }}
              >
                {topic}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
