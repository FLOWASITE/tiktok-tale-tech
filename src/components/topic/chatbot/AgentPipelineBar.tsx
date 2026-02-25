// ============================================
// AgentPipelineBar Component
// Persistent horizontal pipeline showing agent execution status
// ============================================

import { memo } from 'react';
import { Search, ClipboardList, PenTool, Image, ShieldCheck, Check, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ProgressStep } from './ChatThinkingIndicator';

interface AgentPipelineBarProps {
  steps: ProgressStep[];
  className?: string;
}

const AGENT_CONFIG = [
  { key: 'research', matchIds: ['research', 'research-agent'], label: 'Research', icon: Search, viLabel: 'Nghiên cứu' },
  { key: 'strategy', matchIds: ['strategy', 'strategy-agent'], label: 'Strategy', icon: ClipboardList, viLabel: 'Chiến lược' },
  { key: 'content', matchIds: ['content', 'content-agent'], label: 'Content', icon: PenTool, viLabel: 'Nội dung' },
  { key: 'visual', matchIds: ['visual', 'image-agent'], label: 'Visual', icon: Image, viLabel: 'Hình ảnh' },
  { key: 'reviewer', matchIds: ['reviewer', 'reviewer-agent'], label: 'Reviewer', icon: ShieldCheck, viLabel: 'Kiểm duyệt' },
] as const;

function getStepForAgent(steps: ProgressStep[], agent: typeof AGENT_CONFIG[number]): ProgressStep | undefined {
  // Match by step.id first (e.g. 'research-agent'), then fallback to label includes
  return steps.find(s => 
    agent.matchIds.some(id => s.id === id) || 
    s.label.toLowerCase().includes(agent.key) ||
    s.id.toLowerCase().includes(agent.key)
  );
}

export const AgentPipelineBar = memo(function AgentPipelineBar({ steps, className }: AgentPipelineBarProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className={cn(
      "flex-shrink-0 border-b bg-gradient-to-r from-primary/5 via-violet-500/5 to-primary/5 px-2 sm:px-4 py-2",
      className
    )}>
      {/* Desktop: full pills */}
      <div className="hidden sm:flex items-center gap-1.5 justify-center">
        {AGENT_CONFIG.map((agent, idx) => {
          const step = getStepForAgent(steps, agent);
          const status = step?.status || 'pending';
          const Icon = agent.icon;

          return (
            <div key={agent.key} className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all duration-300 cursor-default",
                    status === 'pending' && "bg-muted/50 text-muted-foreground/50",
                    status === 'active' && "bg-gradient-to-r from-primary/20 to-violet-500/20 text-primary ring-2 ring-primary/30 animate-pulse",
                    status === 'complete' && "bg-gradient-to-r from-primary/10 to-violet-500/10 text-primary/80",
                  )}>
                    {status === 'complete' ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : status === 'active' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Icon className="w-3 h-3" />
                    )}
                    <span className="hidden lg:inline">{agent.viLabel}</span>
                    {status === 'complete' && step?.duration && (
                      <span className="text-[9px] text-muted-foreground/60">{(step.duration / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                  <p className="font-medium">{agent.label} Agent</p>
                  {status === 'active' && (
                    <p className="text-muted-foreground mt-0.5">Đang xử lý...</p>
                  )}
                  {status === 'complete' && step?.duration && (
                    <p className="text-muted-foreground mt-0.5">Hoàn thành trong {(step.duration / 1000).toFixed(1)}s</p>
                  )}
                  {status === 'pending' && <p className="text-muted-foreground mt-0.5">Chờ xử lý</p>}
                </TooltipContent>
              </Tooltip>

              {idx < AGENT_CONFIG.length - 1 && (
                <div className={cn(
                  "w-4 h-px transition-colors duration-300",
                  status === 'complete' ? "bg-primary/40" : "bg-border"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: compact progress bar */}
      <div className="sm:hidden flex items-center gap-2">
        <div className="flex items-center gap-1">
          {AGENT_CONFIG.map((agent) => {
            const step = getStepForAgent(steps, agent);
            const status = step?.status || 'pending';
            const Icon = agent.icon;
            return (
              <div
                key={agent.key}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300",
                  status === 'pending' && "bg-muted/50 text-muted-foreground/40",
                  status === 'active' && "bg-primary/20 text-primary ring-1 ring-primary/40 animate-pulse",
                  status === 'complete' && "bg-primary/10 text-emerald-500",
                )}
              >
                {status === 'complete' ? (
                  <Check className="w-2.5 h-2.5" />
                ) : status === 'active' ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <Icon className="w-2.5 h-2.5" />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full transition-all duration-500"
            style={{
              width: `${(steps.filter(s => s.status === 'complete').length / AGENT_CONFIG.length) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
});
