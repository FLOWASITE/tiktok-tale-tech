import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Sparkles, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  Lightbulb,
  Copy,
  Check,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Globe,
  Mail,
  MessageCircle,
  Send,
  MapPin,
  Music2,
  AtSign,
  LucideIcon,
  AlertTriangle,
  CheckCircle2,
  Info,
  Zap,
} from 'lucide-react';
import { Channel, CHANNELS } from '@/types/multichannel';
import { MultiChannelHook, useMultiChannelHooks } from '@/hooks/useMultiChannelHooks';
import { cn } from '@/lib/utils';

// Hook Score Badge Component - Enhanced styling
const getScoreColor = (score: number) => {
  if (score >= 14) return 'bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40';
  if (score >= 10) return 'bg-gradient-to-r from-amber-500/20 to-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-500/40';
  return 'bg-gradient-to-r from-destructive/20 to-destructive/10 text-destructive border-destructive/40';
};

const getScoreLabel = (score: number) => {
  if (score >= 14) return 'Xuất sắc';
  if (score >= 10) return 'Tốt';
  return 'Cần cải thiện';
};

const getScoreIcon = (score: number) => {
  if (score >= 14) return CheckCircle2;
  if (score >= 10) return Zap;
  return AlertTriangle;
};

interface MultiChannelSelectedHook {
  channel: Channel;
  opening_line: string;
  hook_type?: string;
  psychology?: string;
}

interface MultiChannelHookGeneratorProps {
  topic: string;
  channels: Channel[];
  brandVoice?: {
    brand_name?: string;
    tone_of_voice?: string[];
    formality_level?: string;
  };
  selectedHooks?: MultiChannelSelectedHook[];
  onSelectHook?: (hook: MultiChannelHook) => void;
  disabled?: boolean;
  className?: string;
  organizationId?: string;
  brandTemplateId?: string;
}

const channelIcons: Record<Channel, LucideIcon> = {
  website: Globe,
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  google_maps: MapPin,
  linkedin: Linkedin,
  email: Mail,
  youtube: Youtube,
  zalo_oa: MessageCircle,
  telegram: Send,
  tiktok: Music2,
  threads: AtSign,
};

// Skeleton loading component for hook cards
function HookCardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="p-3">
        <div className="flex items-start gap-3">
          <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export function MultiChannelHookGenerator({
  topic,
  channels,
  brandVoice,
  selectedHooks = [],
  onSelectHook,
  disabled,
  className,
  organizationId,
  brandTemplateId,
}: MultiChannelHookGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Check if a hook is selected
  const isHookSelected = (hook: MultiChannelHook) => {
    return selectedHooks.some(
      h => h.channel === hook.channel && h.opening_line === hook.opening_line
    );
  };

  const { hooks, isLoading, refresh } = useMultiChannelHooks({
    topic,
    channels,
    brandVoice,
    enabled: isOpen && topic.length >= 10 && channels.length > 0,
    organizationId,
    brandTemplateId,
  });

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getChannelInfo = (channel: Channel) => {
    return CHANNELS.find(c => c.value === channel);
  };

  if (topic.length < 10 || channels.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "w-full justify-between border-dashed border-2",
            "border-primary/30 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5",
            "hover:from-primary/10 hover:to-secondary/10 hover:border-primary/50",
            "transition-all duration-300 group",
            isOpen && "border-primary/50 from-primary/10 to-secondary/10"
          )}
          disabled={disabled}
        >
          <span className="flex items-center gap-2">
            <span className="relative">
              <Lightbulb className={cn(
                "w-4 h-4 text-amber-500 transition-transform duration-300",
                "group-hover:scale-110"
              )} />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
            </span>
            <span className="font-medium text-foreground">Gợi ý Opening Hook</span>
            {hooks.length > 0 && (
              <Badge 
                variant="secondary" 
                className="text-[10px] px-1.5 bg-primary/10 text-primary border-primary/20"
              >
                {hooks.length} hook
              </Badge>
            )}
          </span>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <p className="text-xs">
                  Hook là câu mở đầu thu hút, giúp tăng tỷ lệ đọc tiếp nội dung
                </p>
              </TooltipContent>
            </Tooltip>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </div>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3 space-y-3">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Loading header */}
              <div className="flex items-center gap-2 px-1">
                <div className="relative">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <motion.div
                    className="absolute inset-0"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-4 h-4 text-primary/30" />
                  </motion.div>
                </div>
                <span className="text-xs text-muted-foreground">
                  Đang tạo hook cho {channels.length} kênh
                </span>
                <motion.span
                  className="text-xs text-primary"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  ...
                </motion.span>
              </div>

              {/* Skeleton cards */}
              <div className="grid gap-2">
                {Array.from({ length: Math.min(channels.length, 3) }).map((_, i) => (
                  <HookCardSkeleton key={i} index={i} />
                ))}
              </div>
            </motion.div>
          ) : hooks.length > 0 ? (
            <motion.div
              key="hooks"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-1 mb-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  Click để chọn hook (có thể chọn nhiều)
                  {selectedHooks.length > 0 && (
                    <Badge variant="default" className="ml-1 text-[10px] px-1.5">
                      {selectedHooks.length} đã chọn
                    </Badge>
                  )}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                  onClick={refresh}
                  disabled={disabled || isLoading}
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                  Tạo lại
                </Button>
              </div>

              {/* Hook cards with staggered animation */}
              <div className="grid gap-2">
                <AnimatePresence>
                  {hooks.map((hook, index) => {
                    const Icon = channelIcons[hook.channel];
                    const channelInfo = getChannelInfo(hook.channel);
                    const isCopied = copiedIndex === index;
                    const ScoreIcon = hook.evaluation ? getScoreIcon(hook.evaluation.score) : null;
                    const isSelected = isHookSelected(hook);

                    return (
                      <motion.div
                        key={`${hook.channel}-${index}`}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ 
                          delay: index * 0.08, 
                          duration: 0.3,
                          ease: [0.23, 1, 0.32, 1]
                        }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <Card
                          className={cn(
                            "p-3 cursor-pointer transition-all duration-200",
                            "hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm",
                            "group/hook relative overflow-hidden",
                            disabled && "opacity-50 cursor-not-allowed",
                            // Selected state styling
                            isSelected && "border-primary bg-primary/10 ring-2 ring-primary/30"
                          )}
                          onClick={() => !disabled && onSelectHook?.(hook)}
                        >
                          {/* Selected checkmark indicator */}
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="absolute top-2 right-2 z-10"
                            >
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="w-3 h-3 text-primary-foreground" />
                              </div>
                            </motion.div>
                          )}
                          {/* Subtle gradient overlay on hover */}
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover/hook:opacity-100 transition-opacity pointer-events-none" />
                          
                          <div className="flex items-start gap-3 relative">
                            {/* Channel Icon */}
                            <div className={cn(
                              "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
                              "bg-gradient-to-br from-primary/15 to-primary/5",
                              "group-hover/hook:from-primary/25 group-hover/hook:to-primary/10",
                              "transition-all duration-200"
                            )}>
                              <Icon className="w-4.5 h-4.5 text-primary" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-foreground">
                                  {channelInfo?.label}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className="text-[10px] px-1.5 py-0 bg-muted/50"
                                >
                                  {hook.hook_type}
                                </Badge>
                                
                                {/* Enhanced Hook Evaluation Score Badge */}
                                {hook.evaluation && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge 
                                        variant="outline" 
                                        className={cn(
                                          "text-[10px] px-2 py-0.5 flex items-center gap-1",
                                          "font-medium cursor-help",
                                          getScoreColor(hook.evaluation.score)
                                        )}
                                      >
                                        {ScoreIcon && <ScoreIcon className="w-3 h-3" />}
                                        <span>{hook.evaluation.score}/18</span>
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs p-3">
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2 pb-1.5 border-b border-border/50">
                                          <span className={cn(
                                            "text-sm font-semibold",
                                            hook.evaluation.score >= 14 ? "text-emerald-500" :
                                            hook.evaluation.score >= 10 ? "text-amber-500" : "text-destructive"
                                          )}>
                                            {getScoreLabel(hook.evaluation.score)}
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            ({hook.evaluation.score}/18 điểm)
                                          </span>
                                        </div>
                                        
                                        {hook.evaluation.strengths?.length > 0 && (
                                          <div className="space-y-1">
                                            {hook.evaluation.strengths.map((s, i) => (
                                              <div key={i} className="flex items-start gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                <span>{s}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        
                                        {hook.evaluation.issues?.length > 0 && (
                                          <div className="space-y-1">
                                            {hook.evaluation.issues.map((issue, i) => (
                                              <div key={i} className="flex items-start gap-1.5 text-xs text-destructive">
                                                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                <span>{issue}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        
                                        {!hook.evaluation.strengths?.length && !hook.evaluation.issues?.length && (
                                          <span className="text-xs text-muted-foreground">
                                            Chưa có đánh giá chi tiết
                                          </span>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>

                              <p className="text-sm leading-relaxed text-foreground font-medium">
                                "{hook.opening_line}"
                              </p>

                              {hook.psychology && (
                                <p className="text-[11px] text-muted-foreground italic flex items-start gap-1.5">
                                  <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-500/70" />
                                  {hook.psychology}
                                </p>
                              )}
                            </div>

                            {/* Copy Button */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-8 w-8 p-0 transition-all duration-200",
                                "opacity-0 group-hover/hook:opacity-100",
                                "hover:bg-primary/10"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(hook.opening_line, index);
                              }}
                            >
                              <AnimatePresence mode="wait">
                                {isCopied ? (
                                  <motion.div
                                    key="check"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                  >
                                    <Check className="w-4 h-4 text-emerald-500" />
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    key="copy"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-3">
                <Lightbulb className="w-7 h-7 text-primary/70" />
              </div>
              <h4 className="text-sm font-medium text-foreground mb-1">
                Chưa có gợi ý hook
              </h4>
              <p className="text-xs text-muted-foreground mb-4 max-w-[200px]">
                AI sẽ tạo câu mở đầu thu hút cho từng kênh của bạn
              </p>
              <Button
                type="button"
                size="sm"
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2"
                onClick={refresh}
                disabled={disabled}
              >
                <Sparkles className="w-4 h-4" />
                Tạo hook ngay
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CollapsibleContent>
    </Collapsible>
  );
}
