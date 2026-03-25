import { Card, CardContent } from '@/components/ui/card';
import { AgentPipeline } from '@/types/agent';
import { Activity, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface PipelineStatsCardsProps {
  pipelines: AgentPipeline[];
}

export function PipelineStatsCards({ pipelines }: PipelineStatsCardsProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayPipelines = pipelines.filter(p => new Date(p.created_at) >= today);
  const completed = pipelines.filter(p => p.current_stage === 'analyze' || p.completed_at);
  const failed = pipelines.filter(p => p.is_flagged);
  const running = pipelines.filter(p =>
    !p.is_flagged &&
    p.current_stage !== 'analyze' &&
    !p.completed_at
  );

  const successRate = pipelines.length > 0
    ? Math.round((completed.length / pipelines.length) * 100)
    : 0;

  const completedWithTime = completed.filter(p => p.completed_at && p.created_at);
  const avgTimeMs = completedWithTime.length > 0
    ? completedWithTime.reduce((acc, p) => acc + (new Date(p.completed_at!).getTime() - new Date(p.created_at).getTime()), 0) / completedWithTime.length
    : 0;
  const avgTimeMin = Math.round(avgTimeMs / 60000);

  const stats = [
    { label: 'Hôm nay', value: todayPipelines.length, icon: Clock, color: 'text-blue-500', progress: pipelines.length > 0 ? Math.round((todayPipelines.length / pipelines.length) * 100) : 0, barColor: 'bg-blue-500' },
    { label: 'Tỷ lệ thành công', value: `${successRate}%`, icon: CheckCircle2, color: 'text-emerald-500', progress: successRate, barColor: 'bg-emerald-500' },
    { label: 'TB hoàn thành', value: avgTimeMin > 0 ? `${avgTimeMin} phút` : '—', icon: Activity, color: 'text-primary', progress: avgTimeMin > 0 ? Math.min(100, Math.round((avgTimeMin / 60) * 100)) : 0, barColor: 'bg-primary' },
    { label: 'Đang chạy', value: running.length, icon: Activity, color: 'text-amber-500', pulse: running.length > 0, progress: pipelines.length > 0 ? Math.round((running.length / pipelines.length) * 100) : 0, barColor: 'bg-amber-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map(s => (
        <Card key={s.label}>
          <CardContent className="pt-4 pb-4 px-4 space-y-2">
            <div className="flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color} ${s.pulse ? 'animate-pulse' : ''}`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
            <div className="h-1 w-full bg-secondary overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full transition-all duration-500 ${s.barColor}`}
                style={{ width: `${s.progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
