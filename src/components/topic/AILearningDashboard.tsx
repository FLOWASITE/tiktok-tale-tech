import React, { useMemo } from 'react';
import {
  Brain,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  Target,
  Sparkles,
  CheckCircle2,
  Clock,
  BarChart3,
  PieChart,
  Star,
  Zap,
  Eye,
  MessageSquare,
  Share2,
  Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
} from 'recharts';
import { useTopicHistory } from '@/hooks/useTopicHistory';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface AILearningDashboardProps {
  brandTemplateId?: string;
  contentGoal?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
const FEEDBACK_COLORS = {
  positive: 'hsl(142, 76%, 36%)', // emerald
  negative: 'hsl(0, 84%, 60%)', // red
  neutral: 'hsl(var(--muted-foreground))',
};

export function AILearningDashboard({
  brandTemplateId,
  contentGoal,
  open,
  onOpenChange,
}: AILearningDashboardProps) {
  const { history, favorites, topPerformers, stats, getLearningContext } = useTopicHistory({
    brandTemplateId,
    contentGoal: contentGoal as any,
    enabled: open,
  });

  // Feedback analysis
  const feedbackData = useMemo(() => {
    const positive = history.filter((h) => h.feedback === 'positive').length;
    const negative = history.filter((h) => h.feedback === 'negative').length;
    const neutral = history.length - positive - negative;
    const total = positive + negative;
    const positiveRate = total > 0 ? Math.round((positive / total) * 100) : 0;

    return {
      positive,
      negative,
      neutral,
      total,
      positiveRate,
      chartData: [
        { name: 'Tích cực', value: positive, fill: FEEDBACK_COLORS.positive },
        { name: 'Tiêu cực', value: negative, fill: FEEDBACK_COLORS.negative },
      ].filter((d) => d.value > 0),
    };
  }, [history]);

  // Performance metrics from actual data
  const performanceData = useMemo(() => {
    const published = history.filter((h) => h.usageStatus === 'published');
    const withScore = published.filter((h) => h.performanceScore !== null && h.performanceScore !== undefined);
    const avgScore = withScore.length > 0
      ? Math.round(withScore.reduce((sum, h) => sum + (h.performanceScore || 0), 0) / withScore.length)
      : 0;

    // Total engagement
    const totalEngagement = {
      likes: published.reduce((sum, h) => sum + (h.actualEngagement?.likes || 0), 0),
      comments: published.reduce((sum, h) => sum + (h.actualEngagement?.comments || 0), 0),
      shares: published.reduce((sum, h) => sum + (h.actualEngagement?.shares || 0), 0),
      views: published.reduce((sum, h) => sum + (h.actualEngagement?.views || 0), 0),
    };

    // Performance trend (last 10 published)
    const trendData = withScore
      .sort((a, b) => new Date(a.publishedAt || a.createdAt).getTime() - new Date(b.publishedAt || b.createdAt).getTime())
      .slice(-10)
      .map((h, idx) => ({
        name: `#${idx + 1}`,
        score: h.performanceScore || 0,
      }));

    return {
      publishedCount: published.length,
      scoredCount: withScore.length,
      avgScore,
      totalEngagement,
      trendData,
    };
  }, [history]);

  // Pillar distribution
  const pillarData = useMemo(() => {
    const pillarCounts: Record<string, number> = {};
    history.forEach((h) => {
      if (h.pillar) {
        pillarCounts[h.pillar] = (pillarCounts[h.pillar] || 0) + 1;
      }
    });

    return Object.entries(pillarCounts)
      .map(([name, value], idx) => ({
        name: name.length > 12 ? name.slice(0, 12) + '...' : name,
        fullName: name,
        value,
        fill: CHART_COLORS[idx % CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [history]);

  // Category distribution
  const categoryData = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    history.forEach((h) => {
      const category = h.category || 'other';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    return Object.entries(categoryCounts)
      .map(([name, value], idx) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        fill: CHART_COLORS[idx % CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [history]);

  // Personalization milestones
  const milestones = useMemo(() => {
    const learningContext = getLearningContext();
    return [
      { label: 'Brand đã liên kết', done: !!brandTemplateId, icon: Target },
      { label: 'Có topic yêu thích', done: favorites.length > 0, icon: Star },
      { label: 'Đã cho feedback', done: feedbackData.total > 0, icon: ThumbsUp },
      { label: 'Có 5+ feedback', done: feedbackData.total >= 5, icon: Zap },
      { label: 'Có top performers', done: topPerformers.length > 0, icon: TrendingUp },
      { label: 'Đủ dữ liệu học', done: history.length >= 10, icon: Brain },
      // Enhanced milestones for actual performance
      { label: 'Đã publish content', done: performanceData.publishedCount > 0, icon: Award },
      { label: 'Có dữ liệu hiệu suất', done: performanceData.scoredCount >= 3, icon: BarChart3 },
    ];
  }, [brandTemplateId, favorites.length, feedbackData.total, topPerformers.length, history.length, performanceData]);

  const completedMilestones = milestones.filter((m) => m.done).length;
  const personalizationLevel = Math.round((completedMilestones / milestones.length) * 100);

  // Recent feedback history
  const recentFeedback = useMemo(() => {
    return history
      .filter((h) => h.feedback)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [history]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Learning Dashboard
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Personalization Progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Mức độ cá nhân hóa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <Progress value={personalizationLevel} className="flex-1" />
                <span className="text-lg font-bold">{personalizationLevel}%</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {milestones.map((milestone) => {
                  const Icon = milestone.icon;
                  return (
                    <div
                      key={milestone.label}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg text-xs',
                        milestone.done ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted/50 text-muted-foreground'
                      )}
                    >
                      {milestone.done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <Icon className="w-3.5 h-3.5 shrink-0 opacity-50" />
                      )}
                      <span className="truncate">{milestone.label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Actual Performance Metrics - NEW */}
          {performanceData.publishedCount > 0 && (
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-500" />
                  Hiệu suất thực tế
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-600">{performanceData.publishedCount}</div>
                    <div className="text-xs text-muted-foreground">Đã publish</div>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <div className={cn(
                      'text-2xl font-bold',
                      performanceData.avgScore >= 70 ? 'text-emerald-600' : performanceData.avgScore >= 50 ? 'text-amber-600' : 'text-red-600'
                    )}>
                      {performanceData.avgScore}
                    </div>
                    <div className="text-xs text-muted-foreground">Score TB</div>
                  </div>
                </div>

                {/* Engagement Summary */}
                {(performanceData.totalEngagement.views > 0 || performanceData.totalEngagement.likes > 0) && (
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 bg-background/50 rounded">
                      <Eye className="w-3.5 h-3.5 mx-auto mb-1 text-blue-500" />
                      <div className="text-sm font-medium">{performanceData.totalEngagement.views.toLocaleString()}</div>
                      <div className="text-[10px] text-muted-foreground">Views</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded">
                      <ThumbsUp className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-500" />
                      <div className="text-sm font-medium">{performanceData.totalEngagement.likes.toLocaleString()}</div>
                      <div className="text-[10px] text-muted-foreground">Likes</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded">
                      <MessageSquare className="w-3.5 h-3.5 mx-auto mb-1 text-violet-500" />
                      <div className="text-sm font-medium">{performanceData.totalEngagement.comments.toLocaleString()}</div>
                      <div className="text-[10px] text-muted-foreground">Comments</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded">
                      <Share2 className="w-3.5 h-3.5 mx-auto mb-1 text-orange-500" />
                      <div className="text-sm font-medium">{performanceData.totalEngagement.shares.toLocaleString()}</div>
                      <div className="text-[10px] text-muted-foreground">Shares</div>
                    </div>
                  </div>
                )}

                {/* Performance Trend */}
                {performanceData.trendData.length >= 3 && (
                  <div className="h-[100px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performanceData.trendData}>
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={30} />
                        <Tooltip 
                          content={({ payload }) => {
                            if (payload && payload[0]) {
                              return (
                                <div className="bg-popover border rounded p-2 text-xs">
                                  Score: {payload[0].value}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Feedback Overview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary" />
                Phân tích Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feedbackData.total === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  <ThumbsUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Chưa có feedback nào</p>
                  <p className="text-xs">Hãy đánh giá các gợi ý để AI học hỏi tốt hơn</p>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={feedbackData.chartData}
                          dataKey="value"
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={40}
                        >
                          {feedbackData.chartData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Pie>
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="text-sm">Tích cực</span>
                      </div>
                      <span className="font-medium">{feedbackData.positive}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-sm">Tiêu cực</span>
                      </div>
                      <span className="font-medium">{feedbackData.negative}</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Tỷ lệ tích cực</span>
                        <Badge variant={feedbackData.positiveRate >= 70 ? 'default' : 'secondary'}>
                          {feedbackData.positiveRate}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Topic Patterns */}
          <div className="grid gap-4 grid-cols-1">
            {/* Pillar Distribution */}
            {pillarData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Phân bố theo Pillar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pillarData} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                        <Tooltip
                          content={({ payload }) => {
                            if (payload && payload[0]) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-popover border rounded-lg p-2 shadow-lg text-xs">
                                  <p className="font-medium">{data.fullName}</p>
                                  <p className="text-muted-foreground">{data.value} topics</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {pillarData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Category Distribution */}
            {categoryData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Phân bố theo Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {categoryData.map((cat, idx) => (
                      <Badge
                        key={cat.name}
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: cat.fill, color: cat.fill }}
                      >
                        {cat.name}: {cat.value}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Feedback History */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Lịch sử Feedback gần đây
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentFeedback.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Chưa có feedback
                </p>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {recentFeedback.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        {item.feedback === 'positive' ? (
                          <ThumbsUp className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <ThumbsDown className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium line-clamp-1">{item.topic}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(item.createdAt), {
                              addSuffix: true,
                              locale: vi,
                            })}
                          </p>
                          {item.feedbackNote && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 italic line-clamp-1">
                              "{item.feedbackNote}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Learning Summary */}
          <Card className="bg-gradient-to-br from-primary/5 to-violet-500/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">AI đã học được gì?</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {topPerformers.length > 0 && (
                      <li className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Top {topPerformers.length} topics hiệu suất cao
                      </li>
                    )}
                    {feedbackData.positive > 0 && (
                      <li className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {feedbackData.positive} phản hồi tích cực
                      </li>
                    )}
                    {pillarData.length > 0 && (
                      <li className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Pillar ưa thích: {pillarData[0]?.fullName}
                      </li>
                    )}
                    {categoryData.length > 0 && (
                      <li className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Loại topic phổ biến: {categoryData[0]?.name}
                      </li>
                    )}
                    {history.length === 0 && (
                      <li className="text-muted-foreground">
                        Chưa có dữ liệu. Hãy bắt đầu sử dụng topics!
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
