// ============================================
// AgentPipelineBar Component
// Persistent horizontal pipeline showing agent execution status
// Aligned with 5-agent Pipeline: Strategy, Creator, Quality, Approval, Publisher
// ============================================

import { memo } from 'react';
import { Lightbulb, PenTool, ShieldCheck, CheckCircle2, Send, Check, Loader2, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ProgressStep } from './ChatThinkingIndicator';

interface AgentPipelineBarProps {
  steps: ProgressStep[];
  className?: string;
}

const AGENT_CONFIG = [
  { key: 'strategy', matchIds: ['orchestrator', 'orchestrator-agent', 'research', 'research-agent', 'brand_memory', 'brand-memory-agent', 'strategy', 'strategy-agent'], label: 'Strategy', icon: Lightbulb, viLabel: 'Chiến lược' },
  { key: 'creator', matchIds: ['content', 'content-agent', 'image', 'image-agent', 'visual'], label: 'Creator', icon: PenTool, viLabel: 'Sáng tạo' },
  { key: 'quality', matchIds: ['compliance', 'compliance-agent', 'reviewer', 'reviewer-agent', 'governor', 'governor-agent', 'quality', 'quality-agent'], label: 'Quality', icon: ShieldCheck, viLabel: 'Chất lượng' },
  { key: 'approval', matchIds: ['approval', 'approval-agent'], label: 'Approval', icon: CheckCircle2, viLabel: 'Duyệt' },
  { key: 'publisher', matchIds: ['publisher', 'publish', 'publisher-agent', 'publish-agent'], label: 'Publisher', icon: Send, viLabel: 'Đăng bài' },
] as const;

// Sub-node display names for active sub-label
const SUB_NODE_LABELS: Record<string, string> = {
  'orchestrator': 'Điều phối',
  'research': 'Nghiên cứu',
  'brand_memory': 'Thương hiệu',
  'strategy': 'Lên chiến lược',
  'content': 'Viết nội dung',
  'image': 'Tạo hình ảnh',
  'visual': 'Tạo hình ảnh',
  'compliance': 'Tuân thủ',
  'reviewer': 'Kiểm duyệt',
  'governor': 'Kiểm soát',
  'quality': 'Kiểm tra',
  'approval': 'Chờ duyệt',
  'publisher': 'Đăng bài',
};

function getStepsForAgent(steps: ProgressStep[], agent: typeof AGENT_CONFIG[number]): ProgressStep[] {
  return steps.filter(s =>
    agent.matchIds.some(id => s.id === id) ||
    s.id.toLowerCase().includes(agent.key)
  );
}

function getGroupStatus(matchedSteps: ProgressStep[]): { status: ProgressStep['status']; activeStep?: ProgressStep; totalDuration?: number } {
  if (matchedSteps.length === 0) return { status: 'pending' };
  
  const activeStep = matchedSteps.find(s => s.status === 'active');
  if (activeStep) return { status: 'active', activeStep };
  
  const errorStep = matchedSteps.find(s => s.status === 'error');
  if (errorStep) return { status: 'error', activeStep: errorStep };
  
  const allComplete = matchedSteps.every(s => s.status === 'complete');
  if (allComplete && matchedSteps.length > 0) {
    const totalDuration = matchedSteps.reduce((sum, s) => sum + (s.duration || 0), 0);
    return { status: 'complete', totalDuration };
  }
  
  return { status: 'pending' };
}

export const AgentPipelineBar = memo(function AgentPipelineBar({ steps, className }: AgentPipelineBarProps) {
  if (!steps || steps.length === 0) return null;

  const activeAgents = AGENT_CONFIG.filter(agent => getStepsForAgent(steps, agent).length > 0);
  
  return (
    <div className={cn(
      "flex-shrink-0 border-b bg-muted/30 px-2 sm:px-4 py-2",
      className
    )}>
      {/* Desktop: full pills */}
      <div className="hidden sm:flex items-center gap-1.5 justify-center">
        {activeAgents.map((agent, idx) => {
          const matched = getStepsForAgent(steps, agent);
          const { status, activeStep, totalDuration } = getGroupStatus(matched);
          const Icon = agent.icon;
          const subLabel = activeStep ? (SUB_NODE_LABELS[activeStep.id] || activeStep.subLabel) : undefined;

          return (
            <div key={agent.key} className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center transition-all duration-300 cursor-default">
                    <div className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium",
                      status === 'pending' && "bg-muted/50 text-muted-foreground/50",
                      status === 'active' && "bg-foreground/10 text-foreground ring-2 ring-foreground/20 animate-pulse",
                      status === 'complete' && "bg-muted text-foreground/80",
                      status === 'error' && "bg-destructive/10 text-destructive ring-1 ring-destructive/30",
                    )}>
                      {status === 'complete' ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : status === 'active' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : status === 'error' ? (
                        <AlertCircle className="w-3 h-3" />
                      ) : (
                        <Icon className="w-3 h-3" />
                      )}
                      <span className="hidden lg:inline">{agent.viLabel}</span>
                      {status === 'complete' && totalDuration && totalDuration > 0 && (
                        <span className="text-[9px] text-muted-foreground/60">{(totalDuration / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                    {/* Sub-label showing active sub-node */}
                    {status === 'active' && subLabel && (
                      <span className="hidden lg:block text-[9px] text-muted-foreground mt-0.5 max-w-[140px] truncate animate-fade-in">
                        {subLabel}
                      </span>
                    )}
                    {/* Mini progress bar for active step */}
                    {status === 'active' && activeStep?.progress != null && activeStep.progress > 0 && (
                      <div className="hidden lg:block w-full max-w-[80px] h-0.5 bg-muted/40 rounded-full mt-0.5 overflow-hidden">
                        <div
                          className="h-full bg-foreground/40 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${activeStep.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                  <p className="font-medium">{agent.label} Agent</p>
                  {status === 'active' && subLabel && (
                    <p className="text-primary mt-0.5">{subLabel}</p>
                  )}
                  {status === 'active' && !subLabel && (
                    <p className="text-muted-foreground mt-0.5">Đang xử lý...</p>
                  )}
                  {status === 'complete' && totalDuration && totalDuration > 0 && (
                    <p className="text-muted-foreground mt-0.5">Hoàn thành trong {(totalDuration / 1000).toFixed(1)}s</p>
                  )}
                  {status === 'pending' && <p className="text-muted-foreground mt-0.5">Chờ xử lý</p>}
                </TooltipContent>
              </Tooltip>

              {idx < activeAgents.length - 1 && (
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
          {activeAgents.map((agent) => {
            const matched = getStepsForAgent(steps, agent);
            const { status } = getGroupStatus(matched);
            const Icon = agent.icon;
            return (
              <div
                key={agent.key}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300",
                  status === 'pending' && "bg-muted/50 text-muted-foreground/40",
                  status === 'active' && "bg-foreground/15 text-foreground ring-1 ring-foreground/30 animate-pulse",
                  status === 'complete' && "bg-muted text-emerald-500",
                  status === 'error' && "bg-destructive/10 text-destructive",
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
            className="h-full bg-foreground/60 rounded-full transition-all duration-500"
            style={{
              width: `${(activeAgents.filter(a => getGroupStatus(getStepsForAgent(steps, a)).status === 'complete').length / Math.max(activeAgents.length, 1)) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
});
