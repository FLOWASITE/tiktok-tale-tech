import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, AlertTriangle, CheckCircle2, Zap, ChevronRight } from 'lucide-react';
import { AgentGoal, AgentPipeline, PIPELINE_STAGES } from '@/types/agent';
import { CampaignContentPlan } from '@/types/agent';
import { getGradeFromScore, GRADE_COLORS } from '@/types/creativeScore';
import { cn } from '@/lib/utils';
import { ChannelIcon, channelIconColors } from '@/components/ui/channel-icon';
import { Channel } from '@/types/multichannel';

const CHANNEL_TO_KEY: Record<string, Channel> = {
  facebook: 'facebook', tiktok: 'tiktok', instagram: 'instagram', linkedin: 'linkedin',
  twitter: 'twitter', youtube: 'youtube', email: 'email', blog: 'website', website: 'website',
  zalo: 'zalo_oa', 'zalo_oa': 'zalo_oa', threads: 'threads', telegram: 'telegram',
};

interface CampaignMetricCardProps {
  goal: AgentGoal;
  pipelines: AgentPipeline[];
  plan?: CampaignContentPlan;
  onClick?: () => void;
}

export function CampaignMetricCard({ goal, pipelines, plan, onClick }: CampaignMetricCardProps) {
  const metrics = useMemo(() => {
    const goalPipelines = pipelines.filter(p => p.goal_id === goal.id);
    const completed = goalPipelines.filter(p => p.completed_at || p.current_stage === 'analyze').length;
    const running = goalPipelines.filter(p => !p.completed_at && p.current_stage !== 'analyze').length;
    const flagged = goalPipelines.filter(p => p.is_flagged).length;
    const total = plan?.total_pieces || goalPipelines.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Avg quality
    const scored = goalPipelines.filter(p => p.overall_quality_score != null);
    const avgScore = scored.length
      ? Math.round(scored.reduce((s, p) => s + (p.overall_quality_score || 0), 0) / scored.length)
      : null;
    const grade = avgScore != null ? getGradeFromScore(avgScore) : null;

    // Stage distribution
    const stageCounts: Record<string, number> = {};
    PIPELINE_STAGES.forEach(s => (stageCounts[s.id] = 0));
    goalPipelines.filter(p => !p.completed_at).forEach(p => {
      stageCounts[p.current_stage] = (stageCounts[p.current_stage] || 0) + 1;
    });

    return { total, completed, running, flagged, pct, avgScore, grade, stageCounts, pipelineCount: goalPipelines.length };
  }, [goal.id, pipelines, plan]);

  const STAGE_DOT_COLORS: Record<string, string> = {
    strategy: 'bg-violet-500',
    create: 'bg-blue-500',
    quality: 'bg-cyan-500',
    approval: 'bg-amber-500',
    publish: 'bg-emerald-500',
    analyze: 'bg-pink-500',
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:border-primary/30',
        goal.is_paused && 'opacity-60'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Target className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-sm font-semibold truncate">{goal.name}</span>
            <Badge
              variant={goal.is_paused ? 'secondary' : 'default'}
              className="text-[9px] h-4 px-1.5 shrink-0"
            >
              {goal.is_paused ? 'Tạm dừng' : 'Đang chạy'}
            </Badge>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {(goal.target_channels || []).slice(0, 4).map(ch => {
              const key = CHANNEL_TO_KEY[ch.toLowerCase()] || 'website' as Channel;
              return (
                <ChannelIcon key={ch} channel={key} size={12} className={channelIconColors[key]} />
              );
            })}
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-1" />
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-4 gap-2">
          <MiniStat icon={<Zap className="w-3 h-3 text-blue-500" />} value={metrics.pipelineCount} label="Tổng" />
          <MiniStat icon={<CheckCircle2 className="w-3 h-3 text-emerald-500" />} value={metrics.completed} label="Xong" />
          <MiniStat icon={<Zap className="w-3 h-3 text-amber-500" />} value={metrics.running} label="Đang chạy" />
          <MiniStat
            icon={<AlertTriangle className="w-3 h-3 text-destructive" />}
            value={metrics.flagged}
            label="Lỗi"
            highlight={metrics.flagged > 0}
          />
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{metrics.completed}/{metrics.total} bài</span>
            <div className="flex items-center gap-2">
              {metrics.avgScore != null && metrics.grade && (
                <span className="flex items-center gap-1">
                  <span className="font-medium text-foreground">{metrics.avgScore}</span>
                  <Badge className={cn(GRADE_COLORS[metrics.grade], 'text-[8px] h-3.5 px-1')}>{metrics.grade}</Badge>
                </span>
              )}
              <span className="font-medium">{metrics.pct}%</span>
            </div>
          </div>
          <Progress value={metrics.pct} className="h-1.5" />
        </div>

        {/* Stage Distribution Dots */}
        <div className="flex items-center gap-1">
          {PIPELINE_STAGES.map(stage => {
            const count = metrics.stageCounts[stage.id] || 0;
            return (
              <div key={stage.id} className="flex items-center gap-0.5" title={`${stage.label}: ${count}`}>
                <div
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    count > 0 ? STAGE_DOT_COLORS[stage.id] : 'bg-muted'
                  )}
                />
                {count > 1 && (
                  <span className="text-[8px] text-muted-foreground font-medium">{count}</span>
                )}
              </div>
            );
          })}
          <span className="text-[8px] text-muted-foreground ml-auto">
            {PIPELINE_STAGES.map(s => s.label.charAt(0)).join(' · ')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon, value, label, highlight }: { icon: React.ReactNode; value: number; label: string; highlight?: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 rounded-md p-1.5',
      highlight ? 'bg-destructive/10' : 'bg-muted/50'
    )}>
      {icon}
      <div>
        <p className={cn('text-xs font-bold leading-none', highlight && 'text-destructive')}>{value}</p>
        <p className="text-[8px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
