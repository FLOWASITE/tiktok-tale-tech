import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileVideo, Images, Layers, Clock, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export type ActivityType = 'script' | 'carousel' | 'multichannel';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  createdAt: string;
  metadata?: {
    topic?: string;
    channels?: string[];
    platform?: string;
  };
}

interface RecentActivityProps {
  activities: ActivityItem[];
  loading?: boolean;
}

const activityConfig: Record<ActivityType, {
  icon: typeof FileVideo;
  label: string;
  color: string;
  bgColor: string;
  route: string;
}> = {
  script: {
    icon: FileVideo,
    label: 'Kịch bản',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    route: '/',
  },
  carousel: {
    icon: Images,
    label: 'Carousel',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    route: '/carousel',
  },
  multichannel: {
    icon: Layers,
    label: 'Đa kênh',
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    route: '/multichannel',
  },
};

export function RecentActivity({ activities, loading }: RecentActivityProps) {
  if (loading) {
    return (
      <Card className="gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-primary" />
            Hoạt động gần đây
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-primary" />
            Hoạt động gần đây
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              Chưa có hoạt động nào
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Bắt đầu tạo nội dung để xem hoạt động tại đây
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gradient-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="w-5 h-5 text-primary" />
          Hoạt động gần đây
        </CardTitle>
        <Badge variant="secondary" className="font-normal">
          {activities.length} mục
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="divide-y divide-border/50">
            {activities.map((activity, index) => {
              const config = activityConfig[activity.type];
              const Icon = config.icon;
              
              return (
                <Link
                  key={activity.id}
                  to={config.route}
                  className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors group stagger-item"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {activity.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs font-normal">
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.createdAt), {
                          addSuffix: true,
                          locale: vi,
                        })}
                      </span>
                    </div>
                    {activity.metadata?.topic && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {activity.metadata.topic}
                      </p>
                    )}
                  </div>
                  
                  {/* Arrow */}
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                </Link>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
