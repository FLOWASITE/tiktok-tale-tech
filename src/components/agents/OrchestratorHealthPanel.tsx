import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  Activity, Zap, AlertTriangle, Clock, TrendingUp, Shield,
  RefreshCw, Lightbulb, CheckCircle2,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { cn } from '@/lib/utils';

interface OrchestratorStats {
  total_pipelines: number;
  completed: number;
  failed: number;
  avg_quality_score: number | null;
  stage_durations: Record<string, number>;
  stage_bottleneck: string | null;
  stage_fail_rates: Record<string, { total: number; failed: number; rate: number }>;
  top_failure_reason: string | null;
  recovery_count: number;
  pass_rate: number;
  flag_rate: number;
}

interface Suggestion {
  type: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

const STAGE_LABELS: Record<string, string> = {
  strategy: 'Chiến lược',
  create: 'Sáng tạo',
  quality: 'Chất lượng',
  approval: 'Duyệt',
  publish: 'Đăng bài',
  analyze: 'Phân tích',
  orchestrator: 'Điều phối',
  recovery: 'Phục hồi',
};

const STAGE_COLORS: Record<string, string> = {
  strategy: 'hsl(263, 70%, 58%)',
  create: 'hsl(217, 91%, 60%)',
  quality: 'hsl(187, 85%, 53%)',
  approval: 'hsl(38, 92%, 50%)',
  publish: 'hsl(160, 84%, 39%)',
  analyze: 'hsl(330, 81%, 60%)',
};

const FAILURE_LABELS: Record<string, string> = {
  timeout: 'Timeout',
  rate_limit: 'Rate Limit',
  network: 'Mạng',
  auth: 'Xác thực',
  data_missing: 'Thiếu dữ liệu',
  publish_error: 'Đăng bài',
  quality_gate: 'Quality Gate',
  unknown: 'Khác',
};

export function OrchestratorHealthPanel() {
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month');
  const { currentOrganization } = useOrganization();

  const { data, isLoading } = useQuery({
    queryKey: ['orchestrator-health', currentOrganization?.id, dateRange],
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: result, error } = await supabase.functions.invoke('agent-orchestrator-analytics', {
        body: {
          action: 'compute_stats',
          organization_id: currentOrganization!.id,
          date_range: dateRange,
        },
      });
      if (error) throw error;
      return result as { stats: OrchestratorStats; suggestions: Suggestion[] };
    },
  });

  const stats = data?.stats;
  const suggestions = data?.suggestions || [];

  // Prepare stage duration chart data
  const durationData = stats
    ? Object.entries(stats.stage_durations)
        .filter(([stage]) => ['strategy', 'create', 'quality', 'approval', 'publish', 'analyze'].includes(stage))
        .map(([stage, ms]) => ({
          stage: STAGE_LABELS[stage] || stage,
          id: stage,
          seconds: Math.round(ms / 1000),
          fill: STAGE_COLORS[stage] || 'hsl(var(--muted-foreground))',
        }))
    : [];

  // Fail rate data
  const failRateData = stats
    ? Object.entries(stats.stage_fail_rates)
        .filter(([stage]) => ['strategy', 'create', 'quality', 'approval', 'publish'].includes(stage))
        .map(([stage, data]) => ({
          stage: STAGE_LABELS[stage] || stage,
          id: stage,
          rate: data.rate,
          fill: data.rate > 20 ? 'hsl(0, 72%, 60%)' : data.rate > 10 ? 'hsl(38, 92%, 50%)' : 'hsl(160, 84%, 39%)',
        }))
    : [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          Đang tải dữ liệu Orchestrator...
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center text-sm text-muted-foreground">
          Chưa có dữ liệu pipeline
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Sức khỏe Orchestrator</h3>
        </div>
        <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
          <SelectTrigger className="w-auto h-8 text-xs gap-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">7 ngày</SelectItem>
            <SelectItem value="month">30 ngày</SelectItem>
            <SelectItem value="all">90 ngày</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <HealthStatCard
          icon={<Zap className="w-4 h-4 text-blue-500" />}
          iconBg="bg-blue-500/10"
          value={stats.total_pipelines}
          label="Tổng pipeline"
        />
        <HealthStatCard
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          iconBg="bg-emerald-500/10"
          value={`${stats.pass_rate}%`}
          label="Tỷ lệ thành công"
        />
        <HealthStatCard
          icon={<AlertTriangle className="w-4 h-4 text-destructive" />}
          iconBg="bg-destructive/10"
          value={stats.failed}
          label="Bị flag"
        />
        <HealthStatCard
          icon={<Clock className="w-4 h-4 text-amber-500" />}
          iconBg="bg-amber-500/10"
          value={stats.stage_bottleneck ? STAGE_LABELS[stats.stage_bottleneck] || stats.stage_bottleneck : '—'}
          label="Bottleneck"
        />
        <HealthStatCard
          icon={<RefreshCw className="w-4 h-4 text-purple-500" />}
          iconBg="bg-purple-500/10"
          value={stats.recovery_count}
          label="Lần phục hồi"
        />
        <HealthStatCard
          icon={<Shield className="w-4 h-4 text-cyan-500" />}
          iconBg="bg-cyan-500/10"
          value={stats.avg_quality_score != null ? `${stats.avg_quality_score}` : '—'}
          label="Quality TB"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stage Duration */}
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              Thời gian TB mỗi stage (giây)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {durationData.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
                Chưa có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={durationData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => [`${value}s`, 'Thời gian TB']}
                  />
                  <Bar dataKey="seconds" radius={[4, 4, 0, 0]}>
                    {durationData.map((entry) => (
                      <Cell key={entry.id} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Stage Fail Rates */}
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              Tỷ lệ lỗi theo stage (%)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {failRateData.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
                Chưa có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={failRateData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => [`${value}%`, 'Tỷ lệ lỗi']}
                  />
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                    {failRateData.map((entry) => (
                      <Cell key={entry.id} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Suggestions + Top Failure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Auto-tuning Suggestions */}
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Gợi ý tối ưu
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {suggestions.length === 0 ? (
              <div className="h-[80px] flex items-center justify-center text-xs text-muted-foreground">
                Hệ thống đang hoạt động tốt — không có gợi ý
              </div>
            ) : (
              <div className="space-y-2.5">
                {suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Badge
                      variant={s.priority === 'high' ? 'destructive' : 'secondary'}
                      className="text-[9px] h-4 px-1.5 mt-0.5 shrink-0"
                    >
                      {s.priority === 'high' ? 'Cao' : 'TB'}
                    </Badge>
                    <span className="text-muted-foreground">{s.message}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Failure Reason */}
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              Lỗi phổ biến nhất
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-3">
              {stats.top_failure_reason ? (
                <>
                  <div className="p-3 rounded-lg bg-destructive/10">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {FAILURE_LABELS[stats.top_failure_reason] || stats.top_failure_reason}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stats.failed} pipeline bị ảnh hưởng
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Không có lỗi trong khoảng thời gian này
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function HealthStatCard({ icon, iconBg, value, label }: {
  icon: React.ReactNode;
  iconBg: string;
  value: string | number;
  label: string;
}) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", iconBg)}>{icon}</div>
        <div>
          <p className="text-lg font-bold">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
