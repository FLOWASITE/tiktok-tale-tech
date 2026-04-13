import { useState } from 'react';
import { Lightbulb, PenTool, ShieldCheck, CheckCircle2, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { AgentContribution } from './types';

interface AgentAttributionBarProps {
  contributions: AgentContribution[];
  approved?: boolean;
  className?: string;
}

// 5 Pipeline agents with grouped matchIds
const AGENT_GROUPS = [
  { key: 'strategy', matchIds: ['orchestrator-agent', 'research-agent', 'brand-memory-agent', 'strategy-agent', 'orchestrator', 'research', 'brand_memory', 'strategy'], icon: Lightbulb, color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-500/10 border-violet-500/20', label: 'Strategy' },
  { key: 'creator', matchIds: ['content-agent', 'image-agent', 'content', 'image', 'visual'], icon: PenTool, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20', label: 'Creator' },
  { key: 'quality', matchIds: ['compliance-agent', 'reviewer-agent', 'governor-agent', 'compliance', 'reviewer', 'governor', 'quality'], icon: ShieldCheck, color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-500/10 border-cyan-500/20', label: 'Quality' },
  { key: 'approval', matchIds: ['approval-agent', 'approval'], icon: CheckCircle2, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20', label: 'Approval' },
  { key: 'publisher', matchIds: ['publisher-agent', 'publish-agent', 'publisher', 'publish'], icon: Send, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20', label: 'Publisher' },
] as const;

function groupContributions(contributions: AgentContribution[]) {
  const grouped: { group: typeof AGENT_GROUPS[number]; contributions: AgentContribution[]; totalDuration: number; summaries: string[] }[] = [];

  for (const group of AGENT_GROUPS) {
    const matched = contributions.filter(c =>
      group.matchIds.some(id => c.agentName === id || c.agentName.includes(group.key))
    );
    if (matched.length > 0) {
      grouped.push({
        group,
        contributions: matched,
        totalDuration: matched.reduce((sum, c) => sum + (c.duration || 0), 0),
        summaries: matched.map(c => c.summary).filter(Boolean) as string[],
      });
    }
  }

  return grouped;
}

export function AgentAttributionBar({ contributions, approved, className }: AgentAttributionBarProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  if (contributions.length === 0) return null;

  const grouped = groupContributions(contributions);

  return (
    <div className={cn('space-y-1', className)}>
      {/* Badge row */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none pb-0.5">
        {grouped.map((g) => {
          const Icon = g.group.icon;
          const isQuality = g.group.key === 'quality';

          return (
            <button
              key={g.group.key}
              onClick={() => setExpandedGroup(expandedGroup === g.group.key ? null : g.group.key)}
              className="shrink-0"
            >
              <Badge
                variant="outline"
                className={cn(
                  'gap-1 px-1.5 py-0.5 text-[10px] font-medium cursor-pointer transition-colors border',
                  g.group.bgColor,
                  g.group.color,
                  isQuality && approved === true && 'border-emerald-500/40 bg-emerald-500/15',
                  isQuality && approved === false && 'border-amber-500/40 bg-amber-500/15',
                  expandedGroup === g.group.key && 'ring-1 ring-primary/30'
                )}
              >
                <Icon className="w-2.5 h-2.5" />
                <span>{g.group.label}</span>
                {g.totalDuration > 0 && (
                  <span className="opacity-60">{(g.totalDuration / 1000).toFixed(1)}s</span>
                )}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Expanded summary */}
      {expandedGroup && (() => {
        const g = grouped.find(g => g.group.key === expandedGroup);
        if (!g || g.summaries.length === 0) return null;
        return (
          <Collapsible open={true}>
            <CollapsibleContent className="animate-in slide-in-from-top-1 duration-200">
              <div className="text-[10px] text-muted-foreground bg-muted/30 rounded-lg px-2.5 py-1.5 border border-border/30">
                <p className="font-medium text-foreground mb-0.5">
                  {g.group.label}:
                </p>
                {g.summaries.map((s, i) => (
                  <p key={i} className="line-clamp-3">{s}</p>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })()}
    </div>
  );
}
