import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChannelIcon } from '@/components/ui/channel-icon';
import { ExternalLink, RefreshCw, Loader2, Eye, Bookmark, MousePointerClick, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  contentId: string;
  pinId: string | null | undefined;
  pinUrl: string | null | undefined;
  organizationId: string;
}

interface MetricRow {
  impressions: number;
  saves: number;
  link_clicks: number;
  video_views: number;
  snapshot_at: string;
}

/**
 * Inline card showing the latest Pinterest analytics snapshot for a published Pin.
 * Reads from social_post_metrics; user can trigger manual sync via sync-social-engagement.
 */
export function PinterestAnalyticsCard({ contentId, pinId, pinUrl, organizationId }: Props) {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<MetricRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function loadMetrics() {
    if (!pinId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('social_post_metrics')
      .select('impressions, saves, link_clicks, video_views, snapshot_at')
      .eq('platform', 'pinterest')
      .eq('post_id', pinId)
      .order('snapshot_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setMetrics((data as MetricRow | null) ?? null);
    setLoading(false);
  }

  async function syncNow() {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-social-engagement', {
        body: { organization_id: organizationId },
      });
      if (error) throw error;
      await loadMetrics();
      toast({ title: 'Đã đồng bộ analytics', description: 'Dữ liệu Pinterest mới nhất đã cập nhật.' });
    } catch (e: any) {
      toast({
        title: 'Đồng bộ thất bại',
        description: e?.message ?? 'Thử lại sau ít phút.',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinId, contentId]);

  if (!pinId) return null;

  const stats = [
    { icon: Eye, label: 'Impressions', value: metrics?.impressions ?? 0 },
    { icon: Bookmark, label: 'Saves', value: metrics?.saves ?? 0 },
    { icon: MousePointerClick, label: 'Clicks', value: metrics?.link_clicks ?? 0 },
    { icon: Play, label: 'Video views', value: metrics?.video_views ?? 0 },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ChannelIcon channel="pinterest" className="text-[#E60023]" size={18} />
          Pinterest analytics
        </CardTitle>
        <div className="flex items-center gap-1">
          {pinUrl && (
            <Button asChild variant="ghost" size="sm">
              <a href={pinUrl} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> Xem Pin
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={syncNow} disabled={syncing}>
            {syncing ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
            )}
            Sync
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải số liệu…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-md border bg-background p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </div>
                  <div className="mt-1 text-xl font-semibold tabular-nums">
                    {value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            {metrics?.snapshot_at && (
              <p className="mt-3 text-[11px] text-muted-foreground">
                Cập nhật lần cuối: {new Date(metrics.snapshot_at).toLocaleString()}
              </p>
            )}
            {!metrics && (
              <p className="mt-3 text-xs text-muted-foreground">
                Chưa có dữ liệu — bấm <strong>Sync</strong> để gọi Pinterest Analytics.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
