// ============================================
// AgentSessionSummary Component
// Shows summary card after all agents complete
// ============================================

import { memo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Brain, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProgressStep } from './ChatThinkingIndicator';
import type { ContextSources } from './types';

interface AgentSessionSummaryProps {
  steps: ProgressStep[];
  contextSources?: ContextSources;
  onViewDetails?: () => void;
  className?: string;
}

export const AgentSessionSummary = memo(function AgentSessionSummary({
  steps,
  contextSources,
  onViewDetails,
  className,
}: AgentSessionSummaryProps) {
  const allComplete = steps.length > 0 && steps.every(s => s.status === 'complete');
  if (!allComplete) return null;

  const totalDuration = steps.reduce((sum, s) => sum + (s.duration || 0), 0);
  const contextScore = contextSources
    ? Math.round((contextSources.brandMemory + contextSources.webSearch + contextSources.conversationHistory + contextSources.industryPack) / 4)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'mx-2 sm:mx-4 mb-2 rounded-xl border border-primary/15 bg-gradient-to-r from-primary/5 via-violet-500/5 to-primary/5 p-2.5 sm:p-3',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span className="text-[11px] font-semibold">
          Hoàn thành trong {(totalDuration / 1000).toFixed(1)}s
        </span>
        <span className="text-[10px] text-muted-foreground">
          · {steps.length} agents
        </span>
      </div>

      {/* Agent chips */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {steps.map(step => (
          <span
            key={step.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-[10px] text-primary font-medium"
          >
            {step.label.replace(/^[^\s]+\s/, '')}
            {step.duration && (
              <span className="text-muted-foreground">{(step.duration / 1000).toFixed(1)}s</span>
            )}
          </span>
        ))}
      </div>

      {/* Footer: context score + view details */}
      <div className="flex items-center justify-between">
        {contextScore !== null && (
          <div className="flex items-center gap-1.5">
            <Brain className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">
              Context: <span className="font-medium text-foreground">{contextScore}/100</span>
            </span>
          </div>
        )}
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="flex items-center gap-0.5 text-[10px] text-primary hover:underline font-medium"
          >
            Xem chi tiết
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
});
