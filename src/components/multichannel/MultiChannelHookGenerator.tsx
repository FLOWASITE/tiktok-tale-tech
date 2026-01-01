import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
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
} from 'lucide-react';
import { Channel, CHANNELS } from '@/types/multichannel';
import { MultiChannelHook, useMultiChannelHooks } from '@/hooks/useMultiChannelHooks';
import { cn } from '@/lib/utils';

interface MultiChannelHookGeneratorProps {
  topic: string;
  channels: Channel[];
  brandVoice?: {
    brand_name?: string;
    tone_of_voice?: string[];
    formality_level?: string;
  };
  onSelectHook?: (hook: MultiChannelHook) => void;
  disabled?: boolean;
  className?: string;
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

export function MultiChannelHookGenerator({
  topic,
  channels,
  brandVoice,
  onSelectHook,
  disabled,
  className,
}: MultiChannelHookGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const { hooks, isLoading, refresh } = useMultiChannelHooks({
    topic,
    channels,
    brandVoice,
    enabled: isOpen && topic.length >= 10 && channels.length > 0,
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
          variant="ghost"
          size="sm"
          className="w-full justify-between text-xs text-muted-foreground hover:text-foreground group"
          disabled={disabled}
        >
          <span className="flex items-center gap-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Gợi ý Opening Hook cho bài đăng</span>
            {hooks.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5">
                {hooks.length} hook
              </Badge>
            )}
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 transition-transform" />
          ) : (
            <ChevronDown className="w-4 h-4 transition-transform" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 space-y-2 animate-fade-in">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Sparkles className="w-4 h-4 animate-pulse text-primary mr-2" />
            <span className="text-xs text-muted-foreground">Đang tạo hook cho các kênh...</span>
          </div>
        ) : hooks.length > 0 ? (
          <>
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] text-muted-foreground">
                Click để sử dụng hook cho bài đăng
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                onClick={refresh}
                disabled={disabled || isLoading}
              >
                <RefreshCw className={cn("w-3 h-3 mr-1", isLoading && "animate-spin")} />
                Tạo lại
              </Button>
            </div>

            <div className="grid gap-2">
              {hooks.map((hook, index) => {
                const Icon = channelIcons[hook.channel];
                const channelInfo = getChannelInfo(hook.channel);
                const isCopied = copiedIndex === index;

                return (
                  <Card
                    key={`${hook.channel}-${index}`}
                    className={cn(
                      "p-3 cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 group/hook",
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => !disabled && onSelectHook?.(hook)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Channel Icon */}
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                        "bg-gradient-to-br from-primary/10 to-primary/5"
                      )}>
                        <Icon className="w-4 h-4 text-primary" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{channelInfo?.label}</span>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                            {hook.hook_type}
                          </Badge>
                        </div>

                        <p className="text-sm leading-relaxed text-foreground">
                          "{hook.opening_line}"
                        </p>

                        {hook.psychology && (
                          <p className="text-[10px] text-muted-foreground italic">
                            💡 {hook.psychology}
                          </p>
                        )}
                      </div>

                      {/* Copy Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover/hook:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(hook.opening_line, index);
                        }}
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Lightbulb className="w-8 h-8 text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground">
              Không có gợi ý hook. Hãy thử lại.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={refresh}
              disabled={disabled}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Tạo hook
            </Button>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
