import { Search, PenTool, Gauge, Layers, ShieldCheck, Send, BarChart3 } from 'lucide-react';
import { AgentPipeline } from '@/types/agent';
import { cn } from '@/lib/utils';

interface AgentStatusPanelProps {
  pipelines: AgentPipeline[];
}

const AGENTS = [
  { name: 'Research', icon: Search, stages: ['research'] },
  { name: 'Creator', icon: PenTool, stages: ['creation'] },
  { name: 'Optimizer', icon: Gauge, stages: ['optimization'] },
  { name: 'Expander', icon: Layers, stages: ['expansion'] },
  { name: 'Compliance', icon: ShieldCheck, stages: ['compliance'] },
  { name: 'Publisher', icon: Send, stages: ['scheduled', 'published'] },
  { name: 'Analyst', icon: BarChart3, stages: ['analyzing'] },
];

export function AgentStatusPanel({ pipelines }: AgentStatusPanelProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Trạng thái Agent</h3>
      <div className="space-y-1.5">
        {AGENTS.map(agent => {
          const activeCount = pipelines.filter(p => agent.stages.includes(p.current_stage)).length;
          const flaggedCount = pipelines.filter(p => agent.stages.includes(p.current_stage) && p.is_flagged).length;
          const status = flaggedCount > 0 ? 'flagged' : activeCount > 0 ? 'active' : 'idle';

          return (
            <div key={agent.name} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className={cn(
                'w-2 h-2 rounded-full flex-shrink-0',
                status === 'active' && 'bg-emerald-500 animate-pulse',
                status === 'flagged' && 'bg-red-500 animate-pulse',
                status === 'idle' && 'bg-muted-foreground/30',
              )} />
              <agent.icon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium flex-1">{agent.name}</span>
              {activeCount > 0 && (
                <span className="text-[10px] text-muted-foreground">{activeCount}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
