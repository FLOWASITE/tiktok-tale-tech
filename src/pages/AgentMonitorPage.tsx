import { useState, useMemo } from 'react';
import { useAgentPipelines } from '@/hooks/useAgentPipelines';
import { PipelineStatsCards } from '@/components/agents/PipelineStatsCards';
import { PipelineMonitorTable } from '@/components/agents/PipelineMonitorTable';
import { Activity, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

type StatusFilter = 'all' | 'running' | 'completed' | 'flagged';

export default function AgentMonitorPage() {
  const { pipelines, isLoading, retryPipeline } = useAgentPipelines();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredPipelines = useMemo(() => {
    let result = pipelines;

    // Status filter
    if (statusFilter === 'running') {
      result = result.filter(p => !p.completed_at && !p.is_flagged);
    } else if (statusFilter === 'completed') {
      result = result.filter(p => !!p.completed_at);
    } else if (statusFilter === 'flagged') {
      result = result.filter(p => p.is_flagged);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.content_title?.toLowerCase().includes(q) ||
        p.content_topic?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [pipelines, statusFilter, search]);

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

      {/* Filter bar */}
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
        onApprove={handleApprove}
      />
    </div>
  );
}
