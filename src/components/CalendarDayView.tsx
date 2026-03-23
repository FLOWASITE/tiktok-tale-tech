import { useState, useMemo } from 'react';
import { format, parseISO, setHours, setMinutes, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Clock, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Channel } from '@/types/multichannel';
import { ContentSchedule } from '@/types/publishing';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';

interface ScheduleWithContent extends ContentSchedule {
  content?: {
    id: string;
    title: string;
    topic: string;
  };
}

interface CalendarDayViewProps {
  date: Date;
  schedules: ScheduleWithContent[];
  onScheduleClick: (schedule: ScheduleWithContent) => void;
  onScheduleDrop: (scheduleId: string, newDate: Date) => Promise<void>;
  onCreateSchedule?: (date: Date) => void;
}


const channelColors: Record<Channel, string> = {
  website: 'border-l-blue-500 bg-blue-500/10',
  facebook: 'border-l-indigo-500 bg-indigo-500/10',
  instagram: 'border-l-pink-500 bg-pink-500/10',
  twitter: 'border-l-slate-500 bg-slate-500/10',
  google_maps: 'border-l-green-500 bg-green-500/10',
  linkedin: 'border-l-sky-500 bg-sky-500/10',
  email: 'border-l-amber-500 bg-amber-500/10',
  youtube: 'border-l-red-500 bg-red-500/10',
  zalo_oa: 'border-l-blue-500 bg-blue-500/10',
  telegram: 'border-l-sky-500 bg-sky-500/10',
  tiktok: 'border-l-pink-500 bg-pink-500/10',
  threads: 'border-l-slate-500 bg-slate-500/10',
};

// Generate hours array (0-23)
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Draggable item for day view
function DayViewDraggableItem({
  schedule,
  onClick,
}: {
  schedule: ScheduleWithContent;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: schedule.id,
    data: { schedule },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  const statusColor =
    schedule.publish_status === 'published'
      ? 'ring-green-500'
      : schedule.publish_status === 'failed'
      ? 'ring-red-500'
      : schedule.publish_status === 'cancelled'
      ? 'ring-muted-foreground'
      : 'ring-yellow-500';

  const channel = schedule.channel as Channel;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'p-2 rounded-md cursor-grab active:cursor-grabbing border-l-4 transition-all',
        'hover:shadow-md hover:scale-[1.02]',
        channelColors[channel],
        isDragging && 'opacity-50 shadow-lg scale-105',
        'ring-2 ring-offset-1',
        statusColor
      )}
    >
      <div className="flex items-center gap-2">
        <ChannelIcon channel={channel} size={16} className={channelIconColors[channel]} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {schedule.content?.title || 'Không có tiêu đề'}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(parseISO(schedule.scheduled_at), 'HH:mm')} • {channel}
          </p>
        </div>
      </div>
    </div>
  );
}

// Droppable hour slot
function DroppableHourSlot({
  date,
  hour,
  schedules,
  onScheduleClick,
  onCreateSchedule,
}: {
  date: Date;
  hour: number;
  schedules: ScheduleWithContent[];
  onScheduleClick: (schedule: ScheduleWithContent) => void;
  onCreateSchedule?: (date: Date) => void;
}) {
  const slotId = `${format(date, 'yyyy-MM-dd')}-${hour.toString().padStart(2, '0')}`;
  const { isOver, setNodeRef } = useDroppable({
    id: slotId,
    data: { date, hour },
  });

  // Get schedules for this hour
  const hourSchedules = schedules.filter((s) => {
    const scheduledDate = parseISO(s.scheduled_at);
    return isSameDay(scheduledDate, date) && scheduledDate.getHours() === hour;
  });

  const handleSlotClick = () => {
    if (onCreateSchedule) {
      const newDate = setMinutes(setHours(date, hour), 0);
      onCreateSchedule(newDate);
    }
  };

  return (
    <div
      ref={setNodeRef}
      onClick={handleSlotClick}
      className={cn(
        'min-h-[60px] border-b border-border/30 p-1 transition-colors cursor-pointer group',
        isOver && 'bg-primary/10 ring-2 ring-primary/40',
        'hover:bg-muted/50'
      )}
    >
      <div className="space-y-1">
        {hourSchedules.map((schedule) => (
          <DayViewDraggableItem
            key={schedule.id}
            schedule={schedule}
            onClick={() => onScheduleClick(schedule)}
          />
        ))}
      </div>
      {hourSchedules.length === 0 && (
        <div className="hidden group-hover:flex items-center justify-center h-full opacity-50">
          <Plus className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}

export function CalendarDayView({
  date,
  schedules,
  onScheduleClick,
  onScheduleDrop,
  onCreateSchedule,
}: CalendarDayViewProps) {
  const [draggedSchedule, setDraggedSchedule] = useState<ScheduleWithContent | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  // Filter schedules for this day
  const daySchedules = useMemo(() => {
    return schedules.filter((s) => isSameDay(parseISO(s.scheduled_at), date));
  }, [schedules, date]);

  // Group schedules by hour for quick lookup
  const schedulesByHour = useMemo(() => {
    const map = new Map<number, ScheduleWithContent[]>();
    daySchedules.forEach((s) => {
      const hour = parseISO(s.scheduled_at).getHours();
      if (!map.has(hour)) {
        map.set(hour, []);
      }
      map.get(hour)!.push(s);
    });
    return map;
  }, [daySchedules]);

  const handleDragStart = (event: DragStartEvent) => {
    const schedule = event.active.data.current?.schedule as ScheduleWithContent;
    setDraggedSchedule(schedule);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedSchedule(null);

    if (!over) return;

    const schedule = active.data.current?.schedule as ScheduleWithContent;
    const { date: targetDate, hour: targetHour } = over.data.current as { date: Date; hour: number };

    if (!schedule || targetDate === undefined || targetHour === undefined) return;

    // Calculate new date with the target hour
    const currentScheduledAt = parseISO(schedule.scheduled_at);
    const newScheduledAt = setHours(setMinutes(targetDate, currentScheduledAt.getMinutes()), targetHour);

    await onScheduleDrop(schedule.id, newScheduledAt);
  };

  // Calculate current hour marker position
  const now = new Date();
  const isToday = isSameDay(date, now);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimePosition = currentHour * 60 + currentMinute; // in pixels (1px per minute)

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full">
        {/* Day Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-3xl font-bold">{format(date, 'd')}</div>
              <div className="text-sm text-muted-foreground">{format(date, 'EEEE', { locale: vi })}</div>
            </div>
            <div className="text-muted-foreground">
              {format(date, 'MMMM yyyy', { locale: vi })}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{daySchedules.length} lịch đăng</span>
          </div>
        </div>

        {/* Timeline */}
        <ScrollArea className="flex-1">
          <div className="relative">
            {/* Current time indicator */}
            {isToday && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: `${currentTimePosition}px` }}
              >
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div className="flex-1 h-0.5 bg-red-500" />
                </div>
              </div>
            )}

            {/* Hour slots */}
            <div className="grid grid-cols-[60px_1fr]">
              {HOURS.map((hour) => (
                <div key={hour} className="contents">
                  {/* Time label */}
                  <div className="border-r border-b border-border/30 p-2 text-xs text-muted-foreground text-right pr-3 bg-muted/20">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  {/* Schedule slot */}
                  <DroppableHourSlot
                    date={date}
                    hour={hour}
                    schedules={daySchedules}
                    onScheduleClick={onScheduleClick}
                    onCreateSchedule={onCreateSchedule}
                  />
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedSchedule && (
            <div
              className={cn(
                'p-2 rounded-md border-l-4 shadow-lg bg-card',
                channelColors[draggedSchedule.channel as Channel]
              )}
            >
              <div className="flex items-center gap-2">
                <ChannelIcon channel={draggedSchedule.channel as Channel} size={16} className={channelIconColors[draggedSchedule.channel as Channel]} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {draggedSchedule.content?.title || 'Không có tiêu đề'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(draggedSchedule.scheduled_at), 'HH:mm')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
