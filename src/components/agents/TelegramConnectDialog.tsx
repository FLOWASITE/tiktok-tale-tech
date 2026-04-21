import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, Copy, Check, RefreshCw, CheckCircle2, Rocket, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTelegramBinding, type TelegramBinding } from '@/hooks/useTelegramBinding';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

interface TelegramConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  botUsername?: string;
  usingDefaultBot?: boolean;
}

type DialogState =
  | { kind: 'loading' }
  | { kind: 'ready'; deeplink: string; expiresAt: number }
  | { kind: 'error'; message: string }
  | { kind: 'success'; binding: TelegramBinding; botUsername: string };

const POLL_INTERVAL_MS = 3000;
const REGEN_DEBOUNCE_MS = 500;

function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function TelegramConnectDialog({
  open,
  onOpenChange,
  botUsername: botUsernameProp,
  usingDefaultBot,
}: TelegramConnectDialogProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const { generateDeeplink, refresh: refreshBinding } = useTelegramBinding();

  const [state, setState] = useState<DialogState>({ kind: 'loading' });
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [resolvedBotUsername, setResolvedBotUsername] = useState<string | undefined>(botUsernameProp);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const regeneratingRef = useRef(false);
  const autoRegenFiredRef = useRef(false);

  const generate = useCallback(async () => {
    if (regeneratingRef.current) return;
    regeneratingRef.current = true;
    setState({ kind: 'loading' });
    autoRegenFiredRef.current = false;
    try {
      const result = await generateDeeplink();
      if (!result) {
        setState({ kind: 'error', message: 'Không tạo được link kết nối' });
        return;
      }
      // deeplink format: https://t.me/<bot>?start=<token>
      const match = result.deeplink.match(/t\.me\/([^/?]+)/i);
      if (match) setResolvedBotUsername(match[1]);
      setState({
        kind: 'ready',
        deeplink: result.deeplink,
        expiresAt: Date.now() + (result.expires_in ?? 600) * 1000,
      });
    } catch (err) {
      console.error('[TelegramConnectDialog] generate error:', err);
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Lỗi không xác định',
      });
    } finally {
      regeneratingRef.current = false;
    }
  }, [generateDeeplink]);

  // Auto-generate on open
  useEffect(() => {
    if (!open) return;
    setCopied(false);
    generate();
  }, [open, generate]);

  // Tick clock every second for countdown display
  useEffect(() => {
    if (!open || state.kind !== 'ready') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open, state.kind]);

  // Auto-regenerate when expired
  useEffect(() => {
    if (state.kind !== 'ready') return;
    const remaining = state.expiresAt - now;
    if (remaining <= 0 && !autoRegenFiredRef.current) {
      autoRegenFiredRef.current = true;
      setTimeout(() => generate(), REGEN_DEBOUNCE_MS);
    }
  }, [state, now, generate]);

  // Render QR whenever deeplink changes
  useEffect(() => {
    if (state.kind !== 'ready' || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, state.deeplink, {
      width: 200,
      margin: 1,
      color: { dark: '#0a0a0a', light: '#ffffff' },
    }).catch((err) => {
      console.warn('[TelegramConnectDialog] QR render failed:', err);
    });
  }, [state]);

  // Realtime subscription + poll fallback to detect successful bind
  useEffect(() => {
    if (!open || state.kind === 'success' || !user || !currentOrganization) return;

    let cancelled = false;
    const handleBind = (binding: TelegramBinding) => {
      if (cancelled) return;
      setState({
        kind: 'success',
        binding,
        botUsername: resolvedBotUsername ?? binding.telegram_username ?? 'bot',
      });
    };

    const checkBinding = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('telegram_chat_bindings')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('user_id', user.id)
        .eq('chat_type', 'private')
        .eq('is_active', true)
        .maybeSingle();
      if (data) handleBind(data as TelegramBinding);
    };

    // Initial check in case user already bound before opening dialog
    checkBinding();

    const channel = supabase
      .channel(`tg-bind-${user.id}-${currentOrganization.id}`)
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
            handleBind(row as TelegramBinding);
          }
        },
      )
      .subscribe();

    // Poll fallback — runs alongside realtime. Stops automatically on success via cancelled flag.
    const pollId = setInterval(checkBinding, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [open, state.kind, user, currentOrganization, resolvedBotUsername]);

  // Refresh parent binding state when we detect success (so card outside shows bound state)
  useEffect(() => {
    if (state.kind === 'success') {
      refreshBinding();
    }
  }, [state.kind, refreshBinding]);

  const handleCopy = async () => {
    if (state.kind !== 'ready') return;
    try {
      await navigator.clipboard.writeText(state.deeplink);
      setCopied(true);
      toast({ title: 'Đã copy link' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Không copy được', variant: 'destructive' });
    }
  };

  const miniAppUrl =
    state.kind === 'success' && resolvedBotUsername
      ? `https://t.me/${resolvedBotUsername}?startapp=flowa`
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Kết nối Telegram
            {usingDefaultBot && resolvedBotUsername && (
              <Badge variant="secondary" className="text-[10px] font-normal">
                via @{resolvedBotUsername}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Scan QR bằng Telegram trên điện thoại, hoặc bấm nút để mở trực tiếp.
          </DialogDescription>
        </DialogHeader>

        {state.kind === 'loading' && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {state.kind === 'error' && (
          <div className="space-y-3 py-4">
            <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <div className="text-sm font-medium">Không tạo được link</div>
                <p className="text-xs text-muted-foreground break-words">{state.message}</p>
              </div>
            </div>
            <Button onClick={generate} variant="outline" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" /> Thử lại
            </Button>
          </div>
        )}

        {state.kind === 'ready' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="rounded-lg border bg-white p-3">
                <canvas ref={canvasRef} className="block" />
              </div>
            </div>

            <Button asChild size="lg" className="w-full">
              <a href={state.deeplink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" /> Continue in Telegram
              </a>
            </Button>

            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted border rounded px-2 py-1.5 truncate">
                {state.deeplink}
              </code>
              <Button size="icon" variant="outline" onClick={handleCopy} className="shrink-0">
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Hết hạn trong{' '}
                <span className="font-mono font-medium text-foreground">
                  {formatCountdown(state.expiresAt - now)}
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={generate}
                disabled={regeneratingRef.current}
                className="h-7 px-2 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Tạo link mới
              </Button>
            </div>
          </div>
        )}

        {state.kind === 'success' && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center space-y-1">
                <div className="font-medium">Đã kết nối!</div>
                <p className="text-sm text-muted-foreground">
                  {state.binding.telegram_username
                    ? `@${state.binding.telegram_username} đã link với workspace.`
                    : 'Tài khoản Telegram đã link với workspace.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {miniAppUrl && (
                <Button asChild size="lg" className="w-full">
                  <a href={miniAppUrl} target="_blank" rel="noopener noreferrer">
                    <Rocket className="w-4 h-4 mr-2" /> Mở Mini App
                  </a>
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                Xong
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
