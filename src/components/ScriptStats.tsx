import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Script } from '@/types/script';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Clock,
  ChevronDown,
  ChevronUp,
  Video,
  User,
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

interface ScriptStatsProps {
  scripts: Script[];
  loading?: boolean;
}

const VIDEO_TYPE_LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  'youtube-shorts': 'YouTube Shorts',
  reels: 'Reels',
  long: 'Video dài',
};

const CHARACTER_TYPE_LABELS: Record<string, string> = {
  single: 'Một người',
  dialogue: 'Đối thoại',
  narrator: 'Người dẫn',
};

const DURATION_LABELS: Record<number, string> = {
  30: '30 giây',
  60: '1 phút',
  90: '1.5 phút',
  180: '3 phút',
  300: '5 phút',
};

export function ScriptStats({ scripts, loading }: ScriptStatsProps) {
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

    scripts.forEach(script => {
      const createdAt = new Date(script.created_at);
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

    // Video type distribution
    const videoTypeCounts: Record<string, number> = {};
    scripts.forEach((s) => {
      videoTypeCounts[s.video_type] = (videoTypeCounts[s.video_type] || 0) + 1;
    });
    const videoTypeData = Object.entries(videoTypeCounts)
      .map(([type, count]) => ({
        type,
        label: VIDEO_TYPE_LABELS[type] || type,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Character type distribution
    const characterTypeCounts: Record<string, number> = {};
    scripts.forEach((s) => {
      characterTypeCounts[s.character_type] = (characterTypeCounts[s.character_type] || 0) + 1;
    });
    const characterTypeData = Object.entries(characterTypeCounts)
      .map(([type, count]) => ({
        type,
        label: CHARACTER_TYPE_LABELS[type] || type,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Duration distribution
    const durationCounts: Record<number, number> = {};
    scripts.forEach((s) => {
      durationCounts[s.duration] = (durationCounts[s.duration] || 0) + 1;
    });
    const durationData = Object.entries(durationCounts)
      .map(([duration, count]) => ({
        duration: Number(duration),
        label: DURATION_LABELS[Number(duration)] || `${duration}s`,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const scriptsLast7Days = scripts.filter(
      (s) => isAfter(new Date(s.created_at), last7Days)
    ).length;

    const scriptsLast30Days = scripts.filter(
      (s) => isAfter(new Date(s.created_at), last30Days)
    ).length;

    const topVideoType = videoTypeData[0];

    return {
      total: scripts.length,
      last7Days: scriptsLast7Days,
      last30Days: scriptsLast30Days,
      topVideoType: topVideoType ? { type: topVideoType.type, count: topVideoType.count } : null,
      dailyData,
      videoTypeData,
      characterTypeData,
      durationData,
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
              <p className="text-[10px] text-muted-foreground mt-0.5">Tổng kịch bản</p>
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
              <Clock className="w-3.5 h-3.5 text-violet-500" />
            </div>
            <div className="min-w-0">
              {stats.topVideoType ? (
                <>
                  <p className="text-lg font-bold leading-none text-violet-500">{stats.topVideoType.count}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {VIDEO_TYPE_LABELS[stats.topVideoType.type] || stats.topVideoType.type}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold leading-none text-violet-500">-</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Loại phổ biến</p>
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
                      formatter={(value) => [`${value} kịch bản`, '']}
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

            {/* Video Type & Character Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <h4 className="text-xs font-medium flex items-center gap-1.5">
                  <Video className="w-3 h-3" />
                  Loại video
                </h4>
                <div className="space-y-0.5">
                  {stats.videoTypeData.slice(0, 3).map((item) => (
                    <div key={item.type} className="flex items-center gap-1.5 text-xs">
                      <span className="flex-1 truncate text-muted-foreground">{item.label}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-medium flex items-center gap-1.5">
                  <User className="w-3 h-3" />
                  Nhân vật
                </h4>
                <div className="flex flex-wrap gap-1">
                  {stats.characterTypeData.slice(0, 3).map((item) => (
                    <Badge key={item.type} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                      {item.label}: {item.count}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Duration Distribution */}
            {stats.durationData.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-medium flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Thời lượng
                </h4>
                <div className="flex flex-wrap gap-1">
                  {stats.durationData.map((item) => (
                    <Badge key={item.duration} variant="outline" className="text-[10px] px-1.5 py-0 h-5">
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
