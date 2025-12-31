import { motion } from 'framer-motion';
import { Bot, Brain, Sparkles, Save, Search, FileText, Images, Calendar, Wand2 } from 'lucide-react';
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
  | 'refine_plan';

interface ChatThinkingIndicatorProps {
  status?: ThinkingStatus;
  currentTool?: string;
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
};

export function ChatThinkingIndicator({ 
  status = 'thinking',
  currentTool,
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex items-start gap-2 p-3',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="AI đang xử lý yêu cầu của bạn"
    >
      {/* AI Avatar with pulse effect */}
      <div className="relative shrink-0">
        <motion.div
          animate={{ 
            boxShadow: [
              '0 0 0 0 hsl(var(--primary) / 0.4)',
              '0 0 0 8px hsl(var(--primary) / 0)',
            ]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            ease: 'easeOut'
          }}
          className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary via-violet-600 to-primary flex items-center justify-center"
        >
          <Bot className="w-4 h-4 text-primary-foreground" />
        </motion.div>
      </div>

      {/* Thinking bubble */}
      <div className="flex-1 min-w-0">
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl rounded-tl-sm bg-muted/80 backdrop-blur-sm border border-border/50">
          {/* Status icon with rotation for some statuses */}
          <motion.div
            animate={effectiveStatus === 'thinking' ? { rotate: [0, 360] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <StatusIcon className="w-3.5 h-3.5 text-primary" />
          </motion.div>
          
          {/* Status text */}
          <span className="text-xs text-muted-foreground font-medium">
            {config.message}
          </span>
          
          {/* Animated dots */}
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary/60"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Skeleton lines for content preview */}
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
      </div>
    </motion.div>
  );
}
