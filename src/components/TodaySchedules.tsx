import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useContentSchedules } from '@/hooks/useContentSchedules';
import { useMultiChannelContents } from '@/hooks/useMultiChannelContents';
import { CHANNELS } from '@/types/multichannel';
import { format, isToday } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

export const TodaySchedules = () => {
  const { allSchedules, fetchAllSchedules, isLoading } = useContentSchedules();
  const { contents } = useMultiChannelContents();
  const [todaySchedules, setTodaySchedules] = useState<typeof allSchedules>([]);

  useEffect(() => {
    fetchAllSchedules();
  }, [fetchAllSchedules]);

  useEffect(() => {
    const filtered = allSchedules.filter(schedule => {
      const scheduleDate = new Date(schedule.scheduled_at);
      return isToday(scheduleDate) && schedule.publish_status !== 'cancelled';
    });
    setTodaySchedules(filtered);
  }, [allSchedules]);

  const getChannel = (channelValue: string) => {
    return CHANNELS.find(c => c.value === channelValue);
  };

  const getContentTitle = (contentId: string) => {
    const content = contents.find(c => c.id === contentId);
    return content?.title || 'Nội dung không xác định';
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'published':
        return { label: 'Đã đăng', variant: 'default' as const, icon: CheckCircle };
      case 'failed':
        return { label: 'Thất bại', variant: 'destructive' as const, icon: AlertCircle };
      default:
        return { label: 'Chờ đăng', variant: 'secondary' as const, icon: Clock };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Lịch đăng hôm nay
            {todaySchedules.length > 0 && (
              <Badge variant="secondary">{todaySchedules.length}</Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/calendar">
              Xem lịch
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {todaySchedules.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            Không có bài đăng nào trong hôm nay
          </div>
        ) : (
          <div className="space-y-3">
            {todaySchedules.slice(0, 5).map((schedule) => {
              const channel = getChannel(schedule.channel);
              const statusConfig = getStatusConfig(schedule.publish_status || 'scheduled');
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={schedule.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm truncate flex-1">
                      {getContentTitle(schedule.content_id)}
                    </span>
                    <Badge variant={statusConfig.variant} className="ml-2">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {channel && (
                      <span className="flex items-center gap-1">
                        <span>{channel.label}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(schedule.scheduled_at), 'HH:mm', { locale: vi })}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {todaySchedules.length > 5 && (
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <Link to="/calendar">
                  Xem thêm {todaySchedules.length - 5} bài đăng khác
                </Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
