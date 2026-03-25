import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Cpu, Zap, ArrowRight, Wrench, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AgentRouteStep {
  label: string;
  detail?: string;
}

export interface AgentRoute {
  id: string;
  label: string;
  condition?: string;
  steps: AgentRouteStep[];
}

export interface AgentInfo {
  id: string;
  name: string;
  nameVi: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  role: string;
  tasks?: string[];
  routes?: AgentRoute[];
  input: string;
  output: string;
  tools: string[];
  model: string;
  costPerCall: string;
  pipelinePosition: number;
  isParallel?: boolean;
}

interface AgentDetailCardProps {
  agent: AgentInfo;
  activePipelines: number;
}

export function AgentDetailCard({ agent, activePipelines }: AgentDetailCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState(0);
  const Icon = agent.icon;

  const statusLabel = activePipelines > 0 ? 'Active' : 'Idle';
  const statusColor = activePipelines > 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-muted text-muted-foreground border-border';

  const hasRoutes = agent.routes && agent.routes.length > 0;
  const hasMultipleRoutes = hasRoutes && agent.routes!.length > 1;

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
              <div className="flex flex-col items-end gap-1">
                <Badge className={cn('text-[10px] px-2 py-0.5', statusColor)}>
                  {statusLabel} {activePipelines > 0 && `(${activePipelines})`}
                </Badge>
                {activePipelines > 0 && (
                  <div className="h-1 w-16 bg-secondary overflow-hidden rounded-full">
                    <div className="h-full w-full bg-primary rounded-full animate-pulse" />
                  </div>
                )}
              </div>
              <CollapsibleTrigger asChild>
                <button className="p-1 rounded-md hover:bg-muted/50 transition-colors">
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                </button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Routes / Steps - always visible */}
          {hasRoutes ? (
            <div className="space-y-2 mb-3">
              {/* Route tabs if multiple routes */}
              {hasMultipleRoutes && (
                <div className="flex gap-1 flex-wrap mb-2">
                  {agent.routes!.map((route, i) => (
                    <button
                      key={route.id}
                      onClick={() => setActiveRoute(i)}
                      className={cn(
                        'px-2 py-1 rounded-md text-[11px] font-medium transition-colors border',
                        activeRoute === i
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/50'
                      )}
                    >
                      <GitBranch className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                      {route.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Active route steps */}
              {(() => {
                const route = agent.routes![activeRoute];
                return (
                  <div className="space-y-1">
                    {route.condition && (
                      <div className="text-[10px] text-muted-foreground mb-1.5 font-mono bg-muted/30 px-2 py-1 rounded-md inline-block">
                        {route.condition}
                      </div>
                    )}
                    {route.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-[10px] font-mono text-primary bg-primary/10 rounded-full w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div>
                          <span className="text-foreground/90">{step.label}</span>
                          {step.detail && (
                            <span className="text-muted-foreground text-xs ml-1">— {step.detail}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ) : agent.tasks ? (
            <div className="space-y-1.5 mb-3">
              {agent.tasks.map((task, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{task}</span>
                </div>
              ))}
            </div>
          ) : null}

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
