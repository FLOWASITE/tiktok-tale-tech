import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from 'recharts';
import { PlatformBreakdown } from '@/hooks/useAdCopyAnalytics';

interface PlatformComparisonChartProps {
  data: PlatformBreakdown[];
  isLoading?: boolean;
}

const PLATFORM_LABELS: Record<string, string> = {
  facebook_feed: 'FB Feed',
  facebook_stories: 'FB Stories',
  instagram_feed: 'IG Feed',
  instagram_stories: 'IG Stories',
  instagram_reels: 'IG Reels',
  tiktok: 'TikTok',
  google_search: 'Google Search',
  google_display: 'Google Display',
  zalo: 'Zalo',
  youtube: 'YouTube',
  unknown: 'Khác',
};

const PLATFORM_COLORS: Record<string, string> = {
  facebook_feed: 'hsl(214, 89%, 52%)',
  facebook_stories: 'hsl(214, 70%, 60%)',
  instagram_feed: 'hsl(326, 78%, 55%)',
  instagram_stories: 'hsl(326, 60%, 65%)',
  instagram_reels: 'hsl(326, 90%, 45%)',
  tiktok: 'hsl(180, 50%, 50%)',
  google_search: 'hsl(45, 90%, 50%)',
  google_display: 'hsl(45, 70%, 60%)',
  zalo: 'hsl(200, 80%, 50%)',
  youtube: 'hsl(0, 80%, 55%)',
  unknown: 'hsl(var(--muted-foreground))',
};

const chartConfig = {
  spend: {
    label: 'Chi tiêu',
    color: 'hsl(var(--chart-1))',
  },
  roas: {
    label: 'ROAS',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export function PlatformComparisonChart({ data, isLoading }: PlatformComparisonChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>So sánh nền tảng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    platformLabel: PLATFORM_LABELS[d.platform] || d.platform,
    color: PLATFORM_COLORS[d.platform] || PLATFORM_COLORS.unknown,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>So sánh nền tảng</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Spend by Platform */}
          <div>
            <p className="text-sm text-muted-foreground mb-4">Chi tiêu theo nền tảng</p>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={formattedData} layout="vertical" margin={{ left: 80, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    value >= 1000000 ? `${(value / 1000000).toFixed(0)}M` : `${(value / 1000).toFixed(0)}K`
                  }
                />
                <YAxis
                  type="category"
                  dataKey="platformLabel"
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="spend" radius={[0, 4, 4, 0]}>
                  {formattedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>

          {/* ROAS by Platform */}
          <div>
            <p className="text-sm text-muted-foreground mb-4">ROAS theo nền tảng</p>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={formattedData} layout="vertical" margin={{ left: 80, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value.toFixed(1)}x`}
                />
                <YAxis
                  type="category"
                  dataKey="platformLabel"
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="roas" radius={[0, 4, 4, 0]}>
                  {formattedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        {/* Platform Stats Summary */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {formattedData.slice(0, 4).map((platform) => (
            <div
              key={platform.platform}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: platform.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{platform.platformLabel}</p>
                <p className="text-xs text-muted-foreground">
                  CTR: {platform.ctr.toFixed(2)}% • Conv: {platform.conversions}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
