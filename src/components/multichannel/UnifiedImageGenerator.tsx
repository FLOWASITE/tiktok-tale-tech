import { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, Image, Loader2, Save, Settings2, Check, ArrowLeft, 
  Copy, Download, RefreshCw, Wand2, Palette, ChevronDown, ChevronUp, Eye,
  Layers, ImageIcon, Camera, Brush, Box, Droplets, Film, LayoutGrid,
  Facebook, Instagram, Linkedin, Twitter, Globe, MapPin, Youtube, Mail, MessageCircle, Music2, AtSign, Star,
  Type, AlignCenter, AlignLeft, AlignRight, Quote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Channel, MultiChannelContent, ChannelImage } from '@/types/multichannel';
import { 
  useAutoImageGeneration, 
  LogoPosition, 
  AspectRatioOption,
  ImageStylePreset,
} from '@/hooks/useAutoImageGeneration';
import { 
  useSocialImageGeneration, 
  IMAGE_STYLE_PRESETS,
  type ImageContentType,
  type TextPosition,
  type TypographyStyle,
} from '@/hooks/useSocialImageGeneration';
import { CHANNEL_OPTIMAL_ASPECT_RATIO, getChannelImageSpec } from '@/config/channelImageConfig';
import { ImageErrorBoundary } from '@/components/image/ImageErrorBoundary';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageStreamingGrid } from './streaming/ImageStreamingGrid';
import { toast } from 'sonner';
import { suggestImageStyles, formatReasons, type StyleSuggestion } from '@/utils/imageStyleSuggestion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StrategicContextPreview } from './StrategicContextPreview';

interface UnifiedImageGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: MultiChannelContent;
  brandLogoUrl?: string | null;
  brandPrimaryColor?: string | null;
  brandIndustry?: string[];
  onImageGenerated?: (channel: Channel, image: ChannelImage) => Promise<void>;
  // Single channel mode props
  initialChannel?: Channel;
  initialMode?: 'single' | 'batch';
}

type ViewMode = 'setup' | 'streaming' | 'preview';
type GeneratorMode = 'single' | 'batch';

// Channel icons and colors for visual selection
const CHANNEL_CONFIG: Record<Channel, { icon: React.ReactNode; color: string; bgColor: string }> = {
  facebook: { icon: <Facebook className="w-4 h-4" />, color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  instagram: { icon: <Instagram className="w-4 h-4" />, color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  linkedin: { icon: <Linkedin className="w-4 h-4" />, color: 'text-sky-600', bgColor: 'bg-sky-500/10' },
  twitter: { icon: <Twitter className="w-4 h-4" />, color: 'text-slate-700', bgColor: 'bg-slate-500/10' },
  website: { icon: <Globe className="w-4 h-4" />, color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
  google_maps: { icon: <MapPin className="w-4 h-4" />, color: 'text-green-600', bgColor: 'bg-green-500/10' },
  youtube: { icon: <Youtube className="w-4 h-4" />, color: 'text-red-600', bgColor: 'bg-red-500/10' },
  email: { icon: <Mail className="w-4 h-4" />, color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
  tiktok: { icon: <Music2 className="w-4 h-4" />, color: 'text-black dark:text-white', bgColor: 'bg-black/10 dark:bg-white/10' },
  zalo_oa: { icon: <MessageCircle className="w-4 h-4" />, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  telegram: { icon: <Send className="w-4 h-4" />, color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
  threads: { icon: <AtSign className="w-4 h-4" />, color: 'text-slate-800 dark:text-slate-200', bgColor: 'bg-slate-500/10' },
};

import { Send } from 'lucide-react';

const LOGO_POSITIONS: { value: LogoPosition; label: string }[] = [
  { value: 'bottom-right', label: 'Góc dưới phải' },
  { value: 'bottom-left', label: 'Góc dưới trái' },
  { value: 'top-right', label: 'Góc trên phải' },
  { value: 'top-left', label: 'Góc trên trái' },
];

const ASPECT_RATIOS: { value: AspectRatioOption; label: string; description: string }[] = [
  { value: 'auto', label: 'Tự động', description: 'Tỉ lệ tối ưu cho từng kênh' },
  { value: '16:9', label: '16:9', description: 'Website, YouTube, LinkedIn' },
  { value: '1:1', label: '1:1', description: 'Facebook, Instagram Feed' },
  { value: '4:5', label: '4:5', description: 'Instagram Portrait' },
  { value: '9:16', label: '9:16', description: 'Stories, Reels, TikTok' },
];

const IMAGE_STYLES: { value: ImageStylePreset | 'auto'; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'auto', label: 'Tự động', description: 'Theo brand style', icon: <Sparkles className="w-4 h-4" /> },
  { value: 'photorealistic', label: 'Chân thực', description: 'Ảnh chụp', icon: <Camera className="w-4 h-4" /> },
  { value: 'illustration', label: 'Minh họa', description: 'Vector', icon: <Brush className="w-4 h-4" /> },
  { value: 'minimalist', label: 'Tối giản', description: 'Minimal', icon: <LayoutGrid className="w-4 h-4" /> },
  { value: '3d_render', label: '3D', description: 'Render', icon: <Box className="w-4 h-4" /> },
  { value: 'flat_design', label: 'Flat', description: 'Phẳng', icon: <Layers className="w-4 h-4" /> },
  { value: 'watercolor', label: 'Màu nước', description: 'Nghệ thuật', icon: <Droplets className="w-4 h-4" /> },
  { value: 'cinematic', label: 'Điện ảnh', description: 'Kịch tính', icon: <Film className="w-4 h-4" /> },
];

function getContentSummary(content: MultiChannelContent, channel: Channel): string {
  let text = '';
  switch (channel) {
    case 'website': text = content.website_content || ''; break;
    case 'facebook': text = content.facebook_content || ''; break;
    case 'instagram': text = content.instagram_content || ''; break;
    case 'twitter': text = content.twitter_content || ''; break;
    case 'linkedin': text = content.linkedin_content || ''; break;
    case 'youtube': text = content.youtube_content || ''; break;
    case 'tiktok': text = content.tiktok_content || ''; break;
    case 'threads': text = content.threads_content || ''; break;
    default: text = content.topic || '';
  }
  
  const cleaned = text
    .replace(/#{1,6}\s?/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .slice(0, 300);
    
  return `Topic: ${content.topic}. ${cleaned}`;
}

function generateAutoPrompt(
  channel: Channel,
  contentSummary: string,
  brandName?: string,
  primaryColor?: string,
  brandIndustry?: string[],
  hookMessage?: string,
): string {
  const optimalRatio = CHANNEL_OPTIMAL_ASPECT_RATIO[channel] || '16:9';
  
  let prompt = `Create a ${optimalRatio} aspect ratio image for ${channel}. `;
  
  // Add hook message first (most important for visual relevance)
  if (hookMessage) {
    prompt += `Main message (HOOK): "${hookMessage}". `;
  }
  
  if (contentSummary) {
    const summary = contentSummary.slice(0, 200);
    prompt += `Content theme: ${summary}. `;
  }
  
  if (brandName) {
    prompt += `Brand: ${brandName}. `;
  }
  
  if (primaryColor) {
    prompt += `Use primary color ${primaryColor} as accent. `;
  }

  if (brandIndustry && brandIndustry.length > 0) {
    prompt += `Industry: ${brandIndustry.join(', ')}. `;
  }
  
  prompt += 'High quality, professional, visually appealing. Ultra high resolution.';
  
  return prompt;
}

// Helper to extract hook for a specific channel
// Note: selected_hooks and global_hook may be present in DB but not in MultiChannelContent type
function getHookForChannel(content: MultiChannelContent, channel: Channel): { hookMessage?: string; hookType?: string } {
  // Access potential fields that may exist in the content from DB
  const contentAny = content as any;
  
  // Try to find channel-specific hook first
  const selectedHooks = contentAny.selected_hooks as any[] | null;
  const channelHook = selectedHooks?.find((h: any) => h.channel === channel);
  
  if (channelHook?.opening_line) {
    return {
      hookMessage: channelHook.opening_line,
      hookType: channelHook.hook_type || channelHook.framework,
    };
  }
  
  // Fallback to global hook
  const globalHook = contentAny.global_hook as any;
  if (globalHook?.opening_line) {
    return {
      hookMessage: globalHook.opening_line,
      hookType: globalHook.hook_type || globalHook.framework,
    };
  }
  
  return {};
}

export function UnifiedImageGenerator({
  open,
  onOpenChange,
  content,
  brandLogoUrl,
  brandPrimaryColor,
  brandIndustry,
  onImageGenerated,
  initialChannel,
  initialMode = 'batch',
}: UnifiedImageGeneratorProps) {
  // Mode state
  const [mode, setMode] = useState<GeneratorMode>(initialMode);
  const [viewMode, setViewMode] = useState<ViewMode>('setup');
  
  // Shared settings
  const [includeLogo, setIncludeLogo] = useState(!!brandLogoUrl);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>('bottom-right');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('auto');
  const [imageStyle, setImageStyle] = useState<ImageStylePreset | 'auto'>('auto');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [advancedMode, setAdvancedMode] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  
  // NEW: Social Graphics (text-in-image) state
  const [imageContentType, setImageContentType] = useState<ImageContentType>('background_only');
  const [textToInclude, setTextToInclude] = useState<string>('');
  const [textPosition, setTextPosition] = useState<TextPosition>('center');
  const [typographyStyle, setTypographyStyle] = useState<TypographyStyle>('modern');
  
  // Batch mode state
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>(content?.selected_channels ?? []);
  const [regeneratingChannel, setRegeneratingChannel] = useState<Channel | null>(null);
  
  // Single mode state
  const [singleChannel, setSingleChannel] = useState<Channel>(initialChannel || content?.selected_channels?.[0] || 'facebook');
  const [customPrompt, setCustomPrompt] = useState('');
  const [singleGeneratedUrl, setSingleGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [styleSuggestions, setStyleSuggestions] = useState<StyleSuggestion[]>([]);

  // Hooks
  const batchGen = useAutoImageGeneration();
  const singleGen = useSocialImageGeneration();

  // Fetch brand template for suggestions
  const { data: brandTemplate } = useQuery({
    queryKey: ['brand-template-for-suggestions', content?.brand_template_id],
    queryFn: async () => {
      if (!content?.brand_template_id) return null;
      const { data, error } = await supabase
        .from('brand_templates')
        .select('industry, tone_of_voice, image_style, formality_level')
        .eq('id', content.brand_template_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!content?.brand_template_id,
  });

  // Compute style suggestions when brand data available
  // Note: We don't include imageStyle in deps to avoid infinite loop when auto-selecting
  useEffect(() => {
    const industry = brandTemplate?.industry || brandIndustry;
    const toneOfVoice = brandTemplate?.tone_of_voice as string[] | undefined;
    const explicitImageStyle = brandTemplate?.image_style as string | undefined;
    const formalityLevel = brandTemplate?.formality_level as string | undefined;
    
    if (industry || toneOfVoice || explicitImageStyle) {
      const suggestions = suggestImageStyles({
        industry,
        toneOfVoice,
        explicitImageStyle,
        formalityLevel,
      });
      setStyleSuggestions(suggestions);
      
      // Auto-select recommended style if currently on 'auto' and we have suggestions
      // Use functional update to check current value without adding to deps
      setImageStyle(currentStyle => {
        if (currentStyle === 'auto' && suggestions.length > 0 && suggestions[0]?.isRecommended) {
          return suggestions[0].style;
        }
        return currentStyle;
      });
    } else {
      setStyleSuggestions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandTemplate, brandIndustry]);

  // Auto-generate prompt for single mode
  useEffect(() => {
    if (open && mode === 'single') {
      const contentSummary = getContentSummary(content, singleChannel);
      const hookData = getHookForChannel(content, singleChannel);
      const autoPrompt = generateAutoPrompt(
        singleChannel,
        contentSummary,
        content.brand_name,
        brandPrimaryColor || undefined,
        brandIndustry,
        hookData.hookMessage,
      );
      setCustomPrompt(autoPrompt);
      setSingleGeneratedUrl(null);
      
      // Auto-fill text from hook's text_overlay if available
      const contentAny = content as any;
      const selectedHooks = contentAny.selected_hooks as any[] | null;
      const channelHook = selectedHooks?.find((h: any) => h.channel === singleChannel);
      if (channelHook?.text_overlay) {
        setTextToInclude(channelHook.text_overlay);
      } else if (contentAny.global_hook?.text_overlay) {
        setTextToInclude(contentAny.global_hook.text_overlay);
      } else if (hookData.hookMessage) {
        // Use hook message as fallback for text
        setTextToInclude(hookData.hookMessage);
      }
    }
  }, [open, mode, singleChannel, content, brandPrimaryColor, brandIndustry]);

  // Content summaries for batch mode
  const contentSummaries = useMemo(() => {
    const summaries: Record<Channel, string> = {} as Record<Channel, string>;
    selectedChannels.forEach(ch => {
      summaries[ch] = getContentSummary(content, ch);
    });
    return summaries;
  }, [content, selectedChannels]);

  // Hook messages for batch mode - extract for each channel
  const hookMessages = useMemo(() => {
    const hooks: Record<Channel, { hookMessage?: string; hookType?: string }> = {} as Record<Channel, { hookMessage?: string; hookType?: string }>;
    selectedChannels.forEach(ch => {
      hooks[ch] = getHookForChannel(content, ch);
    });
    return hooks;
  }, [content, selectedChannels]);

  // Extract strategic context from content
  const contentAny = content as any;
  const contentRole = contentAny.content_role as 'seed' | 'sprout' | 'harvest' | undefined;
  const contentAngle = contentAny.content_angle as string | undefined;

  const batchOptions = useMemo(() => ({
    contentId: content?.id ?? '',
    brandTemplateId: content?.brand_template_id || '',
    channels: selectedChannels,
    contentSummaries,
    includeLogo: includeLogo && !!brandLogoUrl,
    logoPosition,
    logoUrl: brandLogoUrl || undefined,
    aspectRatio,
    imageStylePreset: imageStyle === 'auto' ? undefined : imageStyle,
    negativePrompt: negativePrompt.trim() || undefined,
    // Strategic context for content-aware image generation
    contentRole,
    contentAngle,
    hookMessages,
  }), [content?.id, content?.brand_template_id, selectedChannels, contentSummaries, includeLogo, brandLogoUrl, logoPosition, aspectRatio, imageStyle, negativePrompt, contentRole, contentAngle, hookMessages]);

  // Handlers
  const handleBatchGenerate = async () => {
    if (!content.brand_template_id) return;
    setViewMode('streaming');
    const result = await batchGen.generateAllImages(batchOptions, onImageGenerated, false);
    if (result.successful.length > 0) {
      setViewMode('preview');
    }
  };

  const handleSingleGenerate = async () => {
    if (!customPrompt.trim() || !content.brand_template_id) {
      toast.error('Vui lòng nhập prompt và chọn brand');
      return;
    }

    const effectiveAspectRatio = aspectRatio === 'auto' 
      ? CHANNEL_OPTIMAL_ASPECT_RATIO[singleChannel] || '16:9'
      : aspectRatio;

    // Extract hook and strategic context from content
    const hookData = getHookForChannel(content, singleChannel);
    const contentAny = content as any;

    const imageUrl = await singleGen.generateImage({
      prompt: customPrompt,
      contentId: content.id,
      channel: singleChannel,
      aspectRatio: effectiveAspectRatio,
      brandTemplateId: content.brand_template_id,
      imageStylePreset: imageStyle === 'auto' ? undefined : imageStyle,
      negativePrompt: negativePrompt.trim() || undefined,
      // Pass strategic context for more relevant images
      contentRole: contentAny.content_role,
      contentAngle: contentAny.content_angle,
      hookMessage: hookData.hookMessage,
      hookType: hookData.hookType,
      // NEW: Pass text-in-image params for Social Graphics
      imageContentType,
      textToInclude: imageContentType === 'with_text' ? textToInclude : undefined,
      textPosition: imageContentType === 'with_text' ? textPosition : undefined,
      typographyStyle: imageContentType === 'with_text' ? typographyStyle : undefined,
    });

    if (imageUrl) {
      setSingleGeneratedUrl(imageUrl);
      if (onImageGenerated) {
        await onImageGenerated(singleChannel, {
          url: imageUrl,
          prompt: customPrompt,
          provider: 'lovable-ai',
          generatedAt: new Date().toISOString(),
        });
      }
    }
  };

  const handleSaveAll = async () => {
    if (onImageGenerated) {
      const channelsToSave = Object.keys(batchGen.generatedImages) as Channel[];
      await batchGen.savePreviewImages(channelsToSave, onImageGenerated);
      handleClose();
    }
  };

  const handleRegenerateChannel = async (channel: Channel) => {
    setRegeneratingChannel(channel);
    await batchGen.regenerateForChannel(channel, batchOptions);
    setRegeneratingChannel(null);
  };

  const handleDownloadImage = (channel: Channel) => {
    const image = batchGen.generatedImages[channel];
    if (!image) return;
    
    const link = document.createElement('a');
    link.href = image.imageUrl;
    link.download = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}-${channel}.png`;
    link.target = '_blank';
    link.click();
  };

  const handleDownloadSingle = async () => {
    if (!singleGeneratedUrl) return;
    try {
      const response = await fetch(singleGeneratedUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${singleChannel}-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Đã tải ảnh');
    } catch {
      toast.error('Không thể tải ảnh');
    }
  };

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(customPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Đã copy prompt');
  };

  const handleRegeneratePrompt = () => {
    const contentSummary = getContentSummary(content, singleChannel);
    const hookData = getHookForChannel(content, singleChannel);
    const autoPrompt = generateAutoPrompt(
      singleChannel,
      contentSummary,
      content.brand_name,
      brandPrimaryColor || undefined,
      brandIndustry,
      hookData.hookMessage,
    );
    setCustomPrompt(autoPrompt);
  };

  const handleClose = () => {
    if (!batchGen.isGenerating && !singleGen.generating) {
      batchGen.resetProgress();
      setViewMode('setup');
      setSingleGeneratedUrl(null);
      onOpenChange(false);
    }
  };

  const handleBackToSetup = () => {
    if (!batchGen.isGenerating) {
      batchGen.resetProgress();
      setViewMode('setup');
    }
  };

  const handleToggleChannel = (channel: Channel) => {
    setSelectedChannels((prev) => {
      const arr = prev ?? [];
      return arr.includes(channel)
        ? arr.filter(c => c !== channel)
        : [...arr, channel];
    });
  };

  // Computed
  const hasGeneratedImages = Object.keys(batchGen.generatedImages).length > 0;
  const dialogSize = viewMode === 'setup' ? 'sm:max-w-2xl' : 'sm:max-w-4xl';
  const isGenerating = batchGen.isGenerating || singleGen.generating === singleChannel;

  // Visual aspect ratio preview helper
  const getAspectRatioClasses = (ratio: string) => {
    switch (ratio) {
      case '16:9': return 'w-10 h-6';
      case '1:1': return 'w-7 h-7';
      case '4:5': return 'w-6 h-7';
      case '9:16': return 'w-5 h-9';
      default: return 'w-8 h-6';
    }
  };

  const effectiveAspectRatio = aspectRatio === 'auto' 
    ? CHANNEL_OPTIMAL_ASPECT_RATIO[mode === 'single' ? singleChannel : selectedChannels[0]] || '16:9'
    : aspectRatio;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(dialogSize, "transition-all duration-300 max-h-[90vh] overflow-hidden flex flex-col")}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {viewMode === 'setup' && 'Tạo ảnh AI'}
            {viewMode === 'streaming' && 'Đang tạo ảnh...'}
            {viewMode === 'preview' && 'Xem trước ảnh đã tạo'}
          </DialogTitle>
          <DialogDescription>
            {viewMode === 'setup' && 'Tạo ảnh với brand context, style presets và logo overlay'}
            {viewMode === 'streaming' && 'AI đang tạo ảnh, bạn có thể theo dõi tiến trình'}
            {viewMode === 'preview' && 'Kiểm tra và lưu ảnh đã tạo'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Setup Mode */}
          {viewMode === 'setup' && (
            <div className="space-y-4 py-2">
              {/* Mode Toggle */}
              <Tabs value={mode} onValueChange={(v) => setMode(v as GeneratorMode)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-muted/60">
                  <TabsTrigger value="batch" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                    <Layers className="w-4 h-4" />
                    Tạo nhiều kênh
                  </TabsTrigger>
                  <TabsTrigger value="single" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                    <ImageIcon className="w-4 h-4" />
                    Tạo từng kênh
                  </TabsTrigger>
                </TabsList>

                {/* Batch Mode Content */}
                <TabsContent value="batch" className="space-y-4 mt-4">
                  {/* Brand Preview - Enhanced */}
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
                    {brandLogoUrl ? (
                      <div className="w-12 h-12 rounded-xl bg-background shadow-sm flex items-center justify-center overflow-hidden ring-1 ring-border/50">
                        <img src={brandLogoUrl} alt="Brand logo" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                        <Image className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{content.brand_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {brandPrimaryColor ? (
                          <>
                            <div className="w-4 h-4 rounded-full ring-2 ring-background shadow-sm" style={{ backgroundColor: brandPrimaryColor }} />
                            <span className="text-sm text-muted-foreground font-medium">{brandPrimaryColor}</span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Không có màu chủ đạo</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Channel Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Chọn kênh ({selectedChannels.length})</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(content?.selected_channels ?? []).map(channel => {
                        const isSelected = selectedChannels.includes(channel);
                        const optimalRatio = CHANNEL_OPTIMAL_ASPECT_RATIO[channel] || '16:9';
                        const channelInfo = CHANNEL_CONFIG[channel];

                        return (
                          <button
                            key={channel}
                            onClick={() => handleToggleChannel(channel)}
                            className={cn(
                              'flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all duration-200',
                              isSelected 
                                ? 'border-primary bg-primary/5 shadow-sm' 
                                : 'border-border/50 hover:border-primary/40 hover:bg-muted/30'
                            )}
                          >
                            <div className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                              isSelected ? channelInfo?.bgColor : 'bg-muted'
                            )}>
                              <span className={cn(isSelected ? channelInfo?.color : 'text-muted-foreground')}>
                                {channelInfo?.icon}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium capitalize block text-sm truncate">
                                {channel === 'google_maps' ? 'Google Maps' : channel === 'zalo_oa' ? 'Zalo OA' : channel}
                              </span>
                              {aspectRatio === 'auto' && (
                                <span className="text-xs text-muted-foreground">{optimalRatio}</span>
                              )}
                            </div>
                            <div className={cn(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                              isSelected 
                                ? 'border-primary bg-primary text-primary-foreground' 
                                : 'border-muted-foreground/30'
                            )}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>

                {/* Single Mode Content */}
                <TabsContent value="single" className="space-y-4 mt-4">
                  {/* Channel Selection for Single */}
                  <div className="space-y-2">
                    <Label>Chọn kênh</Label>
                    <Select value={singleChannel} onValueChange={(v) => setSingleChannel(v as Channel)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(content?.selected_channels ?? []).map(channel => (
                          <SelectItem key={channel} value={channel}>
                            <span className="capitalize">{channel.replace('_', ' ')}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Prompt Editor */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Image Prompt</Label>
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRegeneratePrompt}>
                                <Wand2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Tạo lại prompt</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyPrompt}>
                                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy prompt</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <Textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Mô tả ảnh bạn muốn tạo..."
                      rows={3}
                      className="resize-none text-sm"
                    />
                  </div>

                  {/* Single Generated Preview */}
                  {singleGeneratedUrl && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Ảnh đã tạo</Label>
                        <Button variant="ghost" size="sm" onClick={handleDownloadSingle} className="h-7 gap-1">
                          <Download className="w-3.5 h-3.5" />
                          Tải xuống
                        </Button>
                      </div>
                      <div className="relative rounded-lg overflow-hidden border bg-muted/30">
                        <img src={singleGeneratedUrl} alt="Generated" className="w-full h-auto max-h-64 object-contain" />
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Shared Settings */}
              <div className="space-y-4 pt-4 border-t">
                {/* Strategic Context Preview - Enhanced Card */}
                <StrategicContextPreview
                  mode={mode}
                  contentRole={contentRole}
                  contentAngle={contentAngle}
                  hookMessages={hookMessages}
                  selectedChannels={selectedChannels}
                  singleChannel={singleChannel}
                  content={content}
                  getHookForChannel={getHookForChannel}
                  CHANNEL_CONFIG={CHANNEL_CONFIG}
                  // NEW: Pass text-in-image params for preview
                  imageContentType={imageContentType}
                  textToInclude={textToInclude}
                  textPosition={textPosition}
                  typographyStyle={typographyStyle}
                />

                {/* NEW: Image Content Type Selection (Social Graphics) */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    Loại ảnh
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setImageContentType('background_only')}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all duration-200",
                        imageContentType === 'background_only' 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : "border-border/50 hover:border-primary/40 hover:bg-muted/30"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                        imageContentType === 'background_only' ? "bg-primary/10" : "bg-muted"
                      )}>
                        <ImageIcon className={cn(
                          "w-5 h-5",
                          imageContentType === 'background_only' ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="font-medium text-sm">Ảnh nền</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Không có text, phù hợp để overlay sau
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setImageContentType('with_text')}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all duration-200",
                        imageContentType === 'with_text' 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : "border-border/50 hover:border-primary/40 hover:bg-muted/30"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                        imageContentType === 'with_text' ? "bg-primary/10" : "bg-muted"
                      )}>
                        <Type className={cn(
                          "w-5 h-5",
                          imageContentType === 'with_text' ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="font-medium text-sm">Social Graphic</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Có hook/quote hiển thị trên ảnh
                      </div>
                    </button>
                  </div>

                  {/* Text options when with_text selected */}
                  {imageContentType === 'with_text' && (
                    <div className="space-y-3 p-4 bg-gradient-to-r from-orange-500/5 to-transparent rounded-xl border border-orange-500/20">
                      <div className="space-y-2">
                        <Label className="text-sm flex items-center gap-2">
                          <Quote className="w-3.5 h-3.5 text-orange-600" />
                          Text hiển thị trên ảnh
                        </Label>
                        <Textarea
                          value={textToInclude}
                          onChange={(e) => setTextToInclude(e.target.value)}
                          placeholder="Nhập text hoặc sử dụng hook message..."
                          rows={2}
                          className="resize-none text-sm"
                        />
                        {getHookForChannel(content, mode === 'single' ? singleChannel : selectedChannels[0])?.hookMessage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs gap-1.5 h-7 text-orange-600 hover:text-orange-700 hover:bg-orange-500/10"
                            onClick={() => {
                              const hookData = getHookForChannel(content, mode === 'single' ? singleChannel : selectedChannels[0]);
                              if (hookData.hookMessage) {
                                setTextToInclude(hookData.hookMessage);
                              }
                            }}
                          >
                            <Sparkles className="w-3 h-3" />
                            Dùng Hook message
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Vị trí text</Label>
                          <Select 
                            value={textPosition} 
                            onValueChange={(v) => setTextPosition(v as TextPosition)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="center">
                                <div className="flex items-center gap-2">
                                  <AlignCenter className="w-3.5 h-3.5" />
                                  Giữa ảnh
                                </div>
                              </SelectItem>
                              <SelectItem value="top">
                                <div className="flex items-center gap-2">
                                  <AlignLeft className="w-3.5 h-3.5" />
                                  Phía trên
                                </div>
                              </SelectItem>
                              <SelectItem value="bottom">
                                <div className="flex items-center gap-2">
                                  <AlignRight className="w-3.5 h-3.5" />
                                  Phía dưới
                                </div>
                              </SelectItem>
                              <SelectItem value="top-left">Góc trên trái</SelectItem>
                              <SelectItem value="bottom-right">Góc dưới phải</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Typography</Label>
                          <Select 
                            value={typographyStyle} 
                            onValueChange={(v) => setTypographyStyle(v as TypographyStyle)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="modern">Modern (Sans)</SelectItem>
                              <SelectItem value="classic">Classic (Serif)</SelectItem>
                              <SelectItem value="bold">Bold (Impact)</SelectItem>
                              <SelectItem value="minimal">Minimal (Thin)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Text Preview */}
                      {textToInclude && (
                        <div className="p-3 rounded-lg bg-background/50 border border-dashed border-orange-500/30">
                          <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                          <p className="text-sm font-medium text-foreground leading-relaxed">
                            "{textToInclude}"
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-2">
                            Vị trí: {textPosition} • Style: {typographyStyle}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* AI Style Suggestions */}
                {styleSuggestions.length > 0 && (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                        <Wand2 className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        Gợi ý cho thương hiệu của bạn
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {styleSuggestions.slice(0, 2).map((suggestion) => {
                        const styleInfo = IMAGE_STYLES.find(s => s.value === suggestion.style);
                        const isSelected = imageStyle === suggestion.style;
                        
                        return (
                          <button
                            key={suggestion.style}
                            onClick={() => setImageStyle(suggestion.style)}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2 transition-all duration-200",
                              isSelected 
                                ? "border-primary bg-primary/10 shadow-sm" 
                                : "border-primary/30 bg-background hover:border-primary/50 hover:bg-primary/5"
                            )}
                          >
                            <div className={cn(
                              "w-7 h-7 rounded-md flex items-center justify-center",
                              isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                            )}>
                              {styleInfo?.icon}
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  "text-sm font-medium",
                                  isSelected ? "text-primary" : "text-foreground"
                                )}>
                                  {styleInfo?.label}
                                </span>
                                {suggestion.isRecommended && (
                                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-primary/15 text-primary border-0">
                                    <Star className="w-2.5 h-2.5 mr-0.5 fill-primary" />
                                    Best
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {suggestion.matchPercentage}% phù hợp
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {styleSuggestions[0]?.reasons.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2.5 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                        {formatReasons(styleSuggestions[0].reasons)}
                      </p>
                    )}
                  </div>
                )}

                {/* Style Selection - Visual Grid */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {styleSuggestions.length > 0 ? 'Tất cả phong cách' : 'Phong cách ảnh'}
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {IMAGE_STYLES.map(style => {
                      const isSelected = imageStyle === style.value;
                      const isSuggested = styleSuggestions.some(s => s.style === style.value);
                      
                      return (
                        <button
                          key={style.value}
                          onClick={() => setImageStyle(style.value as ImageStylePreset | 'auto')}
                          className={cn(
                            'flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all duration-200 relative',
                            isSelected 
                              ? 'border-primary bg-primary/5 shadow-sm' 
                              : 'border-border/50 hover:border-primary/40 hover:bg-muted/30'
                          )}
                        >
                          {isSuggested && !isSelected && (
                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary/60 ring-2 ring-background" />
                          )}
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center',
                            isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                          )}>
                            {style.icon}
                          </div>
                          <span className={cn(
                            'text-xs font-medium',
                            isSelected ? 'text-primary' : 'text-foreground'
                          )}>
                            {style.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Aspect Ratio - Visual Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tỉ lệ khung hình</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {ASPECT_RATIOS.map(ratio => {
                      const isSelected = aspectRatio === ratio.value;
                      return (
                        <button
                          key={ratio.value}
                          onClick={() => setAspectRatio(ratio.value)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-200',
                            isSelected 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border/50 hover:border-primary/40'
                          )}
                        >
                          {/* Visual aspect ratio box */}
                          <div className={cn(
                            'border-2 rounded flex items-center justify-center shrink-0',
                            isSelected ? 'border-primary bg-primary/20' : 'border-muted-foreground/30 bg-muted/50',
                            ratio.value === '16:9' && 'w-8 h-[18px]',
                            ratio.value === '1:1' && 'w-5 h-5',
                            ratio.value === '4:5' && 'w-4 h-5',
                            ratio.value === '9:16' && 'w-[18px] h-8',
                            ratio.value === 'auto' && 'w-5 h-5',
                          )}>
                            {ratio.value === 'auto' && <Sparkles className="w-3 h-3 text-primary" />}
                          </div>
                          <div className="text-left">
                            <span className={cn(
                              'text-sm font-medium block',
                              isSelected ? 'text-primary' : 'text-foreground'
                            )}>
                              {ratio.label}
                            </span>
                            {ratio.value !== 'auto' && (
                              <span className="text-xs text-muted-foreground">{ratio.description}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Logo Options - Enhanced */}
                {brandLogoUrl && (
                  <div className={cn(
                    "flex items-center justify-between p-3 rounded-xl border-2 transition-colors",
                    includeLogo ? "border-primary/30 bg-primary/5" : "border-border/50 bg-card"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden",
                        includeLogo ? "ring-2 ring-primary/30" : "bg-muted"
                      )}>
                        <img src={brandLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Thêm logo</p>
                        <p className="text-xs text-muted-foreground">Tự động overlay sau khi tạo</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {includeLogo && (
                        <Select value={logoPosition} onValueChange={(v) => setLogoPosition(v as LogoPosition)}>
                          <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LOGO_POSITIONS.map(pos => (
                              <SelectItem key={pos.value} value={pos.value}>
                                {pos.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Switch 
                        checked={includeLogo} 
                        onCheckedChange={setIncludeLogo} 
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                  </div>
                )}

                {/* Advanced Mode */}
                <Collapsible open={advancedMode} onOpenChange={setAdvancedMode}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <Settings2 className="w-4 h-4" />
                      <span>{advancedMode ? 'Ẩn nâng cao' : 'Tùy chọn nâng cao'}</span>
                      {advancedMode ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Negative Prompt</Label>
                      <Textarea
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="text, logo, watermark, blurry, distorted, low quality..."
                        rows={2}
                        className="text-sm"
                      />
                    </div>

                    {/* Prompt Preview */}
                    <Collapsible open={showPromptPreview} onOpenChange={setShowPromptPreview}>
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                          <Eye className="w-4 h-4" />
                          <span>Xem context sẽ gửi</span>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="p-3 rounded-lg border bg-muted/30 space-y-2 text-xs">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-muted-foreground">Brand</p>
                              <p className="font-medium">{content.brand_name}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Màu chủ đạo</p>
                              <div className="flex items-center gap-1.5">
                                {brandPrimaryColor ? (
                                  <>
                                    <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: brandPrimaryColor }} />
                                    <span className="font-medium">{brandPrimaryColor}</span>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">Không có</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Ngành</p>
                              <p className="font-medium">{brandIndustry?.slice(0, 2).join(', ') || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Style</p>
                              <p className="font-medium">
                                {imageStyle === 'auto' ? 'Tự động' : IMAGE_STYLE_PRESETS[imageStyle]?.label || imageStyle}
                              </p>
                            </div>
                            {/* Strategic Context: Role */}
                            {contentRole && (
                              <div>
                                <p className="text-muted-foreground">Vai trò</p>
                                <p className="font-medium capitalize">
                                  {contentRole === 'seed' ? '🌱 Seed (Nhận diện)' : 
                                   contentRole === 'sprout' ? '🌿 Sprout (Tin tưởng)' : 
                                   '🌾 Harvest (Chuyển đổi)'}
                                </p>
                              </div>
                            )}
                            {/* Strategic Context: Angle */}
                            {contentAngle && (
                              <div>
                                <p className="text-muted-foreground">Góc nhìn</p>
                                <p className="font-medium capitalize">{contentAngle.replace('_', ' ')}</p>
                              </div>
                            )}
                          </div>
                          {/* Hook Message Preview */}
                          {mode === 'batch' && Object.values(hookMessages).some(h => h.hookMessage) && (
                            <div className="pt-2 border-t">
                              <p className="text-muted-foreground mb-1">Hook messages</p>
                              <div className="space-y-1">
                                {selectedChannels.slice(0, 2).map(ch => {
                                  const hook = hookMessages[ch];
                                  if (!hook?.hookMessage) return null;
                                  return (
                                    <div key={ch} className="flex items-start gap-1.5">
                                      <span className="text-muted-foreground capitalize">{ch}:</span>
                                      <span className="font-medium line-clamp-1">{hook.hookMessage.slice(0, 60)}...</span>
                                    </div>
                                  );
                                })}
                                {selectedChannels.length > 2 && (
                                  <span className="text-muted-foreground">+{selectedChannels.length - 2} kênh khác</span>
                                )}
                              </div>
                            </div>
                          )}
                          {mode === 'single' && (() => {
                            const singleHook = getHookForChannel(content, singleChannel);
                            return singleHook.hookMessage ? (
                              <div className="pt-2 border-t">
                                <p className="text-muted-foreground">Hook message</p>
                                <p className="font-medium text-primary/90">"{singleHook.hookMessage.slice(0, 80)}{singleHook.hookMessage.length > 80 ? '...' : ''}"</p>
                              </div>
                            ) : null;
                          })()}
                          {negativePrompt && (
                            <div className="pt-2 border-t">
                              <p className="text-muted-foreground">Negative</p>
                              <p className="font-medium text-destructive/80">{negativePrompt}</p>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          )}

          {/* Streaming & Preview Mode */}
          {(viewMode === 'streaming' || viewMode === 'preview') && (
            <ScrollArea className="max-h-[60vh]">
              <div className="py-2">
                <ImageStreamingGrid
                  progress={batchGen.progress}
                  progressTimes={batchGen.progressTimes}
                  logoOverlayFailures={batchGen.logoOverlayFailures}
                  generatedImages={batchGen.generatedImages}
                  onRetryChannel={handleRegenerateChannel}
                  onDownloadImage={handleDownloadImage}
                  retryingChannel={regeneratingChannel}
                />
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {viewMode === 'setup' && mode === 'batch' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Đóng
              </Button>
              <Button
                onClick={handleBatchGenerate}
                disabled={selectedChannels.length === 0 || !content.brand_template_id}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Tạo {selectedChannels.length} ảnh
              </Button>
            </>
          )}

          {viewMode === 'setup' && mode === 'single' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Đóng
              </Button>
              <Button
                onClick={handleSingleGenerate}
                disabled={isGenerating || !customPrompt.trim() || !content.brand_template_id}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang tạo...
                  </>
                ) : singleGeneratedUrl ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Tạo lại
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Tạo ảnh
                  </>
                )}
              </Button>
            </>
          )}

          {viewMode === 'streaming' && (
            <Button variant="outline" disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Đang xử lý...
            </Button>
          )}

          {viewMode === 'preview' && (
            <>
              <Button variant="outline" onClick={handleBackToSetup} disabled={batchGen.isGenerating}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại
              </Button>
              <Button onClick={handleSaveAll} disabled={batchGen.isGenerating || !hasGeneratedImages}>
                <Save className="w-4 h-4 mr-2" />
                Lưu tất cả ({Object.keys(batchGen.generatedImages).length})
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
