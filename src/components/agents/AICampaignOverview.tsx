import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Target, Zap, CheckSquare, Award, Clock, TrendingUp, BarChart3, Filter,
  AlertTriangle, ShieldCheck, Calendar, DollarSign,
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
} from 'recharts';
import { AgentGoal, AgentPipeline, PIPELINE_STAGES } from '@/types/agent';
import { CampaignContentPlan } from '@/types/agent';
import { getGradeFromScore, GRADE_COLORS } from '@/types/creativeScore';
import { formatDistanceToNow, subDays, format, eachDayOfInterval, startOfDay, differenceInDays, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useCampaigns } from '@/hooks/useCampaigns';
import { cn } from '@/lib/utils';
import { ChannelIcon, channelIconColors } from '@/components/ui/channel-icon';
import { Channel } from '@/types/multichannel';

interface AICampaignOverviewProps {
  goals: AgentGoal[];
  pipelines: AgentPipeline[];
  plans: CampaignContentPlan[];
  onNavigateToPipeline?: (goalId: string) => void;
}

const STAGE_COLORS: Record<string, string> = {
  strategy: 'hsl(263, 70%, 58%)',
  create: 'hsl(217, 91%, 60%)',
  quality: 'hsl(187, 85%, 53%)',
  approval: 'hsl(38, 92%, 50%)',
  publish: 'hsl(160, 84%, 39%)',
  analyze: 'hsl(330, 81%, 60%)',
};

const GRADE_CHART_COLORS: Record<string, string> = {
  'A+': 'hsl(160, 84%, 39%)',
  'A': 'hsl(142, 71%, 45%)',
  'B': 'hsl(48, 96%, 53%)',
  'C': 'hsl(25, 95%, 53%)',
  'D': 'hsl(0, 72%, 60%)',
  'F': 'hsl(0, 72%, 45%)',
};

const CHANNEL_TO_KEY: Record<string, Channel> = {
  facebook: 'facebook', tiktok: 'tiktok', instagram: 'instagram', linkedin: 'linkedin',
  twitter: 'twitter', youtube: 'youtube', email: 'email', blog: 'website', website: 'website',
  zalo: 'zalo_oa', 'zalo_oa': 'zalo_oa', threads: 'threads', telegram: 'telegram',
};

const PILLAR_COLORS: Record<string, string> = {
  hero: 'hsl(263, 70%, 58%)',
  hub: 'hsl(217, 91%, 60%)',
  help: 'hsl(160, 84%, 39%)',
  hygiene: 'hsl(38, 92%, 50%)',
  other: 'hsl(var(--muted-foreground))',
};

const PILLAR_LABELS: Record<string, string> = {
  hero: 'Hero',
  hub: 'Hub',
  help: 'Help',
  hygiene: 'Hygiene',
  other: 'Khác',
};

const PAST_APPROVAL_STAGES = ['publish', 'analyze'];

export function AICampaignOverview({ goals, pipelines, plans, onNavigateToPipeline }: AICampaignOverviewProps) {
  const [selectedGoalId, setSelectedGoalId] = useState<string>('all');
  const { campaigns } = useCampaigns();

  const isSpecific = selectedGoalId !== 'all';

  // Filter data based on selection
  const filteredPipelines = useMemo(
    () => isSpecific ? pipelines.filter(p => p.goal_id === selectedGoalId) : pipelines,
    [pipelines, selectedGoalId, isSpecific]
  );

  const filteredPlans = useMemo(
    () => isSpecific ? plans.filter(p => p.goal_id === selectedGoalId) : plans,
    [plans, selectedGoalId, isSpecific]
  );

  const filteredGoals = useMemo(
    () => isSpecific ? goals.filter(g => g.id === selectedGoalId) : goals,
    [goals, selectedGoalId, isSpecific]
  );

  const selectedGoal = useMemo(
    () => isSpecific ? goals.find(g => g.id === selectedGoalId) : null,
    [goals, selectedGoalId, isSpecific]
  );

  // Find the campaign linked to the selected goal
  const selectedCampaign = useMemo(() => {
    if (!selectedGoal?.campaign_id || !campaigns.length) return null;
    return campaigns.find(c => c.id === selectedGoal.campaign_id) || null;
  }, [selectedGoal, campaigns]);

  const activeGoals = useMemo(() => filteredGoals.filter(g => g.is_active && !g.is_paused), [filteredGoals]);

  const runningPipelines = useMemo(
    () => filteredPipelines.filter(p => !p.completed_at && p.current_stage !== 'analyze'),
    [filteredPipelines]
  );

  const completedPipelines = useMemo(
    () => filteredPipelines.filter(p => p.completed_at || p.current_stage === 'analyze'),
    [filteredPipelines]
  );

  const completedThisWeek = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return completedPipelines.filter(p => {
      const d = new Date(p.completed_at || p.updated_at);
      return d >= weekAgo;
    });
  }, [completedPipelines]);

  // Flagged pipelines
  const flaggedPipelines = useMemo(
    () => filteredPipelines.filter(p => p.is_flagged),
    [filteredPipelines]
  );

  // Approval rate
  const approvalRate = useMemo(() => {
    const pastApproval = filteredPipelines.filter(
      p => PAST_APPROVAL_STAGES.includes(p.current_stage) || p.completed_at
    );
    if (pastApproval.length === 0) return null;
    const clean = pastApproval.filter(p => !p.is_flagged).length;
    return Math.round((clean / pastApproval.length) * 100);
  }, [filteredPipelines]);

  // Avg quality score
  const avgQuality = useMemo(() => {
    const scored = filteredPipelines.filter(p => p.overall_quality_score != null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((s, p) => s + (p.overall_quality_score || 0), 0) / scored.length);
  }, [filteredPipelines]);

  const avgGrade = avgQuality != null ? getGradeFromScore(avgQuality) : null;

  // Stage distribution
  const stageData = useMemo(() => {
    const counts: Record<string, number> = {};
    PIPELINE_STAGES.forEach(s => (counts[s.id] = 0));
    runningPipelines.forEach(p => { counts[p.current_stage] = (counts[p.current_stage] || 0) + 1; });
    return PIPELINE_STAGES.map(s => ({
      stage: s.label, id: s.id, count: counts[s.id] || 0, fill: STAGE_COLORS[s.id],
    }));
  }, [runningPipelines]);

  // 14-day completion trend
  const completionTrend = useMemo(() => {
    const now = new Date();
    const days = eachDayOfInterval({ start: subDays(now, 13), end: now });
    return days.map(day => {
      const dayStart = startOfDay(day);
      const count = completedPipelines.filter(p => {
        const d = startOfDay(new Date(p.completed_at || p.updated_at));
        return d.getTime() === dayStart.getTime();
      }).length;
      return { date: format(day, 'dd/MM'), count };
    });
  }, [completedPipelines]);

  // Quality grade distribution
  const gradeData = useMemo(() => {
    const grades: Record<string, number> = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    filteredPipelines.forEach(p => {
      if (p.overall_quality_score != null) {
        const g = getGradeFromScore(p.overall_quality_score);
        grades[g]++;
      }
    });
    return Object.entries(grades)
      .filter(([, v]) => v > 0)
      .map(([grade, count]) => ({ grade, count, fill: GRADE_CHART_COLORS[grade] }));
  }, [filteredPipelines]);

  // Channel distribution from plans
  const channelData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredPlans.forEach(plan => {
      (plan.plan_data || []).forEach(piece => {
        const ch = piece.target_channel?.toLowerCase() || 'other';
        counts[ch] = (counts[ch] || 0) + 1;
      });
    });
    if (!Object.keys(counts).length) {
      filteredGoals.forEach(g => {
        (g.target_channels || []).forEach(ch => {
          const key = ch.toLowerCase();
          counts[key] = (counts[key] || 0) + filteredPipelines.filter(p => p.goal_id === g.id).length;
        });
      });
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([channel, count]) => ({ channel, count, channelKey: CHANNEL_TO_KEY[channel] || 'website' as Channel }));
  }, [filteredPlans, filteredGoals, filteredPipelines]);

  // Content Pillar distribution
  const pillarData = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    filteredPlans.forEach(plan => {
      (plan.plan_data || []).forEach(piece => {
        const role = (piece.content_role || 'other').toLowerCase();
        counts[role] = (counts[role] || 0) + 1;
        total++;
      });
    });
    if (total === 0) return [];
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([role, count]) => ({
        role,
        label: PILLAR_LABELS[role] || role,
        count,
        percentage: Math.round((count / total) * 100),
        color: PILLAR_COLORS[role] || PILLAR_COLORS.other,
      }));
  }, [filteredPlans]);

  // Recent completions
  const recentCompletions = useMemo(() => {
    return completedPipelines
      .sort((a, b) => new Date(b.completed_at || b.updated_at).getTime() - new Date(a.completed_at || a.updated_at).getTime())
      .slice(0, 8);
  }, [completedPipelines]);

  // Campaign timeline info
  const campaignTimeline = useMemo(() => {
    if (!selectedCampaign) return null;
    const now = new Date();
    const start = parseISO(selectedCampaign.start_date);
    const end = parseISO(selectedCampaign.end_date);
    const totalDays = differenceInDays(end, start) || 1;
    const elapsed = differenceInDays(now, start);
    const remaining = differenceInDays(end, now);
    const progressPct = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));
    return { start, end, totalDays, remaining, progressPct };
  }, [selectedCampaign]);

  // Budget info
  const budgetInfo = useMemo(() => {
    if (!selectedCampaign || !selectedCampaign.budget_total) return null;
    const total = selectedCampaign.budget_total;
    const spent = selectedCampaign.budget_spent || 0;
    const pct = Math.round((spent / total) * 100);
    const currency = selectedCampaign.budget_currency || 'VND';
    const fmt = (v: number) => {
      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
      if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
      return v.toString();
    };
    return { total, spent, pct, currency, fmtTotal: fmt(total), fmtSpent: fmt(spent) };
  }, [selectedCampaign]);

  // Pipeline completion rate for campaign header
  const completionRate = useMemo(() => {
    if (filteredPipelines.length === 0) return 0;
    return Math.round((completedPipelines.length / filteredPipelines.length) * 100);
  }, [filteredPipelines, completedPipelines]);

  return (
    <div className="space-y-4">
      {/* Global Campaign Selector */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Tổng quan Campaign AI</h3>
        </div>
        <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
          <SelectTrigger className="w-auto max-w-[280px] h-8 text-xs gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <SelectValue placeholder="Chọn chiến dịch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <span>Tất cả chiến dịch</span>
                <Badge variant="outline" className="text-[9px] h-4 px-1.5">{goals.length}</Badge>
              </div>
            </SelectItem>
            {goals.map(goal => (
              <SelectItem key={goal.id} value={goal.id}>
                <div className="flex items-center gap-2">
                  <span className="truncate">{goal.name}</span>
                  <Badge
                    variant={goal.is_paused ? 'secondary' : 'default'}
                    className="text-[9px] h-4 px-1.5 shrink-0"
                  >
                    {goal.is_paused ? 'Tạm dừng' : 'Đang chạy'}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Campaign Header Card — only when a specific campaign is selected */}
      {isSpecific && selectedCampaign && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-4 space-y-3">
            {/* Row 1: Name + Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-sm">{selectedCampaign.name}</h4>
              <Badge variant={selectedCampaign.status === 'active' ? 'default' : 'secondary'} className="text-[9px] h-4 px-1.5 capitalize">
                {selectedCampaign.status}
              </Badge>
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 capitalize">
                {selectedCampaign.campaign_type}
              </Badge>
              {(selectedCampaign.target_channels || []).slice(0, 4).map(ch => {
                const key = CHANNEL_TO_KEY[ch.toLowerCase()] || 'website' as Channel;
                return (
                  <ChannelIcon key={ch} channel={key} size={14} className={channelIconColors[key]} />
                );
              })}
            </div>

            {/* Row 2: Progress + Timeline */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tiến độ pipeline</span>
                <span className="font-medium">{completionRate}% · {completedPipelines.length}/{filteredPipelines.length} hoàn thành</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>

            {/* Row 3: Timeline + Budget */}
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
              {campaignTimeline && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {format(campaignTimeline.start, 'dd/MM')} → {format(campaignTimeline.end, 'dd/MM/yyyy')}
                  </span>
                  <Badge variant={campaignTimeline.remaining > 7 ? 'outline' : 'destructive'} className="text-[9px] h-4 px-1.5 ml-1">
                    {campaignTimeline.remaining > 0 ? `${campaignTimeline.remaining} ngày còn lại` : 'Đã hết hạn'}
                  </Badge>
                </div>
              )}
              {budgetInfo && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>
                    {budgetInfo.fmtSpent} / {budgetInfo.fmtTotal} {budgetInfo.currency}
                  </span>
                  <span className="font-medium text-foreground">({budgetInfo.pct}%)</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Row — 6 cards when specific, 4 when all */}
      <div className={cn(
        "grid gap-3",
        isSpecific ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" : "grid-cols-2 sm:grid-cols-4"
      )}>
        <StatCard icon={<Target className="w-4 h-4 text-blue-500" />} iconBg="bg-blue-500/10" value={isSpecific ? filteredPipelines.length : activeGoals.length} label={isSpecific ? 'Tổng pipeline' : 'Campaigns đang chạy'} />
        <StatCard icon={<CheckSquare className="w-4 h-4 text-emerald-500" />} iconBg="bg-emerald-500/10" value={isSpecific ? completedPipelines.length : completedThisWeek.length} label={isSpecific ? 'Hoàn thành' : 'Hoàn thành tuần này'} />
        <StatCard icon={<Zap className="w-4 h-4 text-amber-500" />} iconBg="bg-amber-500/10" value={runningPipelines.length} label="Đang xử lý" />
        
        {isSpecific && (
          <StatCard icon={<AlertTriangle className="w-4 h-4 text-destructive" />} iconBg="bg-destructive/10" value={flaggedPipelines.length} label="Bị flag" />
        )}

        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10"><Award className="w-4 h-4 text-purple-500" /></div>
            <div className="flex items-center gap-2">
              <div>
                <p className="text-lg font-bold">{avgQuality ?? '—'}</p>
                <p className="text-[10px] text-muted-foreground">Chất lượng TB</p>
              </div>
              {avgGrade && (
                <Badge className={`${GRADE_COLORS[avgGrade]} text-[10px] h-5 px-1.5`}>{avgGrade}</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {isSpecific && (
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10"><ShieldCheck className="w-4 h-4 text-cyan-500" /></div>
              <div>
                <p className="text-lg font-bold">{approvalRate != null ? `${approvalRate}%` : '—'}</p>
                <p className="text-[10px] text-muted-foreground">Tỷ lệ duyệt</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Row: Stage Distribution + Completion Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pipeline Stage Distribution */}
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              Pipeline theo giai đoạn
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {runningPipelines.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
                Chưa có pipeline đang chạy
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stageData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => [value, 'Pipeline']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {stageData.map((entry) => (
                      <Cell key={entry.id} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 14-day Completion Trend */}
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Hoàn thành 14 ngày
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {completionTrend.every(d => d.count === 0) ? (
              <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
                Chưa có dữ liệu hoàn thành
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={completionTrend} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <defs>
                    <linearGradient id="completionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => [value, 'Hoàn thành']}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(160, 84%, 39%)"
                    strokeWidth={2}
                    fill="url(#completionGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Quality + Channel + Pillar/Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quality Grade Donut */}
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-sm font-semibold">Phân bổ chất lượng</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex items-center justify-center">
            {gradeData.length === 0 ? (
              <div className="h-[160px] flex items-center justify-center text-xs text-muted-foreground">
                Chưa có điểm chất lượng
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={gradeData} dataKey="count" nameKey="grade" innerRadius={35} outerRadius={55} paddingAngle={2}>
                      {gradeData.map((entry) => (
                        <Cell key={entry.grade} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1">
                  {gradeData.map(({ grade, count }) => (
                    <div key={grade} className="flex items-center gap-2 text-xs">
                      <Badge className={`${GRADE_COLORS[grade as keyof typeof GRADE_COLORS]} text-[9px] h-4 px-1.5 min-w-[24px] justify-center`}>{grade}</Badge>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Channel Distribution */}
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-sm font-semibold">Nội dung theo kênh</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {channelData.length === 0 ? (
              <div className="h-[160px] flex items-center justify-center text-xs text-muted-foreground">
                Chưa có dữ liệu kênh
              </div>
            ) : (
              <div className="space-y-2.5">
                {channelData.slice(0, 6).map(({ channel, count, channelKey }) => {
                  const max = channelData[0]?.count || 1;
                  return (
                    <div key={channel} className="flex items-center gap-2">
                      <ChannelIcon channel={channelKey} size={14} className={cn("shrink-0", channelIconColors[channelKey])} />
                      <span className="text-xs capitalize w-20 truncate">{channel}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/70 transition-all"
                          style={{ width: `${(count / max) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Pillar (specific) or Recent Completions (all) */}
        {isSpecific && pillarData.length > 0 ? (
          <Card>
            <CardHeader className="pb-2 p-4">
              <CardTitle className="text-sm font-semibold">Content Pillar</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-3">
                {pillarData.map(({ role, label, count, percentage, color }) => (
                  <div key={role} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percentage}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2 p-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                Hoạt động gần đây
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {recentCompletions.length === 0 ? (
                <div className="h-[160px] flex items-center justify-center text-xs text-muted-foreground">
                  Chưa có hoạt động
                </div>
              ) : (
                <div className="space-y-2">
                  {recentCompletions.map(p => (
                    <div key={p.id} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs truncate">{p.content_title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(p.completed_at || p.updated_at), { addSuffix: true, locale: vi })}
                          {p.overall_quality_score != null && (
                            <> · <span className="font-medium">{p.overall_quality_score}đ</span></>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent activity — shown below pillar when specific campaign selected */}
      {isSpecific && pillarData.length > 0 && (
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              Hoạt động gần đây
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {recentCompletions.length === 0 ? (
              <div className="h-[100px] flex items-center justify-center text-xs text-muted-foreground">
                Chưa có hoạt động
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {recentCompletions.map(p => (
                  <div key={p.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs truncate">{p.content_title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(p.completed_at || p.updated_at), { addSuffix: true, locale: vi })}
                        {p.overall_quality_score != null && (
                          <> · <span className="font-medium">{p.overall_quality_score}đ</span></>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon, iconBg, value, label }: { icon: React.ReactNode; iconBg: string; value: number; label: string }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconBg}`}>{icon}</div>
        <div>
          <p className="text-lg font-bold">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
