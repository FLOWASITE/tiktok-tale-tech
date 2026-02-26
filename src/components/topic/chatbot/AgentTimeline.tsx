// ============================================
// AgentTimeline Component
// Gantt-chart style visualization of agent execution
// Supports parallel agent groups for accurate wall-clock representation
// ============================================

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ProgressStep } from './ChatThinkingIndicator';

interface AgentTimelineProps {
  steps: ProgressStep[];
  className?: string;
}

// Agents that run in parallel (first phase after orchestrator)
const PARALLEL_AGENTS = new Set(['research', 'brand_memory', 'compliance']);
// Orchestrator runs as Phase 0 (before everything)
const PHASE_ZERO_AGENTS = new Set(['orchestrator']);

function extractAgentKey(step: ProgressStep): string {
  // step.id is like "research-agent", "brand_memory-agent", etc.
  return step.id.replace(/-agent$/, '');
}

export const AgentTimeline = memo(function AgentTimeline({ steps, className }: AgentTimelineProps) {
  const completedSteps = steps.filter(s => s.status === 'complete' && s.duration);
  
  const timeline = useMemo(() => {
    if (completedSteps.length === 0) return null;

    // Separate phase-0, parallel and sequential agents
    const phase0Group: typeof completedSteps = [];
    const parallelGroup: typeof completedSteps = [];
    const sequentialGroup: typeof completedSteps = [];

    for (const step of completedSteps) {
      const key = extractAgentKey(step);
      if (PHASE_ZERO_AGENTS.has(key)) {
        phase0Group.push(step);
      } else if (PARALLEL_AGENTS.has(key)) {
        parallelGroup.push(step);
      } else {
        sequentialGroup.push(step);
      }
    }

    const entries: Array<ProgressStep & { startMs: number; durationMs: number }> = [];

    // Phase 0: Orchestrator starts at 0
    let phase0EndMs = 0;
    for (const step of phase0Group) {
      const duration = step.duration || 0;
      entries.push({ ...step, startMs: 0, durationMs: duration });
      phase0EndMs = Math.max(phase0EndMs, duration);
    }

    // Parallel agents start after phase 0
    let parallelEndMs = phase0EndMs;
    for (const step of parallelGroup) {
      const duration = step.duration || 0;
      entries.push({ ...step, startMs: phase0EndMs, durationMs: duration });
      parallelEndMs = Math.max(parallelEndMs, phase0EndMs + duration);
    }

    // Sequential agents start after the parallel group
    let cumulativeStart = parallelEndMs;
    for (const step of sequentialGroup) {
      const duration = step.duration || 0;
      entries.push({ ...step, startMs: cumulativeStart, durationMs: duration });
      cumulativeStart += duration;
    }

    const totalMs = cumulativeStart;
    return { entries, totalMs };
  }, [completedSteps]);

  if (!timeline || timeline.totalMs === 0) return null;

  const { entries, totalMs } = timeline;
  const totalSec = totalMs / 1000;

  // Generate tick marks
  const tickCount = Math.min(Math.ceil(totalSec), 6);
  const tickInterval = totalSec / tickCount;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => i * tickInterval);

  return (
    <div className={cn('space-y-1', className)}>
      <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Timeline
      </h4>
      
      <div className="space-y-1">
        {entries.map(entry => {
          const leftPct = (entry.startMs / totalMs) * 100;
          const widthPct = Math.max((entry.durationMs / totalMs) * 100, 3);
          const label = entry.label.replace(/^[^\s]+\s/, '');

          return (
            <div key={entry.id} className="flex items-center gap-2">
              <span className="text-[9px] text-muted-foreground w-16 shrink-0 truncate text-right">
                {label}
              </span>
              <div className="flex-1 h-4 bg-muted/30 rounded-sm relative overflow-hidden">
                <div
                  className={cn(
                    'absolute top-0.5 bottom-0.5 rounded-sm transition-all',
                    entry.status === 'complete' && 'bg-gradient-to-r from-primary/60 to-violet-500/60',
                    entry.status === 'error' && 'bg-destructive/60',
                  )}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                />
                {/* Duration label inside bar */}
                <span
                  className="absolute text-[8px] text-primary-foreground font-medium leading-none top-1/2 -translate-y-1/2"
                  style={{ left: `${leftPct + widthPct / 2}%`, transform: 'translate(-50%, -50%)' }}
                >
                  {(entry.durationMs / 1000).toFixed(1)}s
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Time axis */}
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0" />
        <div className="flex-1 flex justify-between">
          {ticks.map((t, i) => (
            <span key={i} className="text-[8px] text-muted-foreground/60">
              {t.toFixed(1)}s
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});
