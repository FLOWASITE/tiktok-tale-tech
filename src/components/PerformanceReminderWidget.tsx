import { useState } from 'react';
import { usePerformanceReminder, PendingPerformanceItem } from '@/hooks/usePerformanceReminder';
import { TopicPerformanceUpdater } from '@/components/topic/TopicPerformanceUpdater';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  Clock, 
  FileText, 
  Film, 
  Images, 
  X, 
  ChevronDown, 
  ChevronUp,
  Bell,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface PerformanceReminderWidgetProps {
  className?: string;
  maxItems?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const contentTypeConfig = {
  multichannel: { icon: FileText, label: 'Multi-channel', color: 'text-blue-500' },
  script: { icon: Film, label: 'Script', color: 'text-purple-500' },
  carousel: { icon: Images, label: 'Carousel', color: 'text-pink-500' },
};

function PendingItemCard({ 
  item, 
  onDismiss, 
  onUpdate 
}: { 
  item: PendingPerformanceItem; 
  onDismiss: () => void;
  onUpdate: () => void;
}) {
  const { t } = useTranslation();
  const config = contentTypeConfig[item.contentType];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50 hover:border-border transition-colors">
      <div className={cn("p-2 rounded-lg bg-background", config.color)}>
        <Icon className="w-4 h-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.contentTitle}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{item.topic}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <Badge variant="outline" className="text-[10px] h-5">
            <Clock className="w-3 h-3 mr-1" />
            {formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true, locale: vi })}
          </Badge>
          {item.daysSincePublish >= 3 && (
            <Badge variant="destructive" className="text-[10px] h-5">
              {t('app.dashboard.overdue')}
            </Badge>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-1.5 shrink-0">
        <TopicPerformanceUpdater
          contentId={item.contentId}
          onUpdate={onUpdate}
          trigger={
            <Button size="sm" variant="default" className="h-7 text-xs gap-1">
              <TrendingUp className="w-3 h-3" />
              {t('app.dashboard.update')}
            </Button>
          }
        />
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-7 w-7" 
          onClick={onDismiss}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function PerformanceReminderWidget({
  className,
  maxItems = 5,
  collapsible = true,
  defaultCollapsed = false,
}: PerformanceReminderWidgetProps) {
  const { t } = useTranslation();
  const { pendingItems, isLoading, hasPendingItems, pendingCount, dismissItem, refetch } = usePerformanceReminder();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const displayItems = pendingItems.slice(0, maxItems);
  const hasMore = pendingItems.length > maxItems;

  if (isLoading) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!hasPendingItems) {
    return (
      <Card className={cn("border-border/50 bg-emerald-500/5 border-emerald-500/20", className)}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-500/10">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {t('app.dashboard.allUpdated')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('app.dashboard.noPerformanceNeeded')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border/50 border-amber-500/30 bg-amber-500/5", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            {t('app.dashboard.updatePerformance')}
            <Badge variant="secondary" className="ml-1">
              {pendingCount}
            </Badge>
          </CardTitle>
          {collapsible && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('app.dashboard.updateToLearn')}
        </p>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="pt-2">
          <ScrollArea className={pendingItems.length > 3 ? "h-[280px]" : undefined}>
            <div className="space-y-2 pr-2">
              {displayItems.map((item) => (
                <PendingItemCard
                  key={item.id}
                  item={item}
                  onDismiss={() => dismissItem(item.id)}
                  onUpdate={() => {
                    dismissItem(item.id);
                    refetch();
                  }}
                />
              ))}
            </div>
          </ScrollArea>
          
          {hasMore && (
            <p className="text-xs text-center text-muted-foreground mt-3">
              {t('app.dashboard.andMore', { count: pendingItems.length - maxItems })}
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
