import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Script } from '@/types/script';
import { BarChart3, TrendingUp, Calendar, Clock } from 'lucide-react';

interface ScriptStatsProps {
  scripts: Script[];
  loading?: boolean;
}

export function ScriptStats({ scripts, loading }: ScriptStatsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const scriptsLast7Days = scripts.filter(
      (s) => new Date(s.created_at) >= last7Days
    ).length;

    const scriptsLast30Days = scripts.filter(
      (s) => new Date(s.created_at) >= last30Days
    ).length;

    // Most popular video type
    const videoTypeCounts: Record<string, number> = {};
    scripts.forEach((s) => {
      videoTypeCounts[s.video_type] = (videoTypeCounts[s.video_type] || 0) + 1;
    });
    const topVideoType = Object.entries(videoTypeCounts).sort(
      (a, b) => b[1] - a[1]
    )[0];

    return {
      total: scripts.length,
      last7Days: scriptsLast7Days,
      last30Days: scriptsLast30Days,
      topVideoType: topVideoType ? { type: topVideoType[0], count: topVideoType[1] } : null,
    };
  }, [scripts]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-3">
            <Skeleton className="h-8 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (scripts.length === 0) return null;

  const videoTypeLabels: Record<string, string> = {
    tiktok: 'TikTok',
    'youtube-shorts': 'YouTube Shorts',
    reels: 'Reels',
    long: 'Video dài',
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <Card className="p-3 flex items-center gap-2 gradient-card border-border/50">
        <div className="p-1.5 rounded-full bg-primary/10">
          <BarChart3 className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground truncate">Tổng kịch bản</p>
        </div>
      </Card>

      <Card className="p-3 flex items-center gap-2 gradient-card border-border/50">
        <div className="p-1.5 rounded-full bg-green-500/10">
          <TrendingUp className="w-4 h-4 text-green-500" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-green-500">{stats.last7Days}</p>
          <p className="text-[10px] text-muted-foreground truncate">7 ngày qua</p>
        </div>
      </Card>

      <Card className="p-3 flex items-center gap-2 gradient-card border-border/50">
        <div className="p-1.5 rounded-full bg-blue-500/10">
          <Calendar className="w-4 h-4 text-blue-500" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-blue-500">{stats.last30Days}</p>
          <p className="text-[10px] text-muted-foreground truncate">30 ngày qua</p>
        </div>
      </Card>

      <Card className="p-3 flex items-center gap-2 gradient-card border-border/50">
        <div className="p-1.5 rounded-full bg-violet-500/10">
          <Clock className="w-4 h-4 text-violet-500" />
        </div>
        <div className="min-w-0">
          {stats.topVideoType ? (
            <>
              <p className="text-lg font-bold text-violet-500">{stats.topVideoType.count}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {videoTypeLabels[stats.topVideoType.type] || stats.topVideoType.type}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-violet-500">-</p>
              <p className="text-[10px] text-muted-foreground truncate">Loại phổ biến</p>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
