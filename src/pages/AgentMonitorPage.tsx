import { useEffect } from 'react';
import { useAgentPipelines } from '@/hooks/useAgentPipelines';
import { PipelineStatsCards } from '@/components/agents/PipelineStatsCards';
import { PipelineMonitorTable } from '@/components/agents/PipelineMonitorTable';
import { Activity } from 'lucide-react';

export default function AgentMonitorPage() {
  const { pipelines, isLoading } = useAgentPipelines();

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
      <PipelineMonitorTable pipelines={pipelines} isLoading={isLoading} />
    </div>
  );
}
