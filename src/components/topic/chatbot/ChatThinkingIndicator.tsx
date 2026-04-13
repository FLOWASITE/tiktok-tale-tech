import { motion } from 'framer-motion';
import { Bot, Brain, Sparkles, Save, Search, FileText, Images, Calendar, Wand2, CheckCircle2, Loader2, Globe, ClipboardList, Pen, Shield, ImageIcon, Crosshair, Lightbulb, PenTool, ShieldCheck, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ThinkingStatus = 
  | 'thinking' 
  | 'executing_tools' 
  | 'generating'
  | 'save_topic'
  | 'search_topics'
  | 'generate_script'
  | 'generate_carousel'
  | 'generate_multichannel'
  | 'start_planning_session'
  | 'generate_plan_draft'
  | 'refine_plan'
  | 'web_search'
  | 'prefetch_web'
  | 'fetch_context'
  | 'task_complete';

export interface AgentTurnInfo {
  currentTurn: number;
  maxTurns: number;
  toolsExecuted: string[];
  isComplete: boolean;
  agentName?: string;
  phase?: string;
}

export interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  duration?: number;
  subLabel?: string;
  progress?: number;
}

interface ChatThinkingIndicatorProps {
  status?: ThinkingStatus;
  currentTool?: string;
  agentTurn?: AgentTurnInfo;
  progressSteps?: ProgressStep[];
  elapsedSeconds?: number;
  className?: string;
}

const STATUS_CONFIG: Record<ThinkingStatus, { message: string; icon: typeof Brain }> = {
  thinking: { message: 'AI đang suy nghĩ...', icon: Brain },
  executing_tools: { message: 'Đang thực thi...', icon: Wand2 },
  generating: { message: 'Đang viết phản hồi...', icon: Sparkles },
  save_topic: { message: 'Đang lưu topic...', icon: Save },
  search_topics: { message: 'Đang tìm kiếm...', icon: Search },
  generate_script: { message: 'Đang tạo kịch bản...', icon: FileText },
  generate_carousel: { message: 'Đang tạo carousel...', icon: Images },
  generate_multichannel: { message: 'Đang tạo nội dung đa kênh...', icon: FileText },
  start_planning_session: { message: 'Đang khởi tạo phiên lập kế hoạch...', icon: Calendar },
  generate_plan_draft: { message: 'Đang tạo bản kế hoạch...', icon: Calendar },
  refine_plan: { message: 'Đang tinh chỉnh kế hoạch...', icon: Wand2 },
  web_search: { message: 'Đang tìm kiếm web...', icon: Globe },
  prefetch_web: { message: 'Đang tìm xu hướng...', icon: Globe },
  fetch_context: { message: 'Đang tải ngữ cảnh...', icon: FileText },
  task_complete: { message: 'Đã hoàn thành!', icon: CheckCircle2 },
};

// Agent icon mapping — 5-Agent Pipeline
function getAgentIcon(agentId: string) {
  const map: Record<string, typeof Search> = {
    'strategy': Lightbulb,
    'creator': PenTool,
    'quality': ShieldCheck,
    'approval': CheckCircle2,
    'publisher': Send,
  };
  return map[agentId] || Brain;
}

import React from 'react';

export const ChatThinkingIndicator = React.forwardRef<HTMLDivElement, ChatThinkingIndicatorProps>(function ChatThinkingIndicator({ 
  status = 'thinking',
  currentTool,
  agentTurn,
  progressSteps,
  elapsedSeconds = 0,
  className 
}, ref) {
  const effectiveStatus = currentTool && (currentTool in STATUS_CONFIG) 
    ? currentTool as ThinkingStatus 
    : status;
  
  const config = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.thinking;
  const StatusIcon = config.icon;

  const hasProgressSteps = progressSteps && progressSteps.length > 0;
  const completedSteps = progressSteps?.filter(s => s.status === 'complete').length || 0;
  const totalSteps = progressSteps?.length || 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
      className={cn(
        'flex items-start gap-3',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="AI đang xử lý yêu cầu của bạn"
    >
      {/* AI Avatar with pulse effect */}
      <div className="relative shrink-0 ai-avatar-pulse">
        <motion.div
          animate={{ 
            boxShadow: [
              '0 0 0 0 hsl(var(--primary) / 0.5)',
              '0 0 0 12px hsl(var(--primary) / 0)',
            ]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            ease: 'easeOut'
          }}
          className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-primary/25"
        >
          <Bot className="w-4 h-4 text-white" />
        </motion.div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Header with status and elapsed time */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl rounded-tl-sm glass-chat-bubble">
          <motion.div
            animate={effectiveStatus === 'thinking' ? { rotate: [0, 360] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="text-primary"
          >
            <StatusIcon className="w-4 h-4" />
          </motion.div>
          
          <span className="text-xs text-foreground font-medium">
            {agentTurn && agentTurn.agentName && !agentTurn.isComplete && (
              <span className="text-primary mr-1.5 font-semibold">
                {agentTurn.agentName}:
              </span>
            )}
            {agentTurn?.phase || config.message}
          </span>
          
          {/* Elapsed time badge */}
          {elapsedSeconds > 0 && effectiveStatus !== 'task_complete' && (
            <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
              {elapsedSeconds}s
            </span>
          )}
          
          {/* Animated dots */}
          {effectiveStatus !== 'task_complete' && (
            <div className="flex items-center gap-1 ml-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary"
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.4, 1, 0.4],
                  }}
                  transition={{
                    duration: 0.9,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Progress Steps - Horizontal on desktop, Vertical compact on mobile */}
        {hasProgressSteps && (
          <>
            {/* Desktop: Horizontal Pipeline */}
            <div className="mt-3 hidden md:flex items-center gap-1">
              {progressSteps.map((step, idx) => {
                const AgentIcon = getAgentIcon(step.id);
                return (
                  <div key={step.id} className="flex items-center gap-1">
                    <div className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] border transition-all',
                      step.status === 'complete' ? 'bg-primary/10 border-primary/20 text-primary' :
                      step.status === 'active' ? 'bg-primary/15 border-primary/30 text-primary font-medium ring-1 ring-primary/20' :
                      'bg-muted/30 border-border/30 text-muted-foreground/60'
                    )}>
                      {step.status === 'complete' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : step.status === 'active' ? (
                        <div className="relative">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <div className="absolute inset-0 w-3 h-3 rounded-full bg-primary/20 animate-ping" />
                        </div>
                      ) : (
                        <AgentIcon className="w-3 h-3" />
                      )}
                      <span>{step.label.replace(/^[^\s]+\s/, '')}</span>
                      {step.status === 'active' && step.subLabel && (
                        <span className="text-[9px] text-primary/70 ml-0.5">· {step.subLabel}</span>
                      )}
                      {step.status === 'complete' && step.duration && (
                        <span className="opacity-60">{(step.duration / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                    {idx < progressSteps.length - 1 && (
                      <div className={cn(
                        'w-4 h-0.5 rounded-full',
                        step.status === 'complete' ? 'bg-primary/30' : 'bg-muted-foreground/20'
                      )} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile: Compact Vertical */}
            <div className="mt-3 space-y-1 md:hidden">
              {progressSteps.map((step, idx) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex items-center justify-center w-5 h-5">
                    {step.status === 'complete' ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-primary" />
                      </motion.div>
                    ) : step.status === 'active' ? (
                      <div className="relative">
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        <div className="absolute inset-0 w-4 h-4 rounded-full bg-primary/20 animate-ping" />
                      </div>
                    ) : (
                      <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    {idx < progressSteps.length - 1 && (
                      <div className={cn("absolute top-5 left-1/2 w-0.5 h-4 -translate-x-1/2", step.status === 'complete' ? 'bg-primary/30' : 'bg-muted-foreground/20')} />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs",
                    step.status === 'complete' ? 'text-muted-foreground' :
                    step.status === 'active' ? 'text-foreground font-medium' :
                    'text-muted-foreground/60'
                  )}>
                    {step.label}
                  </span>
                  {step.status === 'complete' && step.duration && (
                    <span className="text-[10px] text-muted-foreground/60">({(step.duration / 1000).toFixed(1)}s)</span>
                  )}
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* Multi-turn progress indicator */}
        {agentTurn && agentTurn.currentTurn > 0 && agentTurn.toolsExecuted.length > 0 && !hasProgressSteps && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {agentTurn.toolsExecuted.map((tool, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-[10px] text-primary"
              >
                <CheckCircle2 className="w-2.5 h-2.5" />
                {tool.replace(/_/g, ' ')}
              </div>
            ))}
            {!agentTurn.isComplete && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ...
              </div>
            )}
          </div>
        )}
        
        {/* Skeleton lines (only when no progress steps) */}
        {(!agentTurn || agentTurn.currentTurn === 0) && !hasProgressSteps && effectiveStatus !== 'task_complete' && (
          <div className="mt-2 space-y-1.5 max-w-[200px]">
            <motion.div
              className="h-2 rounded-full bg-muted/60"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ width: '85%' }}
            />
            <motion.div
              className="h-2 rounded-full bg-muted/60"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              style={{ width: '65%' }}
            />
            <motion.div
              className="h-2 rounded-full bg-muted/60"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
              style={{ width: '45%' }}
            />
          </div>
        )}

        {/* Progress bar (when we have steps) */}
        {hasProgressSteps && totalSteps > 0 && (
          <div className="mt-3 w-full max-w-[200px]">
            <div className="h-1 bg-muted/40 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {completedSteps}/{totalSteps} bước hoàn thành
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
});
