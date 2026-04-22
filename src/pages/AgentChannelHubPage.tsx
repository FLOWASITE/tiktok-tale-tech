import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Send, Slack, Check, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ZaloIcon } from '@/components/icons/SocialIcons';
import { useTelegramBinding } from '@/hooks/useTelegramBinding';
import { cn } from '@/lib/utils';

type ChannelRow = {
  key: string;
  name: string;
  icon: React.ReactNode;
  iconWrapClass: string;
  status: 'connected' | 'connect' | 'soon';
  onClick?: () => void;
};

export default function AgentChannelHubPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { binding, loading } = useTelegramBinding();

  const telegramConnected = !loading && !!binding;

  const channels: ChannelRow[] = [
    {
      key: 'telegram',
      name: 'Telegram',
      icon: <Send className="w-5 h-5" />,
      iconWrapClass: 'bg-[hsl(200_80%_55%/0.12)] text-[hsl(200_80%_45%)]',
      status: telegramConnected ? 'connected' : 'connect',
      onClick: () => navigate('/agents/telegram'),
    },
    {
      key: 'slack',
      name: 'Slack',
      icon: <Slack className="w-5 h-5" />,
      iconWrapClass: 'bg-muted text-muted-foreground',
      status: 'soon',
    },
    {
      key: 'zalo',
      name: 'Zalo',
      icon: <ZaloIcon className="w-5 h-5" />,
      iconWrapClass: 'bg-[hsl(210_100%_55%/0.12)] text-[hsl(210_100%_45%)]',
      status: 'soon',
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
          {t('agentHub.title', { defaultValue: 'Nhận Agent của bạn' })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('agentHub.subtitle', {
            defaultValue: 'Chọn nền tảng để chat với AI Agent',
          })}
        </p>
      </header>

      <Card className="overflow-hidden divide-y divide-border">
        {channels.map((ch) => {
          const isSoon = ch.status === 'soon';
          const clickable = !isSoon && !!ch.onClick;
          return (
            <div
              key={ch.key}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? ch.onClick : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        ch.onClick?.();
                      }
                    }
                  : undefined
              }
              className={cn(
                'flex items-center gap-3 px-4 py-4 transition-colors',
                clickable && 'cursor-pointer hover:bg-muted/40',
                isSoon && 'opacity-60',
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                  ch.iconWrapClass,
                )}
              >
                {ch.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm sm:text-base truncate">{ch.name}</div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {ch.status === 'connected' && (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 border-emerald-500/20 gap-1 cursor-help"
                        >
                          <Check className="w-3 h-3" />
                          {t('agentHub.connected', { defaultValue: 'Đã kết nối' })}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs text-xs leading-relaxed">
                        {t('agentHub.connectedHint', {
                          defaultValue:
                            'Tài khoản của bạn đã được liên kết với bot. Nếu bot không phản hồi đúng trong Telegram, hãy mở chat bot và gõ /start để làm mới liên kết.',
                        })}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {ch.status === 'connect' && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      ch.onClick?.();
                    }}
                  >
                    {t('agentHub.connect', { defaultValue: 'Kết nối' })}
                  </Button>
                )}
                {ch.status === 'soon' && (
                  <Badge variant="secondary" className="font-medium">
                    {t('agentHub.comingSoon', { defaultValue: 'Sắp ra mắt' })}
                  </Badge>
                )}
                {clickable && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
                )}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
