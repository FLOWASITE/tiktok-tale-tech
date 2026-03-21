import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  FileText, 
  Hash, 
  Calendar,
  ChevronDown,
  ChevronUp,
  Globe,
  Facebook,
  Instagram,
  MapPin,
  Linkedin,
  Mail,
  Youtube,
  Send,
  Music2,
  AtSign,
} from 'lucide-react';
import { ZaloIcon, XIcon } from '@/components/icons/SocialIcons';
import { MultiChannelContent, Channel, CONTENT_GOALS, CHANNELS } from '@/types/multichannel';
import { format, subDays, startOfDay, isAfter } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface MultiChannelStatsProps {
  contents: MultiChannelContent[];
}

const channelIcons: Record<Channel, React.ReactNode> = {
  website: <Globe className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  google_maps: <MapPin className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
  zalo_oa: <MessageCircle className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
  tiktok: <Music2 className="w-4 h-4" />,
  threads: <AtSign className="w-4 h-4" />,
};

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function MultiChannelStats({ contents }: MultiChannelStatsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate statistics
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

    contents.forEach(content => {
      const createdAt = new Date(content.created_at);
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

    // Channel popularity
    const channelCounts: Record<Channel, number> = {} as Record<Channel, number>;
    CHANNELS.forEach(ch => {
      channelCounts[ch.value] = 0;
    });
    
    contents.forEach(content => {
      (content?.selected_channels ?? []).forEach(channel => {
        channelCounts[channel]++;
      });
    });

    const channelData = Object.entries(channelCounts)
      .map(([channel, count]) => ({
        channel: channel as Channel,
        label: CHANNELS.find(c => c.value === channel)?.label || channel,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Goal distribution
    const goalCounts: Record<string, number> = {};
    CONTENT_GOALS.forEach(goal => {
      goalCounts[goal.value] = 0;
    });
    
    contents.forEach(content => {
      if (goalCounts[content.content_goal] !== undefined) {
        goalCounts[content.content_goal]++;
      }
    });

    const goalData = Object.entries(goalCounts)
      .map(([goal, count]) => ({
        goal,
        label: CONTENT_GOALS.find(g => g.value === goal)?.label || goal,
        count,
      }))
      .filter(g => g.count > 0);

    // Status distribution
    const statusCounts = {
      draft: 0,
      review: 0,
      approved: 0,
      published: 0,
    };
    
    contents.forEach(content => {
      if (statusCounts[content.status] !== undefined) {
        statusCounts[content.status]++;
      }
    });

    // Recent stats
    const last7DaysCount = contents.filter(c => 
      isAfter(new Date(c.created_at), last7Days)
    ).length;

    const last30DaysCount = contents.filter(c => 
      isAfter(new Date(c.created_at), last30Days)
    ).length;

    return {
      total: contents.length,
      last7Days: last7DaysCount,
      last30Days: last30DaysCount,
      dailyData,
      channelData,
      goalData,
      statusCounts,
      topChannel: channelData[0],
    };
  }, [contents]);

  if (contents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Summary Cards - 4 cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-primary/10">
              <BarChart3 className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-none">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Tổng nội dung</p>
            </div>
          </div>
        </Card>

        <Card className="p-2.5">
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

        <Card className="p-2.5">
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

        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            {stats.topChannel ? (
              <>
                <div className="p-1.5 rounded-full bg-violet-500/10">
                  <span className="text-violet-500">{channelIcons[stats.topChannel.channel]}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none text-violet-500">{stats.topChannel.count}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">Kênh phổ biến</p>
                </div>
              </>
            ) : (
              <>
                <div className="p-1.5 rounded-full bg-muted">
                  <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none">0</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Kênh phổ biến</p>
                </div>
              </>
            )}
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
                      formatter={(value) => [`${value} bài`, '']}
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

            {/* Channel & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <h4 className="text-xs font-medium">Top kênh</h4>
                <div className="space-y-0.5">
                  {stats.channelData.slice(0, 3).map((item) => (
                    <div key={item.channel} className="flex items-center gap-1.5 text-xs">
                      <span className="text-primary">{channelIcons[item.channel]}</span>
                      <span className="flex-1 truncate text-muted-foreground">{item.label}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-medium">Trạng thái</h4>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-gray-500/10">
                    Nháp: {stats.statusCounts.draft}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-green-500/10 text-green-500">
                    Đã đăng: {stats.statusCounts.published}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
