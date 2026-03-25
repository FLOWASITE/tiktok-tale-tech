import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Loader2, 
  ChevronDown, 
  Bot, 
  Check,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Mail,
  Globe,
  Send,
  Music2,
  AtSign,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { ZaloIcon, XIcon } from '@/components/icons/SocialIcons';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  calculateStepDurations, 
  calculateTotalDuration,
  PROGRESS_CAP_PERCENT,
} from './progressConstants';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Channel display names mapping
const CHANNEL_DISPLAY_NAMES: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  twitter: 'Twitter',
  threads: 'Threads',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  zalo: 'Zalo',
  telegram: 'Telegram',
  email: 'Email',
  website: 'Website',
  blog: 'Blog',
};

// Channel icons mapping
const CHANNEL_ICONS: Record<string, LucideIcon | (({ className, ...props }: any) => JSX.Element)> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  twitter: XIcon as any,
  youtube: Youtube,
  email: Mail,
  blog: FileText,
  zalo: ZaloIcon as any,
  zalo_oa: ZaloIcon as any,
  telegram: Send,
  tiktok: Music2,
  threads: AtSign,
  website: Globe,
};

interface GeneratingBannerProps {
  isGenerating: boolean;
  channelCount: number;
  elapsedMs?: number;
  className?: string;
  sseStep?: string;
  sseProgress?: number;
  sseMessage?: string;
  retryCount?: number;
  currentChannel?: string;
  completedChannels?: string[];
  totalChannels?: string[];
  streamingTexts?: Record<string, string>;
}

export function GeneratingBanner({
  isGenerating,
  channelCount,
  elapsedMs: externalElapsedMs,
  className,
  sseStep,
  sseProgress,
  sseMessage,
  retryCount = 0,
  currentChannel,
  completedChannels: completedChannelsProp,
  totalChannels: totalChannelsProp,
  streamingTexts,
}: GeneratingBannerProps) {
  const completedChannels = completedChannelsProp ?? [];
  const totalChannels = totalChannelsProp ?? [];
  
  const [internalElapsedMs, setInternalElapsedMs] = useState(0);
  const elapsedMs = externalElapsedMs ?? internalElapsedMs;

  const steps = useMemo(() => calculateStepDurations(channelCount), [channelCount]);
  const totalDuration = useMemo(() => calculateTotalDuration(channelCount), [channelCount]);

  useEffect(() => {
    if (!isGenerating || externalElapsedMs !== undefined || sseProgress !== undefined) {
      if (!isGenerating) setInternalElapsedMs(0);
      return;
    }

    const interval = setInterval(() => {
      setInternalElapsedMs((prev) => prev + 100);
    }, 100);

    return () => clearInterval(interval);
  }, [isGenerating, externalElapsedMs, sseProgress]);

  const { currentStepIndex, stepProgress: calculatedStepProgress } = useMemo(() => {
    if (sseStep) {
      const sseIndex = steps.findIndex(s => s.id === sseStep);
      if (sseIndex >= 0) {
        return { currentStepIndex: sseIndex, stepProgress: 0.5 };
      }
    }

    let accumulated = 0;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (elapsedMs < accumulated + step.duration) {
        const progress = (elapsedMs - accumulated) / step.duration;
        return { currentStepIndex: i, stepProgress: Math.min(progress, 1) };
      }
      accumulated += step.duration;
    }
    return { currentStepIndex: steps.length - 1, stepProgress: 1 };
  }, [elapsedMs, steps, sseStep]);

  const progressPercent = useMemo(() => {
    if (sseProgress !== undefined) {
      return Math.min(PROGRESS_CAP_PERCENT, sseProgress);
    }
    const rawPercent = ((currentStepIndex + calculatedStepProgress) / steps.length) * 100;
    return Math.min(PROGRESS_CAP_PERCENT, rawPercent);
  }, [sseProgress, currentStepIndex, calculatedStepProgress, steps.length]);

  if (!isGenerating) return null;

  const activeStep = steps[currentStepIndex];
  const displayMessage = sseMessage || activeStep?.label || 'Đang xử lý...';

  // Get pending channels (not started yet)
  const streamingChannelKeys = Object.keys(streamingTexts || {});
  const pendingChannels = totalChannels.filter(ch => !streamingChannelKeys.includes(ch));

  // Consolidated progress steps for collapsed view
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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={cn('w-full', className)}
      >
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-background to-secondary/5 shadow-lg overflow-hidden">
          {/* Compact Progress Bar */}
          <div className="h-1 bg-primary/10 relative overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-secondary"
              initial={{ width: '0%' }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          <CardContent className="p-3">
            {/* Compact Header */}
            <div className="flex items-center gap-3">
              {/* AI Icon - smaller */}
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
                  {retryCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                      Retry {retryCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{displayMessage}</p>
              </div>

              {/* Mini Channel Badges */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {totalChannels.slice(0, 6).map((channel) => {
                  const isCompleted = completedChannels.includes(channel);
                  const isCurrent = currentChannel === channel && !isCompleted;
                  const ChannelIcon = CHANNEL_ICONS[channel] || Globe;
                  
                  return (
                    <div
                      key={channel}
                      className={cn(
                        'w-6 h-6 rounded-md flex items-center justify-center transition-colors',
                        isCompleted && 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
                        isCurrent && 'bg-primary/20 text-primary',
                        !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                      )}
                      title={CHANNEL_DISPLAY_NAMES[channel] || channel}
                    >
                      {isCompleted ? (
                        <Check className="w-3 h-3" />
                      ) : isCurrent ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ChannelIcon className="w-3 h-3" />
                      )}
                    </div>
                  );
                })}
                {totalChannels.length > 6 && (
                  <span className="text-[10px] text-muted-foreground">+{totalChannels.length - 6}</span>
                )}
              </div>
            </div>

            {/* === STREAMING TEXT GRID - MAIN FOCUS === */}
            {(streamingTexts && Object.keys(streamingTexts).length > 0) || pendingChannels.length > 0 ? (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {/* Active/Completed streaming cards */}
                {Object.entries(streamingTexts || {}).map(([channel, text]) => {
                  const ChannelIcon = CHANNEL_ICONS[channel] || Globe;
                  const displayName = CHANNEL_DISPLAY_NAMES[channel] || channel;
                  const wordCount = typeof text === 'string' ? text.split(/\s+/).filter(w => w.length > 0).length : 0;
                  const isCompleted = completedChannels.includes(channel);
                  const safeText = typeof text === 'string' ? text : '';
                  
                  return (
                    <motion.div
                      key={channel}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'rounded-lg border p-2.5 min-h-[100px] flex flex-col',
                        isCompleted 
                          ? 'bg-muted/30 border-green-200 dark:border-green-800/50' 
                          : 'bg-primary/5 border-primary/20'
                      )}
                    >
                      {/* Card Header */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <ChannelIcon className={cn(
                          'w-4 h-4',
                          isCompleted ? 'text-green-600 dark:text-green-400' : 'text-primary'
                        )} />
                        <span className="text-xs font-medium flex-1">{displayName}</span>
                        {isCompleted ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        )}
                        <span className="text-[10px] text-muted-foreground">{wordCount} từ</span>
                      </div>

                      {/* Streaming Content */}
                      <div className="flex-1 text-xs text-foreground/80 leading-relaxed overflow-hidden">
                        <p className="whitespace-pre-wrap break-words">
                          {safeText.slice(0, 250)}
                          {safeText.length > 250 && '...'}
                          {!isCompleted && (
                            <span className="inline-block w-0.5 h-3 bg-primary ml-0.5 animate-pulse" />
                          )}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Pending channel skeletons */}
                {pendingChannels.map((channel) => {
                  const ChannelIcon = CHANNEL_ICONS[channel] || Globe;
                  const displayName = CHANNEL_DISPLAY_NAMES[channel] || channel;
                  
                  return (
                    <div
                      key={`pending-${channel}`}
                      className="rounded-lg border border-dashed border-muted-foreground/20 bg-muted/20 p-2.5 min-h-[100px] flex flex-col"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <ChannelIcon className="w-4 h-4 text-muted-foreground/50" />
                        <span className="text-xs font-medium text-muted-foreground/70">{displayName}</span>
                        <span className="text-[10px] text-muted-foreground/50 ml-auto">Đang chờ...</span>
                      </div>
                      {/* Skeleton lines */}
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2 bg-muted-foreground/10 rounded animate-pulse w-full" />
                        <div className="h-2 bg-muted-foreground/10 rounded animate-pulse w-4/5" />
                        <div className="h-2 bg-muted-foreground/10 rounded animate-pulse w-3/5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Collapsed Progress Steps */}
            <Collapsible className="mt-3">
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
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
