import { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Lightbulb, PenTool, ShieldCheck, UserCheck, Send, BarChart3, InboxIcon, AlertTriangle, Clock, Check, X, CheckCircle2, FileText, Video, Images } from 'lucide-react';
import { AgentPipeline, AgentPipelineStage, AgentApproval, PIPELINE_STAGES, ContentType } from '@/types/agent';
import { ChannelIcon } from '@/components/multichannel/streaming/ChannelIcon';
import { getGradeFromScore } from '@/types/creativeScore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PipelineDetailDialog } from './PipelineDetailDialog';

const TOTAL_STAGES = 6;

function calculatePipelineProgress(pipeline: AgentPipeline): { percent: number; completedCount: number } {
  if (pipeline.completed_at) return { percent: 100, completedCount: TOTAL_STAGES };

  const stages = (pipeline.pipeline_state as any)?.stages;
  if (!stages || typeof stages !== 'object') {
    // Fallback: estimate from current_stage position
    const idx = PIPELINE_STAGES.findIndex(s => s.id === pipeline.current_stage);
    return { percent: Math.round((idx / TOTAL_STAGES) * 100), completedCount: idx };
  }

  let completedCount = 0;
  let hasInProgress = false;
  for (const val of Object.values(stages) as any[]) {
    if (val?.status === 'completed') completedCount++;
    if (val?.status === 'in_progress') hasInProgress = true;
  }

  const progress = ((completedCount + (hasInProgress ? 0.5 : 0)) / TOTAL_STAGES) * 100;
  return { percent: Math.min(Math.round(progress), 100), completedCount };
}

const CONTENT_TYPE_CONFIG: Record<ContentType, { label: string; icon: any; color: string }> = {
  multichannel: { label: 'Bài viết', icon: FileText, color: 'text-blue-400' },
  video_script: { label: 'Video', icon: Video, color: 'text-pink-400' },
  carousel: { label: 'Carousel', icon: Images, color: 'text-purple-400' },
};

const GRADE_COLORS: Record<string, string> = {
  'A+': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'A': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'B': 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  'C': 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'D': 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  'F': 'bg-destructive/15 text-destructive border-destructive/25',
};

const STAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Lightbulb, PenTool, ShieldCheck, UserCheck, Send, BarChart3,
};

interface PipelineKanbanProps {
  pipelines: AgentPipeline[];
  approvals?: AgentApproval[];
  onStageChange?: (id: string, stage: AgentPipelineStage) => void;
  onFlagToggle?: (id: string, flagged: boolean) => void;
  onDelete?: (id: string) => void;
  onApprove?: (approvalId: string, notes?: string) => void;
  onReject?: (approvalId: string, notes: string) => void;
}

function PipelineColumn({ stage, pipelines, onCardClick, approvalMap, onApprove, onReject }: { stage: typeof PIPELINE_STAGES[0]; pipelines: AgentPipeline[]; onCardClick?: (p: AgentPipeline) => void; approvalMap?: Map<string, AgentApproval>; onApprove?: (id: string, notes?: string) => void; onReject?: (id: string, notes: string) => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.id });
  const Icon = STAGE_ICONS[stage.icon] || Lightbulb;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-shrink-0 min-w-[260px] w-[260px] rounded-2xl border-2 transition-colors duration-200',
        isOver
          ? 'border-primary bg-primary/5 shadow-xl shadow-primary/20'
          : 'border-border/40 bg-gradient-to-b from-background to-muted/10 hover:border-border/60'
      )}
    >
      <div className={cn('p-3 rounded-t-[14px] border-b border-border/20 bg-gradient-to-r', stage.color)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-background/50 backdrop-blur-sm">
              <Icon className="w-3.5 h-3.5 text-foreground/70" />
            </div>
            <h3 className="font-semibold text-xs">{stage.label}</h3>
          </div>
          <Badge variant="secondary" className="text-[10px] font-bold min-w-[24px] h-5 justify-center bg-background/80">
            {pipelines.length}
          </Badge>
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-420px)] min-h-[300px]">
        <div className="p-2 space-y-2">
          {pipelines.map(p => (
            <PipelineCard
              key={p.id}
              pipeline={p}
              onClick={() => onCardClick?.(p)}
              approval={approvalMap?.get(p.id)}
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
          {pipelines.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <InboxIcon className="w-6 h-6 text-muted-foreground/20 mb-2" />
              <p className="text-[11px] text-muted-foreground/40">Trống</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function PipelineCard({ pipeline, isDragging, onClick, approval, onApprove, onReject }: { pipeline: AgentPipeline; isDragging?: boolean; onClick?: () => void; approval?: AgentApproval; onApprove?: (id: string, notes?: string) => void; onReject?: (id: string, notes: string) => void }) {
  const priorityColors: Record<string, string> = {
    urgent: 'border-l-red-500',
    high: 'border-l-orange-500',
    normal: 'border-l-blue-500',
    low: 'border-l-muted-foreground/30',
  };

  const isCompleted = !!pipeline.completed_at;
  const isRunning = !isCompleted && !pipeline.is_flagged;
  const isApprovalPending = pipeline.current_stage === 'approval' && approval?.status === 'pending';
  const { percent: progress, completedCount } = calculatePipelineProgress(pipeline);
  const stageLabel = PIPELINE_STAGES.find(s => s.id === pipeline.current_stage)?.label;
  const grade = pipeline.overall_quality_score != null ? getGradeFromScore(pipeline.overall_quality_score) : null;

  return (
    <Card
      className={cn(
        'border-l-[3px] cursor-grab active:cursor-grabbing transition-all hover:shadow-md',
        priorityColors[pipeline.priority] || 'border-l-border',
        isDragging && 'opacity-80 rotate-2 shadow-2xl scale-105',
        pipeline.is_flagged && 'ring-1 ring-destructive/50',
        isCompleted && 'border-l-emerald-500',
        isApprovalPending && 'ring-1 ring-amber-500/30 bg-amber-500/[0.03]',
      )}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-1.5 min-w-0">
            {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />}
            {isRunning && !isCompleted && (
              <span className="relative flex h-2 w-2 flex-shrink-0 mt-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
            )}
            <p className="text-xs font-medium line-clamp-2 leading-relaxed">{pipeline.content_title}</p>
          </div>
          {pipeline.is_flagged && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">{pipeline.flag_reason || 'Cần xem xét'}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-1 w-full bg-secondary overflow-hidden rounded-full">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isCompleted ? 'bg-emerald-500' : pipeline.is_flagged ? 'bg-destructive' : 'bg-primary'
              )}
              style={{ width: `${isCompleted ? 100 : progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground">{stageLabel}</span>
            <span className="text-[9px] text-muted-foreground">{completedCount}/{TOTAL_STAGES} bước</span>
          </div>
        </div>

        {pipeline.content_topic && (
          <p className="text-[10px] text-muted-foreground line-clamp-1">{pipeline.content_topic}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[9px] h-4 px-1.5">
              {pipeline.priority}
            </Badge>
            {grade && (
              <Badge className={cn('text-[9px] h-4 px-1.5 font-bold border', GRADE_COLORS[grade])}>
                {grade}
              </Badge>
            )}
          </div>
          {pipeline.estimated_completion && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {formatDistanceToNow(new Date(pipeline.estimated_completion), { locale: vi, addSuffix: true })}
            </span>
          )}
        </div>
        {/* Approve/Reject buttons for approval stage */}
        {isApprovalPending && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-border/30">
            <Button
              size="sm"
              variant="default"
              className="h-7 flex-1 text-[10px] gap-1"
              onClick={(e) => { e.stopPropagation(); onApprove?.(approval!.id); }}
            >
              <Check className="w-3 h-3" /> Duyệt
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 flex-1 text-[10px] gap-1"
              onClick={(e) => { e.stopPropagation(); onReject?.(approval!.id, 'Từ chối từ Kanban'); }}
            >
              <X className="w-3 h-3" /> Từ chối
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PipelineKanban({ pipelines, approvals, onStageChange, onFlagToggle, onDelete, onApprove, onReject }: PipelineKanbanProps) {
  const [activePipeline, setActivePipeline] = useState<AgentPipeline | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<AgentPipeline | null>(null);

  // Map pipeline_id -> approval for quick lookup
  const approvalMap = useMemo(() => {
    const map = new Map<string, AgentApproval>();
    approvals?.forEach(a => map.set(a.pipeline_id, a));
    return map;
  }, [approvals]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const grouped = useMemo(() => {
    const map: Record<AgentPipelineStage, AgentPipeline[]> = {} as any;
    PIPELINE_STAGES.forEach(s => { map[s.id] = []; });
    pipelines.forEach(p => {
      if (map[p.current_stage]) map[p.current_stage].push(p);
    });
    return map;
  }, [pipelines]);

  const handleDragStart = (e: DragStartEvent) => {
    const p = pipelines.find(x => x.id === e.active.id);
    if (p) setActivePipeline(p);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActivePipeline(null);
    if (!e.over) return;
    const newStage = e.over.id as AgentPipelineStage;
    const id = e.active.id as string;
    const pipeline = pipelines.find(p => p.id === id);
    if (pipeline && pipeline.current_stage !== newStage && onStageChange) {
      onStageChange(id, newStage);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="w-full overflow-x-auto">
        <div className="flex gap-3 pb-4 min-w-max">
          {PIPELINE_STAGES.map(stage => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              pipelines={grouped[stage.id]}
              onCardClick={setSelectedPipeline}
              approvalMap={stage.id === 'approval' ? approvalMap : undefined}
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
        </div>
      </div>
      <DragOverlay>
        {activePipeline && <PipelineCard pipeline={activePipeline} isDragging />}
      </DragOverlay>
      <PipelineDetailDialog
        pipeline={selectedPipeline}
        open={!!selectedPipeline}
        onOpenChange={(open) => { if (!open) setSelectedPipeline(null); }}
        onStageChange={(id, stage) => { onStageChange?.(id, stage); setSelectedPipeline(null); }}
        onFlagToggle={onFlagToggle}
        onDelete={(id) => { onDelete?.(id); setSelectedPipeline(null); }}
      />
    </DndContext>
  );
}
