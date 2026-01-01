import { motion } from 'framer-motion';
import { Bot, Brain, Sparkles, Save, Search, FileText, Images, Calendar, Wand2, CheckCircle2, Loader2 } from 'lucide-react';
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
  | 'task_complete';

export interface AgentTurnInfo {
  currentTurn: number;
  maxTurns: number;
  toolsExecuted: string[];
  isComplete: boolean;
}

interface ChatThinkingIndicatorProps {
  status?: ThinkingStatus;
  currentTool?: string;
  agentTurn?: AgentTurnInfo;
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
  web_search: { message: 'Đang tìm kiếm web...', icon: Search },
  task_complete: { message: 'Đã hoàn thành!', icon: CheckCircle2 },
};

export function ChatThinkingIndicator({ 
  status = 'thinking',
  currentTool,
  agentTurn,
  className 
}: ChatThinkingIndicatorProps) {
  // Determine the effective status based on currentTool if provided
  const effectiveStatus = currentTool && (currentTool in STATUS_CONFIG) 
    ? currentTool as ThinkingStatus 
    : status;
  
  const config = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.thinking;
  const StatusIcon = config.icon;

  return (
    <motion.div
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
      {/* AI Avatar with enhanced pulse effect */}
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

      {/* Thinking bubble with glassmorphism */}
      <div className="flex-1 min-w-0">
        <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl rounded-tl-sm glass-chat-bubble">
          {/* Status icon with rotation for some statuses */}
          <motion.div
            animate={effectiveStatus === 'thinking' ? { rotate: [0, 360] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="text-primary"
          >
            <StatusIcon className="w-4 h-4" />
          </motion.div>
          
          {/* Status text with turn info */}
          <span className="text-xs text-foreground font-medium">
            {agentTurn && agentTurn.currentTurn > 0 && !agentTurn.isComplete && (
              <span className="text-primary mr-1.5 font-semibold">
                Turn {agentTurn.currentTurn}/{agentTurn.maxTurns}:
              </span>
            )}
            {config.message}
          </span>
          
          {/* Enhanced animated dots (hide when complete) */}
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

        {/* Multi-turn progress indicator */}
        {agentTurn && agentTurn.currentTurn > 0 && agentTurn.toolsExecuted.length > 0 && (
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
        
        {/* Skeleton lines for content preview (only when not showing turn info) */}
        {(!agentTurn || agentTurn.currentTurn === 0) && effectiveStatus !== 'task_complete' && (
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
      </div>
    </motion.div>
  );
}
