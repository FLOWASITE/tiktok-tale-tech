import { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Search, PenTool, ShieldCheck, UserCheck, Send, BarChart3, InboxIcon, AlertTriangle, Clock } from 'lucide-react';
import { AgentPipeline, AgentPipelineStage, PIPELINE_STAGES } from '@/types/agent';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PipelineDetailDialog } from './PipelineDetailDialog';

const STAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Search, PenTool, Gauge, Layers, ShieldCheck, UserCheck, Calendar, Send, BarChart3,
};

interface PipelineKanbanProps {
  pipelines: AgentPipeline[];
  onStageChange?: (id: string, stage: AgentPipelineStage) => void;
  onFlagToggle?: (id: string, flagged: boolean) => void;
  onDelete?: (id: string) => void;
}

function PipelineColumn({ stage, pipelines, onCardClick }: { stage: typeof PIPELINE_STAGES[0]; pipelines: AgentPipeline[]; onCardClick?: (p: AgentPipeline) => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.id });
  const Icon = STAGE_ICONS[stage.icon] || Search;

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
            <PipelineCard key={p.id} pipeline={p} onClick={() => onCardClick?.(p)} />
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

function PipelineCard({ pipeline, isDragging, onClick }: { pipeline: AgentPipeline; isDragging?: boolean; onClick?: () => void }) {
  const priorityColors: Record<string, string> = {
    urgent: 'border-l-red-500',
    high: 'border-l-orange-500',
    normal: 'border-l-blue-500',
    low: 'border-l-muted-foreground/30',
  };

  return (
    <Card
      className={cn(
        'border-l-[3px] cursor-grab active:cursor-grabbing transition-all hover:shadow-md',
        priorityColors[pipeline.priority] || 'border-l-border',
        isDragging && 'opacity-80 rotate-2 shadow-2xl scale-105',
        pipeline.is_flagged && 'ring-1 ring-destructive/50',
      )}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium line-clamp-2 leading-relaxed">{pipeline.content_title}</p>
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
        {pipeline.content_topic && (
          <p className="text-[10px] text-muted-foreground line-clamp-1">{pipeline.content_topic}</p>
        )}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[9px] h-4 px-1.5">
            {pipeline.priority}
          </Badge>
          {pipeline.estimated_completion && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {formatDistanceToNow(new Date(pipeline.estimated_completion), { locale: vi, addSuffix: true })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PipelineKanban({ pipelines, onStageChange, onFlagToggle, onDelete }: PipelineKanbanProps) {
  const [activePipeline, setActivePipeline] = useState<AgentPipeline | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<AgentPipeline | null>(null);

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
            <PipelineColumn key={stage.id} stage={stage} pipelines={grouped[stage.id]} onCardClick={setSelectedPipeline} />
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
