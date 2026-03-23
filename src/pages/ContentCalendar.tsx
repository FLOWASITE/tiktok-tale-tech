import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Filter,
  Loader2,
  Plus,
  LayoutGrid,
  List,
  Clock,
  PanelLeftClose,
  PanelLeft,
  History,
  Flag,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SlidePanel } from '@/components/ui/slide-panel';
import { MultiChannelForm } from '@/components/MultiChannelForm';
import { MultiChannelViewer } from '@/components/MultiChannelViewer';
import { PublishingQueue } from '@/components/PublishingQueue';
import { PublishingHistoryTab } from '@/components/PublishingHistoryTab';
import { CalendarDayView } from '@/components/CalendarDayView';
import { Calendar } from '@/components/ui/calendar';
import { CalendarMilestoneItem } from '@/components/CalendarMilestoneItem';
import { CampaignTimelineBar } from '@/components/calendar/CampaignTimelineBar';
import { CalendarDayNotes } from '@/components/calendar/CalendarDayNotes';
import { useCalendarNotes, CalendarNote } from '@/hooks/useCalendarNotes';
import { ContentSchedule, PUBLISH_STATUSES, PublishStatus } from '@/types/publishing';
import { Channel, CHANNELS, MultiChannelContent, MultiChannelFormData, ContentGoal } from '@/types/multichannel';
import { ScheduleTopicDialog, ScheduleTopicData } from '@/components/topic/ScheduleTopicDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useMultiChannelContents } from '@/hooks/useMultiChannelContents';
import { useCampaignIntegration, CampaignMilestone } from '@/hooks/useCampaignIntegration';
import { toast } from '@/hooks/use-toast';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isToday,
  parseISO,
  isBefore
} from 'date-fns';
import { vi } from 'date-fns/locale';
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

const channelEmojis: Record<Channel, string> = {
  website: '🌐',
  facebook: '📘',
  instagram: '📸',
  twitter: '𝕏',
  google_maps: '📍',
  linkedin: '💼',
  email: '📧',
  youtube: '▶️',
  zalo_oa: '💬',
  telegram: '✈️',
  tiktok: '🎵',
  threads: '🧵',
};

const channelColors: Record<Channel, { border: string; bg: string; text: string }> = {
  website: { border: 'border-l-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400' },
  facebook: { border: 'border-l-indigo-500', bg: 'bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400' },
  instagram: { border: 'border-l-pink-500', bg: 'bg-pink-500/10', text: 'text-pink-700 dark:text-pink-400' },
  twitter: { border: 'border-l-slate-500', bg: 'bg-slate-500/10', text: 'text-slate-700 dark:text-slate-400' },
  google_maps: { border: 'border-l-green-500', bg: 'bg-green-500/10', text: 'text-green-700 dark:text-green-400' },
  linkedin: { border: 'border-l-sky-500', bg: 'bg-sky-500/10', text: 'text-sky-700 dark:text-sky-400' },
  email: { border: 'border-l-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400' },
  youtube: { border: 'border-l-red-500', bg: 'bg-red-500/10', text: 'text-red-700 dark:text-red-400' },
  zalo_oa: { border: 'border-l-blue-600', bg: 'bg-blue-600/10', text: 'text-blue-700 dark:text-blue-400' },
  telegram: { border: 'border-l-cyan-500', bg: 'bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-400' },
  tiktok: { border: 'border-l-pink-500', bg: 'bg-pink-500/10', text: 'text-pink-700 dark:text-pink-400' },
  threads: { border: 'border-l-slate-500', bg: 'bg-slate-500/10', text: 'text-slate-700 dark:text-slate-400' },
};

// Draggable Schedule Item
function DraggableScheduleItem({ 
  schedule, 
  onClick 
}: { 
  schedule: ScheduleWithContent;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: schedule.id,
    data: { schedule },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const statusColor = schedule.publish_status === 'published' ? 'bg-green-500' :
    schedule.publish_status === 'failed' ? 'bg-red-500' :
    schedule.publish_status === 'cancelled' ? 'bg-muted-foreground' :
    'bg-yellow-500';

  const channel = schedule.channel as Channel;
  const colors = channelColors[channel] || { border: 'border-l-muted-foreground', bg: 'bg-muted/50', text: 'text-foreground' };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`
        text-xs p-1.5 rounded cursor-grab active:cursor-grabbing
        border-l-[3px] shadow-sm
        hover:shadow-md transition-all
        ${colors.border} ${colors.bg}
        ${isDragging ? 'opacity-50 scale-105' : ''}
      `}
    >
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor}`} />
        <span>{channelEmojis[channel]}</span>
        <span className={`truncate font-medium ${colors.text}`}>{schedule.content?.title || 'Không có tiêu đề'}</span>
      </div>
      <div className="text-muted-foreground text-[10px] mt-0.5">
        {format(parseISO(schedule.scheduled_at), 'HH:mm')}
      </div>
    </div>
  );
}

// Droppable Day Cell
function DroppableDayCell({ 
  date, 
  isCurrentMonth,
  schedules,
  milestones = [],
  notes = [],
  onScheduleClick,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: { 
  date: Date;
  isCurrentMonth: boolean;
  schedules: ScheduleWithContent[];
  milestones?: CampaignMilestone[];
  notes?: CalendarNote[];
  onScheduleClick: (schedule: ScheduleWithContent) => void;
  onAddNote?: (dateStr: string, content: string) => Promise<CalendarNote | null>;
  onUpdateNote?: (noteId: string, content: string) => Promise<boolean>;
  onDeleteNote?: (noteId: string) => Promise<boolean>;
}) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const { isOver, setNodeRef } = useDroppable({
    id: dateStr,
    data: { date },
  });

  const daySchedules = schedules.filter(s => 
    format(parseISO(s.scheduled_at), 'yyyy-MM-dd') === dateStr
  );
  
  const dayMilestones = milestones.filter(m => 
    format(parseISO(m.due_date), 'yyyy-MM-dd') === dateStr
  );

  const dayNotes = notes.filter(n => n.note_date === dateStr);

  return (
    <div
      ref={setNodeRef}
      className={`
        group min-h-[120px] border-r border-b border-border/30 p-1
        ${!isCurrentMonth ? 'bg-muted/30' : 'bg-background'}
        ${isToday(date) ? 'bg-primary/5 ring-1 ring-primary/20' : ''}
        ${isOver ? 'bg-primary/10 ring-2 ring-primary/40' : ''}
        transition-colors
      `}
    >
      <div className="flex items-center justify-between mb-1 px-1">
        <span className={`
          text-xs font-medium
          ${isToday(date) ? 'text-primary' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
        `}>
          {format(date, 'd')}
        </span>
        {onAddNote && onUpdateNote && onDeleteNote && (
          <CalendarDayNotes
            date={date}
            notes={dayNotes}
            onAdd={onAddNote}
            onUpdate={onUpdateNote}
            onDelete={onDeleteNote}
          />
        )}
      </div>
      <div className="space-y-1">
        {/* Milestones first */}
        {dayMilestones.slice(0, 1).map((milestone) => (
          <CalendarMilestoneItem
            key={milestone.id}
            milestone={milestone}
            compact
          />
        ))}
        {dayMilestones.length > 1 && (
          <div className="text-xs text-amber-600 px-1 flex items-center gap-1">
            <Flag className="h-3 w-3" />
            +{dayMilestones.length - 1} milestones
          </div>
        )}
        {/* Schedules */}
        {daySchedules.slice(0, dayMilestones.length > 0 ? 2 : 3).map((schedule) => (
          <DraggableScheduleItem
            key={schedule.id}
            schedule={schedule}
            onClick={() => onScheduleClick(schedule)}
          />
        ))}
        {daySchedules.length > (dayMilestones.length > 0 ? 2 : 3) && (
          <div className="text-xs text-muted-foreground px-1">
            +{daySchedules.length - (dayMilestones.length > 0 ? 2 : 3)} more
          </div>
        )}
      </div>
    </div>
  );
}

interface LocationState {
  scheduleTopic?: string;
  scheduleGoal?: ContentGoal;
}

export default function ContentCalendar() {
  const location = useLocation();
  const navigate = useNavigate();
  const prefillData = location.state as LocationState | null;
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'history' | 'month' | 'week' | 'day' | 'queue'>('history');
  const [schedules, setSchedules] = useState<ScheduleWithContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PublishStatus | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<Channel | 'all'>('all');
  const [draggedSchedule, setDraggedSchedule] = useState<ScheduleWithContent | null>(null);
  const [selectedContent, setSelectedContent] = useState<MultiChannelContent | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [showMiniCalendar, setShowMiniCalendar] = useState(true);
  const [showCampaignTimeline, setShowCampaignTimeline] = useState(true);
  
  // Schedule Topic Dialog state
  const [scheduleTopicDialogOpen, setScheduleTopicDialogOpen] = useState(false);
  const [pendingScheduleTopic, setPendingScheduleTopic] = useState<string>('');
  const [pendingScheduleGoal, setPendingScheduleGoal] = useState<ContentGoal | undefined>();
  const [isSchedulingTopic, setIsSchedulingTopic] = useState(false);

  // Handle prefill from Topics Hub
  useEffect(() => {
    if (prefillData?.scheduleTopic) {
      setPendingScheduleTopic(prefillData.scheduleTopic);
      setPendingScheduleGoal(prefillData.scheduleGoal);
      setScheduleTopicDialogOpen(true);
      // Clear location state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [prefillData]);
  
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const { 
    contents,
    generating,
    regeneratingChannel,
    expandingChannels,
    generateContent, 
    regenerateChannel,
    updateChannelContent,
    aiEditChannel,
    updateTitleTopic,
    updateChannelStatus,
    expandChannels,
  } = useMultiChannelContents();
  
  // Campaign milestones integration
  const { 
    upcomingMilestones,
    todayMilestones,
    overdueMilestones,
  } = useCampaignIntegration();
  
  // Combine all milestones for calendar display
  const allMilestones = useMemo(() => {
    return [...upcomingMilestones, ...todayMilestones, ...overdueMilestones];
  }, [upcomingMilestones, todayMilestones, overdueMilestones]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  // Fetch schedules
  const fetchSchedules = async () => {
    if (!user || !currentOrganization?.id) {
      setSchedules([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data: schedulesData, error } = await supabase
        .from('content_schedules')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      const contentIds = [...new Set((schedulesData || []).map(s => s.content_id))];
      
      const { data: contentsData } = await supabase
        .from('multi_channel_contents')
        .select('id, title, topic')
        .in('id', contentIds);

      const contentMap = new Map((contentsData || []).map(c => [c.id, c]));

      const merged: ScheduleWithContent[] = (schedulesData || []).map(s => ({
        ...s as ContentSchedule,
        content: contentMap.get(s.content_id) || undefined,
      }));

      setSchedules(merged);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải lịch đăng bài',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [user, currentOrganization?.id]);

  // Realtime subscription for content_schedules
  useEffect(() => {
    if (!currentOrganization?.id) return;

    const channel = supabase
      .channel('content_schedules_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_schedules',
          filter: `organization_id=eq.${currentOrganization.id}`,
        },
        () => {
          fetchSchedules();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrganization?.id]);

  // Filter schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      if (statusFilter !== 'all' && s.publish_status !== statusFilter) return false;
      if (channelFilter !== 'all' && s.channel !== channelFilter) return false;
      return true;
    });
  }, [schedules, statusFilter, channelFilter]);

  // Overdue schedules count
  const overdueCount = useMemo(() => {
    const now = new Date();
    return schedules.filter(s => 
      s.publish_status === 'scheduled' && isBefore(parseISO(s.scheduled_at), now)
    ).length;
  }, [schedules]);

  // Mini calendar: categorize days by status for color coding
  const daysWithScheduleStatus = useMemo(() => {
    const dayMap: Record<string, Set<string>> = {};
    schedules.forEach(s => {
      const day = format(parseISO(s.scheduled_at), 'yyyy-MM-dd');
      if (!dayMap[day]) dayMap[day] = new Set();
      dayMap[day].add(s.publish_status);
    });
    return dayMap;
  }, [schedules]);

  const daysWithSchedules = useMemo(() => {
    return schedules.map(s => format(parseISO(s.scheduled_at), 'yyyy-MM-dd'));
  }, [schedules]);

  // Get days for current view
  const calendarDays = useMemo(() => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
  }, [currentDate, viewMode]);

  // Navigation
  const goToPrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else if (viewMode === 'day') {
      setCurrentDate(subDays(currentDate, 1));
    }
  };

  const goToNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const schedule = event.active.data.current?.schedule as ScheduleWithContent;
    setDraggedSchedule(schedule);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedSchedule(null);

    if (!over) return;

    const schedule = active.data.current?.schedule as ScheduleWithContent;
    const targetDate = over.data.current?.date as Date;

    if (!schedule || !targetDate) return;

    const currentScheduledAt = parseISO(schedule.scheduled_at);
    const newScheduledAt = new Date(targetDate);
    newScheduledAt.setHours(currentScheduledAt.getHours());
    newScheduledAt.setMinutes(currentScheduledAt.getMinutes());

    // Validate: cannot reschedule to past
    if (isBefore(newScheduledAt, new Date())) {
      toast({
        title: 'Không thể đổi lịch',
        description: 'Không thể chuyển lịch đăng sang thời gian đã qua',
        variant: 'destructive',
      });
      return;
    }

    // Update schedule in database
    try {
      const { error } = await supabase
        .from('content_schedules')
        .update({ 
          scheduled_at: newScheduledAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', schedule.id);

      if (error) throw error;

      // Log the reschedule
      await supabase.from('content_publishing_logs').insert({
        schedule_id: schedule.id,
        content_id: schedule.content_id,
        channel: schedule.channel,
        organization_id: currentOrganization?.id || null,
        action: 'rescheduled',
        performed_by: user?.id || null,
        performed_at: new Date().toISOString(),
        details: { 
          from: schedule.scheduled_at, 
          to: newScheduledAt.toISOString() 
        },
      });

      toast({
        title: 'Đã đổi lịch',
        description: `Đã chuyển sang ${format(newScheduledAt, 'dd/MM/yyyy HH:mm', { locale: vi })}`,
      });

      fetchSchedules();
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật lịch',
        variant: 'destructive',
      });
    }
  };

  // Handle schedule click to view content
  const handleScheduleClick = async (schedule: ScheduleWithContent) => {
    const content = contents.find(c => c.id === schedule.content_id);
    if (content) {
      setSelectedContent(content);
      setViewerOpen(true);
    }
  };

  const handleGenerateContent = async (formData: MultiChannelFormData) => {
    const result = await generateContent(formData);
    if (result) {
      setFormOpen(false);
      setSelectedContent(result);
      setViewerOpen(true);
    }
  };

  const handleExpandChannels = async (contentId: string, newChannels: Channel[]) => {
    const updated = await expandChannels(contentId, newChannels);
    if (updated) setSelectedContent(updated);
    return updated;
  };

  // Handle scheduling a topic from Topics Hub
  const handleScheduleTopic = async (data: ScheduleTopicData) => {
    setIsSchedulingTopic(true);
    try {
      // Combine date and time
      const [hours, minutes] = data.scheduledTime.split(':').map(Number);
      const scheduledAt = new Date(data.scheduledDate);
      scheduledAt.setHours(hours, minutes, 0, 0);

      // Navigate to the appropriate content creation page based on format
      const navigationState = {
        prefillTopic: data.topic,
        prefillGoal: data.contentGoal,
        fromTopics: true,
        scheduledAt: scheduledAt.toISOString(),
      };

      setScheduleTopicDialogOpen(false);
      
      // Navigate based on content format
      switch (data.contentFormat) {
        case 'multichannel':
          navigate('/multichannel', { state: navigationState });
          break;
        case 'script':
          navigate('/', { state: navigationState });
          break;
        case 'carousel':
          navigate('/carousel', { state: navigationState });
          break;
        default:
          navigate('/multichannel', { state: navigationState });
      }

      toast({
        title: 'Đã lên lịch',
        description: `Tiếp tục tạo nội dung cho "${data.topic}"`,
      });
    } catch (error) {
      console.error('Error scheduling topic:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể lên lịch topic',
        variant: 'destructive',
      });
    } finally {
      setIsSchedulingTopic(false);
    }
  };

  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý lịch đăng</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý và lên lịch đăng bài theo ngày
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(viewMode === 'month' || viewMode === 'week') && (
            <Button
              variant={showCampaignTimeline ? "default" : "outline"}
              size="sm"
              onClick={() => setShowCampaignTimeline(!showCampaignTimeline)}
              className="gap-2"
            >
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Chiến dịch</span>
            </Button>
          )}
          {viewMode !== 'queue' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMiniCalendar(!showMiniCalendar)}
              className="gap-2"
            >
              {showMiniCalendar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
              <span className="hidden sm:inline">Mini Calendar</span>
            </Button>
          )}
          <Button onClick={() => setFormOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Tạo nội dung
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* View Mode Toggle */}
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(v) => v && setViewMode(v as typeof viewMode)}
              className="bg-muted/50 p-1 rounded-lg"
            >
              <ToggleGroupItem value="history" className="gap-1.5 text-xs px-3">
                <History className="w-3.5 h-3.5" />
                Lịch sử
              </ToggleGroupItem>
              <ToggleGroupItem value="month" className="gap-1.5 text-xs px-3">
                <LayoutGrid className="w-3.5 h-3.5" />
                Tháng
              </ToggleGroupItem>
              <ToggleGroupItem value="week" className="gap-1.5 text-xs px-3">
                <CalendarIcon className="w-3.5 h-3.5" />
                Tuần
              </ToggleGroupItem>
              <ToggleGroupItem value="day" className="gap-1.5 text-xs px-3">
                <Clock className="w-3.5 h-3.5" />
                Ngày
              </ToggleGroupItem>
              <ToggleGroupItem value="queue" className="gap-1.5 text-xs px-3">
                <List className="w-3.5 h-3.5" />
                Hàng đợi
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Navigation */}
            {viewMode !== 'queue' && viewMode !== 'history' && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToPrevious}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Hôm nay
                </Button>
                <span className="font-semibold min-w-[180px] text-center">
                  {viewMode === 'month' 
                    ? format(currentDate, 'MMMM yyyy', { locale: vi })
                    : viewMode === 'week'
                    ? `Tuần ${format(currentDate, 'w, yyyy', { locale: vi })}`
                    : format(currentDate, 'dd MMMM yyyy', { locale: vi })
                  }
                </span>
                <Button variant="outline" size="sm" onClick={goToNext}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Filters - hide for history tab */}
            {viewMode !== 'history' && (
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PublishStatus | 'all')}>
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {PUBLISH_STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v as Channel | 'all')}>
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue placeholder="Kênh" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả kênh</SelectItem>
                    {CHANNELS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats - hide for history tab */}
      {viewMode !== 'history' && (
        <div className={`grid gap-3 ${overdueCount > 0 ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-900/10">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {filteredSchedules.filter(s => s.publish_status === 'scheduled').length}
              </div>
              <div className="text-xs text-muted-foreground">Đang chờ</div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredSchedules.filter(s => s.publish_status === 'published').length}
              </div>
              <div className="text-xs text-muted-foreground">Đã đăng</div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/10">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-red-600">
                {filteredSchedules.filter(s => s.publish_status === 'failed').length}
              </div>
              <div className="text-xs text-muted-foreground">Thất bại</div>
            </CardContent>
          </Card>
          {overdueCount > 0 && (
            <Card className="border-orange-300 bg-orange-50/50 dark:bg-orange-900/10 ring-1 ring-orange-300">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {overdueCount}
                </div>
                <div className="text-xs text-orange-600 font-medium">⚠️ Quá hạn</div>
              </CardContent>
            </Card>
          )}
          <Card className="border-muted bg-muted/30">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-muted-foreground">
                {filteredSchedules.filter(s => s.publish_status === 'cancelled').length}
              </div>
              <div className="text-xs text-muted-foreground">Đã hủy</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History Tab */}
      {viewMode === 'history' ? (
        <PublishingHistoryTab />
      ) : viewMode === 'queue' ? (
        <Card>
          <CardContent className="p-4">
            <PublishingQueue
              onViewContent={(contentId) => {
                const content = contents.find(c => c.id === contentId);
                if (content) {
                  setSelectedContent(content);
                  setViewerOpen(true);
                }
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-4">
          {/* Mini Calendar Sidebar */}
          {showMiniCalendar && (
            <Card className="shrink-0 h-fit">
              <CardContent className="p-3">
                <Calendar
                  mode="single"
                  selected={currentDate}
                  onSelect={(date) => date && setCurrentDate(date)}
                  locale={vi}
                  modifiers={{
                    hasPublished: (date) => {
                      const statuses = daysWithScheduleStatus[format(date, 'yyyy-MM-dd')];
                      return !!statuses?.has('published') && !statuses?.has('failed');
                    },
                    hasFailed: (date) => {
                      const statuses = daysWithScheduleStatus[format(date, 'yyyy-MM-dd')];
                      return !!statuses?.has('failed');
                    },
                    hasScheduled: (date) => {
                      const statuses = daysWithScheduleStatus[format(date, 'yyyy-MM-dd')];
                      return !!statuses?.has('scheduled') && !statuses?.has('published') && !statuses?.has('failed');
                    },
                  }}
                  modifiersClassNames={{
                    hasPublished: 'bg-green-500/20 font-bold text-green-700 dark:text-green-400',
                    hasFailed: 'bg-red-500/20 font-bold text-red-700 dark:text-red-400',
                    hasScheduled: 'bg-yellow-500/20 font-bold text-yellow-700 dark:text-yellow-400',
                  }}
                  className="rounded-md"
                />
                {/* Schedule count for today */}
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-xs text-muted-foreground mb-2">
                    Lịch ngày {format(currentDate, 'dd/MM', { locale: vi })}
                  </div>
                  <div className="space-y-1">
                    {schedules
                      .filter(s => format(parseISO(s.scheduled_at), 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd'))
                      .slice(0, 5)
                      .map(schedule => (
                        <div 
                          key={schedule.id}
                          onClick={() => handleScheduleClick(schedule)}
                          className="text-xs p-1.5 rounded bg-muted/50 hover:bg-muted cursor-pointer flex items-center gap-1.5 truncate"
                        >
                          <span>{channelEmojis[schedule.channel as Channel]}</span>
                          <span className="truncate">{schedule.content?.title || 'Không có tiêu đề'}</span>
                          <span className="text-muted-foreground ml-auto shrink-0">
                            {format(parseISO(schedule.scheduled_at), 'HH:mm')}
                          </span>
                        </div>
                      ))
                    }
                    {schedules.filter(s => format(parseISO(s.scheduled_at), 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')).length === 0 && (
                      <div className="text-xs text-muted-foreground italic">Không có lịch</div>
                    )}
                    {schedules.filter(s => format(parseISO(s.scheduled_at), 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')).length > 5 && (
                      <div className="text-xs text-muted-foreground">
                        +{schedules.filter(s => format(parseISO(s.scheduled_at), 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')).length - 5} lịch khác
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Calendar View */}
          <div className="flex-1 min-w-0">
            {/* Campaign Timeline Bar */}
            {showCampaignTimeline && (viewMode === 'month' || viewMode === 'week') && (
              <CampaignTimelineBar
                currentDate={currentDate}
                viewMode={viewMode}
              />
            )}
            
            {viewMode === 'day' ? (
              <Card className="overflow-hidden">
                <CardContent className="p-0 h-[600px]">
                  <CalendarDayView
                    date={currentDate}
                    schedules={filteredSchedules}
                    onScheduleClick={handleScheduleClick}
                    onScheduleDrop={async (scheduleId, newDate) => {
                      try {
                        const schedule = schedules.find(s => s.id === scheduleId);
                        if (!schedule) return;

                        const { error } = await supabase
                          .from('content_schedules')
                          .update({ 
                            scheduled_at: newDate.toISOString(),
                            updated_at: new Date().toISOString(),
                          })
                          .eq('id', scheduleId);

                        if (error) throw error;

                        // Log the reschedule
                        await supabase.from('content_publishing_logs').insert({
                          schedule_id: scheduleId,
                          content_id: schedule.content_id,
                          channel: schedule.channel,
                          organization_id: currentOrganization?.id || null,
                          action: 'rescheduled',
                          performed_by: user?.id || null,
                          performed_at: new Date().toISOString(),
                          details: { 
                            from: schedule.scheduled_at, 
                            to: newDate.toISOString() 
                          },
                        });

                        toast({
                          title: 'Đã đổi lịch',
                          description: `Đã chuyển sang ${format(newDate, 'dd/MM/yyyy HH:mm', { locale: vi })}`,
                        });

                        fetchSchedules();
                      } catch (error) {
                        console.error('Error updating schedule:', error);
                        toast({
                          title: 'Lỗi',
                          description: 'Không thể cập nhật lịch',
                          variant: 'destructive',
                        });
                      }
                    }}
                  />
                </CardContent>
              </Card>
            ) : (
              <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <Card>
                  <CardContent className="p-0 overflow-hidden">
                    {/* Week days header */}
                    <div className="grid grid-cols-7 border-b border-border/30 bg-muted/30">
                      {weekDays.map((day) => (
                        <div 
                          key={day} 
                          className="text-center py-2 text-xs font-medium text-muted-foreground border-r border-border/30 last:border-r-0"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div className={`grid grid-cols-7 ${viewMode === 'week' ? '' : ''}`}>
                      {calendarDays.map((date) => (
                        <DroppableDayCell
                          key={date.toISOString()}
                          date={date}
                          isCurrentMonth={isSameMonth(date, currentDate)}
                          schedules={filteredSchedules}
                          milestones={allMilestones}
                          onScheduleClick={handleScheduleClick}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Drag Overlay */}
                <DragOverlay>
                  {draggedSchedule && (
                    <div className="text-xs p-2 rounded bg-card border-2 border-primary shadow-lg">
                      <div className="flex items-center gap-1.5">
                        <span>{channelEmojis[draggedSchedule.channel as Channel]}</span>
                        <span className="font-medium">{draggedSchedule.content?.title}</span>
                      </div>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>
      )}

      {/* Create Content Form */}
      <SlidePanel
        open={formOpen}
        onOpenChange={setFormOpen}
        title="Tạo nội dung mới"
        description="Tạo nội dung đa kênh từ một chủ đề"
      >
        <MultiChannelForm
          onSubmit={handleGenerateContent}
          isLoading={generating}
        />
      </SlidePanel>

      {/* Content Viewer */}
      <MultiChannelViewer
        content={selectedContent}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        onRegenerate={regenerateChannel}
        onUpdateContent={updateChannelContent}
        onAIEdit={aiEditChannel}
        onUpdateTitleTopic={updateTitleTopic}
        onUpdateChannelStatus={updateChannelStatus}
        onExpandChannels={handleExpandChannels}
        onContentUpdated={(updated) => setSelectedContent(updated)}
        expandingChannels={expandingChannels}
      />

      {/* Schedule Topic Dialog from Topics Hub */}
      <ScheduleTopicDialog
        open={scheduleTopicDialogOpen}
        onOpenChange={setScheduleTopicDialogOpen}
        topic={pendingScheduleTopic}
        contentGoal={pendingScheduleGoal}
        onSchedule={handleScheduleTopic}
        isLoading={isSchedulingTopic}
      />
    </div>
  );
}
