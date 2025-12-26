import { useMemo } from 'react';
import { 
  TrendingUp, Star, Target, BarChart3, 
  PieChart, Activity, Trophy, Lightbulb,
  ThumbsUp, ThumbsDown, Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useTopicHistory } from '@/hooks/useTopicHistory';
import { ContentGoal } from '@/types/multichannel';
import { TOPIC_CATEGORIES } from '@/types/topicDiscovery';
import { cn } from '@/lib/utils';

interface TopicAnalyticsDashboardProps {
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
}

export function TopicAnalyticsDashboard({
  brandTemplateId,
  contentGoal,
}: TopicAnalyticsDashboardProps) {
  const {
    history,
    favorites,
    topPerformers,
    stats,
    isLoading,
  } = useTopicHistory({
    brandTemplateId,
    contentGoal,
    enabled: true,
  });

  // Calculate category distribution
  const categoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    history.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return TOPIC_CATEGORIES.map(cat => ({
      ...cat,
      count: counts[cat.value] || 0,
      percentage: history.length > 0 ? Math.round((counts[cat.value] || 0) / history.length * 100) : 0,
    })).sort((a, b) => b.count - a.count);
  }, [history]);

  // Calculate feedback distribution
  const feedbackDistribution = useMemo(() => {
    const positive = history.filter(h => h.feedback === 'positive').length;
    const negative = history.filter(h => h.feedback === 'negative').length;
    const neutral = history.filter(h => h.feedback === 'neutral').length;
    const noFeedback = history.length - positive - negative - neutral;
    return { positive, negative, neutral, noFeedback };
  }, [history]);

  // Calculate pillar distribution
  const pillarDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    history.forEach(item => {
      if (item.pillar) {
        counts[item.pillar] = (counts[item.pillar] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([pillar, count]) => ({ pillar, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [history]);

  // Performance trend (simplified)
  const performanceTrend = useMemo(() => {
    const scored = history.filter(h => h.performanceScore != null);
    if (scored.length < 2) return null;
    
    const sorted = [...scored].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    const recent = sorted.slice(0, Math.ceil(sorted.length / 2));
    const older = sorted.slice(Math.ceil(sorted.length / 2));
    
    const recentAvg = recent.reduce((sum, h) => sum + (h.performanceScore || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, h) => sum + (h.performanceScore || 0), 0) / older.length;
    
    return {
      trend: recentAvg > olderAvg ? 'up' : recentAvg < olderAvg ? 'down' : 'stable',
      change: Math.round(recentAvg - olderAvg),
    };
  }, [history]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="gradient-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Tỷ lệ sử dụng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{stats.suggestionToUsageRate}%</span>
              <span className="text-sm text-muted-foreground mb-1">
                ({stats.usedTopics}/{stats.totalTopics})
              </span>
            </div>
            <Progress value={stats.suggestionToUsageRate} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="gradient-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Điểm hiệu suất TB
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{stats.averagePerformance || '-'}</span>
              {performanceTrend && (
                <Badge 
                  variant={performanceTrend.trend === 'up' ? 'default' : 'secondary'}
                  className={cn(
                    'text-xs',
                    performanceTrend.trend === 'up' && 'bg-emerald-500',
                    performanceTrend.trend === 'down' && 'bg-red-500'
                  )}
                >
                  {performanceTrend.trend === 'up' ? '+' : ''}{performanceTrend.change}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {performanceTrend?.trend === 'up' && 'Đang cải thiện'}
              {performanceTrend?.trend === 'down' && 'Cần cải thiện'}
              {performanceTrend?.trend === 'stable' && 'Ổn định'}
              {!performanceTrend && 'Chưa đủ dữ liệu'}
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="w-4 h-4 text-rose-500" />
              Yêu thích
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{stats.favoriteCount}</span>
              <span className="text-sm text-muted-foreground mb-1">topics</span>
            </div>
            <Progress 
              value={stats.totalTopics > 0 ? (stats.favoriteCount / stats.totalTopics) * 100 : 0} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>

        <Card className="gradient-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-500" />
              Hiệu suất cao
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{topPerformers.length}</span>
              <span className="text-sm text-muted-foreground mb-1">topics</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Điểm &gt; 70
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Category Distribution */}
        <Card className="gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Phân bố theo loại
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoryDistribution.map((cat) => {
              const colorClass = 
                cat.color === 'emerald' ? 'bg-emerald-500' :
                cat.color === 'orange' ? 'bg-orange-500' :
                cat.color === 'purple' ? 'bg-purple-500' :
                cat.color === 'red' ? 'bg-red-500' : 'bg-slate-500';
              return (
                <div key={cat.value} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className={cn('w-2.5 h-2.5 rounded-full', colorClass)} />
                      {cat.label}
                    </span>
                    <span className="text-muted-foreground">{cat.count}</span>
                  </div>
                  <Progress value={cat.percentage} className="h-1.5" />
                </div>
              );
            })}
            {categoryDistribution.every(c => c.count === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Chưa có dữ liệu
              </p>
            )}
          </CardContent>
        </Card>

        {/* Feedback Distribution */}
        <Card className="gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Phản hồi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <ThumbsUp className="w-4 h-4 text-emerald-500" />
                <span className="text-sm">Tích cực</span>
              </div>
              <span className="font-medium">{feedbackDistribution.positive}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Minus className="w-4 h-4 text-amber-500" />
                <span className="text-sm">Trung lập</span>
              </div>
              <span className="font-medium">{feedbackDistribution.neutral}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <ThumbsDown className="w-4 h-4 text-red-500" />
                <span className="text-sm">Tiêu cực</span>
              </div>
              <span className="font-medium">{feedbackDistribution.negative}</span>
            </div>
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Lightbulb className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Chưa đánh giá</span>
                </div>
                <span className="text-muted-foreground">{feedbackDistribution.noFeedback}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Pillars */}
        <Card className="gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4" />
              Content Pillars
            </CardTitle>
            <CardDescription className="text-xs">
              Top 5 pillars được sử dụng
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pillarDistribution.length > 0 ? (
              pillarDistribution.map((item, index) => (
                <div key={item.pillar} className="flex items-center gap-3">
                  <Badge variant="outline" className="w-6 h-6 p-0 justify-center text-xs">
                    {index + 1}
                  </Badge>
                  <span className="flex-1 text-sm truncate">{item.pillar}</span>
                  <span className="text-sm text-muted-foreground">{item.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Chưa có dữ liệu về content pillars
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performers List */}
      <Card className="gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Topics hiệu suất cao nhất
          </CardTitle>
          <CardDescription className="text-xs">
            Các topic có điểm hiệu suất thực tế cao nhất
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topPerformers.length > 0 ? (
            <div className="space-y-3">
              {topPerformers.slice(0, 5).map((item, index) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      'w-7 h-7 p-0 justify-center text-sm font-bold',
                      index === 0 && 'bg-amber-500 text-white border-amber-500',
                      index === 1 && 'bg-slate-400 text-white border-slate-400',
                      index === 2 && 'bg-amber-700 text-white border-amber-700'
                    )}
                  >
                    {index + 1}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.topic}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-[10px]">{item.category}</Badge>
                      {item.pillar && <span>{item.pillar}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600">{item.performanceScore}</p>
                    <p className="text-[10px] text-muted-foreground">điểm</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Chưa có topic nào đạt hiệu suất cao
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Sử dụng và đánh giá topics để theo dõi hiệu suất
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
