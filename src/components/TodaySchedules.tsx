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
import { motion } from 'framer-motion';
import { SkeletonCard } from '@/components/dashboard/SkeletonCard';
import { EmptyState } from '@/components/dashboard/EmptyState';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

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
      <Card className="gradient-card border-border/50 overflow-hidden">
        <CardContent className="p-6">
          <SkeletonCard lines={3} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gradient-card border-border/50 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-blue-500/20">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            Lịch đăng hôm nay
            {todaySchedules.length > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {todaySchedules.length}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="group">
            <Link to="/calendar">
              Xem lịch
              <ArrowRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {todaySchedules.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Không có lịch đăng"
            description="Không có bài đăng nào trong hôm nay"
          />
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            {todaySchedules.slice(0, 5).map((schedule) => {
              const channel = getChannel(schedule.channel);
              const statusConfig = getStatusConfig(schedule.publish_status || 'scheduled');
              const StatusIcon = statusConfig.icon;

              return (
                <motion.div
                  key={schedule.id}
                  variants={itemVariants}
                  className="p-3 rounded-xl bg-muted/30 border border-border/50 
                           hover:bg-muted/50 hover:border-primary/20 hover:shadow-md 
                           transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm truncate flex-1 group-hover:text-primary transition-colors">
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
                </motion.div>
              );
            })}
            
            {todaySchedules.length > 5 && (
              <motion.div variants={itemVariants}>
                <Button variant="ghost" size="sm" className="w-full group" asChild>
                  <Link to="/calendar">
                    Xem thêm {todaySchedules.length - 5} bài đăng khác
                    <ArrowRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
