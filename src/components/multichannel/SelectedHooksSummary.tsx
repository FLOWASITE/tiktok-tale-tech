import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Zap, X, ChevronDown, Sparkles, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Channel, CHANNELS, MultiChannelSelectedHook } from '@/types/multichannel';
import { ChannelIcon } from '@/components/multichannel/streaming/ChannelIcon';
import { FRAMEWORK_ICONS, FRAMEWORK_LABELS } from '@/types/hook';
import { motion, AnimatePresence } from 'framer-motion';

interface SelectedHooksSummaryProps {
  selectedHooks: MultiChannelSelectedHook[];
  onRemoveHook: (channel: Channel) => void;
  onClearAll: () => void;
  disabled?: boolean;
  /** Compact mode for sidebar/step summary */
  compact?: boolean;
  /** Show expand/collapse toggle */
  collapsible?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
  className?: string;
}

export function SelectedHooksSummary({
  selectedHooks,
  onRemoveHook,
  onClearAll,
  disabled = false,
  compact = false,
  collapsible = false,
  defaultCollapsed = false,
  className,
}: SelectedHooksSummaryProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [copiedHook, setCopiedHook] = useState<string | null>(null);

  if (selectedHooks.length === 0) {
    return null;
  }

  const handleCopyHook = async (hook: MultiChannelSelectedHook) => {
    try {
      await navigator.clipboard.writeText(hook.opening_line);
      setCopiedHook(hook.channel);
      toast.success('Đã sao chép hook');
      setTimeout(() => setCopiedHook(null), 2000);
    } catch {
      toast.error('Không thể sao chép');
    }
  };

  const getFrameworkIcon = (hookType?: string) => {
    if (!hookType) return '🎯';
    const normalizedType = hookType.toLowerCase().replace(/\s+/g, '_');
    return FRAMEWORK_ICONS[normalizedType] || '🎯';
  };

  const getFrameworkLabel = (hookType?: string) => {
    if (!hookType) return hookType;
    const normalizedType = hookType.toLowerCase().replace(/\s+/g, '_');
    return FRAMEWORK_LABELS[normalizedType] || hookType;
  };

  const content = (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {selectedHooks.map((hook, index) => {
          const channelInfo = CHANNELS.find(c => c.value === hook.channel);
          const isCopied = copiedHook === hook.channel;

          return (
            <motion.div
              key={hook.channel}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20, height: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg bg-background/60 group border border-transparent hover:border-primary/20 transition-all",
                compact && "p-2"
              )}
            >
              <ChannelIcon channel={hook.channel} size={compact ? "sm" : "md"} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
                    {channelInfo?.label}
                  </span>
                  {hook.hook_type && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "px-1.5 py-0 border-primary/20 bg-primary/5",
                        compact ? "text-[8px]" : "text-[10px]"
                      )}
                    >
                      <span className="mr-1">{getFrameworkIcon(hook.hook_type)}</span>
                      {getFrameworkLabel(hook.hook_type)}
                    </Badge>
                  )}
                </div>
                <p className={cn(
                  "text-muted-foreground italic",
                  compact ? "text-[10px] line-clamp-1" : "text-xs line-clamp-2"
                )}>
                  "{hook.opening_line}"
                </p>
                {!compact && hook.psychology && (
                  <p className="text-[10px] text-muted-foreground/70 mt-1 line-clamp-1">
                    💡 {hook.psychology}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn("p-0", compact ? "h-5 w-5" : "h-6 w-6")}
                  onClick={() => handleCopyHook(hook)}
                  disabled={disabled}
                >
                  {isCopied ? (
                    <Check className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5", "text-green-500")} />
                  ) : (
                    <Copy className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn("p-0 hover:text-destructive", compact ? "h-5 w-5" : "h-6 w-6")}
                  onClick={() => onRemoveHook(hook.channel)}
                  disabled={disabled}
                >
                  <X className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  if (collapsible) {
    return (
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        <Card className={cn("border-amber-500/30 bg-amber-500/5", className)}>
          <CollapsibleTrigger asChild>
            <CardContent className="p-3 cursor-pointer hover:bg-amber-500/10 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-amber-500/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-sm font-medium">Hooks đã chọn</span>
                  <Badge className="bg-amber-500/20 text-amber-600 hover:bg-amber-500/30 border-0">
                    {selectedHooks.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearAll();
                    }}
                    disabled={disabled}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Xóa tất cả
                  </Button>
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    !isCollapsed && "rotate-180"
                  )} />
                </div>
              </div>
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 px-3 pb-3">
              {content}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card className={cn("border-amber-500/30 bg-amber-500/5", className)}>
      <CardContent className={cn("space-y-3", compact ? "p-3" : "p-4")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "rounded-md bg-amber-500/20 flex items-center justify-center",
              compact ? "w-6 h-6" : "w-7 h-7"
            )}>
              <Zap className={cn("text-amber-500", compact ? "w-3.5 h-3.5" : "w-4 h-4")} />
            </div>
            <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
              Hooks đã chọn
            </span>
            <Badge className="bg-amber-500/20 text-amber-600 hover:bg-amber-500/30 border-0 text-xs">
              {selectedHooks.length}
            </Badge>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "text-muted-foreground hover:text-destructive",
              compact ? "h-6 text-[10px]" : "h-7 text-xs"
            )}
            onClick={onClearAll}
            disabled={disabled}
          >
            <X className={cn(compact ? "w-2.5 h-2.5" : "w-3 h-3", "mr-1")} />
            Xóa tất cả
          </Button>
        </div>
        
        {content}

        {/* Summary footer */}
        {!compact && selectedHooks.length > 1 && (
          <div className="pt-2 border-t border-amber-500/20 flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {selectedHooks.length} hook{selectedHooks.length > 1 ? 's' : ''} sẽ được áp dụng khi tạo nội dung
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
