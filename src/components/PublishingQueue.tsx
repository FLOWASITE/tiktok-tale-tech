import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  ExternalLink, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search,
  Eye,
  Pencil,
  Check,
  X,
  SquareCheck,
  Square,
  RefreshCw,
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isPast, isFuture } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ContentSchedule, PUBLISH_STATUSES, PublishStatus } from '@/types/publishing';
import { Channel, CHANNELS, MultiChannelContent } from '@/types/multichannel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useRetryPublish } from '@/hooks/useRetryPublish';

interface ContentInfo {
  id: string;
  title: string;
  topic: string;
}

interface ScheduleWithContent extends ContentSchedule {
  content?: ContentInfo;
}

interface PublishingQueueProps {
  onViewContent?: (contentId: string) => void;
}

const channelIcons: Record<Channel, string> = {
  website: '🌐',
  blogger: '🌐',
  wordpress: '🌐',
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

const channelColors: Record<Channel, string> = {
  website: 'border-l-blue-500',
  blogger: 'border-l-blue-500',
  wordpress: 'border-l-blue-500',
  facebook: 'border-l-indigo-500',
  instagram: 'border-l-pink-500',
  twitter: 'border-l-slate-500',
  google_maps: 'border-l-green-500',
  linkedin: 'border-l-sky-500',
  email: 'border-l-amber-500',
  youtube: 'border-l-red-500',
  zalo_oa: 'border-l-blue-600',
  telegram: 'border-l-cyan-500',
  tiktok: 'border-l-pink-500',
  threads: 'border-l-slate-500',
};

export function PublishingQueue({ onViewContent }: PublishingQueueProps) {
  const [schedules, setSchedules] = useState<ScheduleWithContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PublishStatus | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<Channel | 'all'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'tomorrow' | 'past' | 'future'>('all');
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  
  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<Date | undefined>();
  const [editTime, setEditTime] = useState('');
  
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const { retryPublish, isRetrying } = useRetryPublish();

  const fetchSchedules = async () => {
    if (!user || !currentOrganization?.id) {
      setSchedules([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('content_schedules')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('scheduled_at', { ascending: true });

      if (schedulesError) throw schedulesError;

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
        description: 'Không thể tải danh sách lịch đăng',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [user, currentOrganization?.id]);

  // Filter schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchTitle = s.content?.title?.toLowerCase().includes(query);
        const matchTopic = s.content?.topic?.toLowerCase().includes(query);
        if (!matchTitle && !matchTopic) return false;
      }
      if (statusFilter !== 'all' && s.publish_status !== statusFilter) return false;
      if (channelFilter !== 'all' && s.channel !== channelFilter) return false;
      if (timeFilter !== 'all') {
        const scheduledDate = parseISO(s.scheduled_at);
        if (timeFilter === 'today' && !isToday(scheduledDate)) return false;
        if (timeFilter === 'tomorrow' && !isTomorrow(scheduledDate)) return false;
        if (timeFilter === 'past' && !isPast(scheduledDate)) return false;
        if (timeFilter === 'future' && !isFuture(scheduledDate)) return false;
      }
      return true;
    });
  }, [schedules, searchQuery, statusFilter, channelFilter, timeFilter]);

  // Group by date
  const groupedSchedules = useMemo(() => {
    return filteredSchedules.reduce((groups, schedule) => {
      const date = format(parseISO(schedule.scheduled_at), 'yyyy-MM-dd');
      if (!groups[date]) groups[date] = [];
      groups[date].push(schedule);
      return groups;
    }, {} as Record<string, ScheduleWithContent[]>);
  }, [filteredSchedules]);

  // Selection handlers
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    const scheduledIds = filteredSchedules
      .filter(s => s.publish_status === 'scheduled')
      .map(s => s.id);
    setSelectedIds(new Set(scheduledIds));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Inline edit handlers
  const startEditing = (schedule: ScheduleWithContent) => {
    const date = parseISO(schedule.scheduled_at);
    setEditingId(schedule.id);
    setEditDate(date);
    setEditTime(format(date, 'HH:mm'));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDate(undefined);
    setEditTime('');
  };

  const saveEditing = async () => {
    if (!editingId || !editDate) return;

    const [hours, minutes] = editTime.split(':').map(Number);
    const newDate = new Date(editDate);
    newDate.setHours(hours, minutes, 0, 0);

    try {
      const { error } = await supabase
        .from('content_schedules')
        .update({ 
          scheduled_at: newDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId);

      if (error) throw error;

      toast({
        title: 'Đã cập nhật',
        description: `Lịch đã được đổi sang ${format(newDate, 'dd/MM/yyyy HH:mm', { locale: vi })}`,
      });
      
      cancelEditing();
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

  // Single actions
  const handleMarkPublished = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('content_schedules')
        .update({ 
          publish_status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', scheduleId);

      if (error) throw error;

      toast({ title: 'Thành công', description: 'Đã đánh dấu là đã đăng' });
      fetchSchedules();
    } catch (error) {
      console.error('Error marking as published:', error);
      toast({ title: 'Lỗi', description: 'Không thể cập nhật trạng thái', variant: 'destructive' });
    }
  };

  const handleCancelSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('content_schedules')
        .update({ publish_status: 'cancelled' })
        .eq('id', scheduleId);

      if (error) throw error;

      toast({ title: 'Đã hủy', description: 'Lịch đăng đã được hủy' });
      fetchSchedules();
    } catch (error) {
      console.error('Error cancelling schedule:', error);
      toast({ title: 'Lỗi', description: 'Không thể hủy lịch đăng', variant: 'destructive' });
    }
  };

  // Bulk actions
  const handleBulkMarkPublished = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);

    let successCount = 0;
    for (const id of selectedIds) {
      try {
        const { error } = await supabase
          .from('content_schedules')
          .update({ 
            publish_status: 'published',
            published_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (!error) successCount++;
      } catch (error) {
        console.error('Error marking as published:', error);
      }
    }

    toast({
      title: 'Thành công',
      description: `Đã đánh dấu ${successCount}/${selectedIds.size} bài là đã đăng`,
    });
    
    clearSelection();
    setIsBulkProcessing(false);
    fetchSchedules();
  };

  const handleBulkCancel = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);

    let successCount = 0;
    for (const id of selectedIds) {
      try {
        const { error } = await supabase
          .from('content_schedules')
          .update({ publish_status: 'cancelled' })
          .eq('id', id);

        if (!error) successCount++;
      } catch (error) {
        console.error('Error cancelling schedule:', error);
      }
    }

    toast({
      title: 'Đã hủy',
      description: `Đã hủy ${successCount}/${selectedIds.size} lịch đăng`,
    });
    
    clearSelection();
    setIsBulkProcessing(false);
    fetchSchedules();
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hôm nay';
    if (isTomorrow(date)) return 'Ngày mai';
    return format(date, "EEEE, dd/MM/yyyy", { locale: vi });
  };

  const getStatusIcon = (status: PublishStatus) => {
    switch (status) {
      case 'published': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-muted-foreground" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const scheduledCount = filteredSchedules.filter(s => s.publish_status === 'scheduled').length;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tiêu đề, chủ đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PublishStatus | 'all')}>
          <SelectTrigger className="w-[140px]">
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
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Kênh" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả kênh</SelectItem>
            {CHANNELS.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as typeof timeFilter)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Thời gian" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="today">Hôm nay</SelectItem>
            <SelectItem value="tomorrow">Ngày mai</SelectItem>
            <SelectItem value="future">Sắp tới</SelectItem>
            <SelectItem value="past">Đã qua</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions Bar */}
      {(selectedIds.size > 0 || scheduledCount > 0) && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 border rounded-md">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size === scheduledCount && scheduledCount > 0}
              onCheckedChange={() => {
                if (selectedIds.size === scheduledCount) {
                  clearSelection();
                } else {
                  selectAll();
                }
              }}
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0 ? `Đã chọn ${selectedIds.size}` : `${scheduledCount} đang chờ`}
            </span>
          </div>

          {selectedIds.size > 0 && (
            <>
              <div className="h-4 w-px bg-border mx-2" />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBulkMarkPublished}
                disabled={isBulkProcessing}
                className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Đánh dấu đã đăng
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleBulkCancel}
                disabled={isBulkProcessing}
                className="h-7 text-xs text-destructive hover:bg-destructive/10"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Hủy hàng loạt
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-7 text-xs ml-auto"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-900/10">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {schedules.filter(s => s.publish_status === 'scheduled').length}
            </div>
            <div className="text-xs text-muted-foreground">Đang chờ</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {schedules.filter(s => s.publish_status === 'published').length}
            </div>
            <div className="text-xs text-muted-foreground">Đã đăng</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/10">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-red-600">
              {schedules.filter(s => s.publish_status === 'failed').length}
            </div>
            <div className="text-xs text-muted-foreground">Thất bại</div>
          </CardContent>
        </Card>
        <Card className="border-muted bg-muted/30">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-muted-foreground">
              {schedules.filter(s => s.publish_status === 'cancelled').length}
            </div>
            <div className="text-xs text-muted-foreground">Đã hủy</div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule List */}
      <ScrollArea className="h-[500px]">
        {Object.keys(groupedSchedules).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mb-3 opacity-50" />
            <p>Chưa có lịch đăng nào</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSchedules)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, items]) => (
                <div key={date}>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3 sticky top-0 bg-background py-1 z-10">
                    {getDateLabel(date)} ({items.length})
                  </h3>
                  <div className="space-y-2">
                    {items.map((schedule) => {
                      const statusConfig = PUBLISH_STATUSES.find(s => s.value === schedule.publish_status);
                      const isPastDue = isPast(parseISO(schedule.scheduled_at)) && schedule.publish_status === 'scheduled';
                      const isEditing = editingId === schedule.id;
                      const isScheduled = schedule.publish_status === 'scheduled';

                      return (
                        <Card 
                          key={schedule.id} 
                          className={cn(
                            'border-l-[3px] transition-all',
                            channelColors[schedule.channel as Channel],
                            isPastDue && 'ring-1 ring-yellow-400',
                            selectedIds.has(schedule.id) && 'ring-2 ring-primary'
                          )}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              {/* Checkbox for scheduled items */}
                              {isScheduled && (
                                <Checkbox
                                  checked={selectedIds.has(schedule.id)}
                                  onCheckedChange={() => toggleSelection(schedule.id)}
                                  className="mt-1"
                                />
                              )}

                              <div className="flex-1 min-w-0">
                                {/* Header row */}
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">{channelIcons[schedule.channel as Channel]}</span>
                                  <span className="font-medium truncate flex-1">{schedule.content?.title || 'Không có tiêu đề'}</span>
                                  {getStatusIcon(schedule.publish_status)}
                                </div>

                                {/* Time display/edit row */}
                                <div className="flex items-center gap-2 text-sm">
                                  {isEditing ? (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button variant="outline" size="sm" className="h-7 text-xs">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            {editDate ? format(editDate, 'dd/MM/yyyy') : 'Chọn ngày'}
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                          <CalendarComponent
                                            mode="single"
                                            selected={editDate}
                                            onSelect={setEditDate}
                                            locale={vi}
                                          />
                                        </PopoverContent>
                                      </Popover>
                                      <Input
                                        type="time"
                                        value={editTime}
                                        onChange={(e) => setEditTime(e.target.value)}
                                        className="h-7 w-24 text-xs"
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={saveEditing}
                                        className="h-7 w-7 p-0 text-green-600"
                                      >
                                        <Check className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={cancelEditing}
                                        className="h-7 w-7 p-0"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                      <span className="text-muted-foreground">
                                        {format(parseISO(schedule.scheduled_at), 'HH:mm')}
                                      </span>
                                      {isScheduled && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => startEditing(schedule)}
                                          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </Button>
                                      )}
                                      <Badge variant="outline" className="text-xs">
                                        {CHANNELS.find(c => c.value === schedule.channel)?.label}
                                      </Badge>
                                      <Badge 
                                        variant="outline"
                                        className={cn(
                                          'text-xs',
                                          schedule.publish_status === 'published' && 'bg-green-500/10 text-green-600',
                                          schedule.publish_status === 'failed' && 'bg-red-500/10 text-red-600',
                                          schedule.publish_status === 'cancelled' && 'bg-muted text-muted-foreground',
                                          schedule.publish_status === 'scheduled' && 'bg-yellow-500/10 text-yellow-600'
                                        )}
                                      >
                                        {statusConfig?.label}
                                      </Badge>
                                      {isPastDue && (
                                        <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600">
                                          <AlertCircle className="w-3 h-3 mr-1" />
                                          Quá hạn
                                        </Badge>
                                      )}
                                    </>
                                  )}
                                </div>

                                {schedule.notes && (
                                  <p className="text-xs text-muted-foreground mt-1">{schedule.notes}</p>
                                )}
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-1 shrink-0">
                                {/* View content button */}
                                {onViewContent && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onViewContent(schedule.content_id)}
                                    className="h-8 w-8 p-0"
                                    title="Xem nội dung"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                )}

                                {/* Retry button for failed */}
                                {schedule.publish_status === 'failed' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={async () => {
                                      await retryPublish({
                                        scheduleId: schedule.id,
                                        contentId: schedule.content_id,
                                        channel: schedule.channel as Channel,
                                        organizationId: currentOrganization?.id,
                                      });
                                      fetchSchedules();
                                    }}
                                    disabled={isRetrying === schedule.id}
                                    title="Thử lại"
                                  >
                                    {isRetrying === schedule.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <RefreshCw className="w-4 h-4" />
                                    )}
                                  </Button>
                                )}

                                {isScheduled && !isEditing && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={() => handleMarkPublished(schedule.id)}
                                      title="Đánh dấu đã đăng"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => handleCancelSchedule(schedule.id)}
                                      title="Hủy lịch"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
