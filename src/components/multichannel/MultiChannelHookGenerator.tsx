import { useState, useMemo } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  RotateCw,
  CheckCheck,
  XCircle,
  ArrowUpDown,
  Eye,
} from 'lucide-react';
import { ChannelMockupFrame } from '@/components/preview/ChannelMockupFrame';
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
  onHookRegenerated?: (channel: Channel, newHook: MultiChannelHook) => void;
  disabled?: boolean;
  className?: string;
  organizationId?: string;
  brandTemplateId?: string;
}

const channelIcons: Record<Channel, React.ComponentType<{ className?: string }>> = {
  website: Globe,
  blogger: BloggerIcon,
  wordpress: WordPressIcon,
  facebook: Facebook,
  instagram: Instagram,
  pinterest: PinterestIcon,
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
  onHookRegenerated,
  disabled,
  className,
  organizationId,
  brandTemplateId,
}: MultiChannelHookGeneratorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'channel' | 'score'>('channel');
  const [previewHook, setPreviewHook] = useState<MultiChannelHook | null>(null);

  // Map multichannel Channel to ChannelMockupFrame type
  const channelToMockupType: Record<Channel, 'facebook' | 'linkedin' | 'instagram' | 'tiktok' | 'email' | 'twitter' | 'general'> = {
    facebook: 'facebook',
    linkedin: 'linkedin',
    instagram: 'instagram',
    pinterest: 'instagram',
    tiktok: 'tiktok',
    email: 'email',
    twitter: 'twitter',
    website: 'general',
    blogger: 'general',
    wordpress: 'general',
    google_maps: 'general',
    youtube: 'general',
    zalo_oa: 'general',
    telegram: 'general',
    threads: 'general',
  };

  // Check if a hook is selected
  const isHookSelected = (hook: MultiChannelHook) => {
    return selectedHooks.some(
      h => h.channel === hook.channel && h.opening_line === hook.opening_line
    );
  };

  const { hooks, isLoading, refresh, regenerateForChannel, regeneratingChannel } = useMultiChannelHooks({
    topic,
    channels,
    brandVoice,
    enabled: isOpen && topic.length >= 10 && channels.length > 0,
    organizationId,
    brandTemplateId,
  });

  // Sorted hooks
  const sortedHooks = useMemo(() => {
    if (sortBy === 'score') {
      return [...hooks].sort((a, b) => (b.evaluation?.score || 0) - (a.evaluation?.score || 0));
    }
    // Sort by channel order
    return [...hooks].sort((a, b) => channels.indexOf(a.channel) - channels.indexOf(b.channel));
  }, [hooks, sortBy, channels]);

  // Select all / Deselect all handlers
  const handleSelectAll = () => {
    hooks.forEach(hook => {
      if (!isHookSelected(hook)) {
        onSelectHook?.(hook);
      }
    });
  };

  const handleDeselectAll = () => {
    hooks.forEach(hook => {
      if (isHookSelected(hook)) {
        onSelectHook?.(hook); // Toggle to deselect
      }
    });
  };

  const handleRegenerateHook = async (channel: Channel, e: React.MouseEvent) => {
    e.stopPropagation();
    const newHook = await regenerateForChannel(channel);
    if (newHook && onHookRegenerated) {
      onHookRegenerated(channel, newHook);
    }
  };

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
      <Card className={cn(
        "overflow-hidden transition-all duration-300",
        "border-2",
        isOpen 
          ? "border-amber-400/50 shadow-md shadow-amber-100/50 dark:shadow-amber-900/20" 
          : "border-amber-300/30 hover:border-amber-400/50",
        "bg-gradient-to-r from-amber-50/80 via-yellow-50/50 to-orange-50/80",
        "dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-orange-950/30",
        disabled && "opacity-50"
      )}>
        <CollapsibleTrigger asChild disabled={disabled}>
          <div className="p-4 cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Animated icon */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30 group-hover:scale-105 transition-transform duration-200">
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-gray-900 animate-pulse" />
                </div>
                
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    Gợi ý Opening Hook
                    {hooks.length > 0 && (
                      <Badge className="bg-amber-500 hover:bg-amber-500 text-white border-0 text-xs">
                        {hooks.length} hook
                      </Badge>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    AI đề xuất câu mở đầu thu hút cho từng kênh
                  </p>
                </div>
              </div>
              
              {/* Toggle icon */}
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-amber-600 dark:text-amber-400"
              >
                <ChevronDown className="w-5 h-5" />
              </motion.div>
            </div>
          </div>
        </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4 space-y-3">
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
          ) : sortedHooks.length > 0 ? (
            <motion.div
              key="hooks"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Header with actions */}
              <div className="flex items-center justify-between px-1 mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                    Click để chọn hook
                  </p>
                  {selectedHooks.length > 0 && (
                    <Badge variant="default" className="text-[10px] px-1.5">
                      {selectedHooks.length}/{sortedHooks.length} đã chọn
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  {/* Select All / Deselect All */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={handleSelectAll}
                        disabled={disabled || selectedHooks.length === sortedHooks.length}
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Chọn tất cả</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={handleDeselectAll}
                        disabled={disabled || selectedHooks.length === 0}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Bỏ chọn tất cả</TooltipContent>
                  </Tooltip>
                  
                  {/* Sort */}
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'channel' | 'score')}>
                    <SelectTrigger className="h-7 w-[110px] text-xs">
                      <ArrowUpDown className="w-3 h-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="channel">Theo kênh</SelectItem>
                      <SelectItem value="score">Điểm cao nhất</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Refresh all */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={refresh}
                        disabled={disabled || isLoading}
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Tạo lại tất cả</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Hook cards with staggered animation */}
              <div className="grid gap-2">
                <AnimatePresence>
                  {sortedHooks.map((hook, index) => {
                    const Icon = channelIcons[hook.channel];
                    const channelInfo = getChannelInfo(hook.channel);
                    const isCopied = copiedIndex === index;
                    const ScoreIcon = hook.evaluation ? getScoreIcon(hook.evaluation.score) : null;
                    const isSelected = isHookSelected(hook);
                    const isRegenerating = regeneratingChannel === hook.channel;
                    const isLowScore = hook.evaluation && hook.evaluation.score < 10;

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

                            {/* Action buttons - right side */}
                            <div className="flex flex-col gap-1 opacity-0 group-hover/hook:opacity-100 transition-opacity">
                              {/* Preview Button */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 hover:bg-primary/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewHook(hook);
                                    }}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Xem trước</TooltipContent>
                              </Tooltip>

                              {/* Regenerate Button */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                      "h-7 w-7 p-0 hover:bg-primary/10",
                                      isRegenerating && "opacity-100"
                                    )}
                                    onClick={(e) => handleRegenerateHook(hook.channel, e)}
                                    disabled={disabled || isRegenerating}
                                  >
                                    <RotateCw className={cn("w-3.5 h-3.5", isRegenerating && "animate-spin")} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Tạo lại hook này</TooltipContent>
                              </Tooltip>

                              {/* Copy Button */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 hover:bg-primary/10"
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
                                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                                        </motion.div>
                                      ) : (
                                        <motion.div
                                          key="copy"
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          exit={{ scale: 0 }}
                                        >
                                          <Copy className="w-3.5 h-3.5" />
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{isCopied ? 'Đã copy!' : 'Copy hook'}</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>

                          {/* Low score warning banner */}
                          {isLowScore && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-2 pt-2 border-t border-destructive/20"
                            >
                              <div className="flex items-center gap-2 text-xs text-destructive">
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>Hook có thể cần cải thiện</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-2 text-[10px] text-destructive hover:text-destructive ml-auto"
                                  onClick={(e) => handleRegenerateHook(hook.channel, e)}
                                  disabled={isRegenerating}
                                >
                                  <RotateCw className={cn("w-3 h-3 mr-1", isRegenerating && "animate-spin")} />
                                  Tạo lại
                                </Button>
                              </div>
                            </motion.div>
                          )}
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
      </Card>
      {/* Hook Preview Dialog */}
      <Dialog open={!!previewHook} onOpenChange={(open) => !open && setPreviewHook(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Xem trước Hook - {previewHook && CHANNELS.find(c => c.value === previewHook.channel)?.label}
            </DialogTitle>
          </DialogHeader>
          
          {previewHook && (
            <div className="space-y-4">
              {/* Hook Info */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {previewHook.hook_type}
                  </Badge>
                  {previewHook.evaluation && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        getScoreColor(previewHook.evaluation.score)
                      )}
                    >
                      {previewHook.evaluation.score}/18 điểm
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium">"{previewHook.opening_line}"</p>
                {previewHook.psychology && (
                  <p className="text-xs text-muted-foreground italic flex items-start gap-1.5">
                    <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-500" />
                    {previewHook.psychology}
                  </p>
                )}
              </div>

              {/* Platform Mockup Preview */}
              <div className="rounded-xl overflow-hidden border bg-gradient-to-b from-muted/5 to-muted/20 p-3">
                <ChannelMockupFrame
                  channel={channelToMockupType[previewHook.channel]}
                  content={`${previewHook.opening_line}\n\n[Nội dung bài viết sẽ tiếp tục ở đây...]`}
                  brandName={brandVoice?.brand_name || 'Brand'}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    handleCopy(previewHook.opening_line, -1);
                    setCopiedIndex(-1);
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Hook
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    onSelectHook?.(previewHook);
                    setPreviewHook(null);
                  }}
                  disabled={disabled}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Chọn Hook này
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
}
