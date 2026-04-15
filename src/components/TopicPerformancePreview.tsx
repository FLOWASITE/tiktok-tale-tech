import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Hash, Layers, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceData {
  usageCount: number;
  avgScore: number | null;
  channels: string[];
}

const CHANNEL_LABELS: Record<string, string> = {
  website: 'Web',
  facebook: 'FB',
  instagram: 'IG',
  twitter: 'X',
  linkedin: 'LI',
  youtube: 'YT',
  tiktok: 'TT',
  zalo_oa: 'Zalo',
  telegram: 'TG',
  threads: 'Threads',
  email: 'Email',
  google_maps: 'GMaps',
};

export function TopicPerformancePreview({ topicHistoryId }: { topicHistoryId: string }) {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      try {
        // Get linked contents
        const { data: links } = await supabase
          .from('topic_content_links')
          .select('content_id, content_type')
          .eq('topic_history_id', topicHistoryId);

        if (cancelled) return;

        if (!links || links.length === 0) {
          setData({ usageCount: 0, avgScore: null, channels: [] });
          setLoading(false);
          return;
        }

        const mcIds = links
          .filter(l => l.content_type === 'multichannel')
          .map(l => l.content_id);

        let avgScore: number | null = null;
        const allChannels = new Set<string>();

        if (mcIds.length > 0) {
          const { data: contents } = await supabase
            .from('multi_channel_contents')
            .select('critique_score, selected_channels')
            .in('id', mcIds);

          if (!cancelled && contents) {
            const scores = contents
              .map(c => c.critique_score)
              .filter((s): s is number => s !== null);
            avgScore = scores.length > 0
              ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
              : null;

            contents.forEach(c => {
              if (c.selected_channels) {
                (c.selected_channels as string[]).forEach(ch => allChannels.add(ch));
              }
            });
          }
        }

        if (!cancelled) {
          setData({
            usageCount: links.length,
            avgScore,
            channels: Array.from(allChannels),
          });
        }
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [topicHistoryId]);

  if (loading) {
    return (
      <div className="text-[10px] text-muted-foreground/60 animate-pulse py-1">
        Đang tải hiệu suất...
      </div>
    );
  }

  if (!data || data.usageCount === 0) {
    return (
      <div className="text-[10px] text-muted-foreground/50 italic py-1">
        Chưa có dữ liệu hiệu suất
      </div>
    );
  }

  const scoreColor = data.avgScore
    ? data.avgScore >= 75
      ? 'text-emerald-600 dark:text-emerald-400'
      : data.avgScore >= 50
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-500'
    : 'text-muted-foreground';

  const scoreBarWidth = data.avgScore ? Math.min(100, data.avgScore) : 0;
  const scoreBarColor = data.avgScore
    ? data.avgScore >= 75
      ? 'bg-emerald-500/60'
      : data.avgScore >= 50
        ? 'bg-amber-500/60'
        : 'bg-red-500/60'
    : 'bg-muted';

  return (
    <div className="space-y-1.5 border-t border-border/40 pt-2 mt-1">
      <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
        <BarChart3 className="w-3 h-3" />
        Hiệu suất
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
        {/* Usage count */}
        <div className="flex items-center gap-1">
          <Hash className="w-2.5 h-2.5 text-muted-foreground" />
          <span className="text-muted-foreground">Đã dùng</span>
        </div>
        <span className="font-semibold">{data.usageCount} lần</span>

        {/* Avg score */}
        <div className="flex items-center gap-1">
          <TrendingUp className="w-2.5 h-2.5 text-muted-foreground" />
          <span className="text-muted-foreground">Chất lượng TB</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn('font-semibold', scoreColor)}>
            {data.avgScore !== null ? `${data.avgScore}/100` : '—'}
          </span>
        </div>
      </div>

      {/* Score bar */}
      {data.avgScore !== null && (
        <div className="h-1 w-full rounded-full bg-muted/60 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', scoreBarColor)}
            style={{ width: `${scoreBarWidth}%` }}
          />
        </div>
      )}

      {/* Channels used */}
      {data.channels.length > 0 && (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Layers className="w-2.5 h-2.5" />
            Kênh đã dùng
          </div>
          <div className="flex flex-wrap gap-1">
            {data.channels.map(ch => (
              <span
                key={ch}
                className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium"
              >
                {CHANNEL_LABELS[ch] || ch}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
