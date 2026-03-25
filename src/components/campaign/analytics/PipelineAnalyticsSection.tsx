import { useCampaignPipelineStats } from '@/hooks/useCampaignPipelineStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Activity, CheckCircle2, ShieldCheck, Clock, Bot } from 'lucide-react';
import { GRADE_COLORS, type CreativeGrade } from '@/types/creativeScore';

const STAGE_CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
];

const PILLAR_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
];

const PILLAR_LABELS: Record<string, string> = {
  educate: 'Giáo dục',
  engage: 'Tương tác',
  convert: 'Chuyển đổi',
  inspire: 'Truyền cảm hứng',
  entertain: 'Giải trí',
  nurture: 'Nuôi dưỡng',
  other: 'Khác',
};

interface PipelineAnalyticsSectionProps {
  campaignId: string;
}

export function PipelineAnalyticsSection({ campaignId }: PipelineAnalyticsSectionProps) {
  const { data: stats, isLoading } = useCampaignPipelineStats(campaignId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Bot className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">Chưa có pipeline nào trong campaign này</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">Pipeline Performance</h3>
        <Badge variant="secondary" className="text-xs">{stats.total} pipelines</Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4 text-primary" />}
          label="Hoàn thành"
          value={`${stats.completed}/${stats.total}`}
          sub={`${stats.completionRate}%`}
        />
        <StatCard
          icon={<ShieldCheck className="w-4 h-4 text-primary" />}
          label="Tỷ lệ Approval"
          value={`${stats.approvalRate}%`}
          sub={stats.flagged > 0 ? `${stats.flagged} flagged` : undefined}
        />
        <StatCard
          icon={<Activity className="w-4 h-4 text-primary" />}
          label="Quality Score TB"
          value={stats.avgQualityScore != null ? `${stats.avgQualityScore}` : '—'}
          badge={stats.qualityGrade}
        />
        <StatCard
          icon={<Clock className="w-4 h-4 text-primary" />}
          label="Thời gian TB"
          value={stats.avgCompletionTimeHours != null ? `${stats.avgCompletionTimeHours}h` : '—'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stage Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Phân bổ theo giai đoạn</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.stageDistribution} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={70} />
                <Tooltip formatter={(v: number) => [`${v} pipelines`, 'Số lượng']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {stats.stageDistribution.map((_, i) => (
                    <Cell key={i} fill={STAGE_CHART_COLORS[i % STAGE_CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pillar Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Phân bổ Content Pillar</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.pillarDistribution.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie
                      data={stats.pillarDistribution}
                      dataKey="count"
                      nameKey="role"
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={65}
                      strokeWidth={2}
                    >
                      {stats.pillarDistribution.map((_, i) => (
                        <Cell key={i} fill={PILLAR_COLORS[i % PILLAR_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number, name: string) => [v, PILLAR_LABELS[name] || name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {stats.pillarDistribution.map((p, i) => (
                    <div key={p.role} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: PILLAR_COLORS[i % PILLAR_COLORS.length] }}
                        />
                        <span className="text-foreground">{PILLAR_LABELS[p.role] || p.role}</span>
                      </div>
                      <span className="text-muted-foreground font-medium">{p.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-xs text-muted-foreground">
                Chưa có dữ liệu pillar
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, badge }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  badge?: CreativeGrade | null;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-foreground">{value}</span>
          {badge && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${GRADE_COLORS[badge]}`}>
              {badge}
            </span>
          )}
        </div>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </CardContent>
    </Card>
  );
}
