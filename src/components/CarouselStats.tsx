import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Carousel } from '@/types/carousel';
import { BarChart3, TrendingUp, Calendar, Layers } from 'lucide-react';

interface CarouselStatsProps {
  carousels: Carousel[];
  loading?: boolean;
}

export function CarouselStats({ carousels, loading }: CarouselStatsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const carouselsLast7Days = carousels.filter(
      (c) => new Date(c.created_at) >= last7Days
    ).length;

    const carouselsLast30Days = carousels.filter(
      (c) => new Date(c.created_at) >= last30Days
    ).length;

    // Most popular platform
    const platformCounts: Record<string, number> = {};
    carousels.forEach((c) => {
      platformCounts[c.platform] = (platformCounts[c.platform] || 0) + 1;
    });
    const topPlatform = Object.entries(platformCounts).sort(
      (a, b) => b[1] - a[1]
    )[0];

    return {
      total: carousels.length,
      last7Days: carouselsLast7Days,
      last30Days: carouselsLast30Days,
      topPlatform: topPlatform ? { platform: topPlatform[0], count: topPlatform[1] } : null,
    };
  }, [carousels]);

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

  if (carousels.length === 0) return null;

  const platformLabels: Record<string, string> = {
    facebook: 'Facebook',
    tiktok: 'TikTok',
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <Card className="p-3 flex items-center gap-2 gradient-card border-border/50">
        <div className="p-1.5 rounded-full bg-primary/10">
          <BarChart3 className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground truncate">Tổng carousel</p>
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
          <Layers className="w-4 h-4 text-violet-500" />
        </div>
        <div className="min-w-0">
          {stats.topPlatform ? (
            <>
              <p className="text-lg font-bold text-violet-500">{stats.topPlatform.count}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {platformLabels[stats.topPlatform.platform] || stats.topPlatform.platform}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-violet-500">-</p>
              <p className="text-[10px] text-muted-foreground truncate">Nền tảng phổ biến</p>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
