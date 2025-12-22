import { useState, useEffect } from 'react';
import { Calendar, Clock, ExternalLink, Filter, Loader2, CheckCircle2, XCircle, AlertCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ContentSchedule, PUBLISH_STATUSES, PublishStatus } from '@/types/publishing';
import { Channel, CHANNELS } from '@/types/multichannel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { format, parseISO, isToday, isTomorrow, isPast, isFuture } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

interface ContentInfo {
  id: string;
  title: string;
  topic: string;
}

interface ScheduleWithContent extends ContentSchedule {
  content?: ContentInfo;
}

const channelIcons: Record<Channel, string> = {
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
};

export function PublishingQueue() {
  const [schedules, setSchedules] = useState<ScheduleWithContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PublishStatus | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<Channel | 'all'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'tomorrow' | 'past' | 'future'>('all');
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  const fetchSchedules = async () => {
    if (!user || !currentOrganization?.id) {
      setSchedules([]);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('content_schedules')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('scheduled_at', { ascending: true });

      if (schedulesError) throw schedulesError;

      // Get unique content IDs
      const contentIds = [...new Set((schedulesData || []).map(s => s.content_id))];
      
      // Fetch content info
      const { data: contentsData } = await supabase
        .from('multi_channel_contents')
        .select('id, title, topic')
        .in('id', contentIds);

      const contentMap = new Map((contentsData || []).map(c => [c.id, c]));

      // Merge data
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

      toast({
        title: 'Thành công',
        description: 'Đã đánh dấu là đã đăng',
      });
      fetchSchedules();
    } catch (error) {
      console.error('Error marking as published:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật trạng thái',
        variant: 'destructive',
      });
    }
  };

  const handleCancelSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('content_schedules')
        .update({ publish_status: 'cancelled' })
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: 'Đã hủy',
        description: 'Lịch đăng đã được hủy',
      });
      fetchSchedules();
    } catch (error) {
      console.error('Error cancelling schedule:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể hủy lịch đăng',
        variant: 'destructive',
      });
    }
  };

  // Filter schedules
  const filteredSchedules = schedules.filter(s => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTitle = s.content?.title?.toLowerCase().includes(query);
      const matchTopic = s.content?.topic?.toLowerCase().includes(query);
      if (!matchTitle && !matchTopic) return false;
    }

    // Status filter
    if (statusFilter !== 'all' && s.publish_status !== statusFilter) return false;

    // Channel filter
    if (channelFilter !== 'all' && s.channel !== channelFilter) return false;

    // Time filter
    if (timeFilter !== 'all') {
      const scheduledDate = parseISO(s.scheduled_at);
      if (timeFilter === 'today' && !isToday(scheduledDate)) return false;
      if (timeFilter === 'tomorrow' && !isTomorrow(scheduledDate)) return false;
      if (timeFilter === 'past' && !isPast(scheduledDate)) return false;
      if (timeFilter === 'future' && !isFuture(scheduledDate)) return false;
    }

    return true;
  });

  // Group by date
  const groupedSchedules = filteredSchedules.reduce((groups, schedule) => {
    const date = format(parseISO(schedule.scheduled_at), 'yyyy-MM-dd');
    if (!groups[date]) groups[date] = [];
    groups[date].push(schedule);
    return groups;
  }, {} as Record<string, ScheduleWithContent[]>);

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
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3 sticky top-0 bg-background py-1">
                    {getDateLabel(date)}
                  </h3>
                  <div className="space-y-2">
                    {items.map((schedule) => {
                      const statusConfig = PUBLISH_STATUSES.find(s => s.value === schedule.publish_status);
                      const isPastDue = isPast(parseISO(schedule.scheduled_at)) && schedule.publish_status === 'scheduled';

                      return (
                        <Card 
                          key={schedule.id} 
                          className={`${isPastDue ? 'border-yellow-400' : ''}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">{channelIcons[schedule.channel as Channel]}</span>
                                  <span className="font-medium truncate">{schedule.content?.title || 'Không có tiêu đề'}</span>
                                  {getStatusIcon(schedule.publish_status)}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{format(parseISO(schedule.scheduled_at), 'HH:mm')}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {CHANNELS.find(c => c.value === schedule.channel)?.label}
                                  </Badge>
                                  <Badge 
                                    variant="outline"
                                    className={`text-xs ${
                                      schedule.publish_status === 'published' ? 'bg-green-500/10 text-green-600' :
                                      schedule.publish_status === 'failed' ? 'bg-red-500/10 text-red-600' :
                                      schedule.publish_status === 'cancelled' ? 'bg-muted text-muted-foreground' :
                                      'bg-yellow-500/10 text-yellow-600'
                                    }`}
                                  >
                                    {statusConfig?.label}
                                  </Badge>
                                  {isPastDue && (
                                    <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600">
                                      <AlertCircle className="w-3 h-3 mr-1" />
                                      Quá hạn
                                    </Badge>
                                  )}
                                </div>
                                {schedule.notes && (
                                  <p className="text-xs text-muted-foreground mt-1">{schedule.notes}</p>
                                )}
                              </div>

                              {schedule.publish_status === 'scheduled' && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => handleMarkPublished(schedule.id)}
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Đã đăng
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleCancelSchedule(schedule.id)}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
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
