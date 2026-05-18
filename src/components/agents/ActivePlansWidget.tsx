import { useMemo } from 'react';
import { ArrowRight, BarChart3, CheckCircle2, Clock, Pause, Play, Sparkles, Target, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChannelIcon } from '@/components/ui/channel-icon';
import { cn } from '@/lib/utils';
import type {
  AgentGoal,
  CampaignContentPlan,
  CampaignContentPiece,
} from '@/types/agent';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Target }> = {
  draft:      { label: 'Nháp',             color: 'bg-muted text-muted-foreground',          icon: Target },
  clarifying: { label: 'Đang làm rõ',      color: 'bg-violet-500/10 text-violet-600',        icon: Sparkles },
  planning:   { label: 'Đang lên kế hoạch', color: 'bg-blue-500/10 text-blue-600',           icon: Sparkles },
  planned:    { label: 'Chờ duyệt',        color: 'bg-amber-500/10 text-amber-600',          icon: Clock },
  approved:   { label: 'Đã duyệt',         color: 'bg-emerald-500/10 text-emerald-600',      icon: CheckCircle2 },
  executing:  { label: 'Đang chạy',        color: 'bg-primary/10 text-primary',              icon: Play },
  completed:  { label: 'Hoàn thành',       color: 'bg-emerald-500/10 text-emerald-600',      icon: CheckCircle2 },
  paused:     { label: 'Tạm dừng',         color: 'bg-muted text-muted-foreground',          icon: Pause },
};

// Higher priority = shown first in the widget
const STATUS_PRIORITY: Record<string, number> = {
  executing: 5,
  planned:   4,
  approved:  3,
  planning:  2,
  clarifying: 1,
  paused:    0,
  draft:     0,
  completed: -1,
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

export function ActivePlansWidget({
  plans,
  goals,
  onOpenPlan,
  onViewAll,
  onCreate,
  maxItems = 3,
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
        // Newer first within same status
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
            <span className="text-[10px] font-normal text-muted-foreground">
              ({plans.length})
            </span>
          )}
        </CardTitle>
        {plans.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] gap-1"
            onClick={onViewAll}
          >
            Xem tất cả
            <ArrowRight className="w-3 h-3" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {visiblePlans.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-xs text-muted-foreground">
              Chưa có kế hoạch nào đang chạy
            </p>
            {onCreate && (
              <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={onCreate}>
                <Plus className="w-3 h-3" />
                Tạo campaign mới
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {visiblePlans.map(plan => {
              const goalName = goalNameMap.get(plan.goal_id) || 'Campaign';
              const statusConf = STATUS_CONFIG[plan.status] || STATUS_CONFIG.draft;
              const StatusIcon = statusConf.icon;
              const pieces = (plan.plan_data || []) as CampaignContentPiece[];
              const completed = pieces.filter(p => p.status === 'completed').length;
              const total = plan.total_pieces || pieces.length || 0;
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
              const channels = Array.from(new Set(
                pieces.map(p => p.target_channel).filter(Boolean)
              )).slice(0, 8);

              const startStr = formatDate(plan.campaign_start_date);
              const endStr = formatDate(plan.campaign_end_date);

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => onOpenPlan(plan.id, goalName)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border border-border bg-card/40',
                    'hover:border-primary/40 hover:bg-card transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30'
                  )}
                >
                  {/* Row 1: name + status + progress numbers */}
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{goalName}</p>
                      <Badge
                        variant="outline"
                        className={cn('text-[9px] h-4 gap-0.5 shrink-0', statusConf.color)}
                      >
                        <StatusIcon className="w-2.5 h-2.5" />
                        {statusConf.label}
                      </Badge>
                      {plan.approval_mode === 'full_auto' && (
                        <Badge variant="outline" className="text-[9px] h-4 bg-primary/5 shrink-0">
                          Tự động
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] tabular-nums shrink-0">
                      <span className="text-muted-foreground">
                        {completed.toLocaleString('vi-VN')}/{total.toLocaleString('vi-VN')}
                      </span>
                      <span className="font-semibold text-foreground w-9 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Row 2: channels + dates */}
                  <div className="flex items-center gap-2 mb-2 text-[10px] text-muted-foreground">
                    {channels.length > 0 && (
                      <div className="flex items-center gap-1">
                        {channels.map(ch => (
                          <ChannelIcon key={ch} channel={ch} size={14} />
                        ))}
                      </div>
                    )}
                    {(startStr || endStr) && (
                      <>
                        {channels.length > 0 && <span className="opacity-50">·</span>}
                        <span>
                          {startStr || '?'} → {endStr || '?'}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Row 3: progress bar */}
                  <Progress value={pct} className="h-1.5" />
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
