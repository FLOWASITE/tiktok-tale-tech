// ============================================
// AgentInsightsTab Component
// Right sidebar: Agent status, context, suggestions, tokens
// ============================================

import { Search, ClipboardList, PenTool, Image, ShieldCheck, Send, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { ProgressStep } from './ChatThinkingIndicator';
import type { ContextSources } from './types';

interface AgentInsightsTabProps {
  progressSteps?: ProgressStep[];
  suggestions?: string[];
  contextSources?: ContextSources;
  messageCount: number;
  onSendSuggestion: (suggestion: string) => void;
}

const AGENTS = [
  { key: 'research', label: 'Research', icon: Search },
  { key: 'strategy', label: 'Strategy', icon: ClipboardList },
  { key: 'content', label: 'Content', icon: PenTool },
  { key: 'visual', label: 'Visual', icon: Image },
  { key: 'reviewer', label: 'Reviewer', icon: ShieldCheck },
] as const;

function getAgentStatus(steps: ProgressStep[] | undefined, key: string): 'online' | 'busy' | 'idle' {
  if (!steps || steps.length === 0) return 'idle';
  const step = steps.find(s => s.label.toLowerCase().includes(key));
  if (!step) return 'idle';
  if (step.status === 'active') return 'busy';
  if (step.status === 'complete') return 'online';
  return 'idle';
}

export function AgentInsightsTab({
  progressSteps,
  suggestions,
  contextSources,
  messageCount,
  onSendSuggestion,
}: AgentInsightsTabProps) {
  // Estimate token usage from message count
  const estimatedTokens = messageCount * 450;
  const budgetTokens = 16384;
  const tokenPercent = Math.min((estimatedTokens / budgetTokens) * 100, 100);

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-5">
      {/* Section 1: Context Quality */}
      {contextSources && (
        <section>
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Nguồn ngữ cảnh</h4>
          <div className="space-y-1.5">
            {[
              { label: 'Brand Memory', value: contextSources.brandMemory, color: 'bg-primary' },
              { label: 'Web Search', value: contextSources.webSearch, color: 'bg-violet-500' },
              { label: 'Conversation', value: contextSources.conversationHistory, color: 'bg-fuchsia-500' },
              { label: 'Industry', value: contextSources.industryPack, color: 'bg-amber-500' },
            ].map(source => (
              <div key={source.label} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-20 shrink-0">{source.label}</span>
                <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", source.color)}
                    style={{ width: `${source.value}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground w-8 text-right">{source.value}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 2: Active Agents */}
      <section>
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Đội ngũ Agent</h4>
        <div className="space-y-1">
          {AGENTS.map(agent => {
            const status = getAgentStatus(progressSteps, agent.key);
            const Icon = agent.icon;
            const step = progressSteps?.find(s => s.label.toLowerCase().includes(agent.key));
            return (
              <div key={agent.key} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary/15 to-violet-500/15 flex items-center justify-center">
                  <Icon className="w-3 h-3 text-primary/70" />
                </div>
                <span className="flex-1 text-xs font-medium">{agent.label}</span>
                <div className="flex items-center gap-1.5">
                  {step?.duration && (
                    <span className="text-[9px] text-muted-foreground">{(step.duration / 1000).toFixed(1)}s</span>
                  )}
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    status === 'online' && "bg-emerald-500",
                    status === 'busy' && "bg-amber-500 animate-pulse",
                    status === 'idle' && "bg-muted-foreground/30",
                  )} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 3: Smart Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <section>
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Gợi ý tiếp theo</h4>
          <div className="space-y-1.5">
            {suggestions.map((s, i) => (
              <button
                key={i}
                className="w-full flex items-center gap-2 p-2 rounded-lg border border-primary/10 hover:border-primary/25 hover:bg-primary/5 transition-all text-left group"
                onClick={() => onSendSuggestion(s)}
              >
                <span className="flex-1 text-[11px] line-clamp-2">{s}</span>
                <Send className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Section 4: Token Usage */}
      <section>
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          <Zap className="w-3 h-3 inline mr-1" />
          Token phiên
        </h4>
        <div className="space-y-1.5">
          <Progress value={tokenPercent} className="h-2" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>~{estimatedTokens.toLocaleString()} tokens</span>
            <span>{budgetTokens.toLocaleString()} budget</span>
          </div>
        </div>
      </section>
    </div>
  );
}
