import { useState, useMemo } from 'react';
import { useAgentPipelines } from '@/hooks/useAgentPipelines';
import { useAgentApprovals } from '@/hooks/useAgentApprovals';
import { PipelineStatsCards } from '@/components/agents/PipelineStatsCards';
import { PipelineMonitorTable } from '@/components/agents/PipelineMonitorTable';
import { ApproveWithScheduleDialog } from '@/components/agents/ApproveWithScheduleDialog';
import { Activity, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AgentPipeline } from '@/types/agent';

type StatusFilter = 'all' | 'running' | 'completed' | 'flagged';

export default function AgentMonitorPage() {
  const { pipelines, isLoading, retryPipeline } = useAgentPipelines();
  const { approvals, updateApproval } = useAgentApprovals();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [approveTarget, setApproveTarget] = useState<AgentPipeline | null>(null);

  const filteredPipelines = useMemo(() => {
    let result = pipelines;

    if (statusFilter === 'running') {
      result = result.filter(p => !p.completed_at && !p.is_flagged);
    } else if (statusFilter === 'completed') {
      result = result.filter(p => !!p.completed_at);
    } else if (statusFilter === 'flagged') {
      result = result.filter(p => p.is_flagged);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.content_title?.toLowerCase().includes(q) ||
        p.content_topic?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [pipelines, statusFilter, search]);

  const handleApproveClick = (pipelineId: string) => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    if (!pipeline) return;
    setApproveTarget(pipeline);
  };

  const handleApproveConfirm = (scheduledAt: string | null) => {
    if (!approveTarget) return;
    const approval = approvals.find(a => a.pipeline_id === approveTarget.id && a.status === 'pending');
    if (!approval) {
      toast.error('Không tìm thấy yêu cầu duyệt cho pipeline này');
      setApproveTarget(null);
      return;
    }
    updateApproval.mutate(
      { id: approval.id, status: 'approved', scheduled_publish_at: scheduledAt },
      { onSettled: () => setApproveTarget(null) }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Pipeline Monitor</h1>
          <p className="text-sm text-muted-foreground">Giám sát pipeline AI Agent theo thời gian thực</p>
        </div>
      </div>

      <PipelineStatsCards pipelines={pipelines} />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên nội dung..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[160px] h-9">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="running">Đang chạy</SelectItem>
            <SelectItem value="completed">Hoàn thành</SelectItem>
            <SelectItem value="flagged">Có lỗi</SelectItem>
          </SelectContent>
        </Select>
        {filteredPipelines.length !== pipelines.length && (
          <span className="text-xs text-muted-foreground">
            {filteredPipelines.length}/{pipelines.length} pipeline
          </span>
        )}
      </div>

      <PipelineMonitorTable
        pipelines={filteredPipelines}
        isLoading={isLoading}
        retryPipeline={retryPipeline}
        onApprove={handleApproveClick}
      />

      <ApproveWithScheduleDialog
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        pipeline={approveTarget}
        onConfirm={handleApproveConfirm}
        isLoading={updateApproval.isPending}
      />
    </div>
  );
}
