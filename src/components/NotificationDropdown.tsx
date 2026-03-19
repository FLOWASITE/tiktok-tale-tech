import { Bell, Check, Trash2, ArrowUpCircle, UserPlus, CheckCircle2, Flag, Calendar, Target, TrendingUp, PenLine, Images, Sparkles, FileText, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS, th } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const dateFnsLocales: Record<string, typeof vi> = { vi, en: enUS, th };

// Notification type config for styling
const notificationTypeConfig: Record<string, { 
  icon: React.ReactNode; 
  bgColor: string;
  textColor: string;
}> = {
  industry_upgrade: { icon: <ArrowUpCircle className="h-4 w-4" />, bgColor: 'bg-purple-500/10', textColor: 'text-purple-500' },
  assignment_created: { icon: <UserPlus className="h-4 w-4" />, bgColor: 'bg-blue-500/10', textColor: 'text-blue-500' },
  assignment_status_changed: { icon: <CheckCircle2 className="h-4 w-4" />, bgColor: 'bg-green-500/10', textColor: 'text-green-500' },
  milestone_due_soon: { icon: <Flag className="h-4 w-4" />, bgColor: 'bg-orange-500/10', textColor: 'text-orange-500' },
  campaign_ending_soon: { icon: <Calendar className="h-4 w-4" />, bgColor: 'bg-red-500/10', textColor: 'text-red-500' },
  kpi_target_reached: { icon: <Target className="h-4 w-4" />, bgColor: 'bg-green-500/10', textColor: 'text-green-500' },
  kpi_target_exceeded: { icon: <TrendingUp className="h-4 w-4" />, bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-500' },
  carousel_prompt_done: { icon: <PenLine className="h-4 w-4" />, bgColor: 'bg-blue-500/10', textColor: 'text-blue-500' },
  carousel_generation_complete: { icon: <Images className="h-4 w-4" />, bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-500' },
  multichannel_content_done: { icon: <Sparkles className="h-4 w-4" />, bgColor: 'bg-purple-500/10', textColor: 'text-purple-500' },
  multichannel_images_done: { icon: <Images className="h-4 w-4" />, bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-500' },
  script_generated: { icon: <FileText className="h-4 w-4" />, bgColor: 'bg-indigo-500/10', textColor: 'text-indigo-500' },
  script_analysis_done: { icon: <BarChart3 className="h-4 w-4" />, bgColor: 'bg-amber-500/10', textColor: 'text-amber-500' },
};

export const NotificationDropdown = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLocale = dateFnsLocales[i18n.language] || vi;

  const handleNotificationClick = (notification: any) => {
    if (!notification.read_at) markAsRead(notification.id);
    const data = notification.data as Record<string, any> | null;
    if (data?.campaign_id) navigate(`/campaigns/${data.campaign_id}`);
    else if (data?.carousel_id) navigate(`/carousel`);
    else if (data?.upgrade_url) navigate(data.upgrade_url);
    else if (data?.content_id) navigate(`/multichannel?content=${data.content_id}`);
  };

  const getTypeConfig = (type: string) => {
    return notificationTypeConfig[type] || { icon: <Bell className="h-4 w-4" />, bgColor: 'bg-muted', textColor: 'text-muted-foreground' };
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs" variant="destructive">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>{t('app.notifications.title')}</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground" onClick={markAllAsRead}>
              {t('app.notifications.markAllRead')}
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">{t('app.notifications.empty')}</div>
          ) : (
            notifications.map((notification) => {
              const typeConfig = getTypeConfig(notification.type);
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn("flex flex-col items-start p-3 cursor-pointer", !notification.read_at && "bg-muted/50")}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className={cn("flex-shrink-0 p-2 rounded-full", typeConfig.bgColor, typeConfig.textColor)}>
                      {typeConfig.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{notification.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                      {notification.type === 'industry_upgrade' && notification.data && (
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">v{(notification.data as any).from_version}</Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge className="text-[10px] px-1.5 py-0 bg-purple-500">v{(notification.data as any).to_version}</Badge>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: currentLocale })}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!notification.read_at && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}>
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
