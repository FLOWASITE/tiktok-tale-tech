// REDESIGNED v2.1 - Content First, Progress Secondary
// UI Focus: Streaming text grid is primary, progress steps are collapsed by default
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, ChevronDown, Bot, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  calculateTotalDuration,
  calculateStepDurations,
  PROGRESS_CAP_PERCENT 
} from './progressConstants';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  StreamingTextGrid, 
  ChannelIcon, 
  getChannelLabel,
  type ChannelStreamData 
} from './streaming';

interface AIGenerationProgressProps {
  isLoading: boolean;
  channelCount: number;
  elapsedMs?: number;
  className?: string;
  sseStep?: string;
  sseProgress?: number;
  sseMessage?: string;
  completedChannels?: string[];
  totalChannels?: string[];
  currentChannel?: string;
  channelContents?: {
    channel: string;
    preview: string;
    fullContent?: string;
    wordCount: number;
    isStreaming?: boolean;
  }[];
  streamingTexts?: Record<string, string>;
  errorChannels?: { channel: string; message: string }[];
  onRetryChannel?: (channel: string) => void;
  retryingChannel?: string;
}

export function AIGenerationProgress({ 
  isLoading, 
  channelCount, 
  elapsedMs: externalElapsedMs, 
  className,
  sseStep,
  sseProgress,
  sseMessage,
  completedChannels: completedChannelsProp,
  totalChannels: totalChannelsProp,
  currentChannel,
  streamingTexts,
  errorChannels = [],
  onRetryChannel,
  retryingChannel,
}: AIGenerationProgressProps) {
  // Ensure arrays are always arrays
  const completedChannels = completedChannelsProp ?? [];
  const totalChannels = totalChannelsProp ?? [];
  
  const [internalElapsedMs, setInternalElapsedMs] = useState(0);
  const elapsed = externalElapsedMs ?? internalElapsedMs;

  const steps = useMemo(() => calculateStepDurations(channelCount), [channelCount]);
  const totalDuration = useMemo(() => calculateTotalDuration(channelCount), [channelCount]);

  useEffect(() => {
    if (!isLoading || externalElapsedMs !== undefined) {
      setInternalElapsedMs(0);
      return;
    }
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      setInternalElapsedMs(Date.now() - startTime);
    }, 100);
    
    return () => clearInterval(interval);
  }, [isLoading, externalElapsedMs]);

  // Calculate current step and progress
  const { currentStepIndex, activeStep } = useMemo(() => {
    if (sseStep) {
      const sseIndex = steps.findIndex(s => s.id === sseStep);
      if (sseIndex >= 0) {
        return { currentStepIndex: sseIndex, activeStep: steps[sseIndex] };
      }
    }

    let accumulated = 0;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (elapsed < accumulated + step.duration) {
        return { currentStepIndex: i, activeStep: step };
      }
      accumulated += step.duration;
    }
    return { currentStepIndex: steps.length - 1, activeStep: steps[steps.length - 1] };
  }, [elapsed, steps, sseStep]);

  const progressPercent = useMemo(() => {
    if (sseProgress !== undefined) {
      return Math.min(PROGRESS_CAP_PERCENT, sseProgress);
    }
    const rawPercent = (elapsed / totalDuration) * 100;
    return Math.min(PROGRESS_CAP_PERCENT, rawPercent);
  }, [sseProgress, elapsed, totalDuration]);

  if (!isLoading) return null;

  const displayMessage = sseMessage || activeStep?.label || 'Đang xử lý...';

  // Get pending channels
  const streamingChannelKeys = Object.keys(streamingTexts || {});
  const pendingChannels = totalChannels.filter(ch => !streamingChannelKeys.includes(ch));

  // Consolidated progress groups
  const progressGroups = [
    { id: 'context', label: 'Ngữ cảnh', steps: ['init', 'personas', 'industry', 'prompt'] },
    { id: 'ai', label: 'AI tạo nội dung', steps: ['ai', 'retry'] },
    { id: 'finalize', label: 'Hoàn thiện', steps: ['critique', 'finalize', 'complete'] },
  ];

  const getGroupStatus = (groupSteps: string[]) => {
    const currentStepId = activeStep?.id;
    const currentIdx = steps.findIndex(s => s.id === currentStepId);
    
    const groupStartIdx = steps.findIndex(s => groupSteps.includes(s.id));
    const groupEndIdx = steps.length - 1 - [...steps].reverse().findIndex(s => groupSteps.includes(s.id));
    
    if (currentIdx > groupEndIdx) return 'complete';
    if (currentIdx >= groupStartIdx && currentIdx <= groupEndIdx) return 'current';
    return 'pending';
  };

  return (
    <motion.div 
      className={cn("space-y-3", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      data-testid="ai-generation-progress-v2"
    >
      {/* Compact Header */}
      <div className="flex items-center gap-3">
        {/* AI Icon */}
        <motion.div
          className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Bot className="w-4 h-4 text-primary-foreground" />
        </motion.div>

        {/* Title + Status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">AI đang tạo nội dung</span>
            <span className="text-sm font-semibold text-primary">{Math.round(progressPercent)}%</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{displayMessage}</p>
        </div>

        {/* Mini Channel Badges */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {totalChannels.slice(0, 5).map((channel) => {
            const isCompleted = completedChannels.includes(channel);
            const isCurrent = currentChannel === channel && !isCompleted;
            
            return (
              <div
                key={channel}
                className={cn(
                  'w-6 h-6 rounded-md flex items-center justify-center transition-colors',
                  isCompleted && 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
                  isCurrent && 'bg-primary/20 text-primary',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                )}
                title={getChannelLabel(channel)}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3" />
                ) : isCurrent ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <ChannelIcon channel={channel} size="sm" />
                )}
              </div>
            );
          })}
          {totalChannels.length > 5 && (
            <span className="text-[10px] text-muted-foreground">+{totalChannels.length - 5}</span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-muted rounded-full relative overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3 }}
        />
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* === STREAMING TEXT GRID - MAIN FOCUS === */}
      {(() => {
        // Convert streamingTexts to ChannelStreamData array with error handling
        const errorChannelNames = errorChannels.map(e => e.channel);
        
        const streamingChannels: ChannelStreamData[] = Object.entries(streamingTexts || {}).map(([channel, text]) => {
          const errorInfo = errorChannels.find(e => e.channel === channel);
          return {
            channel,
            text: typeof text === 'string' ? text : '',
            isComplete: completedChannels.includes(channel),
            isStreaming: !completedChannels.includes(channel) && !errorInfo,
            hasError: !!errorInfo,
            errorMessage: errorInfo?.message,
          };
        });

        // Also add error channels that might not be in streamingTexts yet
        errorChannels.forEach(err => {
          if (!streamingChannels.find(ch => ch.channel === err.channel)) {
            streamingChannels.push({
              channel: err.channel,
              text: '',
              isComplete: false,
              isStreaming: false,
              hasError: true,
              errorMessage: err.message,
            });
          }
        });

        return (
          <StreamingTextGrid
            streamingChannels={streamingChannels}
            pendingChannels={pendingChannels}
            onRetryChannel={onRetryChannel}
            retryingChannel={retryingChannel}
            className="max-h-[320px] overflow-y-auto"
          />
        );
      })()}

      {/* Collapsed Progress Steps */}
      <Collapsible className="mt-2">
        <CollapsibleTrigger className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full group">
          <ChevronDown className="w-3 h-3 transition-transform group-data-[state=open]:rotate-180" />
          <span>Chi tiết tiến trình</span>
          <div className="flex-1 h-px bg-border/50" />
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="flex items-center gap-2 mt-2 px-1">
            {progressGroups.map((group, idx) => {
              const status = getGroupStatus(group.steps);
              
              return (
                <div key={group.id} className="flex items-center gap-2 flex-1">
                  {/* Step dot */}
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0',
                      status === 'complete' && 'bg-primary text-primary-foreground',
                      status === 'current' && 'bg-primary/20 text-primary border border-primary/50',
                      status === 'pending' && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {status === 'complete' ? '✓' : idx + 1}
                  </div>
                  <span className={cn(
                    'text-[11px] whitespace-nowrap',
                    status === 'current' && 'text-primary font-medium',
                    status === 'pending' && 'text-muted-foreground/60'
                  )}>
                    {group.label}
                  </span>
                  
                  {/* Connector line (except last) */}
                  {idx < progressGroups.length - 1 && (
                    <div className={cn(
                      'flex-1 h-0.5 rounded-full',
                      status === 'complete' ? 'bg-primary' : 'bg-muted'
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Completion Summary */}
      {completedChannels.length === totalChannels.length && totalChannels.length > 0 && (
        <motion.div 
          className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-sm text-green-700 dark:text-green-400 font-medium"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <Check className="w-4 h-4" />
          <span>✓ Đã tạo xong {totalChannels.length} kênh</span>
        </motion.div>
      )}
    </motion.div>
  );
}
