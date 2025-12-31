import { useMemo } from 'react';
import { useTopicHistory } from '@/hooks/useTopicHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown,
  Star, 
  BarChart3, 
  Target,
  ThumbsUp,
  Eye,
  MessageSquare,
  Share2,
  Calendar,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface TopicPerformanceDashboardProps {
  brandTemplateId?: string;
  className?: string;
}

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  muted: 'hsl(var(--muted))',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

function getScoreColor(score: number) {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-amber-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

function getScoreBgColor(score: number) {
  if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/30';
  if (score >= 60) return 'bg-amber-500/10 border-amber-500/30';
  if (score >= 40) return 'bg-orange-500/10 border-orange-500/30';
  return 'bg-red-500/10 border-red-500/30';
}

export function TopicPerformanceDashboard({ brandTemplateId, className }: TopicPerformanceDashboardProps) {
  const { history, topPerformers, stats, isLoading } = useTopicHistory({ 
    brandTemplateId,
    enabled: true 
  });

  // Calculate performance distribution
  const performanceDistribution = useMemo(() => {
    const withScores = history.filter(h => h.performanceScore !== null && h.performanceScore !== undefined);
    const excellent = withScores.filter(h => h.performanceScore! >= 80).length;
    const good = withScores.filter(h => h.performanceScore! >= 60 && h.performanceScore! < 80).length;
    const average = withScores.filter(h => h.performanceScore! >= 40 && h.performanceScore! < 60).length;
    const poor = withScores.filter(h => h.performanceScore! < 40).length;
    
    return [
      { name: 'Xuất sắc', value: excellent, color: CHART_COLORS.success },
      { name: 'Tốt', value: good, color: CHART_COLORS.warning },
      { name: 'Trung bình', value: average, color: '#f97316' },
      { name: 'Cần cải thiện', value: poor, color: CHART_COLORS.danger },
    ];
  }, [history]);

  // Calculate trend over time
  const performanceTrend = useMemo(() => {
    const published = history
      .filter(h => h.publishedAt && h.performanceScore !== null)
      .sort((a, b) => new Date(a.publishedAt!).getTime() - new Date(b.publishedAt!).getTime());

    const last10 = published.slice(-10);
    return last10.map((item, index) => ({
      name: `#${index + 1}`,
      score: item.performanceScore || 0,
      topic: item.topic.substring(0, 30) + (item.topic.length > 30 ? '...' : ''),
    }));
  }, [history]);

  // Calculate engagement totals
  const engagementTotals = useMemo(() => {
    const withEngagement = history.filter(h => h.actualEngagement);
    let likes = 0, comments = 0, shares = 0, views = 0;
    
    withEngagement.forEach(h => {
      if (h.actualEngagement) {
        likes += h.actualEngagement.likes || 0;
        comments += h.actualEngagement.comments || 0;
        shares += h.actualEngagement.shares || 0;
        views += h.actualEngagement.views || 0;
      }
    });
    
    return { likes, comments, shares, views, count: withEngagement.length };
  }, [history]);

  // Category performance
  const categoryPerformance = useMemo(() => {
    const categoryMap = new Map<string, { total: number; count: number }>();
    
    history.filter(h => h.performanceScore !== null).forEach(h => {
      const category = h.category || 'Khác';
      const existing = categoryMap.get(category) || { total: 0, count: 0 };
      categoryMap.set(category, {
        total: existing.total + (h.performanceScore || 0),
        count: existing.count + 1,
      });
    });
    
    return Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        name,
        avgScore: Math.round(data.total / data.count),
        count: data.count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 5);
  }, [history]);

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const publishedCount = history.filter(h => h.usageStatus === 'published').length;
  const avgPerformance = stats?.averagePerformance || 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Đã xuất bản</p>
                <p className="text-2xl font-bold mt-1">{publishedCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="w-4 h-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Điểm TB</p>
                <p className={cn("text-2xl font-bold mt-1", getScoreColor(avgPerformance))}>
                  {avgPerformance.toFixed(0)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <Progress value={avgPerformance} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card className="gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Top Performers</p>
                <p className="text-2xl font-bold mt-1">{topPerformers.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Star className="w-4 h-4 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tổng Views</p>
                <p className="text-2xl font-bold mt-1">
                  {engagementTotals.views >= 1000 
                    ? `${(engagementTotals.views / 1000).toFixed(1)}K` 
                    : engagementTotals.views}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Eye className="w-4 h-4 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Stats */}
      {engagementTotals.count > 0 && (
        <Card className="gradient-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Tổng hợp Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span className="text-xs">Likes</span>
                </div>
                <p className="text-lg font-semibold">{engagementTotals.likes.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="text-xs">Comments</span>
                </div>
                <p className="text-lg font-semibold">{engagementTotals.comments.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="text-xs">Shares</span>
                </div>
                <p className="text-lg font-semibold">{engagementTotals.shares.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span className="text-xs">Views</span>
                </div>
                <p className="text-lg font-semibold">{engagementTotals.views.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Performance Trend */}
        {performanceTrend.length > 0 && (
          <Card className="gradient-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Xu hướng hiệu suất
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceTrend}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background border border-border rounded-lg p-2 shadow-lg">
                              <p className="text-xs text-muted-foreground">{payload[0].payload.topic}</p>
                              <p className="text-sm font-semibold">Điểm: {payload[0].value}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke={CHART_COLORS.primary} 
                      fillOpacity={1} 
                      fill="url(#colorScore)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Performance Distribution */}
        {performanceDistribution.some(d => d.value > 0) && (
          <Card className="gradient-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Phân bố hiệu suất
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceDistribution} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {performanceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Category Performance & Top Performers */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Category Performance */}
        {categoryPerformance.length > 0 && (
          <Card className="gradient-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Hiệu suất theo Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryPerformance.map((cat, index) => (
                  <div key={cat.name} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{cat.name}</span>
                        <span className={cn("text-sm font-bold", getScoreColor(cat.avgScore))}>
                          {cat.avgScore}
                        </span>
                      </div>
                      <Progress value={cat.avgScore} className="h-1.5" />
                    </div>
                    <Badge variant="outline" className="text-[10px]">{cat.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Performers */}
        <Card className="gradient-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPerformers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Chưa có dữ liệu hiệu suất
              </p>
            ) : (
              <ScrollArea className="h-48">
                <div className="space-y-2 pr-2">
                  {topPerformers.slice(0, 5).map((item, index) => (
                    <div 
                      key={item.id} 
                      className={cn(
                        "flex items-start gap-3 p-2 rounded-lg border",
                        getScoreBgColor(item.performanceScore || 0)
                      )}
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background text-xs font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.topic}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {item.publishedAt && formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true, locale: vi })}
                        </div>
                      </div>
                      <Badge className={cn("shrink-0", getScoreBgColor(item.performanceScore || 0))}>
                        {item.performanceScore}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {publishedCount === 0 && (
        <Card className="gradient-card border-border/50">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Chưa có dữ liệu hiệu suất</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Xuất bản nội dung và cập nhật hiệu suất để xem phân tích chi tiết tại đây.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
