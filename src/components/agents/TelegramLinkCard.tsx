import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTelegramBinding, type TelegramBinding } from '@/hooks/useTelegramBinding';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Loader2,
  Unlink,
  Users,
  AlertCircle,
  ExternalLink,
  Send,
  QrCode,
  Bell,
  Sparkles,
  CircleDot,
} from 'lucide-react';

interface TelegramLinkCardProps {
  botReady: boolean;
  isAdmin: boolean;
  botUsername?: string;
  usingDefaultBot?: boolean;
}

const TOKEN_REFRESH_MS = 8 * 60 * 1000; // refresh 2 min before 10-min TTL

export function TelegramLinkCard({ botReady, isAdmin, botUsername, usingDefaultBot }: TelegramLinkCardProps) {
  const {
    binding,
    groupBinding,
    loading,
    unlink,
    unlinkGroup,
    ensureDeeplink,
    prefetchedDeeplink,
    setBinding,
  } = useTelegramBinding();
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  const [unlinkingGroup, setUnlinkingGroup] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [prefetchError, setPrefetchError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolvedBotUsername = botUsername ?? prefetchedDeeplink?.botUsername;
  const botDirectUrl = resolvedBotUsername ? `https://t.me/${resolvedBotUsername}` : null;
  const deeplinkUrl = prefetchedDeeplink?.url;

  // Prefetch token when card mounts (or binding cleared) so click is instant
  const schedulePrefetch = useCallback(async () => {
    if (!botReady || binding) return;
    setPrefetchError(null);
    const result = await ensureDeeplink();
    if (!result) {
      setPrefetchError('Chưa tạo được link. Bấm "Thử lại".');
      return;
    }
    // Schedule auto-refresh before token expires
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      ensureDeeplink(true).catch(() => { /* will retry on next mount */ });
    }, TOKEN_REFRESH_MS);
  }, [botReady, binding, ensureDeeplink]);

  useEffect(() => {
    schedulePrefetch();
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [schedulePrefetch]);

  // Render QR lazily when popover opens
  useEffect(() => {
    if (!qrOpen || !deeplinkUrl || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, deeplinkUrl, {
      width: 192,
      margin: 1,
      color: { dark: '#0a0a0a', light: '#ffffff' },
    }).catch((err) => console.warn('[TelegramLinkCard] QR render failed:', err));
  }, [qrOpen, deeplinkUrl]);

  // Realtime subscription — morph card to "connected" instantly when bot binds
  useEffect(() => {
    if (!user || !currentOrganization || binding) return;

    const channel = supabase
      .channel(`tg-link-card-${user.id}-${currentOrganization.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'telegram_chat_bindings',
          filter: `organization_id=eq.${currentOrganization.id}`,
        },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const row = (payload.new ?? payload.old) as any;
          if (
            row?.user_id === user.id &&
            row?.chat_type === 'private' &&
            row?.is_active === true
          ) {
            setBinding(row as TelegramBinding);
            toast({
              title: 'Kết nối thành công',
              description: 'AI Agent đã sẵn sàng trong Telegram.',
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentOrganization, binding, setBinding]);

  const handleUnlinkGroup = async () => {
    setUnlinkingGroup(true);
    try { await unlinkGroup(); } finally { setUnlinkingGroup(false); }
  };

  const handleTestPing = async () => {
    if (!currentOrganization) return;
    setPinging(true);
    try {
      const { data, error } = await supabase.functions.invoke('telegram-send-test', {
        body: { organization_id: currentOrganization.id },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errCtx = (error as any)?.context;
      let errBody: { error?: string } | null = null;
      if (errCtx && typeof errCtx.json === 'function') {
        try { errBody = await errCtx.json(); } catch { /* ignore */ }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = errBody ?? ((data as any)?.error ? data : null);
      if (error || payload?.error) {
        toast({
          title: 'Không gửi được',
          description: payload?.error ?? error?.message ?? 'Lỗi không xác định',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Đã gửi ping',
        description: 'Kiểm tra Telegram của bạn.',
      });
    } finally {
      setPinging(false);
    }
  };

  const handleClickConnect = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    // If somehow no deeplink yet, generate on the fly then open
    if (!deeplinkUrl) {
      e.preventDefault();
      const fresh = await ensureDeeplink(true);
      if (fresh?.url) window.open(fresh.url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!botReady) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto">
          <AlertCircle className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <div className="font-medium text-sm">Chờ admin cấu hình bot</div>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {isAdmin
              ? 'Hoàn tất Bước 1 (Cấu hình Bot Telegram) ở trên trước khi link tài khoản.'
              : 'Tổ chức của bạn chưa có bot Telegram. Liên hệ admin để hoàn tất cấu hình.'}
          </p>
        </div>
      </div>
    );
  }

  // === CONNECTED STATE ===
  if (binding) {
    const lastSeen = binding.last_command_at ?? binding.linked_at;
    const lastSeenLabel = lastSeen
      ? formatDistanceToNow(new Date(lastSeen), { addSuffix: true, locale: vi })
      : 'chưa có hoạt động';

    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-transparent p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                <Send className="w-4 h-4 text-primary" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>AI Agent đang lắng nghe</span>
                {resolvedBotUsername && (
                  <span className="text-primary">trên @{resolvedBotUsername}</span>
                )}
                {usingDefaultBot && (
                  <Badge variant="secondary" className="text-[10px] font-normal">mặc định</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                {binding.telegram_username ? `@${binding.telegram_username}` : `Chat ID: ${binding.telegram_chat_id}`}
                <span className="mx-1.5">·</span>
                Hoạt động {lastSeenLabel}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {botDirectUrl && (
              <Button asChild size="sm">
                <a href={botDirectUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Mở chat
                </a>
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleTestPing} disabled={pinging}>
              {pinging ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Bell className="w-3.5 h-3.5 mr-1.5" />
              )}
              Test ping
            </Button>
            <Button size="sm" variant="ghost" onClick={unlink} className="text-muted-foreground hover:text-destructive">
              <Unlink className="w-3.5 h-3.5 mr-1.5" /> Gỡ
            </Button>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground border-t pt-3">
            <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary/70" />
            <span className="leading-relaxed">
              Chat tự nhiên: <span className="text-foreground">"tạo campaign cho spa"</span>,{' '}
              <span className="text-foreground">"quota tháng này"</span>, hoặc gõ{' '}
              <code className="text-primary">/campaign</code>, <code className="text-primary">/pause</code>.
            </span>
          </div>
        </div>

        {/* Group binding accordion — unchanged */}
        <GroupAccordion
          groupBinding={groupBinding}
          isAdmin={isAdmin}
          unlinkingGroup={unlinkingGroup}
          onUnlinkGroup={handleUnlinkGroup}
        />
      </div>
    );
  }

  // === NOT-CONNECTED STATE — one-click ===
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Send className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Kết nối Telegram để chat AI Agent</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              1 click → bấm Start trong Telegram → xong.
              {usingDefaultBot && resolvedBotUsername && ` Dùng bot mặc định @${resolvedBotUsername}.`}
            </p>
          </div>
        </div>

        {prefetchError ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs">
            <div className="flex items-center gap-1.5 text-destructive min-w-0">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{prefetchError}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => schedulePrefetch()}>Thử lại</Button>
          </div>
        ) : (
          <Button asChild size="lg" className="w-full h-12" disabled={!deeplinkUrl}>
            <a
              href={deeplinkUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClickConnect}
            >
              {deeplinkUrl ? (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Mở Telegram → Start bot
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang chuẩn bị link…
                </>
              )}
            </a>
          </Button>
        )}

        <div className="flex items-center justify-between gap-2">
          <Popover open={qrOpen} onOpenChange={setQrOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" disabled={!deeplinkUrl} className="text-xs h-8">
                <QrCode className="w-3.5 h-3.5 mr-1.5" />
                Scan QR (máy khác)
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="rounded-md bg-white p-2 border">
                <canvas ref={canvasRef} className="block" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 max-w-[200px]">
                Mở Telegram trên điện thoại, scan QR để bind nhanh.
              </p>
            </PopoverContent>
          </Popover>

          {botDirectUrl && (
            <Button asChild variant="ghost" size="sm" className="text-xs h-8">
              <a href={botDirectUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3 mr-1" />
                @{resolvedBotUsername}
              </a>
            </Button>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed border-t pt-2.5">
          Sau khi Start: chat tự nhiên với AI Agent ngay trong Telegram —
          tạo campaign, hỏi quota, kiểm tra pipeline, không cần mở app.
        </p>
      </div>

      <GroupAccordion
        groupBinding={groupBinding}
        isAdmin={isAdmin}
        unlinkingGroup={unlinkingGroup}
        onUnlinkGroup={handleUnlinkGroup}
      />
    </div>
  );
}

// ----------------- Group accordion (unchanged behaviour) -----------------
function GroupAccordion({
  groupBinding,
  isAdmin,
  unlinkingGroup,
  onUnlinkGroup,
}: {
  groupBinding: TelegramBinding | null;
  isAdmin: boolean;
  unlinkingGroup: boolean;
  onUnlinkGroup: () => void;
}) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="group" className="border rounded-md px-3">
        <AccordionTrigger className="py-2 text-sm hover:no-underline">
          <div className="flex items-center gap-2 flex-1">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>Group tổ chức</span>
            <span className="text-xs text-muted-foreground">(tùy chọn)</span>
            {groupBinding ? (
              <Badge variant="default" className="ml-auto mr-2">Đã link</Badge>
            ) : (
              <Badge variant="secondary" className="ml-auto mr-2">Chưa link</Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          {groupBinding ? (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-muted-foreground">
                Chat ID: <code className="text-foreground">{groupBinding.telegram_chat_id}</code>
              </p>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onUnlinkGroup}
                  disabled={unlinkingGroup}
                  className="text-destructive hover:text-destructive"
                >
                  {unlinkingGroup ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Unlink className="w-3.5 h-3.5 mr-1" />
                  )}
                  Gỡ group
                </Button>
              )}
            </div>
          ) : (
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside pt-1">
              <li>Admin add bot vào group Telegram của team</li>
              <li>Gõ <code className="text-primary">/link_group</code> trong group để hoàn tất</li>
            </ol>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
