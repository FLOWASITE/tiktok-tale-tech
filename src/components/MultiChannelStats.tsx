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
  Twitter,
  MapPin,
  Linkedin,
  Mail,
  Youtube,
  MessageCircle,
  Send,
} from 'lucide-react';
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
      content.selected_channels.forEach(channel => {
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
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Thống kê nội dung
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 px-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Thu gọn
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Xem thêm
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Tổng nội dung</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-500">{stats.last7Days}</div>
            <div className="text-xs text-muted-foreground">7 ngày qua</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-500">{stats.last30Days}</div>
            <div className="text-xs text-muted-foreground">30 ngày qua</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-lg font-bold">
              {stats.topChannel && (
                <>
                  <span className="text-primary">
                    {channelIcons[stats.topChannel.channel]}
                  </span>
                  <span className="text-sm">{stats.topChannel.count}</span>
                </>
              )}
            </div>
            <div className="text-xs text-muted-foreground">Kênh phổ biến</div>
          </div>
        </div>

        {/* Expanded Stats */}
        {isExpanded && (
          <div className="space-y-4 pt-2 animate-fade-in">
            {/* Daily Chart */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Nội dung theo ngày (7 ngày qua)
              </h4>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.dailyData}>
                    <XAxis 
                      dataKey="day" 
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value) => [`${value} bài`, 'Số lượng']}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Channel & Goal Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Channels */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Top 5 kênh phổ biến
                </h4>
                <div className="space-y-1.5">
                  {stats.channelData.map((item, idx) => (
                    <div key={item.channel} className="flex items-center gap-2">
                      <span className="text-muted-foreground w-4 text-xs">{idx + 1}.</span>
                      <span className="text-primary">{channelIcons[item.channel]}</span>
                      <span className="text-sm flex-1 truncate">{item.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {item.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Goals Distribution */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Phân bố mục tiêu
                </h4>
                {stats.goalData.length > 0 ? (
                  <div className="h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.goalData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={2}
                          dataKey="count"
                        >
                          {stats.goalData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={CHART_COLORS[index % CHART_COLORS.length]} 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          formatter={(value, name, props) => [
                            `${value} bài`,
                            props.payload.label
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {stats.goalData.map((item, idx) => (
                    <Badge 
                      key={item.goal} 
                      variant="outline" 
                      className="text-xs"
                      style={{ borderColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                    >
                      {item.label}: {item.count}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Trạng thái nội dung
              </h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-gray-500/10 text-gray-500">
                  Nháp: {stats.statusCounts.draft}
                </Badge>
                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">
                  Xem xét: {stats.statusCounts.review}
                </Badge>
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                  Đã duyệt: {stats.statusCounts.approved}
                </Badge>
                <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                  Đã đăng: {stats.statusCounts.published}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
