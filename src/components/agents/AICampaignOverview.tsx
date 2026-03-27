import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Zap, CheckSquare, Award, Clock, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AgentGoal, AgentPipeline, PIPELINE_STAGES } from '@/types/agent';
import { CampaignContentPlan } from '@/types/agent';
import { getGradeFromScore, GRADE_COLORS } from '@/types/creativeScore';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface AICampaignOverviewProps {
  goals: AgentGoal[];
  pipelines: AgentPipeline[];
  plans: CampaignContentPlan[];
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

const CHANNEL_ICONS: Record<string, string> = {
  facebook: '📘',
  tiktok: '🎵',
  instagram: '📸',
  linkedin: '💼',
  twitter: '🐦',
  youtube: '▶️',
  email: '📧',
  blog: '📝',
  website: '🌐',
};

export function AICampaignOverview({ goals, pipelines, plans }: AICampaignOverviewProps) {
  const activeGoals = useMemo(() => goals.filter(g => g.is_active && !g.is_paused), [goals]);

  const runningPipelines = useMemo(
    () => pipelines.filter(p => !p.completed_at && p.current_stage !== 'analyze'),
    [pipelines]
  );

  const completedThisWeek = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return pipelines.filter(p => {
      const d = new Date(p.completed_at || p.updated_at);
      return (p.current_stage === 'analyze' || p.completed_at) && d >= weekAgo;
    });
  }, [pipelines]);

  // Avg quality score
  const avgQuality = useMemo(() => {
    const scored = pipelines.filter(p => p.overall_quality_score != null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((s, p) => s + (p.overall_quality_score || 0), 0) / scored.length);
  }, [pipelines]);

  const avgGrade = avgQuality != null ? getGradeFromScore(avgQuality) : null;

  // Stage distribution
  const stageData = useMemo(() => {
    const counts: Record<string, number> = {};
    PIPELINE_STAGES.forEach(s => (counts[s.id] = 0));
    runningPipelines.forEach(p => { counts[p.current_stage] = (counts[p.current_stage] || 0) + 1; });
    return PIPELINE_STAGES.map(s => ({
      stage: s.label,
      id: s.id,
      count: counts[s.id] || 0,
      fill: STAGE_COLORS[s.id],
    }));
  }, [runningPipelines]);

  // Quality grade distribution
  const gradeData = useMemo(() => {
    const grades: Record<string, number> = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    pipelines.forEach(p => {
      if (p.overall_quality_score != null) {
        const g = getGradeFromScore(p.overall_quality_score);
        grades[g]++;
      }
    });
    return Object.entries(grades)
      .filter(([, v]) => v > 0)
      .map(([grade, count]) => ({ grade, count, fill: GRADE_CHART_COLORS[grade] }));
  }, [pipelines]);

  // Channel distribution from plans
  const channelData = useMemo(() => {
    const counts: Record<string, number> = {};
    plans.forEach(plan => {
      (plan.plan_data || []).forEach(piece => {
        const ch = piece.target_channel?.toLowerCase() || 'other';
        counts[ch] = (counts[ch] || 0) + 1;
      });
    });
    // Fallback: count from goal target_channels if no plans
    if (!Object.keys(counts).length) {
      goals.forEach(g => {
        (g.target_channels || []).forEach(ch => {
          const key = ch.toLowerCase();
          counts[key] = (counts[key] || 0) + pipelines.filter(p => p.goal_id === g.id).length;
        });
      });
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([channel, count]) => ({ channel, count, icon: CHANNEL_ICONS[channel] || '📌' }));
  }, [plans, goals, pipelines]);

  // Campaign progress
  const campaignProgress = useMemo(() => {
    return activeGoals.map(goal => {
      const goalPipelines = pipelines.filter(p => p.goal_id === goal.id);
      const completed = goalPipelines.filter(p => p.completed_at || p.current_stage === 'analyze').length;
      const total = goalPipelines.length;
      const plan = plans.find(p => p.goal_id === goal.id);
      const totalPieces = plan?.total_pieces || total;
      const pct = totalPieces > 0 ? Math.round((completed / totalPieces) * 100) : 0;
      return { goal, completed, total: totalPieces, pct, channels: goal.target_channels || [] };
    });
  }, [activeGoals, pipelines, plans]);

  // Recent completions
  const recentCompletions = useMemo(() => {
    return pipelines
      .filter(p => p.completed_at || p.current_stage === 'analyze')
      .sort((a, b) => new Date(b.completed_at || b.updated_at).getTime() - new Date(a.completed_at || a.updated_at).getTime())
      .slice(0, 8);
  }, [pipelines]);

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Target className="w-4 h-4 text-blue-500" />} iconBg="bg-blue-500/10" value={activeGoals.length} label="Campaigns đang chạy" />
        <StatCard icon={<Zap className="w-4 h-4 text-amber-500" />} iconBg="bg-amber-500/10" value={runningPipelines.length} label="Pipeline đang xử lý" />
        <StatCard icon={<CheckSquare className="w-4 h-4 text-emerald-500" />} iconBg="bg-emerald-500/10" value={completedThisWeek.length} label="Hoàn thành tuần này" />
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
      </div>

      {/* Charts Row */}
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

        {/* Channel Distribution */}
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-sm font-semibold">Nội dung theo kênh</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {channelData.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
                Chưa có dữ liệu kênh
              </div>
            ) : (
              <div className="space-y-2.5">
                {channelData.slice(0, 6).map(({ channel, count, icon }) => {
                  const max = channelData[0]?.count || 1;
                  return (
                    <div key={channel} className="flex items-center gap-2">
                      <span className="text-sm w-5 text-center">{icon}</span>
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
      </div>

      {/* Bottom Row */}
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

        {/* Campaign Progress */}
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-sm font-semibold">Tiến độ Campaigns</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {campaignProgress.length === 0 ? (
              <div className="h-[160px] flex items-center justify-center text-xs text-muted-foreground">
                Chưa có campaign nào
              </div>
            ) : (
              <div className="space-y-3">
                {campaignProgress.slice(0, 4).map(({ goal, completed, total, pct, channels }) => (
                  <div key={goal.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate max-w-[60%]">{goal.name}</span>
                      <span className="text-[10px] text-muted-foreground">{completed}/{total}</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <div className="flex items-center gap-1">
                      {channels.slice(0, 3).map(ch => (
                        <span key={ch} className="text-[9px] text-muted-foreground">{CHANNEL_ICONS[ch.toLowerCase()] || ch}</span>
                      ))}
                      <span className="text-[10px] text-muted-foreground ml-auto">{pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Completions */}
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
      </div>
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
