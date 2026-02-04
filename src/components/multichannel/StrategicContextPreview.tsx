import { MessageCircle, Eye, Lightbulb, Target, Sparkles, TrendingUp, Zap, Heart, Quote, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Channel, MultiChannelContent } from '@/types/multichannel';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Content Role config with visual styling
const ROLE_CONFIG = {
  seed: {
    emoji: '🌱',
    label: 'Nhận diện',
    description: 'Thu hút sự chú ý, tạo nhận biết thương hiệu',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    visualHint: 'Hình ảnh gây tò mò, thu hút ánh nhìn',
  },
  sprout: {
    emoji: '🌿',
    label: 'Tin tưởng',
    description: 'Xây dựng niềm tin, chia sẻ giá trị',
    color: 'text-sky-600',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    visualHint: 'Hình ảnh chuyên nghiệp, đáng tin cậy',
  },
  harvest: {
    emoji: '🌾',
    label: 'Chuyển đổi',
    description: 'Thúc đẩy hành động, chuyển đổi',
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    visualHint: 'Hình ảnh sản phẩm nổi bật, CTA rõ ràng',
  },
};

// Content Angle config
const ANGLE_CONFIG: Record<string, { icon: React.ReactNode; label: string; visualHint: string }> = {
  educational: {
    icon: <Lightbulb className="w-3.5 h-3.5" />,
    label: 'Giáo dục',
    visualHint: 'Infographic, biểu đồ, text overlay',
  },
  storytelling: {
    icon: <Heart className="w-3.5 h-3.5" />,
    label: 'Kể chuyện',
    visualHint: 'Hình ảnh cảm xúc, narrative',
  },
  promotional: {
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    label: 'Quảng bá',
    visualHint: 'Sản phẩm nổi bật, ưu đãi',
  },
  social_proof: {
    icon: <Quote className="w-3.5 h-3.5" />,
    label: 'Bằng chứng XH',
    visualHint: 'Testimonial, số liệu thực',
  },
  behind_the_scenes: {
    icon: <Eye className="w-3.5 h-3.5" />,
    label: 'Hậu trường',
    visualHint: 'Authentic, candid shots',
  },
  qa_faq: {
    icon: <MessageCircle className="w-3.5 h-3.5" />,
    label: 'Q&A',
    visualHint: 'Clean, text-focused layout',
  },
};

interface StrategicContextPreviewProps {
  mode: 'single' | 'batch';
  contentRole?: 'seed' | 'sprout' | 'harvest';
  contentAngle?: string;
  hookMessages: Record<Channel, { hookMessage?: string; hookType?: string }>;
  selectedChannels: Channel[];
  singleChannel: Channel;
  content: MultiChannelContent;
  getHookForChannel: (content: MultiChannelContent, channel: Channel) => { hookMessage?: string; hookType?: string };
  CHANNEL_CONFIG: Record<Channel, { icon: React.ReactNode; color: string; bgColor: string }>;
}

export function StrategicContextPreview({
  mode,
  contentRole,
  contentAngle,
  hookMessages,
  selectedChannels,
  singleChannel,
  content,
  getHookForChannel,
  CHANNEL_CONFIG,
}: StrategicContextPreviewProps) {
  // Check if there's any context to show
  const hasHookMessages = mode === 'batch' 
    ? Object.values(hookMessages).some(h => h.hookMessage)
    : !!getHookForChannel(content, singleChannel).hookMessage;
  
  const hasContext = contentRole || contentAngle || hasHookMessages;
  
  if (!hasContext) {
    // Show empty state with hint
    return (
      <div className="p-4 rounded-xl bg-muted/30 border border-dashed border-border/50">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground/70">Chưa có ngữ cảnh chiến lược</p>
            <p className="text-xs">Thêm Hook, Content Role hoặc Angle để AI tạo ảnh phù hợp hơn</p>
          </div>
        </div>
      </div>
    );
  }

  const roleConfig = contentRole ? ROLE_CONFIG[contentRole] : null;
  const angleConfig = contentAngle ? ANGLE_CONFIG[contentAngle] : null;

  return (
    <div className="rounded-xl border overflow-hidden bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">AI Context Preview</h4>
              <p className="text-xs text-muted-foreground">Thông tin AI sử dụng để tạo ảnh</p>
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
                  <Zap className="w-3 h-3" />
                  {(contentRole ? 1 : 0) + (contentAngle ? 1 : 0) + (hasHookMessages ? 1 : 0)} nguồn
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">Số nguồn ngữ cảnh được sử dụng</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Strategy Row - Role & Angle side by side */}
        {(roleConfig || angleConfig) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Content Role */}
            {roleConfig && (
              <div className={cn(
                "p-3 rounded-lg border-2 transition-all",
                roleConfig.bgColor,
                roleConfig.borderColor,
              )}>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{roleConfig.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("font-semibold text-sm", roleConfig.color)}>
                        {roleConfig.label}
                      </span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                        Role
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {roleConfig.description}
                    </p>
                    <div className="mt-2 pt-2 border-t border-current/10">
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Target className="w-3 h-3 shrink-0" />
                        <span className="italic">{roleConfig.visualHint}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Content Angle */}
            {angleConfig && (
              <div className="p-3 rounded-lg border-2 border-violet-500/30 bg-violet-500/5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-600">
                    {angleConfig.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-violet-600">
                        {angleConfig.label}
                      </span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                        Angle
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">
                      Góc tiếp cận: {contentAngle?.replace('_', ' ')}
                    </p>
                    <div className="mt-2 pt-2 border-t border-violet-500/10">
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Target className="w-3 h-3 shrink-0" />
                        <span className="italic">{angleConfig.visualHint}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hook Messages Section */}
        {hasHookMessages && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-orange-500/10 flex items-center justify-center">
                <Quote className="w-3 h-3 text-orange-600" />
              </div>
              <span className="text-xs font-medium text-foreground">
                Hook Messages
              </span>
              <span className="text-xs text-muted-foreground">
                — Câu mở đầu định hướng hình ảnh
              </span>
            </div>

            {/* Batch Mode - Multiple hooks */}
            {mode === 'batch' && (
              <div className="space-y-2">
                {selectedChannels.map(ch => {
                  const hook = hookMessages[ch];
                  if (!hook?.hookMessage) return null;
                  const channelConfig = CHANNEL_CONFIG[ch];
                  
                  return (
                    <div 
                      key={ch} 
                      className="group flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-orange-500/5 to-transparent border border-orange-500/20 hover:border-orange-500/40 transition-colors"
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        channelConfig?.bgColor
                      )}>
                        <span className={channelConfig?.color}>
                          {channelConfig?.icon}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-foreground/80 capitalize">
                            {ch === 'google_maps' ? 'Google Maps' : ch === 'zalo_oa' ? 'Zalo OA' : ch}
                          </span>
                          {hook.hookType && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-orange-500/30 text-orange-600">
                              {hook.hookType}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground font-medium leading-relaxed">
                          "{hook.hookMessage}"
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Single Mode - One hook */}
            {mode === 'single' && (() => {
              const singleHook = getHookForChannel(content, singleChannel);
              if (!singleHook.hookMessage) return null;
              const channelConfig = CHANNEL_CONFIG[singleChannel];
              
              return (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-orange-500/5 to-transparent border border-orange-500/20">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    channelConfig?.bgColor
                  )}>
                    <span className={channelConfig?.color}>
                      {channelConfig?.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-foreground/80 capitalize">
                        {singleChannel === 'google_maps' ? 'Google Maps' : singleChannel === 'zalo_oa' ? 'Zalo OA' : singleChannel}
                      </span>
                      {singleHook.hookType && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-orange-500/30 text-orange-600">
                          {singleHook.hookType}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground font-medium leading-relaxed">
                      "{singleHook.hookMessage}"
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Visual Guidance Summary */}
        {(roleConfig || angleConfig) && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50">
              <Eye className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground/70">Định hướng hình ảnh: </span>
                {roleConfig && <span>{roleConfig.visualHint}</span>}
                {roleConfig && angleConfig && <span> • </span>}
                {angleConfig && <span>{angleConfig.visualHint}</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
