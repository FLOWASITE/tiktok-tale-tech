import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Carousel } from '@/types/carousel';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Layers,
  ChevronDown,
  ChevronUp,
  Palette,
  Facebook,
  Video,
} from 'lucide-react';
import { format, subDays, isAfter } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface CarouselStatsProps {
  carousels: Carousel[];
  loading?: boolean;
}

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  tiktok: 'TikTok',
};

const AI_TOOL_LABELS: Record<string, string> = {
  ideogram: 'Ideogram',
  midjourney: 'Midjourney',
  dalle: 'DALL-E',
  leonardo: 'Leonardo',
};

export function CarouselStats({ carousels, loading }: CarouselStatsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const stats = useMemo(() => {
    const now = new Date();
    const last7Days = subDays(now, 7);
    const last30Days = subDays(now, 30);

    // Content by day (last 7 days)
    const contentByDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const day = subDays(now, i);
      const dayKey = format(day, 'dd/MM', { locale: vi });
      contentByDay[dayKey] = 0;
    }

    carousels.forEach(carousel => {
      const createdAt = new Date(carousel.created_at);
      if (isAfter(createdAt, last7Days)) {
        const dayKey = format(createdAt, 'dd/MM', { locale: vi });
        if (contentByDay[dayKey] !== undefined) {
          contentByDay[dayKey]++;
        }
      }
    });

    const dailyData = Object.entries(contentByDay).map(([day, count]) => ({
      day,
      count,
    }));

    // Platform distribution
    const platformCounts: Record<string, number> = {};
    carousels.forEach((c) => {
      platformCounts[c.platform] = (platformCounts[c.platform] || 0) + 1;
    });
    const platformData = Object.entries(platformCounts)
      .map(([platform, count]) => ({
        platform,
        label: PLATFORM_LABELS[platform] || platform,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // AI Tool distribution
    const aiToolCounts: Record<string, number> = {};
    carousels.forEach((c) => {
      aiToolCounts[c.ai_tool] = (aiToolCounts[c.ai_tool] || 0) + 1;
    });
    const aiToolData = Object.entries(aiToolCounts)
      .map(([tool, count]) => ({
        tool,
        label: AI_TOOL_LABELS[tool] || tool,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Slide count distribution
    const slideCountCounts: Record<number, number> = {};
    carousels.forEach((c) => {
      slideCountCounts[c.slide_count] = (slideCountCounts[c.slide_count] || 0) + 1;
    });
    const slideCountData = Object.entries(slideCountCounts)
      .map(([slides, count]) => ({
        slides: Number(slides),
        label: `${slides} slides`,
        count: count as number,
      }))
      .sort((a, b) => b.count - a.count);

    const carouselsLast7Days = carousels.filter(
      (c) => isAfter(new Date(c.created_at), last7Days)
    ).length;

    const carouselsLast30Days = carousels.filter(
      (c) => isAfter(new Date(c.created_at), last30Days)
    ).length;

    const topPlatform = platformData[0];

    return {
      total: carousels.length,
      last7Days: carouselsLast7Days,
      last30Days: carouselsLast30Days,
      topPlatform: topPlatform ? { platform: topPlatform.platform, count: topPlatform.count } : null,
      dailyData,
      platformData,
      aiToolData,
      slideCountData,
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

  return (
    <div className="space-y-2">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="p-2.5 gradient-card border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-primary/10">
              <BarChart3 className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-none">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Tổng carousel</p>
            </div>
          </div>
        </Card>

        <Card className="p-2.5 gradient-card border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-green-500/10">
              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-none text-green-500">{stats.last7Days}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">7 ngày qua</p>
            </div>
          </div>
        </Card>

        <Card className="p-2.5 gradient-card border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-blue-500/10">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-none text-blue-500">{stats.last30Days}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">30 ngày qua</p>
            </div>
          </div>
        </Card>

        <Card className="p-2.5 gradient-card border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-violet-500/10">
              <Layers className="w-3.5 h-3.5 text-violet-500" />
            </div>
            <div className="min-w-0">
              {stats.topPlatform ? (
                <>
                  <p className="text-lg font-bold leading-none text-violet-500">{stats.topPlatform.count}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {PLATFORM_LABELS[stats.topPlatform.platform] || stats.topPlatform.platform}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold leading-none text-violet-500">-</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Nền tảng phổ biến</p>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Expand/Collapse Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-6 px-2 text-xs w-full"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-3 h-3 mr-1" />
            Ẩn chi tiết
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3 mr-1" />
            Xem chi tiết
          </>
        )}
      </Button>

      {/* Expanded Stats */}
      {isExpanded && (
        <Card className="border-border/50">
          <CardContent className="p-3 space-y-3">
            {/* Daily Chart */}
            <div className="space-y-1">
              <h4 className="text-xs font-medium flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                7 ngày qua
              </h4>
              <div className="h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.dailyData}>
                    <XAxis 
                      dataKey="day" 
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={20}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: '11px',
                      }}
                      formatter={(value) => [`${value} carousel`, '']}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="hsl(var(--primary))" 
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Platform & AI Tool */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <h4 className="text-xs font-medium flex items-center gap-1.5">
                  <Facebook className="w-3 h-3" />
                  Nền tảng
                </h4>
                <div className="space-y-0.5">
                  {stats.platformData.map((item) => (
                    <div key={item.platform} className="flex items-center gap-1.5 text-xs">
                      <span className="flex-1 truncate text-muted-foreground">{item.label}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-medium flex items-center gap-1.5">
                  <Palette className="w-3 h-3" />
                  AI Tool
                </h4>
                <div className="flex flex-wrap gap-1">
                  {stats.aiToolData.slice(0, 3).map((item) => (
                    <Badge key={item.tool} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                      {item.label}: {item.count}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Slide Count Distribution */}
            {stats.slideCountData.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-medium flex items-center gap-1.5">
                  <Video className="w-3 h-3" />
                  Số slides
                </h4>
                <div className="flex flex-wrap gap-1">
                  {stats.slideCountData.map((item) => (
                    <Badge key={item.slides} variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                      {item.label}: {item.count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
