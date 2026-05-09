import { useMemo, useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Unplug,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SocialConnection } from '@/hooks/useSocialConnections';
import { classifyOAuthError } from '@/lib/oauthErrorClassifier';
import { emitReconnectNeeded } from '@/components/social/ReconnectBanner';

type Status =
  | 'valid'
  | 'expiring_soon'
  | 'expired'
  | 'invalid'
  | 'malformed'
  | 'inactive'
  | 'unknown';

interface TokenStatusPanelProps {
  connection: SocialConnection;
  platform: 'instagram' | 'facebook';
  onChecked?: () => void;
}

const PLATFORM_LABEL: Record<TokenStatusPanelProps['platform'], string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
};

const STATUS_STYLES: Record<
  Status,
  { label: string; tone: string; dot: string; icon: React.ReactNode }
> = {
  valid: {
    label: 'Token hợp lệ',
    tone: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  expiring_soon: {
    label: 'Sắp hết hạn',
    tone: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  expired: {
    label: 'Token đã hết hạn',
    tone: 'text-destructive',
    dot: 'bg-destructive',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  invalid: {
    label: 'Token không hợp lệ',
    tone: 'text-destructive',
    dot: 'bg-destructive',
    icon: <ShieldAlert className="h-3.5 w-3.5" />,
  },
  malformed: {
    label: 'Token sai định dạng',
    tone: 'text-destructive',
    dot: 'bg-destructive',
    icon: <ShieldAlert className="h-3.5 w-3.5" />,
  },
  inactive: {
    label: 'Kết nối không hoạt động',
    tone: 'text-muted-foreground',
    dot: 'bg-muted-foreground',
    icon: <Unplug className="h-3.5 w-3.5" />,
  },
  unknown: {
    label: 'Chưa kiểm tra',
    tone: 'text-muted-foreground',
    dot: 'bg-muted-foreground/60',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
};

function classifyStatus(connection: SocialConnection): {
  status: Status;
  lastCheckedAt: string | null;
  lastError: string | null;
  expiresAt: string | null;
} {
  const meta = ((connection as any).metadata ?? {}) as Record<string, any>;
  const lastCheckedAt: string | null =
    connection.last_verified_at ?? meta.last_test ?? null;
  const lastError: string | null =
    connection.last_error ?? meta.error ?? meta.refresh_error ?? null;
  const expiresAt = connection.token_expires_at;

  // 1. Explicit error signals win over expiry math.
  const errKind = classifyOAuthError(lastError);
  const testResult: string | undefined = meta.test_result;

  if (
    testResult === 'malformed' ||
    errKind === 'malformed'
  ) {
    return { status: 'malformed', lastCheckedAt, lastError, expiresAt };
  }
  if (
    testResult === 'invalid_token' ||
    errKind === 'invalid_token' ||
    errKind === 'unauthorized'
  ) {
    return { status: 'invalid', lastCheckedAt, lastError, expiresAt };
  }

  // 2. Hard expiry from DB.
  if (expiresAt) {
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (Number.isFinite(ms)) {
      if (ms <= 0 || errKind === 'expired') {
        return { status: 'expired', lastCheckedAt, lastError, expiresAt };
      }
      if (ms < 7 * 24 * 60 * 60 * 1000) {
        return { status: 'expiring_soon', lastCheckedAt, lastError, expiresAt };
      }
    }
  } else if (errKind === 'expired') {
    return { status: 'expired', lastCheckedAt, lastError, expiresAt };
  }

  // 3. Inactive flag last (so we don't hide a more specific reason).
  if (!connection.is_active || errKind === 'inactive' || meta.needs_reauth) {
    return { status: 'inactive', lastCheckedAt, lastError, expiresAt };
  }

  // 4. Never checked.
  if (!lastCheckedAt) {
    return { status: 'unknown', lastCheckedAt, lastError, expiresAt };
  }

  return { status: 'valid', lastCheckedAt, lastError, expiresAt };
}

export function TokenStatusPanel({ connection, platform, onChecked }: TokenStatusPanelProps) {
  const [checking, setChecking] = useState(false);
  const info = useMemo(() => classifyStatus(connection), [connection]);
  const style = STATUS_STYLES[info.status];

  const needsReconnect =
    info.status === 'expired' ||
    info.status === 'invalid' ||
    info.status === 'malformed' ||
    info.status === 'inactive';

  const expiresInLabel = (() => {
    if (!info.expiresAt) return null;
    const ms = new Date(info.expiresAt).getTime() - Date.now();
    if (!Number.isFinite(ms)) return null;
    if (ms <= 0) return 'đã hết hạn';
    return `hết hạn ${formatDistanceToNow(new Date(info.expiresAt), { addSuffix: true, locale: vi })}`;
  })();

  const lastCheckedRel = info.lastCheckedAt
    ? formatDistanceToNow(new Date(info.lastCheckedAt), { addSuffix: true, locale: vi })
    : null;
  const lastCheckedFull = info.lastCheckedAt
    ? format(new Date(info.lastCheckedAt), "HH:mm 'ngày' dd/MM/yyyy")
    : null;

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-diagnostics', {
        body: { action: 'test-connection', platform, connectionId: connection.id },
      });

      let body: any = data;
      if (error) {
        try {
          const ctx = (error as any)?.context;
          if (ctx && typeof ctx.json === 'function') body = await ctx.json();
          else if (typeof error.message === 'string') body = JSON.parse(error.message);
        } catch {
          /* ignore */
        }
      }

      if (body?.transient) {
        toast.warning(`${PLATFORM_LABEL[platform]} đang gặp sự cố tạm thời`, {
          description: body?.hint || 'Token vẫn hợp lệ. Vui lòng thử lại sau.',
        });
        return;
      }

      if (error || !body?.success) {
        const msg = body?.error || error?.message || 'Không thể xác minh kết nối';
        const desc = body?.hint ? `${msg}\n${body.hint}` : msg;
        toast.error('Xác minh thất bại', { description: desc });
        if (classifyOAuthError(msg) !== 'unknown') {
          emitReconnectNeeded({
            platform,
            platformLabel: PLATFORM_LABEL[platform],
            message: msg,
          });
        }
        return;
      }

      toast.success(body?.limited ? 'Token hợp lệ (giới hạn)' : 'Token hợp lệ', {
        description: body?.hint || `Kết nối ${PLATFORM_LABEL[platform]} đang hoạt động.`,
      });
    } catch (e: any) {
      toast.error('Xác minh thất bại', { description: e?.message ?? String(e) });
    } finally {
      setChecking(false);
      onChecked?.();
    }
  };

  const handleReconnect = () => {
    emitReconnectNeeded({
      platform,
      platformLabel: PLATFORM_LABEL[platform],
      message: info.lastError ?? style.label,
    });
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className={cn('flex items-center gap-2 text-sm font-medium', style.tone)}>
          <span className={cn('h-2 w-2 rounded-full', style.dot)} aria-hidden />
          {style.icon}
          <span>{style.label}</span>
          {expiresInLabel && info.status !== 'unknown' && (
            <span className="text-xs font-normal text-muted-foreground">· {expiresInLabel}</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default">
                {lastCheckedRel
                  ? `Kiểm tra lần cuối ${lastCheckedRel}`
                  : 'Chưa kiểm tra lần nào'}
              </span>
            </TooltipTrigger>
            {lastCheckedFull && <TooltipContent>{lastCheckedFull}</TooltipContent>}
          </Tooltip>
        </TooltipProvider>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleCheckNow}
            disabled={checking}
          >
            {checking ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Kiểm tra ngay
          </Button>
          {needsReconnect && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleReconnect}
            >
              Kết nối lại
            </Button>
          )}
        </div>
      </div>

      {info.lastError && info.status !== 'valid' && info.status !== 'unknown' && (
        <p className="text-xs text-destructive/80 line-clamp-2" title={info.lastError}>
          {info.lastError}
        </p>
      )}
    </div>
  );
}
