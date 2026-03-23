import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Cpu, Zap, ArrowRight, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AgentInfo {
  id: string;
  name: string;
  nameVi: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  role: string;
  tasks: string[];
  input: string;
  output: string;
  tools: string[];
  model: string;
  costPerCall: string;
  pipelinePosition: number; // 0-based, -1 for parallel agents
  isParallel?: boolean;
}

interface AgentDetailCardProps {
  agent: AgentInfo;
  activePipelines: number;
}

export function AgentDetailCard({ agent, activePipelines }: AgentDetailCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = agent.icon;

  const statusLabel = activePipelines > 0 ? 'Active' : 'Idle';
  const statusColor = activePipelines > 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-muted text-muted-foreground border-border';

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm hover:border-primary/30 transition-all duration-200">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br', agent.color)}>
                <Icon className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{agent.name}</h3>
                  <span className="text-xs text-muted-foreground">({agent.nameVi})</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{agent.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn('text-[10px] px-2 py-0.5', statusColor)}>
                {statusLabel} {activePipelines > 0 && `(${activePipelines})`}
              </Badge>
              <CollapsibleTrigger asChild>
                <button className="p-1 rounded-md hover:bg-muted/50 transition-colors">
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                </button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Tasks - always visible */}
          <div className="space-y-1.5 mb-3">
            {agent.tasks.map((task, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-primary mt-0.5">•</span>
                <span>{task}</span>
              </div>
            ))}
          </div>

          {/* Pipeline position indicator */}
          {agent.pipelinePosition >= 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
              <ArrowRight className="w-3 h-3" />
              <span>Stage {agent.pipelinePosition + 1} trong pipeline</span>
            </div>
          )}
          {agent.isParallel && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 mb-3">
              <Zap className="w-3 h-3" />
              <span>Chạy song song tại nhiều checkpoint</span>
            </div>
          )}

          <CollapsibleContent>
            <div className="space-y-4 pt-3 border-t border-border/50">
              {/* Input / Output */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/30">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">Input</div>
                  <p className="text-xs text-foreground">{agent.input}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/30">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">Output</div>
                  <p className="text-xs text-foreground">{agent.output}</p>
                </div>
              </div>

              {/* Tools */}
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <Wrench className="w-3 h-3" />
                  <span className="font-medium">Tools</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {agent.tools.map((tool) => (
                    <Badge key={tool} variant="outline" className="text-[10px] px-2 py-0.5 font-mono">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Model & Cost */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Cpu className="w-3 h-3" />
                  <span className="font-mono">{agent.model}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Zap className="w-3 h-3" />
                  <span>~{agent.costPerCall}/call</span>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
