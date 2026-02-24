import { useState } from 'react';
import { Search, ClipboardList, Pen, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { AgentContribution } from './types';

interface AgentAttributionBarProps {
  contributions: AgentContribution[];
  approved?: boolean;
  className?: string;
}

const AGENT_CONFIG: Record<string, { icon: typeof Search; color: string; bgColor: string; label: string }> = {
  'research-agent': { icon: Search, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20', label: 'Research' },
  'strategy-agent': { icon: ClipboardList, color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-500/10 border-violet-500/20', label: 'Strategy' },
  'content-agent': { icon: Pen, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20', label: 'Content' },
  'reviewer-agent': { icon: Shield, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20', label: 'Reviewer' },
};

export function AgentAttributionBar({ contributions, approved, className }: AgentAttributionBarProps) {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  if (contributions.length === 0) return null;

  return (
    <div className={cn('space-y-1', className)}>
      {/* Badge row - horizontal scroll on mobile */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none pb-0.5">
        {contributions.map((c, i) => {
          const config = AGENT_CONFIG[c.agentName] || { icon: Search, color: 'text-muted-foreground', bgColor: 'bg-muted/50 border-border/50', label: c.agentName };
          const Icon = config.icon;
          const isReviewer = c.agentName === 'reviewer-agent';

          return (
            <button
              key={`${c.agentName}-${i}`}
              onClick={() => setExpandedAgent(expandedAgent === c.agentName ? null : c.agentName)}
              className="shrink-0"
            >
              <Badge
                variant="outline"
                className={cn(
                  'gap-1 px-1.5 py-0.5 text-[10px] font-medium cursor-pointer transition-colors border',
                  config.bgColor,
                  config.color,
                  isReviewer && approved === true && 'border-emerald-500/40 bg-emerald-500/15',
                  isReviewer && approved === false && 'border-amber-500/40 bg-amber-500/15',
                  expandedAgent === c.agentName && 'ring-1 ring-primary/30'
                )}
              >
                <Icon className="w-2.5 h-2.5" />
                <span>{config.label}</span>
                {c.duration && (
                  <span className="opacity-60">{(c.duration / 1000).toFixed(1)}s</span>
                )}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Expanded summary */}
      {expandedAgent && (() => {
        const c = contributions.find(c => c.agentName === expandedAgent);
        if (!c?.summary) return null;
        return (
          <Collapsible open={true}>
            <CollapsibleContent className="animate-in slide-in-from-top-1 duration-200">
              <div className="text-[10px] text-muted-foreground bg-muted/30 rounded-lg px-2.5 py-1.5 border border-border/30">
                <p className="font-medium text-foreground mb-0.5">
                  {AGENT_CONFIG[expandedAgent]?.label || expandedAgent}:
                </p>
                <p className="line-clamp-3">{c.summary}</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })()}
    </div>
  );
}
