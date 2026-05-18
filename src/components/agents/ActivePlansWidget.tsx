import { useMemo } from 'react';
import {
  ArrowRight, BarChart3, CheckCircle2, Clock, Pause, Play, Sparkles, Target, Plus,
  AlertTriangle, Loader2, FileEdit,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChannelIcon } from '@/components/ui/channel-icon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type {
  AgentGoal,
  CampaignContentPlan,
  CampaignContentPiece,
} from '@/types/agent';

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; icon: typeof Target }> = {
  draft:      { label: 'Nháp',             color: 'bg-muted text-muted-foreground',          dot: 'bg-muted-foreground',   icon: Target },
  clarifying: { label: 'Đang làm rõ',      color: 'bg-violet-500/10 text-violet-600',        dot: 'bg-violet-500',         icon: Sparkles },
  planning:   { label: 'Đang lên kế hoạch', color: 'bg-blue-500/10 text-blue-600',           dot: 'bg-blue-500',           icon: Sparkles },
  planned:    { label: 'Chờ duyệt',        color: 'bg-amber-500/10 text-amber-600',          dot: 'bg-amber-500',          icon: Clock },
  approved:   { label: 'Đã duyệt',         color: 'bg-emerald-500/10 text-emerald-600',      dot: 'bg-emerald-500',        icon: CheckCircle2 },
  executing:  { label: 'Đang chạy',        color: 'bg-primary/10 text-primary',              dot: 'bg-primary',            icon: Play },
  completed:  { label: 'Hoàn thành',       color: 'bg-emerald-500/10 text-emerald-600',      dot: 'bg-emerald-500',        icon: CheckCircle2 },
  paused:     { label: 'Tạm dừng',         color: 'bg-muted text-muted-foreground',          dot: 'bg-muted-foreground',   icon: Pause },
};

const STATUS_PRIORITY: Record<string, number> = {
  executing: 5, planned: 4, approved: 3, planning: 2, clarifying: 1, paused: 0, draft: 0, completed: -1,
};

interface ActivePlansWidgetProps {
  plans: CampaignContentPlan[];
  goals: AgentGoal[];
  onOpenPlan: (planId: string, goalName: string) => void;
  onViewAll: () => void;
  onCreate?: () => void;
  maxItems?: number;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function daysRemaining(iso: string | null): number | null {
  if (!iso) return null;
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / 86400000);
}

function progressColor(pct: number): string {
  if (pct >= 100) return 'hsl(var(--primary))';
  if (pct >= 75)  return 'hsl(var(--primary))';
  if (pct >= 50)  return 'hsl(45 93% 47%)';
  if (pct >= 25)  return 'hsl(25 95% 53%)';
  return 'hsl(var(--muted-foreground))';
}

/* ============== Donut ============== */
function CampaignDonut({ pct, done, total }: { pct: number; done: number; total: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * c;
  const color = progressColor(pct);
  return (
    <div className="flex flex-col items-center justify-center shrink-0">
      <div className="relative w-[72px] h-[72px]">
        <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
          <circle cx="36" cy="36" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
          <circle
            cx="36" cy="36" r={r} fill="none"
            stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold tabular-nums">{pct}%</span>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums mt-1">
        {done.toLocaleString('vi-VN')}/{total.toLocaleString('vi-VN')}
      </span>
    </div>
  );
}

/* ============== Channel breakdown ============== */
function ChannelBreakdownList({ pieces }: { pieces: CampaignContentPiece[] }) {
  const rows = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    pieces.forEach(p => {
      const ch = p.target_channel || 'other';
      const row = map.get(ch) || { total: 0, done: 0 };
      row.total += 1;
      if (p.status === 'completed') row.done += 1;
      map.set(ch, row);
    });
    return Array.from(map.entries())
      .map(([channel, v]) => ({ channel, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [pieces]);

  if (rows.length === 0) return null;
  const visible = rows.slice(0, 4);
  const rest = rows.length - visible.length;

  return (
    <div className="flex flex-col gap-1 min-w-0 flex-1">
      {visible.map(({ channel, done, total }) => {
        const pct = total > 0 ? done / total : 0;
        const filled = Math.round(pct * 10);
        return (
          <div key={channel} className="flex items-center gap-2 text-[11px]">
            <ChannelIcon channel={channel as any} size={14} />
            <span className="truncate flex-1 capitalize text-muted-foreground">{channel}</span>
            <div className="flex gap-[2px] shrink-0">
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'w-[5px] h-2 rounded-[1px]',
                    i < filled ? 'bg-primary' : 'bg-muted'
                  )}
                />
              ))}
            </div>
            <span className="tabular-nums text-muted-foreground w-10 text-right shrink-0">
              {done}/{total}
            </span>
          </div>
        );
      })}
      {rest > 0 && (
        <span className="text-[10px] text-muted-foreground italic">+{rest} kênh khác</span>
      )}
    </div>
  );
}

/* ============== Piece status funnel ============== */
const PIECE_PILLS: Array<{ key: CampaignContentPiece['status']; label: string; icon: typeof Target; cls: string }> = [
  { key: 'planned',     label: 'Nháp',     icon: FileEdit,    cls: 'bg-muted text-muted-foreground' },
  { key: 'in_progress', label: 'Đang tạo', icon: Loader2,     cls: 'bg-blue-500/10 text-blue-600' },
  { key: 'approved',    label: 'Đã duyệt', icon: CheckCircle2,cls: 'bg-violet-500/10 text-violet-600' },
  { key: 'completed',   label: 'Xong',     icon: CheckCircle2,cls: 'bg-emerald-500/10 text-emerald-600' },
  { key: 'failed',      label: 'Lỗi',      icon: AlertTriangle,cls:'bg-destructive/10 text-destructive' },
];

function PieceStatusFunnel({ pieces }: { pieces: CampaignContentPiece[] }) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    pieces.forEach(p => { c[p.status] = (c[p.status] || 0) + 1; });
    return c;
  }, [pieces]);

  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none -mx-0.5 px-0.5">
      {PIECE_PILLS.map(({ key, label, icon: Icon, cls }) => {
        const n = counts[key] || 0;
        const empty = n === 0;
        return (
          <div
            key={key}
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] shrink-0 border border-transparent',
              cls,
              empty && 'opacity-40'
            )}
          >
            <Icon className="w-2.5 h-2.5" />
            <span>{label}</span>
            <span className="tabular-nums font-semibold">{n}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ============== Schedule sparkline (14 days from today) ============== */
function ScheduleSparkline({ pieces }: { pieces: CampaignContentPiece[] }) {
  const data = useMemo(() => {
    const days = 14;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const buckets: { date: Date; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      buckets.push({ date: d, count: 0 });
    }
    pieces.forEach(p => {
      if (!p.scheduled_date) return;
      const d = new Date(p.scheduled_date);
      if (Number.isNaN(d.getTime())) return;
      d.setHours(0, 0, 0, 0);
      const idx = Math.floor((d.getTime() - today.getTime()) / 86400000);
      if (idx >= 0 && idx < days) buckets[idx].count += 1;
    });
    return buckets;
  }, [pieces]);

  const max = Math.max(1, ...data.map(b => b.count));
  const hasAny = data.some(b => b.count > 0);
  if (!hasAny) return null;

  const w = 140, h = 28, step = w / (data.length - 1);
  const points = data.map((b, i) => {
    const x = i * step;
    const y = h - (b.count / max) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground shrink-0">Lịch 14 ngày</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <svg viewBox={`0 0 ${w} ${h}`} className="h-7 flex-1" preserveAspectRatio="none">
              <polyline
                points={points}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {data.map((b, i) => b.count > 0 && (
                <circle key={i} cx={i * step} cy={h - (b.count / max) * (h - 4) - 2} r="1.5" fill="hsl(var(--primary))" />
              ))}
            </svg>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[10px]">
            {data.filter(b => b.count > 0).map((b, i) => (
              <div key={i} className="tabular-nums">
                {b.date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}: {b.count} item
              </div>
            ))}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

/* ============== Main widget ============== */
export function ActivePlansWidget({
  plans,
  goals,
  onOpenPlan,
  onViewAll,
  onCreate,
  maxItems = 2,
}: ActivePlansWidgetProps) {
  const goalNameMap = useMemo(() => {
    const m = new Map<string, string>();
    goals.forEach(g => m.set(g.id, g.name));
    return m;
  }, [goals]);

  const visiblePlans = useMemo(() => {
    return [...plans]
      .filter(p => (STATUS_PRIORITY[p.status] ?? 0) >= 0)
      .sort((a, b) => {
        const pa = STATUS_PRIORITY[a.status] ?? 0;
        const pb = STATUS_PRIORITY[b.status] ?? 0;
        if (pa !== pb) return pb - pa;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      })
      .slice(0, maxItems);
  }, [plans, maxItems]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          Kế hoạch đang chạy
          {plans.length > 0 && (
            <span className="text-[10px] font-normal text-muted-foreground">({plans.length})</span>
          )}
        </CardTitle>
        {plans.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={onViewAll}>
            Xem tất cả
            <ArrowRight className="w-3 h-3" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {visiblePlans.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-xs text-muted-foreground">Chưa có kế hoạch nào đang chạy</p>
            {onCreate && (
              <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={onCreate}>
                <Plus className="w-3 h-3" />
                Tạo campaign mới
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {visiblePlans.map(plan => {
              const goalName = goalNameMap.get(plan.goal_id) || 'Campaign';
              const statusConf = STATUS_CONFIG[plan.status] || STATUS_CONFIG.draft;
              const StatusIcon = statusConf.icon;
              const pieces = (plan.plan_data || []) as CampaignContentPiece[];
              const completed = pieces.filter(p => p.status === 'completed').length;
              const total = plan.total_pieces || pieces.length || 0;
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

              const startStr = formatDate(plan.campaign_start_date);
              const endStr = formatDate(plan.campaign_end_date);
              const remain = daysRemaining(plan.campaign_end_date);

              const failedCount = pieces.filter(p => p.status === 'failed').length;
              const pendingCount = pieces.filter(p => p.status === 'planned').length;

              let remainCls = 'bg-muted text-muted-foreground';
              if (remain !== null) {
                if (remain < 0) remainCls = 'bg-destructive/10 text-destructive';
                else if (remain < 3) remainCls = 'bg-destructive/10 text-destructive';
                else if (remain < 7) remainCls = 'bg-amber-500/10 text-amber-600';
              }

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => onOpenPlan(plan.id, goalName)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border border-border bg-card/40',
                    'hover:border-primary/40 hover:bg-card hover:shadow-sm transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30',
                    'space-y-3'
                  )}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={cn('w-2 h-2 rounded-full shrink-0', statusConf.dot)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium truncate">{goalName}</p>
                          <Badge variant="outline" className={cn('text-[9px] h-4 gap-0.5 shrink-0', statusConf.color)}>
                            <StatusIcon className="w-2.5 h-2.5" />
                            {statusConf.label}
                          </Badge>
                          {plan.approval_mode === 'full_auto' && (
                            <Badge variant="outline" className="text-[9px] h-4 bg-primary/5 shrink-0">Tự động</Badge>
                          )}
                        </div>
                        {(startStr || endStr) && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {startStr || '?'} → {endStr || '?'}
                          </p>
                        )}
                      </div>
                    </div>
                    {remain !== null && (
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded shrink-0 tabular-nums font-medium', remainCls)}>
                        {remain < 0 ? `Quá ${Math.abs(remain)} ngày` : `Còn ${remain} ngày`}
                      </span>
                    )}
                  </div>

                  {/* Donut + Channel breakdown */}
                  <div className="flex flex-col md:grid md:grid-cols-[80px_1fr] gap-3 md:gap-4 items-center md:items-start">
                    <CampaignDonut pct={pct} done={completed} total={total} />
                    <ChannelBreakdownList pieces={pieces} />
                  </div>

                  {/* Funnel */}
                  <PieceStatusFunnel pieces={pieces} />

                  {/* Sparkline */}
                  <ScheduleSparkline pieces={pieces} />

                  {/* Footer alerts + CTA */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {pendingCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {pendingCount} chờ duyệt
                        </span>
                      )}
                      {failedCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {failedCount} lỗi
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-primary flex items-center gap-1 ml-auto">
                      Mở chi tiết
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
