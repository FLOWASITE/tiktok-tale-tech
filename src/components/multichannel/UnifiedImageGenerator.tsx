import { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, Image, Loader2, Save, Settings2, Check, ArrowLeft, 
  Copy, Download, RefreshCw, Wand2, Palette, ChevronDown, ChevronUp, Eye,
  Layers, ImageIcon, Camera, Brush, Box, Droplets, Film, LayoutGrid,
  Facebook, Instagram, Linkedin, Twitter, Globe, MapPin, Youtube, Mail, MessageCircle, Music2, AtSign, Star,
  Type, AlignCenter, AlignLeft, AlignRight, Quote, Send
} from 'lucide-react';
import { BlueskyIcon } from '@/components/icons/SocialIcons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { MediaRetentionNotice } from '@/components/MediaRetentionNotice';
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
  AspectRatioOption,
  ImageStylePreset,
} from '@/hooks/useAutoImageGeneration';
import { 
  LogoOptionsPanel, 
  type LogoPosition, 
  type LogoStyle,
} from '@/components/multichannel/LogoOptionsPanel';
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
import { TextPositionMockup } from './TextPositionMockup';
import { VisualTextPositionPreview } from './VisualTextPositionPreview';
import { BackgroundEditor } from './BackgroundEditor';
import { ChannelIcon } from '@/components/multichannel/streaming/ChannelIcon';

interface UnifiedImageGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: MultiChannelContent;
  brandLogoUrl?: string | null;
  brandPrimaryColor?: string | null;
  brandIndustry?: string[];
  onImageGenerated?: (channel: Channel, image: ChannelImage) => Promise<void>;
  initialChannel?: Channel;
  initialMode?: 'single' | 'batch';
}

type ViewMode = 'setup' | 'streaming' | 'preview';
type GeneratorMode = 'single' | 'batch';

const CHANNEL_CONFIG: Record<Channel, { icon: React.ReactNode; color: string; bgColor: string }> = {
  facebook: { icon: <Facebook className="w-4 h-4" />, color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  instagram: { icon: <Instagram className="w-4 h-4" />, color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  pinterest: { icon: <ChannelIcon channel="pinterest" size="sm" />, color: 'text-[#E60023]', bgColor: 'bg-[#E60023]/10' },
  linkedin: { icon: <Linkedin className="w-4 h-4" />, color: 'text-sky-600', bgColor: 'bg-sky-500/10' },
  twitter: { icon: <Twitter className="w-4 h-4" />, color: 'text-slate-700', bgColor: 'bg-slate-500/10' },
  website: { icon: <Globe className="w-4 h-4" />, color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
  blogger: { icon: <ChannelIcon channel="blogger" size="sm" />, color: 'text-[#FF5722]', bgColor: 'bg-[#FF5722]/10' },
  wordpress: { icon: <ChannelIcon channel="wordpress" size="sm" />, color: 'text-[#21759B]', bgColor: 'bg-[#21759B]/10' },
  shopify: { icon: <ChannelIcon channel="shopify" size="sm" />, color: 'text-[#96BF48]', bgColor: 'bg-[#96BF48]/10' },
  wix: { icon: <ChannelIcon channel="wix" size="sm" />, color: 'text-foreground', bgColor: 'bg-muted' },
  medium: { icon: <ChannelIcon channel="wix" size="sm" />, color: 'text-foreground', bgColor: 'bg-muted' },
  google_maps: { icon: <MapPin className="w-4 h-4" />, color: 'text-green-600', bgColor: 'bg-green-500/10' },
  youtube: { icon: <Youtube className="w-4 h-4" />, color: 'text-red-600', bgColor: 'bg-red-500/10' },
  email: { icon: <Mail className="w-4 h-4" />, color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
  tiktok: { icon: <Music2 className="w-4 h-4" />, color: 'text-black dark:text-white', bgColor: 'bg-black/10 dark:bg-white/10' },
  zalo_oa: { icon: <MessageCircle className="w-4 h-4" />, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  telegram: { icon: <Send className="w-4 h-4" />, color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
  threads: { icon: <AtSign className="w-4 h-4" />, color: 'text-slate-800 dark:text-slate-200', bgColor: 'bg-slate-500/10' },
  bluesky: { icon: <BlueskyIcon className="w-4 h-4" />, color: 'text-[#0085FF]', bgColor: 'bg-[#0085FF]/10' },
};

// LOGO_POSITIONS removed - now using LogoOptionsPanel with 9-position grid

const ASPECT_RATIOS: { value: AspectRatioOption; label: string; description: string }[] = [
  { value: 'auto', label: 'Tự động', description: 'Tỉ lệ tối ưu cho từng kênh' },
  { value: '16:9', label: '16:9', description: 'Website, YouTube' },
  { value: '1:1', label: '1:1', description: 'Facebook, IG Feed' },
  { value: '4:5', label: '4:5', description: 'IG Portrait' },
  { value: '9:16', label: '9:16', description: 'Stories, Reels' },
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

function getHookForChannel(content: MultiChannelContent, channel: Channel): { hookMessage?: string; hookType?: string } {
  const selectedHooks = content.selected_hooks;
  const channelHook = selectedHooks?.find((h) => h.channel === channel);
  
  if (channelHook?.opening_line) {
    return {
      hookMessage: channelHook.opening_line,
      hookType: channelHook.hook_type,
    };
  }
  
  const globalHook = content.global_hook;
  if (globalHook?.opening_line) {
    return {
      hookMessage: globalHook.opening_line,
      hookType: globalHook.hook_type,
    };
  }
  
  return {};
}

/**
 * Helper to extract text content snippet from channel content
 * Cleans markdown and truncates to ~100 chars for overlay
 */
function extractContentSnippet(text: string | null, maxLength: number = 100): string {
  if (!text) return '';
  
  // Clean markdown: headers, bold, italic, links, emoji modifiers
  const cleaned = text
    .replace(/#{1,6}\s?/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .trim();
  
  // Get first sentence or truncate
  const firstSentence = cleaned.match(/^[^.!?]+[.!?]/);
  const snippet = firstSentence ? firstSentence[0] : cleaned.slice(0, maxLength);
  
  return snippet.length > maxLength ? snippet.slice(0, maxLength - 3) + '...' : snippet;
}

/**
 * Get best overlay text for a channel with fallback chain:
 * 1. selected_hooks[channel].text_overlay
 * 2. global_hook.text_overlay
 * 3. selected_hooks[channel].opening_line
 * 4. global_hook.opening_line
 * 5. First sentence/snippet of channel content
 */
function getBestOverlayText(content: MultiChannelContent, channel: Channel): string {
  const selectedHooks = content.selected_hooks;
  const globalHook = content.global_hook;
  const channelHook = selectedHooks?.find((h) => h.channel === channel);
  
  // Priority 1: Channel-specific text_overlay
  if (channelHook?.text_overlay) {
    return channelHook.text_overlay;
  }
  
  // Priority 2: Global text_overlay
  if (globalHook?.text_overlay) {
    return globalHook.text_overlay;
  }
  
  // Priority 3: Channel-specific opening_line
  if (channelHook?.opening_line) {
    return channelHook.opening_line;
  }
  
  // Priority 4: Global opening_line
  if (globalHook?.opening_line) {
    return globalHook.opening_line;
  }
  
  // Priority 5: Extract from channel content
  const channelContentMap: Partial<Record<Channel, string | null>> = {
    facebook: content.facebook_content,
    instagram: content.instagram_content,
    pinterest: content.instagram_content,
    twitter: content.twitter_content,
    linkedin: content.linkedin_content,
    youtube: content.youtube_content,
    tiktok: content.tiktok_content,
    threads: content.threads_content,
    website: content.website_content,
    blogger: content.website_content,
    wordpress: content.website_content,
    shopify: content.website_content,
    wix: content.website_content,
    medium: content.website_content,
    zalo_oa: content.zalo_oa_content,
    telegram: content.telegram_content,
    email: content.email_content,
    google_maps: content.google_maps_content,
  };
  
  const channelContent = channelContentMap[channel];
  if (channelContent) {
    return extractContentSnippet(channelContent);
  }
  
  // Final fallback: topic
  return content.topic?.slice(0, 100) || '';
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
  const [logoStyle, setLogoStyle] = useState<LogoStyle>('clean');
  const [logoSize, setLogoSize] = useState(15); // 5-30%
  const [logoOpacity, setLogoOpacity] = useState(100); // 30-100%
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('auto');
  const [imageStyle, setImageStyle] = useState<ImageStylePreset | 'auto'>('auto');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [advancedMode, setAdvancedMode] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  
  // Social Graphics state
  const [imageContentType, setImageContentType] = useState<ImageContentType>('background_only');
  const [textToInclude, setTextToInclude] = useState<string>('');
  const [textsPerChannel, setTextsPerChannel] = useState<Record<Channel, string>>({} as Record<Channel, string>);
  const [useSharedText, setUseSharedText] = useState<boolean>(true);
  const [textPosition, setTextPosition] = useState<TextPosition>('center');
  const [typographyStyle, setTypographyStyle] = useState<TypographyStyle>('modern');
  const [isOptimizingText, setIsOptimizingText] = useState(false);
  const [useCanvasFallback, setUseCanvasFallback] = useState(true); // Default ON for 100% text accuracy
  
  // Batch mode state
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>(content?.selected_channels ?? []);
  const [regeneratingChannel, setRegeneratingChannel] = useState<Channel | null>(null);
  
  // Background Editor state
  const [backgroundEditorOpen, setBackgroundEditorOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  
  // Single mode state
  const [singleChannel, setSingleChannel] = useState<Channel>(initialChannel || content?.selected_channels?.[0] || 'facebook');
  const [customPrompt, setCustomPrompt] = useState('');
  const [singleGeneratedUrl, setSingleGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [styleSuggestions, setStyleSuggestions] = useState<StyleSuggestion[]>([]);

  // Hooks
  const batchGen = useAutoImageGeneration();
  const singleGen = useSocialImageGeneration();

  // Fetch brand template
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

  // Compute style suggestions
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
      
      setImageStyle(currentStyle => {
        if (currentStyle === 'auto' && suggestions.length > 0 && suggestions[0]?.isRecommended) {
          return suggestions[0].style;
        }
        return currentStyle;
      });
    } else {
      setStyleSuggestions([]);
    }
  }, [brandTemplate, brandIndustry]);

  // Auto-generate prompt for single mode AND auto-fill text
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
      
      // Auto-fill text using helper with full fallback chain
      // Only fill if currently empty to avoid overwriting user input
      if (!textToInclude) {
        const bestText = getBestOverlayText(content, singleChannel);
        if (bestText) {
          setTextToInclude(bestText);
          console.log('[UnifiedImageGenerator] Single mode autofill', { 
            channel: singleChannel, 
            textPreview: bestText.slice(0, 40),
            hasSelectedHooks: !!content.selected_hooks?.length,
            hasGlobalHook: !!content.global_hook,
          });
        }
      }
    }
  }, [open, mode, singleChannel, content, brandPrimaryColor, brandIndustry]);

  // Auto-fill text from hooks for BATCH mode
  // Triggers: dialog opens, mode changes, imageContentType changes, useSharedText toggle
  useEffect(() => {
    if (!open || mode !== 'batch' || selectedChannels.length === 0) return;
    
    console.log('[UnifiedImageGenerator] Batch mode hooks check', { 
      hasSelectedHooks: !!content.selected_hooks?.length,
      hasGlobalHook: !!content.global_hook,
      imageContentType,
      useSharedText,
    });
    
    // For shared text mode
    if (useSharedText) {
      // Only fill if empty to preserve user input
      if (!textToInclude) {
        const firstChannel = selectedChannels[0];
        const bestText = getBestOverlayText(content, firstChannel);
        if (bestText) {
          setTextToInclude(bestText);
          console.log('[UnifiedImageGenerator] Batch shared text autofill', { 
            textPreview: bestText.slice(0, 40) 
          });
        }
      }
    } else {
      // For per-channel texts, fill each empty channel
      const newTexts: Record<Channel, string> = { ...textsPerChannel };
      let hasUpdates = false;
      
      selectedChannels.forEach(ch => {
        if (!newTexts[ch]) {
          const bestText = getBestOverlayText(content, ch);
          if (bestText) {
            newTexts[ch] = bestText;
            hasUpdates = true;
          }
        }
      });
      
      if (hasUpdates) {
        setTextsPerChannel(newTexts);
        console.log('[UnifiedImageGenerator] Batch per-channel text autofill', { 
          channels: Object.keys(newTexts).length 
        });
      }
    }
  }, [open, mode, selectedChannels, content, useSharedText, imageContentType]);

  // Content summaries for batch mode
  const contentSummaries = useMemo(() => {
    const summaries: Record<Channel, string> = {} as Record<Channel, string>;
    selectedChannels.forEach(ch => {
      summaries[ch] = getContentSummary(content, ch);
    });
    return summaries;
  }, [content, selectedChannels]);

  // Hook messages for batch mode
  const hookMessages = useMemo(() => {
    const hooks: Record<Channel, { hookMessage?: string; hookType?: string }> = {} as Record<Channel, { hookMessage?: string; hookType?: string }>;
    selectedChannels.forEach(ch => {
      hooks[ch] = getHookForChannel(content, ch);
    });
    return hooks;
  }, [content, selectedChannels]);

  // Strategic context
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
    logoStyle,
    logoSizePercent: logoSize,
    logoOpacity,
    aspectRatio,
    imageStylePreset: imageStyle === 'auto' ? undefined : imageStyle,
    negativePrompt: negativePrompt.trim() || undefined,
    contentRole,
    contentAngle,
    hookMessages,
    imageContentType,
    textToInclude: imageContentType === 'with_text' && useSharedText ? textToInclude : undefined,
    textsPerChannel: imageContentType === 'with_text' && !useSharedText ? textsPerChannel : undefined,
    textPosition: imageContentType === 'with_text' ? textPosition : undefined,
    typographyStyle: imageContentType === 'with_text' ? typographyStyle : undefined,
    useCanvasFallback: imageContentType === 'with_text' ? useCanvasFallback : undefined,
  }), [content?.id, content?.brand_template_id, selectedChannels, contentSummaries, includeLogo, brandLogoUrl, logoPosition, logoStyle, logoSize, logoOpacity, aspectRatio, imageStyle, negativePrompt, contentRole, contentAngle, hookMessages, imageContentType, textToInclude, textsPerChannel, useSharedText, textPosition, typographyStyle, useCanvasFallback]);

  // Handlers
  const handleBatchGenerate = async () => {
    if (!content.brand_template_id) return;
    
    // Validation: Require text when Social Graphics mode is enabled
    if (imageContentType === 'with_text') {
      if (useSharedText && !textToInclude.trim()) {
        toast.error('Vui lòng nhập text để hiển thị trên ảnh');
        return;
      }
      if (!useSharedText) {
        const missingTextChannels = selectedChannels.filter(ch => !textsPerChannel[ch]?.trim());
        if (missingTextChannels.length > 0) {
          toast.error(`Vui lòng nhập text cho: ${missingTextChannels.join(', ')}`);
          return;
        }
      }
    }
    
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
    
    // Validation: Require text when Social Graphics mode is enabled
    if (imageContentType === 'with_text' && !textToInclude.trim()) {
      toast.error('Vui lòng nhập text để hiển thị trên ảnh');
      return;
    }

    const effectiveAspectRatio = aspectRatio === 'auto' 
      ? CHANNEL_OPTIMAL_ASPECT_RATIO[singleChannel] || '16:9'
      : aspectRatio;

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
      contentRole: contentAny.content_role,
      contentAngle: contentAny.content_angle,
      hookMessage: hookData.hookMessage,
      hookType: hookData.hookType,
      imageContentType,
      textToInclude: imageContentType === 'with_text' ? textToInclude : undefined,
      textPosition: imageContentType === 'with_text' ? textPosition : undefined,
      typographyStyle: imageContentType === 'with_text' ? typographyStyle : undefined,
      useCanvasFallback: imageContentType === 'with_text' ? useCanvasFallback : undefined,
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

  const handleEditBackground = (channel: Channel) => {
    const image = batchGen.generatedImages[channel];
    if (!image?.imageUrl) {
      toast.error('Không có ảnh để chỉnh sửa');
      return;
    }
    setEditingChannel(channel);
    setBackgroundEditorOpen(true);
  };

  const handleBackgroundEdited = async (newImageUrl: string) => {
    if (!editingChannel) return;
    
    // Update the generated images with the new URL
    batchGen.updateGeneratedImage(editingChannel, { imageUrl: newImageUrl });
    toast.success('Đã cập nhật ảnh');
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
    }
    setViewMode('setup');
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
  const isGenerating = batchGen.isGenerating || singleGen.generating === singleChannel;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "transition-all duration-300 max-h-[90vh] overflow-hidden flex flex-col",
        viewMode === 'setup' ? "sm:max-w-5xl" : "sm:max-w-4xl"
      )}>
        <DialogHeader className="flex-shrink-0">
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

        <div className="px-1">
          <MediaRetentionNotice variant="inline" />
        </div>

        <div className="flex-1 overflow-hidden">
          {/* Setup Mode - Split Panel Layout */}
          {viewMode === 'setup' && (
            <div className="flex h-full gap-0 -mx-6">
              {/* ==================== LEFT PANEL - Form Controls ==================== */}
              <div className="w-[380px] flex-shrink-0 border-r overflow-y-auto px-6 py-4 space-y-4">
                {/* Mode Toggle */}
                <Tabs value={mode} onValueChange={(v) => setMode(v as GeneratorMode)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-10 p-1 bg-muted/60">
                    <TabsTrigger value="batch" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                      <Layers className="w-3.5 h-3.5" />
                      Nhiều kênh
                    </TabsTrigger>
                    <TabsTrigger value="single" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Từng kênh
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Brand Preview - Compact */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                  {brandLogoUrl ? (
                    <div className="w-10 h-10 rounded-lg bg-background shadow-sm flex items-center justify-center overflow-hidden ring-1 ring-border/50">
                      <img src={brandLogoUrl} alt="Brand logo" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Image className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{content.brand_name}</p>
                    {brandPrimaryColor && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-3 h-3 rounded-full ring-1 ring-background shadow-sm" style={{ backgroundColor: brandPrimaryColor }} />
                        <span className="text-xs text-muted-foreground">{brandPrimaryColor}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Channel Selection - Batch Mode */}
                {mode === 'batch' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Chọn kênh ({selectedChannels.length})</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(content?.selected_channels ?? []).map(channel => {
                        const isSelected = selectedChannels.includes(channel);
                        const channelInfo = CHANNEL_CONFIG[channel];

                        return (
                          <button
                            key={channel}
                            onClick={() => handleToggleChannel(channel)}
                            className={cn(
                              'flex items-center gap-2 p-2.5 rounded-lg border-2 text-left transition-all duration-200',
                              isSelected 
                                ? 'border-primary bg-primary/5 shadow-sm' 
                                : 'border-border/50 hover:border-primary/40 hover:bg-muted/30'
                            )}
                          >
                            <div className={cn(
                              'w-7 h-7 rounded-md flex items-center justify-center transition-colors',
                              isSelected ? channelInfo?.bgColor : 'bg-muted'
                            )}>
                              <span className={cn(isSelected ? channelInfo?.color : 'text-muted-foreground')}>
                                {channelInfo?.icon}
                              </span>
                            </div>
                            <span className="font-medium capitalize text-xs truncate flex-1">
                              {channel === 'google_maps' ? 'Maps' : channel === 'zalo_oa' ? 'Zalo' : channel}
                            </span>
                            <div className={cn(
                              'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0',
                              isSelected 
                                ? 'border-primary bg-primary text-primary-foreground' 
                                : 'border-muted-foreground/30'
                            )}>
                              {isSelected && <Check className="w-2.5 h-2.5" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Channel Selection - Single Mode */}
                {mode === 'single' && (
                  <div className="space-y-2">
                    <Label className="text-sm">Chọn kênh</Label>
                    <Select value={singleChannel} onValueChange={(v) => setSingleChannel(v as Channel)}>
                      <SelectTrigger className="h-9">
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

                    {/* Prompt Editor - Single Mode */}
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Image Prompt</Label>
                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRegeneratePrompt}>
                                  <Wand2 className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Tạo lại prompt</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyPrompt}>
                                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
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
                        className="resize-none text-xs"
                      />
                    </div>

                    {/* Single Generated Preview */}
                    {singleGeneratedUrl && (
                      <div className="space-y-2 mt-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Ảnh đã tạo</Label>
                          <Button variant="ghost" size="sm" onClick={handleDownloadSingle} className="h-6 gap-1 text-xs">
                            <Download className="w-3 h-3" />
                            Tải
                          </Button>
                        </div>
                        <div className="relative rounded-lg overflow-hidden border bg-muted/30">
                          <img src={singleGeneratedUrl} alt="Generated" className="w-full h-auto max-h-40 object-contain" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Image Type Toggle */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5" />
                    Loại ảnh
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setImageContentType('background_only')}
                      className={cn(
                        "p-3 rounded-lg border-2 text-left transition-all duration-200",
                        imageContentType === 'background_only' 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : "border-border/50 hover:border-primary/40"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-md flex items-center justify-center mb-1.5",
                        imageContentType === 'background_only' ? "bg-primary/10" : "bg-muted"
                      )}>
                        <ImageIcon className={cn(
                          "w-4 h-4",
                          imageContentType === 'background_only' ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="font-medium text-xs">Ảnh nền</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Không có text</div>
                    </button>
                    
                    <button
                      onClick={() => {
                        setImageContentType('with_text');
                        // Auto-fill text from hook if empty
                        if (!textToInclude.trim()) {
                          const hookData = getHookForChannel(content, mode === 'single' ? singleChannel : selectedChannels[0]);
                          if (hookData.hookMessage) {
                            setTextToInclude(hookData.hookMessage);
                            toast.info('Đã tự động điền text từ Hook. Bạn có thể chỉnh sửa.');
                          }
                        }
                      }}
                      className={cn(
                        "p-3 rounded-lg border-2 text-left transition-all duration-200",
                        imageContentType === 'with_text' 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : "border-border/50 hover:border-primary/40"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-md flex items-center justify-center mb-1.5",
                        imageContentType === 'with_text' ? "bg-orange-500/10" : "bg-muted"
                      )}>
                        <Type className={cn(
                          "w-4 h-4",
                          imageContentType === 'with_text' ? "text-orange-600" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="font-medium text-xs">Có text</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Social Graphic</div>
                    </button>
                  </div>
                </div>

                {/* Text Input - When Social Graphics mode */}
                {imageContentType === 'with_text' && (
                  <div className="space-y-3 p-3 rounded-lg border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
                    {/* Shared/Per-channel toggle (Batch only) */}
                    {mode === 'batch' && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch 
                            id="use-shared-text"
                            checked={useSharedText} 
                            onCheckedChange={setUseSharedText}
                            className="scale-90"
                          />
                          <Label htmlFor="use-shared-text" className="text-xs cursor-pointer">
                            {useSharedText ? 'Text chung' : 'Text riêng'}
                          </Label>
                        </div>
                        {!useSharedText && (
                          <Badge variant="outline" className="text-[10px] h-5 border-orange-500/30 text-orange-600">
                            {selectedChannels.length} kênh
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Shared text input */}
                    {useSharedText && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Text hiển thị</Label>
                          <span className={cn(
                            "text-[10px]",
                            textToInclude.length > 50 ? "text-orange-600" : "text-muted-foreground"
                          )}>
                            {textToInclude.length}/50
                          </span>
                        </div>
                        <Textarea
                          value={textToInclude}
                          onChange={(e) => setTextToInclude(e.target.value)}
                          placeholder="VD: Giảm 50% hôm nay!"
                          rows={2}
                          className={cn(
                            "resize-none text-xs",
                            imageContentType === 'with_text' && !textToInclude.trim() 
                              && "border-orange-500 focus:border-orange-500"
                          )}
                        />
                        {imageContentType === 'with_text' && !textToInclude.trim() && (
                          <p className="text-xs text-orange-600">⚠️ Vui lòng nhập text để hiển thị trên ảnh</p>
                        )}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(() => {
                            const hookData = getHookForChannel(content, mode === 'single' ? singleChannel : selectedChannels[0]);
                            return hookData.hookMessage && !textToInclude && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[10px] gap-1 h-6 border-orange-500/30 text-orange-600"
                                onClick={() => setTextToInclude(hookData.hookMessage || '')}
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                Dùng Hook
                              </Button>
                            );
                          })()}
                          {/* AI Optimize Button - Always visible when there's text */}
                          {textToInclude.length > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                      "text-[10px] gap-1 h-6",
                                      textToInclude.length > 50 
                                        ? "border-orange-500 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20" 
                                        : "border-primary/30 text-primary hover:bg-primary/10"
                                    )}
                                    disabled={isOptimizingText}
                                    onClick={async () => {
                                      setIsOptimizingText(true);
                                      try {
                                        const { data, error } = await supabase.functions.invoke('optimize-social-text', {
                                          body: { 
                                            text: textToInclude, 
                                            maxLength: 50, 
                                            style: 'punchy' 
                                          }
                                        });
                                        if (error) throw error;
                                        if (data?.optimizedText) {
                                          setTextToInclude(data.optimizedText);
                                          if (data.wasOptimized) {
                                            toast.success(`AI tối ưu: ${data.originalLength} → ${data.optimizedLength} ký tự`);
                                          } else {
                                            toast.info('Text đã đủ ngắn gọn!');
                                          }
                                        }
                                      } catch (err) {
                                        console.error('[AI Optimize] Error:', err);
                                        toast.error('Không thể tối ưu text');
                                      } finally {
                                        setIsOptimizingText(false);
                                      }
                                    }}
                                  >
                                    {isOptimizingText ? (
                                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                    ) : (
                                      <Wand2 className="w-2.5 h-2.5" />
                                    )}
                                    AI Tối ưu
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[200px] text-xs">
                                  <p>Dùng AI rút gọn text thành câu ngắn, ấn tượng hơn phù hợp cho ảnh Social Graphics</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {textToInclude.length > 50 && (
                            <span className="text-[10px] text-orange-600 flex items-center gap-1">
                              ⚠️ Quá dài
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Per-channel text inputs */}
                    {!useSharedText && mode === 'batch' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs flex items-center gap-1.5">
                            <Layers className="w-3 h-3 text-orange-600" />
                            Text từng kênh
                          </Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[10px] gap-1 h-5 text-orange-600"
                            onClick={() => {
                              const newTexts: Record<Channel, string> = {} as Record<Channel, string>;
                              selectedChannels.forEach(ch => {
                                const hookData = getHookForChannel(content, ch);
                                newTexts[ch] = hookData.hookMessage || '';
                              });
                              setTextsPerChannel(newTexts);
                              toast.success('Đã điền hook');
                            }}
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            Dùng Hook
                          </Button>
                        </div>
                        <ScrollArea className="max-h-32">
                          <div className="space-y-1.5 pr-2">
                            {selectedChannels.map((ch) => {
                              const config = CHANNEL_CONFIG[ch];
                              const channelText = textsPerChannel[ch] || '';
                              
                              return (
                                <div key={ch} className="flex items-center gap-2">
                                  <div className={cn(
                                    "w-6 h-6 rounded flex items-center justify-center flex-shrink-0",
                                    config?.bgColor || 'bg-muted'
                                  )}>
                                    <div className={cn("scale-75", config?.color || 'text-muted-foreground')}>
                                      {config?.icon}
                                    </div>
                                  </div>
                                  <input
                                    type="text"
                                    value={channelText}
                                    onChange={(e) => {
                                      setTextsPerChannel(prev => ({
                                        ...prev,
                                        [ch]: e.target.value
                                      }));
                                    }}
                                    placeholder={`Text cho ${ch}...`}
                                    className="flex-1 h-7 px-2 text-xs rounded border border-border/50 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ==================== RIGHT PANEL - Visual Settings ==================== */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {/* Visual Text Position Preview - When Social Graphics */}
                {imageContentType === 'with_text' && (
                  <div className="space-y-3">
                    <VisualTextPositionPreview
                      textPosition={textPosition}
                      typographyStyle={typographyStyle}
                      textPreview={textToInclude}
                      onPositionChange={setTextPosition}
                      onTypographyChange={setTypographyStyle}
                    />
                    
                    {/* Canvas Fallback */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-600" />
                        <div>
                          <span className="text-xs font-medium">Canvas Fallback</span>
                          <p className="text-[10px] text-muted-foreground">Đảm bảo text hiển thị chính xác 100%</p>
                        </div>
                      </div>
                      <Switch
                        checked={useCanvasFallback}
                        onCheckedChange={setUseCanvasFallback}
                      />
                    </div>
                  </div>
                )}

                {/* AI Style Suggestions */}
                {styleSuggestions.length > 0 && (
                  <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Wand2 className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-medium">Gợi ý cho thương hiệu</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {styleSuggestions.slice(0, 2).map((suggestion) => {
                        const styleInfo = IMAGE_STYLES.find(s => s.value === suggestion.style);
                        const isSelected = imageStyle === suggestion.style;
                        
                        return (
                          <button
                            key={suggestion.style}
                            onClick={() => setImageStyle(suggestion.style)}
                            className={cn(
                              "flex items-center gap-2 px-2.5 py-1.5 rounded-md border-2 transition-all duration-200",
                              isSelected 
                                ? "border-primary bg-primary/10 shadow-sm" 
                                : "border-primary/30 bg-background hover:border-primary/50"
                            )}
                          >
                            <div className={cn(
                              "w-6 h-6 rounded flex items-center justify-center",
                              isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                            )}>
                              {styleInfo?.icon}
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-medium">{styleInfo?.label}</span>
                                {suggestion.isRecommended && (
                                  <Star className="w-2.5 h-2.5 fill-primary text-primary" />
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground">{suggestion.matchPercentage}%</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Style Selection Grid */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Phong cách ảnh</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {IMAGE_STYLES.map(style => {
                      const isSelected = imageStyle === style.value;
                      const isSuggested = styleSuggestions.some(s => s.style === style.value);
                      
                      return (
                        <button
                          key={style.value}
                          onClick={() => setImageStyle(style.value as ImageStylePreset | 'auto')}
                          className={cn(
                            'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all duration-200 relative',
                            isSelected 
                              ? 'border-primary bg-primary/5 shadow-sm' 
                              : 'border-border/50 hover:border-primary/40'
                          )}
                        >
                          {isSuggested && !isSelected && (
                            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary/60 ring-2 ring-background" />
                          )}
                          <div className={cn(
                            'w-7 h-7 rounded-md flex items-center justify-center',
                            isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                          )}>
                            {style.icon}
                          </div>
                          <span className={cn(
                            'text-[10px] font-medium',
                            isSelected ? 'text-primary' : 'text-foreground'
                          )}>
                            {style.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Aspect Ratio - Horizontal Chips */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tỉ lệ khung hình</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {ASPECT_RATIOS.map(ratio => {
                      const isSelected = aspectRatio === ratio.value;
                      return (
                        <button
                          key={ratio.value}
                          onClick={() => setAspectRatio(ratio.value)}
                          className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border-2 transition-all duration-200',
                            isSelected 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border/50 hover:border-primary/40'
                          )}
                        >
                          <div className={cn(
                            'border-2 rounded flex items-center justify-center shrink-0',
                            isSelected ? 'border-primary bg-primary/20' : 'border-muted-foreground/30 bg-muted/50',
                            ratio.value === '16:9' && 'w-6 h-[14px]',
                            ratio.value === '1:1' && 'w-4 h-4',
                            ratio.value === '4:5' && 'w-3 h-4',
                            ratio.value === '9:16' && 'w-3 h-5',
                            ratio.value === 'auto' && 'w-4 h-4',
                          )}>
                            {ratio.value === 'auto' && <Sparkles className="w-2 h-2 text-primary" />}
                          </div>
                          <span className={cn(
                            'text-xs font-medium',
                            isSelected ? 'text-primary' : 'text-foreground'
                          )}>
                            {ratio.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Logo Options */}
                {brandLogoUrl && (
                  <div className={cn(
                    "space-y-3 p-3 rounded-lg border-2 transition-colors",
                    includeLogo ? "border-primary/30 bg-primary/5" : "border-border/50"
                  )}>
                    {/* Header with toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-md flex items-center justify-center overflow-hidden",
                          includeLogo ? "ring-2 ring-primary/30" : "bg-muted"
                        )}>
                          <img src={brandLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">Thêm logo</p>
                          <p className="text-[10px] text-muted-foreground">Overlay tự động</p>
                        </div>
                      </div>
                      <Switch 
                        checked={includeLogo} 
                        onCheckedChange={setIncludeLogo}
                        className="scale-90"
                      />
                    </div>
                    
                    {/* Expanded Logo Options Panel */}
                    {includeLogo && (
                      <LogoOptionsPanel
                        position={logoPosition}
                        onPositionChange={setLogoPosition}
                        style={logoStyle}
                        onStyleChange={setLogoStyle}
                        size={logoSize}
                        onSizeChange={setLogoSize}
                        opacity={logoOpacity}
                        onOpacityChange={setLogoOpacity}
                        logoPreviewUrl={brandLogoUrl}
                      />
                    )}
                  </div>
                )}

                {/* Advanced Options - Collapsible */}
                <Collapsible open={advancedMode} onOpenChange={setAdvancedMode}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Settings2 className="w-3.5 h-3.5" />
                      <span>{advancedMode ? 'Ẩn nâng cao' : 'Tùy chọn nâng cao'}</span>
                      {advancedMode ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Negative Prompt</Label>
                      <Textarea
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="text, logo, watermark, blurry..."
                        rows={2}
                        className="text-xs"
                      />
                    </div>

                    {/* Context Preview */}
                    <Collapsible open={showPromptPreview} onOpenChange={setShowPromptPreview}>
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem context</span>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
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
                          imageContentType={imageContentType}
                          textToInclude={textToInclude}
                          textPosition={textPosition}
                          typographyStyle={typographyStyle}
                        />
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
                  onEditBackground={handleEditBackground}
                  retryingChannel={regeneratingChannel}
                />
              </div>
            </ScrollArea>
          )}

          {/* Background Editor Dialog */}
          {backgroundEditorOpen && editingChannel && batchGen.generatedImages[editingChannel] && (
            <BackgroundEditor
              open={backgroundEditorOpen}
              onOpenChange={setBackgroundEditorOpen}
              imageUrl={batchGen.generatedImages[editingChannel].imageUrl}
              channel={editingChannel}
              contentId={content.id}
              onImageEdited={handleBackgroundEdited}
            />
          )}
        </div>

        <DialogFooter className="border-t pt-4 flex-shrink-0">
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
              <Button variant="outline" onClick={handleBackToSetup}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại
              </Button>
              <Button onClick={handleSaveAll} disabled={batchGen.isGenerating || !hasGeneratedImages}>
                <Save className="w-4 h-4 mr-2" />
                Lưu tất cả
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}