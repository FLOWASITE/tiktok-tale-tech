import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgentPipeline, PIPELINE_STAGES, AgentPipelineStage } from '@/types/agent';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { RefreshCw, CheckCircle, Eye, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

interface PipelineMonitorTableProps {
  pipelines: AgentPipeline[];
  isLoading: boolean;
}

const STAGE_ORDER: AgentPipelineStage[] = [
  'strategy', 'create', 'quality', 'approval', 'publish', 'analyze'
];

function StageProgressBar({ pipeline }: { pipeline: AgentPipeline }) {
  const pState = (pipeline.pipeline_state as any) || { stages: {} };
  const currentIdx = STAGE_ORDER.indexOf(pipeline.current_stage);

  return (
    <div className="flex items-center gap-0.5">
      {STAGE_ORDER.map((stage, idx) => {
        const stageState = pState.stages?.[stage];
        const status = stageState?.status || 'pending';
        let dotColor = 'bg-muted-foreground/20'; // pending

        if (status === 'completed') dotColor = 'bg-emerald-500';
        else if (status === 'failed') dotColor = 'bg-destructive';
        else if (status === 'retrying') dotColor = 'bg-amber-500 animate-pulse';
        else if (status === 'in_progress') dotColor = 'bg-primary animate-pulse';
        else if (idx < currentIdx) dotColor = 'bg-emerald-500';

        const stageLabel = PIPELINE_STAGES.find(s => s.id === stage)?.label || stage;

        return (
          <div key={stage} className="group relative">
            <div className={cn('w-3 h-3 rounded-full transition-all', dotColor)} />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-[10px] bg-popover text-popover-foreground rounded shadow-md border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              {stageLabel}
              {status !== 'pending' && ` (${status})`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PipelineMonitorTable({ pipelines, isLoading }: PipelineMonitorTableProps) {
  const [retrying, setRetrying] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleRetry = async (pipelineId: string) => {
    setRetrying(pipelineId);
    try {
      const { error } = await supabase.functions.invoke('agent-pipeline', {
        body: { action: 'run_stage', pipeline_id: pipelineId },
      });
      if (error) throw error;
      toast.success('Đã gửi lệnh retry pipeline');
      queryClient.invalidateQueries({ queryKey: ['agent-pipelines'] });
    } catch (e: any) {
      toast.error(`Retry thất bại: ${e.message}`);
    } finally {
      setRetrying(null);
    }
  };

  const handleApprove = async (pipelineId: string) => {
    try {
      const { error } = await supabase.functions.invoke('agent-approve', {
        body: { pipeline_id: pipelineId, action: 'approve' },
      });
      if (error) throw error;
      toast.success('Đã duyệt pipeline');
      queryClient.invalidateQueries({ queryKey: ['agent-pipelines'] });
    } catch (e: any) {
      toast.error(`Duyệt thất bại: ${e.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pipelines.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Chưa có pipeline nào. Tạo Goal trong trang AI Agents để bắt đầu.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nội dung</TableHead>
            <TableHead>Giai đoạn</TableHead>
            <TableHead>Tiến độ</TableHead>
            <TableHead>Tự trị</TableHead>
            <TableHead>Cập nhật</TableHead>
            <TableHead>Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pipelines.map(pipeline => {
            const stageInfo = PIPELINE_STAGES.find(s => s.id === pipeline.current_stage);
            const pState = (pipeline.pipeline_state as any) || { stages: {} };
            const currentStageState = pState.stages?.[pipeline.current_stage];
            const hasError = pipeline.is_flagged || currentStageState?.status === 'failed';

            return (
              <TableRow key={pipeline.id} className={hasError ? 'bg-destructive/5' : ''}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm truncate max-w-[200px]">{pipeline.content_title}</p>
                    {pipeline.content_topic && pipeline.content_topic !== pipeline.content_title && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{pipeline.content_topic}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={hasError ? 'destructive' : pipeline.current_stage === 'analyze' ? 'default' : 'secondary'} className="text-[11px]">
                    {stageInfo?.label || pipeline.current_stage}
                  </Badge>
                  {currentStageState?.last_error && (
                    <p className="text-[10px] text-destructive mt-1 truncate max-w-[150px]" title={currentStageState.last_error}>
                      {currentStageState.last_error}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <StageProgressBar pipeline={pipeline} />
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {pipeline.autonomy_level === 'full_auto' ? 'Tự động' :
                     pipeline.autonomy_level === 'human_on_loop' ? 'Giám sát' : 'Duyệt'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(pipeline.updated_at), { addSuffix: true, locale: vi })}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {hasError && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleRetry(pipeline.id)}
                        disabled={retrying === pipeline.id}
                        title="Retry"
                      >
                        {retrying === pipeline.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    )}
                    {pipeline.current_stage === 'approval' && pipeline.autonomy_level === 'human_in_loop' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-emerald-600"
                        onClick={() => handleApprove(pipeline.id)}
                        title="Duyệt"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {pipeline.content_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => window.open(`/core-content?id=${pipeline.content_id}`, '_blank')}
                        title="Xem nội dung"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
