import { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Check,
  Columns,
  Facebook,
  Linkedin,
  Instagram,
  Mail,
  MessageCircle,
  Wand2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Zap
} from 'lucide-react';
import { generateAllChannelSamples, ChannelType } from '@/utils/generateSampleText';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChannelMockupFrame } from './preview/ChannelMockupFrame';
import { cn } from '@/lib/utils';

interface BrandVoiceSamplePreviewProps {
  brandName: string;
  positioning?: string;
  toneOfVoice?: string[];
  formalityLevel?: string;
  languageStyle?: string[];
  allowEmoji?: boolean;
  preferredWords?: string[];
  forbiddenWords?: string[];
  savedSampleTexts?: Record<string, string> | null;
  onSampleTextsChange?: (samples: Record<string, string>) => void;
  logoUrl?: string;
  primaryColor?: string;
}

const CHANNEL_INFO: Record<ChannelType, { 
  label: string; 
  icon: React.ReactNode; 
  gradient: string;
  bgGradient: string;
}> = {
  facebook: { 
    label: 'Facebook', 
    icon: <Facebook className="w-4 h-4" />, 
    gradient: 'from-blue-500 to-blue-600',
    bgGradient: 'from-blue-500/10 via-blue-400/5 to-transparent'
  },
  linkedin: { 
    label: 'LinkedIn', 
    icon: <Linkedin className="w-4 h-4" />, 
    gradient: 'from-blue-600 to-blue-800',
    bgGradient: 'from-blue-600/10 via-blue-500/5 to-transparent'
  },
  instagram: { 
    label: 'Instagram', 
    icon: <Instagram className="w-4 h-4" />, 
    gradient: 'from-pink-500 via-red-500 to-yellow-500',
    bgGradient: 'from-pink-500/10 via-purple-500/5 to-transparent'
  },
  pinterest: { 
    label: 'Instagram', 
    icon: <Instagram className="w-4 h-4" />, 
    gradient: 'from-pink-500 via-red-500 to-yellow-500',
    bgGradient: 'from-pink-500/10 via-purple-500/5 to-transparent'
  },
  tiktok: { 
    label: 'TikTok', 
    icon: <MessageCircle className="w-4 h-4" />, 
    gradient: 'from-black to-gray-800',
    bgGradient: 'from-cyan-500/10 via-pink-500/5 to-transparent'
  },
  twitter: { 
    label: 'Twitter/X', 
    icon: <MessageCircle className="w-4 h-4" />, 
    gradient: 'from-sky-400 to-sky-600',
    bgGradient: 'from-sky-500/10 via-sky-400/5 to-transparent'
  },
  email: { 
    label: 'Email', 
    icon: <Mail className="w-4 h-4" />, 
    gradient: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-500/10 via-orange-500/5 to-transparent'
  },
  general: { 
    label: 'Chung', 
    icon: <Sparkles className="w-4 h-4" />, 
    gradient: 'from-primary to-primary/80',
    bgGradient: 'from-primary/10 via-primary/5 to-transparent'
  },
};

const VISIBLE_CHANNELS: ChannelType[] = ['facebook', 'linkedin', 'instagram', 'tiktok', 'email'];

const formalityLabels: Record<string, string> = {
  formal: 'Trang trọng',
  semi_formal: 'Bán trang trọng',
  casual: 'Thân mật',
  friendly: 'Gần gũi',
  very_formal: 'Rất trang trọng',
  very_casual: 'Rất thân mật',
};

const toneLabels: Record<string, string> = {
  professional: 'Chuyên nghiệp',
  friendly: 'Thân thiện',
  authoritative: 'Uy tín',
  playful: 'Vui vẻ',
  empathetic: 'Đồng cảm',
  inspirational: 'Truyền cảm hứng',
  educational: 'Giáo dục',
  conversational: 'Trò chuyện',
};

export function BrandVoiceSamplePreview({
  brandName,
  positioning,
  toneOfVoice = [],
  formalityLevel = 'semi_formal',
  languageStyle = [],
  allowEmoji = true,
  preferredWords = [],
  forbiddenWords = [],
  savedSampleTexts,
  onSampleTextsChange,
  logoUrl,
  primaryColor,
}: BrandVoiceSamplePreviewProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showComparison, setShowComparison] = useState(false);
  const [copiedChannel, setCopiedChannel] = useState<ChannelType | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiSamples, setAiSamples] = useState<Record<string, string> | null>(savedSampleTexts || null);
  const [useAI, setUseAI] = useState(!!savedSampleTexts);
  const carouselRef = useRef<HTMLDivElement>(null);
  
  // Swipe gesture state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Minimum swipe distance threshold (in px)
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    // Calculate offset for visual feedback (clamped)
    const diff = currentTouch - touchStart;
    setSwipeOffset(Math.max(-100, Math.min(100, diff * 0.3)));
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    setSwipeOffset(0);
    
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      navigateCarousel('next');
    } else if (isRightSwipe) {
      navigateCarousel('prev');
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  const activeChannel = VISIBLE_CHANNELS[activeIndex];

  // Generate template-based samples
  const templateSamples = useMemo(() => {
    return generateAllChannelSamples({
      brandName,
      positioning,
      toneOfVoice,
      formalityLevel,
      allowEmoji,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandName, positioning, toneOfVoice, formalityLevel, allowEmoji, refreshKey]);

  // Helper to normalize sample content
  const normalizeSample = (sample: unknown): string => {
    if (typeof sample === 'string') return sample;
    if (sample && typeof sample === 'object') {
      const obj = sample as Record<string, unknown>;
      if ('subject' in obj && 'body' in obj) {
        return `📧 Subject: ${obj.subject}\n\n${obj.body}`;
      }
      return JSON.stringify(sample, null, 2);
    }
    return String(sample || '');
  };

  // Use AI samples if available, otherwise use template
  const samples = useMemo(() => {
    const baseSamples = useAI && aiSamples 
      ? { ...templateSamples, ...aiSamples }
      : templateSamples;
    
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(baseSamples)) {
      normalized[key] = normalizeSample(value);
    }
    return normalized;
  }, [useAI, aiSamples, templateSamples]);

  const handleAIGenerate = async () => {
    if (!brandName.trim()) {
      toast.error('Vui lòng nhập tên thương hiệu trước');
      return;
    }

    setIsAIGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-sample-text', {
        body: {
          brandName,
          positioning,
          toneOfVoice,
          formalityLevel,
          allowEmoji,
          preferredWords,
          forbiddenWords,
          channels: VISIBLE_CHANNELS,
        },
      });

      if (error) throw error;

      if (data?.samples) {
        const normalizedSamples: Record<string, string> = {};
        for (const [key, value] of Object.entries(data.samples)) {
          normalizedSamples[key] = normalizeSample(value);
        }
        setAiSamples(normalizedSamples);
        setUseAI(true);
        onSampleTextsChange?.(normalizedSamples);
        toast.success('Đã tạo nội dung mẫu bằng AI!');
      }
    } catch (err: any) {
      console.error('AI generation error:', err);
      if (err?.message?.includes('429') || err?.message?.includes('Rate limit')) {
        toast.error('Đã vượt giới hạn. Vui lòng thử lại sau.');
      } else if (err?.message?.includes('402')) {
        toast.error('Hết credits AI. Vui lòng nạp thêm.');
      } else {
        toast.error('Không thể tạo nội dung AI. Vui lòng thử lại.');
      }
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleCopy = async (channel: ChannelType) => {
    try {
      await navigator.clipboard.writeText(samples[channel]);
      setCopiedChannel(channel);
      toast.success('Đã copy nội dung!');
      setTimeout(() => setCopiedChannel(null), 2000);
    } catch (err) {
      toast.error('Không thể copy');
    }
  };

  const handleRefresh = () => {
    if (useAI) {
      handleAIGenerate();
    } else {
      setRefreshKey(prev => prev + 1);
      toast.success('Đã tạo lại sample text!');
    }
  };

  const handleSwitchMode = () => {
    if (!useAI) {
      handleAIGenerate();
    } else {
      setUseAI(false);
      toast.info('Đã chuyển về chế độ template');
    }
  };

  const navigateCarousel = (direction: 'prev' | 'next') => {
    setActiveIndex(prev => {
      if (direction === 'prev') {
        return prev === 0 ? VISIBLE_CHANNELS.length - 1 : prev - 1;
      }
      return prev === VISIBLE_CHANNELS.length - 1 ? 0 : prev + 1;
    });
  };

  const hasTone = toneOfVoice.length > 0;
  const channelInfo = CHANNEL_INFO[activeChannel];
  
  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background to-muted/30 border shadow-xl">
          {/* Animated background */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-30 transition-all duration-500",
            channelInfo.bgGradient
          )} />
          
          {/* Glass effect overlay */}
          <div className="absolute inset-0 backdrop-blur-3xl" />

          <div className="relative p-5">
            {/* Header row */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg",
                  channelInfo.gradient
                )}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Xem trước nội dung mẫu</h3>
                  <p className="text-sm text-muted-foreground">Preview theo phong cách Brand Voice</p>
                </div>
              </div>

              {/* Mode badge */}
              {useAI ? (
                <Badge className="bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 shadow-lg shadow-purple-500/25 animate-pulse">
                  <Zap className="w-3 h-3 mr-1" />
                  AI Powered
                </Badge>
              ) : (
                <Badge variant="secondary" className="shadow">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Template
                </Badge>
              )}
            </div>

            {/* Channel selector pills */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {VISIBLE_CHANNELS.map((channel, index) => {
                const info = CHANNEL_INFO[channel];
                const isActive = index === activeIndex;
                return (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                      isActive
                        ? `bg-gradient-to-r ${info.gradient} text-white shadow-lg scale-105`
                        : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {info.icon}
                    <span className={cn("hidden sm:inline", isActive && "inline")}>
                      {info.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Carousel container */}
            <div className="relative">
              {/* Navigation buttons */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => navigateCarousel('prev')}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 rounded-full shadow-lg bg-background/80 backdrop-blur-sm hover:bg-background"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => navigateCarousel('next')}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 rounded-full shadow-lg bg-background/80 backdrop-blur-sm hover:bg-background"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>

              {/* Mockup frame with swipe support */}
              <div 
                ref={carouselRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="flex justify-center px-8 touch-pan-y select-none"
                style={{
                  transform: isSwiping ? `translateX(${swipeOffset}px)` : 'translateX(0)',
                  transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
                }}
              >
                <div 
                  className={cn(
                    "w-full max-w-md transform transition-all duration-500",
                    !isSwiping && "hover:scale-[1.02]"
                  )}
                >
                  <ChannelMockupFrame
                    channel={activeChannel}
                    content={samples[activeChannel]}
                    brandName={brandName || 'Your Brand'}
                    logoUrl={logoUrl}
                    primaryColor={primaryColor}
                    isGenerating={isAIGenerating}
                  />
                </div>
              </div>

              {/* Carousel indicators */}
              <div className="flex items-center justify-center gap-2 mt-4">
                {VISIBLE_CHANNELS.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      index === activeIndex 
                        ? "w-6 bg-primary" 
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-center gap-2 mt-6">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={useAI ? "default" : "outline"}
                    size="sm"
                    onClick={handleSwitchMode}
                    disabled={isAIGenerating}
                    className={cn(
                      "gap-2 shadow-md transition-all",
                      useAI && "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                    )}
                  >
                    {isAIGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang tạo...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        {useAI ? 'Dùng Template' : 'AI Generate'}
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {useAI ? 'Chuyển về sample template' : 'Tạo sample bằng AI thông minh'}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(activeChannel)}
                    disabled={isAIGenerating}
                    className="gap-2 shadow-md"
                  >
                    {copiedChannel === activeChannel ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        Đã copy!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy nội dung {channelInfo.label}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isAIGenerating}
                    className="gap-2 shadow-md"
                  >
                    <RefreshCw className={cn("w-4 h-4", isAIGenerating && "animate-spin")} />
                    Tạo lại
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tạo lại nội dung mẫu</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowComparison(true)}
                    className="gap-2 shadow-md"
                  >
                    <Columns className="w-4 h-4" />
                    So sánh
                  </Button>
                </TooltipTrigger>
                <TooltipContent>So sánh tất cả các kênh</TooltipContent>
              </Tooltip>
            </div>

            {/* Voice characteristics */}
            <div className="mt-6 p-4 rounded-xl bg-muted/30 backdrop-blur-sm border border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">Đặc điểm Brand Voice:</p>
              <div className="flex flex-wrap gap-2">
                {formalityLevel && (
                  <Badge variant="outline" className="bg-background/50">
                    📋 {formalityLabels[formalityLevel] || formalityLevel}
                  </Badge>
                )}
                {hasTone && toneOfVoice.slice(0, 3).map((tone) => (
                  <Badge key={tone} variant="outline" className="bg-background/50">
                    🎤 {toneLabels[tone] || tone}
                  </Badge>
                ))}
                {toneOfVoice.length > 3 && (
                  <Badge variant="outline" className="bg-background/50">
                    +{toneOfVoice.length - 3}
                  </Badge>
                )}
                <Badge variant="outline" className="bg-background/50">
                  {allowEmoji ? '😊 Có emoji' : '🚫 Không emoji'}
                </Badge>
              </div>

              {/* Word preferences */}
              {(preferredWords.length > 0 || forbiddenWords.length > 0) && (
                <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                  {preferredWords.length > 0 && (
                    <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-green-600 dark:text-green-400 font-medium mb-1">✅ Từ nên dùng</p>
                      <p className="text-muted-foreground truncate">
                        {preferredWords.slice(0, 3).join(', ')}
                        {preferredWords.length > 3 && '...'}
                      </p>
                    </div>
                  )}
                  {forbiddenWords.length > 0 && (
                    <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-red-600 dark:text-red-400 font-medium mb-1">❌ Từ không dùng</p>
                      <p className="text-muted-foreground truncate">
                        {forbiddenWords.slice(0, 3).join(', ')}
                        {forbiddenWords.length > 3 && '...'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Comparison Dialog */}
        <Dialog open={showComparison} onOpenChange={setShowComparison}>
          <DialogContent className="max-w-6xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Columns className="w-5 h-5" />
                So sánh nội dung mẫu giữa các kênh
                {useAI && (
                  <Badge className="bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0">
                    <Zap className="w-3 h-3 mr-1" />
                    AI Powered
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pr-4">
                {VISIBLE_CHANNELS.map((channel) => {
                  const info = CHANNEL_INFO[channel];
                  return (
                    <Card key={channel} className="overflow-hidden border-2 hover:border-primary/50 transition-colors">
                      <div className={cn(
                        "h-2 bg-gradient-to-r",
                        info.gradient
                      )} />
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white",
                              info.gradient
                            )}>
                              {info.icon}
                            </div>
                            <span className="font-semibold">{info.label}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopy(channel)}
                            className="h-8 w-8"
                          >
                            {copiedChannel === channel ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed line-clamp-6">
                          {samples[channel]}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-2">
                          {samples[channel]?.length || 0} ký tự
                        </p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
