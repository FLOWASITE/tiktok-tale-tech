import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plug, RefreshCw, ExternalLink, CheckCircle2, AlertTriangle, MinusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { CHANNEL_EMOJI, CHANNEL_LABEL, Loading, openExternal, relativeTime } from './shared';

type Props = {
  orgId: string;
  brandId: string | null;
};

type Connection = {
  id: string;
  platform: string;
  platform_username: string | null;
  platform_display_name: string | null;
  is_active: boolean;
  token_expires_at: string | null;
  last_verified_at: string | null;
  last_error: string | null;
  connected_at: string;
};

const PLATFORMS = ['facebook', 'instagram', 'linkedin', 'threads', 'twitter', 'tiktok', 'zalo_oa', 'google_maps', 'website'];

const REFRESH_FN: Record<string, string> = {
  facebook: 'refresh-facebook-token',
  instagram: 'refresh-instagram-token',
  linkedin: 'refresh-linkedin-token',
  threads: 'refresh-threads-token',
  twitter: 'refresh-x-token',
  tiktok: 'refresh-tiktok-token',
  zalo_oa: 'refresh-zalo-token',
  google_maps: 'refresh-google-business-token',
};

type Status = 'connected' | 'expired' | 'disconnected';

function getStatus(c?: Connection): Status {
  if (!c || !c.is_active) return 'disconnected';
  if (c.token_expires_at && new Date(c.token_expires_at).getTime() < Date.now()) return 'expired';
  if (c.last_error) return 'expired';
  return 'connected';
}

export function ConnectionsTab({ orgId, brandId }: Props) {
  const [conns, setConns] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      let q = sb.from('social_connections')
        .select('id, platform, platform_username, platform_display_name, is_active, token_expires_at, last_verified_at, last_error, connected_at')
        .eq('organization_id', orgId);
      if (brandId) q = q.eq('brand_template_id', brandId);
      const { data } = await q;
      setConns((data ?? []) as Connection[]);
    } catch (e) {
      console.error('[connections-tab] load failed', e);
    } finally {
      setLoading(false);
    }
  }, [orgId, brandId]);

  useEffect(() => { void load(); }, [load]);

  async function refresh(platform: string, connectionId: string) {
    const fn = REFRESH_FN[platform];
    if (!fn) {
      toast.info('Kênh này phải kết nối lại trên web');
      return;
    }
    setBusyKey(connectionId);
    try {
      const { data, error } = await supabase.functions.invoke(fn, {
        body: { connection_id: connectionId, organization_id: orgId },
      });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resp: any = data;
      if (resp?.error) throw new Error(resp.error);
      toast.success('Đã làm mới token');
      void load();
    } catch (e) {
      toast.error('Refresh thất bại: ' + (e instanceof Error ? e.message : 'Lỗi'));
    } finally {
      setBusyKey(null);
    }
  }

  function reconnect(platform: string) {
    const url = `https://app.flowa.one/connections?platform=${platform}${brandId ? `&brand=${brandId}` : ''}`;
    openExternal(url);
  }

  if (loading) return <Loading />;

  // Build map: platform → list of connections (a brand can have multi facebook pages, etc.)
  const byPlatform = new Map<string, Connection[]>();
  for (const c of conns) {
    const arr = byPlatform.get(c.platform) ?? [];
    arr.push(c);
    byPlatform.set(c.platform, arr);
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Kết nối nền tảng</h2>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => void load()}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Làm mới
        </Button>
      </div>

      {PLATFORMS.map((p) => {
        const list = byPlatform.get(p) ?? [];
        if (list.length === 0) {
          return (
            <Card key={p} className="opacity-70">
              <CardContent className="pt-3 pb-3 flex items-center gap-3">
                <div className="text-xl shrink-0">{CHANNEL_EMOJI[p] ?? '🔌'}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{CHANNEL_LABEL[p] ?? p}</div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MinusCircle className="w-3 h-3" /> Chưa kết nối
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => reconnect(p)}>
                  <Plug className="w-3.5 h-3.5 mr-1" /> Kết nối
                </Button>
              </CardContent>
            </Card>
          );
        }
        return list.map((c) => {
          const status = getStatus(c);
          return (
            <Card key={c.id} className={status === 'expired' ? 'border-amber-500/50' : ''}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start gap-3">
                  <div className="text-xl shrink-0 mt-0.5">{CHANNEL_EMOJI[p] ?? '🔌'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{CHANNEL_LABEL[p] ?? p}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.platform_display_name || c.platform_username || '—'}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {status === 'connected' && (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Đã xác thực
                        </Badge>
                      )}
                      {status === 'expired' && (
                        <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Hết hạn
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {c.last_verified_at ? `Kiểm tra: ${relativeTime(c.last_verified_at)}` : `Kết nối: ${relativeTime(c.connected_at)}`}
                      </span>
                    </div>
                    {c.last_error && (
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 line-clamp-2">{c.last_error}</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {REFRESH_FN[p] && status === 'expired' && (
                    <Button
                      size="sm" variant="outline" className="flex-1"
                      disabled={busyKey === c.id}
                      onClick={() => void refresh(p, c.id)}
                    >
                      {busyKey === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                      Refresh
                    </Button>
                  )}
                  <Button
                    size="sm" variant={status === 'expired' ? 'default' : 'outline'} className="flex-1"
                    onClick={() => reconnect(p)}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> {status === 'expired' ? 'Kết nối lại' : 'Quản lý'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        });
      })}
    </div>
  );
}

// Helper used by header banner to show count of expired connections.
export async function countExpiredConnections(orgId: string, brandId: string | null): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  let q = sb.from('social_connections')
    .select('token_expires_at, last_error, is_active')
    .eq('organization_id', orgId)
    .eq('is_active', true);
  if (brandId) q = q.eq('brand_template_id', brandId);
  const { data } = await q;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).filter((c: any) => {
    if (c.last_error) return true;
    if (c.token_expires_at && new Date(c.token_expires_at).getTime() < Date.now()) return true;
    return false;
  }).length;
}
