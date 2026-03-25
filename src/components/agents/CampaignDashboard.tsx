import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Target, ChevronRight, Calendar, Clock, CheckCircle2,
  AlertCircle, Pause, Play, Loader2, Sparkles, ArrowLeft, RefreshCw, ShieldAlert
} from 'lucide-react';
import { useAgentGoals } from '@/hooks/useAgentGoals';
import { useAgentPipelines } from '@/hooks/useAgentPipelines';
import { useAgentApprovals } from '@/hooks/useAgentApprovals';
import { useCampaignPlans } from '@/hooks/useCampaignPlans';
import { CampaignContentPlan, CampaignContentPiece, AgentGoal } from '@/types/agent';
import { CampaignPlanReview } from './CampaignPlanReview';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Target }> = {
  draft: { label: 'Nháp', color: 'bg-muted text-muted-foreground', icon: Target },
  clarifying: { label: 'Đang làm rõ', color: 'bg-violet-500/10 text-violet-600', icon: Sparkles },
  planning: { label: 'Đang lên kế hoạch', color: 'bg-blue-500/10 text-blue-600', icon: Sparkles },
  planned: { label: 'Chờ duyệt', color: 'bg-amber-500/10 text-amber-600', icon: Clock },
  approved: { label: 'Đã duyệt', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle2 },
  executing: { label: 'Đang thực thi', color: 'bg-primary/10 text-primary', icon: Play },
  completed: { label: 'Hoàn thành', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle2 },
  paused: { label: 'Tạm dừng', color: 'bg-muted text-muted-foreground', icon: Pause },
};

export function CampaignDashboard() {
  const { goals } = useAgentGoals();
  const { pipelines } = useAgentPipelines();
  const { plans, isLoading, updatePlan } = useCampaignPlans();
  const [selectedPlan, setSelectedPlan] = useState<{ plan: CampaignContentPlan; goalName: string } | null>(null);
  const [recovering, setRecovering] = useState(false);

  // Detect stuck pipelines (stage_started_at > 15 min, not completed, not approval)
  const stuckPipelines = pipelines.filter(p => {
    if (p.completed_at || p.current_stage === 'approval') return false;
    const pState = (p.pipeline_state as any) || { stages: {} };
    const stageState = pState.stages?.[p.current_stage];
    if (stageState?.status === 'completed') return false;
    if (!stageState?.started_at && !p.updated_at) return false;
    const startedAt = stageState?.started_at || p.updated_at;
    const elapsed = Date.now() - new Date(startedAt).getTime();
    return elapsed > 15 * 60 * 1000; // 15 minutes
  });

  const handleRecoverStuck = async () => {
    setRecovering(true);
    try {
      const { error } = await supabase.functions.invoke('agent-pipeline', {
        body: { action: 'recover_stuck' },
      });
      if (error) throw error;
      toast.success(`Đã khôi phục ${stuckPipelines.length} pipeline bị kẹt`);
    } catch (e: any) {
      toast.error(`Khôi phục thất bại: ${e.message}`);
    } finally {
      setRecovering(false);
    }
  };

  if (selectedPlan) {
    return (
      <div className="space-y-3">
        <Button
          variant="ghost" size="sm" className="gap-1.5 text-xs -ml-2"
          onClick={() => setSelectedPlan(null)}
        >
          <ArrowLeft className="w-3 h-3" /> Quay lại
        </Button>
        <CampaignPlanReview
          plan={selectedPlan.plan}
          goalName={selectedPlan.goalName}
          onClose={() => setSelectedPlan(null)}
        />
      </div>
    );
  }

  // Build campaign data: merge goals with their plans
  const campaignData = goals.map(goal => {
    const goalPlans = plans.filter(p => p.goal_id === goal.id);
    const latestPlan = goalPlans[0]; // most recent
    const goalPipelines = pipelines.filter(p => p.goal_id === goal.id);

    const totalPieces = latestPlan?.total_pieces || 0;
    const completedPieces = latestPlan
      ? ((latestPlan.plan_data || []) as CampaignContentPiece[]).filter(p => p.status === 'completed').length
      : goalPipelines.filter(p => p.current_stage === 'analyze' || p.completed_at).length;
    const inProgressPieces = latestPlan
      ? ((latestPlan.plan_data || []) as CampaignContentPiece[]).filter(p => p.status === 'in_progress').length
      : goalPipelines.filter(p => p.current_stage !== 'analyze' && !p.completed_at).length;

    const effectiveTotalPieces = totalPieces || goalPipelines.length;
    const progressPercent = effectiveTotalPieces > 0 ? (completedPieces / effectiveTotalPieces) * 100 : 0;

    // Determine status
    let status = latestPlan?.status || (goalPipelines.length > 0 ? 'executing' : 'draft');
    if (!latestPlan && goal.is_paused) status = 'paused';

    // Timeline info
    const startDate = latestPlan?.campaign_start_date || goal.campaign_start_date;
    const endDate = latestPlan?.campaign_end_date || goal.campaign_end_date;
    const daysRemaining = endDate ? differenceInDays(new Date(endDate), new Date()) : null;

    // Channel distribution
    const channels: string[] = [];
    if (latestPlan) {
      ((latestPlan.plan_data || []) as CampaignContentPiece[]).forEach(p => {
        if (p.target_channel && !channels.includes(p.target_channel)) channels.push(p.target_channel);
      });
    } else {
      (goal.target_channels || []).forEach(ch => {
        if (!channels.includes(ch)) channels.push(ch);
      });
    }

    return {
      goal,
      plan: latestPlan,
      totalPieces: effectiveTotalPieces,
      completedPieces,
      inProgressPieces,
      progressPercent,
      status,
      startDate,
      endDate,
      daysRemaining,
      channels,
    };
  });

  // Stats
  const activeCampaigns = campaignData.filter(c => c.status === 'executing').length;
  const totalCompleted = campaignData.reduce((sum, c) => sum + c.completedPieces, 0);
  const totalInProgress = campaignData.reduce((sum, c) => sum + c.inProgressPieces, 0);
  const totalPending = campaignData.filter(c => c.status === 'planned').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (campaignData.length === 0) {
    return (
      <div className="text-center py-16">
        <Target className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Chưa có campaign nào có kế hoạch nội dung</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Tạo campaign mới để bắt đầu</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stuck pipelines recovery alert */}
      {stuckPipelines.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <span className="font-semibold">{stuckPipelines.length} pipeline</span> bị kẹt hơn 15 phút
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs shrink-0 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
              onClick={handleRecoverStuck}
              disabled={recovering}
            >
              {recovering ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Khôi phục
            </Button>
          </CardContent>
        </Card>
      )}
      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10"><Play className="w-3.5 h-3.5 text-primary" /></div>
            <div>
              <p className="text-base font-bold">{activeCampaigns}</p>
              <p className="text-[9px] text-muted-foreground">Đang chạy</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /></div>
            <div>
              <p className="text-base font-bold">{totalCompleted}</p>
              <p className="text-[9px] text-muted-foreground">Hoàn thành</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10"><Clock className="w-3.5 h-3.5 text-amber-500" /></div>
            <div>
              <p className="text-base font-bold">{totalInProgress}</p>
              <p className="text-[9px] text-muted-foreground">Đang xử lý</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10"><AlertCircle className="w-3.5 h-3.5 text-blue-500" /></div>
            <div>
              <p className="text-base font-bold">{totalPending}</p>
              <p className="text-[9px] text-muted-foreground">Chờ duyệt</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Cards */}
      <div className="space-y-3">
        {campaignData.map(({ goal, plan, totalPieces, completedPieces, progressPercent, status, startDate, endDate, daysRemaining, channels }) => {
          const statusConf = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
          const StatusIcon = statusConf.icon;

          return (
            <Card
              key={goal.id}
              className="group cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => {
                if (plan) setSelectedPlan({ plan, goalName: goal.name });
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Title + Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{goal.name}</p>
                      <Badge variant="outline" className={cn('text-[9px] h-4 gap-0.5', statusConf.color)}>
                        <StatusIcon className="w-2.5 h-2.5" />
                        {statusConf.label}
                      </Badge>
                    </div>

                    {/* Progress */}
                    {totalPieces > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            {completedPieces}/{totalPieces} nội dung
                          </span>
                          <span className="text-[10px] font-medium">{Math.round(progressPercent)}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-1.5" />
                      </div>
                    )}

                    {/* Timeline + Channels */}
                    <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground">
                      {startDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(startDate), 'dd/MM')}
                          {endDate && ` → ${format(new Date(endDate), 'dd/MM')}`}
                        </span>
                      )}
                      {daysRemaining !== null && daysRemaining > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Còn {daysRemaining} ngày
                        </span>
                      )}
                      {channels.length > 0 && (
                        <div className="flex items-center gap-1">
                          {channels.map(ch => (
                            <Badge key={ch} variant="outline" className="text-[8px] h-3.5 px-1">
                              {ch}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Piece mini-timeline */}
                    {plan && totalPieces > 0 && (
                      <div className="flex items-center gap-0.5">
                        {((plan.plan_data || []) as CampaignContentPiece[]).map((piece) => {
                          const dotColor = piece.status === 'completed' ? 'bg-emerald-500'
                            : piece.status === 'in_progress' ? 'bg-amber-500'
                            : piece.status === 'failed' ? 'bg-destructive'
                            : 'bg-muted-foreground/30';
                          return (
                            <div
                              key={piece.piece_number}
                              className={cn('w-2 h-2 rounded-full', dotColor)}
                              title={`#${piece.piece_number}: ${piece.title} (${piece.status})`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  {plan && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-1" />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
