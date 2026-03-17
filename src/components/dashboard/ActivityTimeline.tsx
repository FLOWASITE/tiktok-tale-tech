import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileVideo, 
  Images, 
  Layers, 
  Clock,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface ActivityItem {
  id: string;
  type: 'script' | 'carousel' | 'multichannel';
  title: string;
  createdAt: string;
  metadata?: {
    topic?: string;
    platform?: string;
    channels?: string[];
  };
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  loading?: boolean;
  className?: string;
}

export function ActivityTimeline({ activities, loading, className }: ActivityTimelineProps) {
  const { t } = useTranslation();

  const typeConfig = {
    script: {
      icon: FileVideo,
      color: 'bg-rose-500',
      label: t('app.dashboard.scriptLabel'),
      href: '/scripts',
    },
    carousel: {
      icon: Images,
      color: 'bg-cyan-500',
      label: t('app.dashboard.carouselLabel'),
      href: '/carousel',
    },
    multichannel: {
      icon: Layers,
      color: 'bg-violet-500',
      label: t('app.dashboard.multiChannelLabel'),
      href: '/multichannel',
    },
  };

  function groupByDate(items: ActivityItem[]) {
    const groups: { [key: string]: ActivityItem[] } = {};
    
    items.forEach(activity => {
      const date = new Date(activity.createdAt);
      let key: string;
      
      if (isToday(date)) {
        key = t('app.dashboard.today');
      } else if (isYesterday(date)) {
        key = t('app.dashboard.yesterday');
      } else {
        key = format(date, 'dd/MM/yyyy', { locale: vi });
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(activity);
    });
    
    return groups;
  }

  const groupedActivities = useMemo(() => groupByDate(activities), [activities, t]);

  if (loading) {
    return (
      <Card className={`gradient-card border-border/50 ${className}`}>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
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
      <Card className={`gradient-card border-border/50 ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            {t('app.dashboard.recentActivity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="p-3 rounded-full bg-muted/50 w-fit mx-auto mb-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('app.dashboard.noActivity')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('app.dashboard.startCreating')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`gradient-card border-border/50 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          {t('app.dashboard.recentActivity')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {Object.entries(groupedActivities).map(([date, items], groupIndex) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {date}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="relative ml-3">
                <div className="absolute left-0 top-3 bottom-3 w-px bg-border" />

                <div className="space-y-3">
                  {items.map((activity, index) => {
                    const config = typeConfig[activity.type];
                    const Icon = config.icon;

                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: groupIndex * 0.1 + index * 0.05 }}
                      >
                        <Link 
                          to={`${config.href}/${activity.id}`}
                          className="group flex items-start gap-3 relative pl-5"
                        >
                          <div className={`absolute left-0 top-2 w-2 h-2 rounded-full ${config.color} -translate-x-1/2 ring-2 ring-background`} />
                          
                          <div className={`w-8 h-8 rounded-lg ${config.color} bg-opacity-10 flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-4 h-4 ${config.color.replace('bg-', 'text-')}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                              {activity.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">
                                {config.label}
                              </span>
                              <span className="text-xs text-muted-foreground/50">•</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(activity.createdAt), { 
                                  addSuffix: true, 
                                  locale: vi 
                                })}
                              </span>
                            </div>
                          </div>

                          <ChevronRight className="w-4 h-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
