import { useState, useMemo, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, ArrowLeft, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Channel, MultiChannelContent, ChannelImage } from '@/types/multichannel';
import {
  useAutoImageGeneration,
  AspectRatioOption,
  ImageStylePreset,
} from '@/hooks/useAutoImageGeneration';
import { useSocialImageGeneration, type ImageContentType, type TextPosition, type TypographyStyle } from '@/hooks/useSocialImageGeneration';
import { CHANNEL_OPTIMAL_ASPECT_RATIO } from '@/config/channelImageConfig';
import { cn } from '@/lib/utils';
import { ImageStreamingGrid } from './streaming/ImageStreamingGrid';
import { ImageChannelPicker } from './ImageChannelPicker';
import { ImageAdvancedOptions } from './ImageAdvancedOptions';
import { ImageSettingsSummary } from './ImageSettingsSummary';
import { BackgroundEditor } from './BackgroundEditor';
import { V3StylePreview } from './V3StylePreview';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { toast } from 'sonner';
import { suggestImageStylesV3, type SuggestionV3, type SuggestionInputV3 } from '@/lib/imageSuggestionEngine';
import type { ChannelKey, ContentGoal, ContentAngle, ContentRole, Industry } from '@/config/visualScoringConfig';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LogoPosition, LogoStyle } from './LogoOptionsPanel';

// Map frontend Channel to V3 ChannelKey
function toChannelKey(ch: Channel): ChannelKey {
  if (ch === 'instagram') return 'instagram_feed';
  return ch as ChannelKey;
}

// ─── Props ────────────────────────────────────────────────────────
interface SimpleImageGeneratorProps {
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

// ─── Helpers (reused from UnifiedImageGenerator) ──────────────────
/** Extract keywords from text for content-aware image generation */
function extractContentKeywords(text: string): string[] {
  if (!text) return [];
  const original = text;
  const cleaned = text
    .replace(/#{1,6}\s?/g, '').replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ"]/gi, ' ');
  const phrases: string[] = [];

  // 1. Quoted phrases (Vietnamese often uses quotes for key terms)
  const quoted = original.match(/[""]([^""]+)[""]|"([^"]+)"/g);
  if (quoted) {
    phrases.push(...quoted.map(q => q.replace(/["""]/g, '').trim()).filter(q => q.length > 1 && q.length < 50).slice(0, 3));
  }

  // 2. Number + context patterns (e.g., "5 cách", "top 10", "3 bước")
  const numPatterns = cleaned.match(/(?:top\s+)?\d+\s+[a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\s+[a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+){0,2}/gi);
  if (numPatterns) phrases.push(...numPatterns.slice(0, 2));

  // 3. Capitalized phrases (English/proper nouns)
  const capMatches = cleaned.match(/[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\s+[A-Za-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+){0,3}/g);
  if (capMatches) phrases.push(...capMatches.slice(0, 3));

  // 4. Vietnamese keyword phrases after indicator words
  const vnIndicators = cleaned.match(/(?:về|cho|của|với|trong|cách|bí quyết|hướng dẫn|mẹo|lợi ích|tại sao|làm sao)\s+([a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\s+[a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+){0,3})/gi);
  if (vnIndicators) phrases.push(...vnIndicators.map(m => m.trim()).slice(0, 3));

  // 5. Fallback: first 3-5 meaningful words from topic/text
  if (phrases.length === 0) {
    const words = cleaned.split(/\s+/).filter(w => w.length > 2).slice(0, 5);
    if (words.length > 0) phrases.push(words.join(' '));
  }

  return [...new Set(phrases.map(p => p.trim()).filter(p => p.length > 1))].slice(0, 5);
}

function getContentSummary(content: MultiChannelContent, channel: Channel): string {
  const fieldMap: Partial<Record<Channel, string | null>> = {
    website: content.website_content, facebook: content.facebook_content,
    instagram: content.instagram_content, twitter: content.twitter_content,
    linkedin: content.linkedin_content, youtube: content.youtube_content,
    tiktok: content.tiktok_content, threads: content.threads_content,
    zalo_oa: (content as any).zalo_oa_content, telegram: (content as any).telegram_content,
  };
  const rawText = (fieldMap[channel] ?? content.topic ?? '')
    .replace(/#{1,6}\s?/g, '').replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  const keywords = extractContentKeywords(rawText);
  const hookInfo = getHookForChannel(content, channel);
  const goal = (content as any).content_goal || '';
  const role = (content as any).content_role || '';
  const angle = (content as any).content_angle || '';

  let summary = `Topic: ${content.topic}.`;
  if (goal) summary += ` Goal: ${goal}.`;
  if (role) summary += ` Role: ${role}.`;
  if (angle) summary += ` Angle: ${angle}.`;
  if (hookInfo.hookMessage) summary += ` Core message: ${hookInfo.hookMessage}.`;
  if (keywords.length > 0) summary += ` Key concepts: ${keywords.join(', ')}.`;
  summary += ` Content: ${rawText.slice(0, 400)}`;
  return summary.slice(0, 600);
}

function getHookForChannel(content: MultiChannelContent, channel: Channel) {
  const ch = content.selected_hooks?.find(h => h.channel === channel);
  if (ch?.opening_line) return { hookMessage: ch.opening_line, hookType: ch.hook_type };
  const g = content.global_hook;
  if (g?.opening_line) return { hookMessage: g.opening_line, hookType: g.hook_type };
  return {};
}

function getBestOverlayText(content: MultiChannelContent, channel: Channel): string {
  const sh = content.selected_hooks; const gh = content.global_hook;
  const ch = sh?.find(h => h.channel === channel);
  if (ch?.text_overlay) return ch.text_overlay;
  if (gh?.text_overlay) return gh.text_overlay;
  if (ch?.opening_line) return ch.opening_line;
  if (gh?.opening_line) return gh.opening_line;
  const map: Partial<Record<Channel, string | null>> = {
    facebook: content.facebook_content, instagram: content.instagram_content,
    twitter: content.twitter_content, linkedin: content.linkedin_content,
    youtube: content.youtube_content, tiktok: content.tiktok_content,
    threads: content.threads_content, website: content.website_content,
    zalo_oa: content.zalo_oa_content, telegram: content.telegram_content,
    email: content.email_content, google_maps: content.google_maps_content,
  };
  const raw = map[channel];
  if (raw) {
    const clean = raw.replace(/#{1,6}\s?/g, '').replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\n+/g, ' ').trim();
    const first = clean.match(/^[^.!?]+[.!?]/);
    const s = first ? first[0] : clean.slice(0, 100);
    return s.length > 100 ? s.slice(0, 97) + '...' : s;
  }
  return content.topic?.slice(0, 100) || '';
}

// ─── Component ────────────────────────────────────────────────────
export function SimpleImageGenerator({
  open, onOpenChange, content,
  brandLogoUrl, brandPrimaryColor, brandIndustry,
  onImageGenerated, initialChannel, initialMode = 'batch',
}: SimpleImageGeneratorProps) {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>('setup');

  // Core settings
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>(content?.selected_channels ?? []);
  const [imageContentType, setImageContentType] = useState<ImageContentType>('with_text');
  const [textToInclude, setTextToInclude] = useState('');
  const [useSharedText, setUseSharedText] = useState(true);
  const [textsPerChannel, setTextsPerChannel] = useState<Record<Channel, string>>({} as Record<Channel, string>);
  const [isOptimizingText, setIsOptimizingText] = useState(false);

  // Advanced (with smart defaults)
  const [imageStyle, setImageStyle] = useState<ImageStylePreset | 'auto'>('auto');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('auto');
  const [includeLogo, setIncludeLogo] = useState(true);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>('top-left');
  const [logoStyle, setLogoStyle] = useState<LogoStyle>('clean');
  const [logoSize, setLogoSize] = useState(15);
  const [logoOpacity, setLogoOpacity] = useState(100);
  const [textPosition, setTextPosition] = useState<TextPosition>('center');
  const [typographyStyle, setTypographyStyle] = useState<TypographyStyle>('modern');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [v3Suggestions, setV3Suggestions] = useState<SuggestionV3[]>([]);

  // Background editor
  const [bgEditorOpen, setBgEditorOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [regeneratingChannel, setRegeneratingChannel] = useState<Channel | null>(null);

  // Hooks
  const batchGen = useAutoImageGeneration();

  // Fetch brand template for style suggestions
  const { data: brandTemplate } = useQuery({
    queryKey: ['brand-tpl-simple-img', content?.brand_template_id],
    queryFn: async () => {
      if (!content?.brand_template_id) return null;
      const { data } = await supabase
        .from('brand_templates')
        .select('industry, tone_of_voice, image_style, formality_level')
        .eq('id', content.brand_template_id)
        .single();
      return data;
    },
    enabled: !!content?.brand_template_id,
  });

  // Extract content context
  const contentAny = content as any;
  const contentGoal = contentAny.content_goal as ContentGoal | undefined;
  const contentRole = contentAny.content_role as ContentRole | undefined;
  const contentAngle = contentAny.content_angle as ContentAngle | undefined;

  // Build content summary for V3 engine
  const currentChannelSummary = useMemo(() => {
    const ch = selectedChannels[0] || 'instagram';
    return getContentSummary(content, ch as Channel);
  }, [content, selectedChannels]);

  // Extract keywords for preview
  const previewKeywords = useMemo(() => {
    const fieldMap: Partial<Record<Channel, string | null>> = {
      website: content.website_content, facebook: content.facebook_content,
      instagram: content.instagram_content, twitter: content.twitter_content,
      linkedin: content.linkedin_content, youtube: content.youtube_content,
      tiktok: content.tiktok_content, threads: content.threads_content,
    };
    const ch = selectedChannels[0] || 'instagram';
    const rawText = (fieldMap[ch as Channel] ?? content.topic ?? '');
    return extractContentKeywords(rawText);
  }, [content, selectedChannels]);

  useEffect(() => {
    // Determine industry from brand template or props
    const rawIndustry = brandTemplate?.industry || brandIndustry;
    const industry: Industry = (Array.isArray(rawIndustry) ? rawIndustry[0] : rawIndustry) as Industry || 'service';

    // Build V3 input from content context
    const input: SuggestionInputV3 = {
      contentGoal: contentGoal || 'education',
      contentAngle: (contentAngle as ContentAngle) || 'educational',
      contentRole: (contentRole as ContentRole) || 'sprout',
      channel: toChannelKey(selectedChannels[0] || 'instagram'),
      industry,
      contentSummary: currentChannelSummary,
    };

    const suggestions = suggestImageStylesV3(input);
    setV3Suggestions(suggestions);

    // Auto-apply top suggestion when style is 'auto'
    setImageStyle(cur => {
      if (cur === 'auto' && suggestions.length > 0) {
        const topStyle = suggestions[0].style as ImageStylePreset;
        // Only apply if it's one of the supported presets in the UI
        const uiStyles: ImageStylePreset[] = ['photorealistic', 'illustration', 'minimalist', '3d_render', 'flat_design', 'watercolor', 'cinematic'];
        if (uiStyles.includes(topStyle)) return topStyle;
      }
      return cur;
    });
  }, [brandTemplate, brandIndustry, contentGoal, contentAngle, contentRole, selectedChannels, currentChannelSummary]);

  // Fill hook text for a specific channel
  const fillHookText = useCallback((channel: Channel) => {
    const best = getBestOverlayText(content, channel);
    if (best) return best;
    return '';
  }, [content]);

  // Auto-fill text from hooks when opening
  useEffect(() => {
    if (!open || selectedChannels.length === 0) return;
    if (!textToInclude) {
      const best = fillHookText(selectedChannels[0]);
      if (best) setTextToInclude(best);
    }
    // Also fill per-channel texts that are empty
    if (!useSharedText) {
      setTextsPerChannel(prev => {
        const updated = { ...prev };
        let changed = false;
        selectedChannels.forEach(ch => {
          if (!updated[ch]) {
            const t = fillHookText(ch);
            if (t) { updated[ch] = t; changed = true; }
          }
        });
        return changed ? updated : prev;
      });
    }
  }, [open, selectedChannels, content, useSharedText]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      batchGen.resetProgress();
      setViewMode('setup');
    }
  }, [open]);

  // If initialChannel provided, select only that channel
  useEffect(() => {
    if (open && initialChannel) {
      setSelectedChannels([initialChannel]);
    } else if (open) {
      setSelectedChannels(content?.selected_channels ?? []);
    }
  }, [open, initialChannel]);

  // ─── Computed ─────────────────────
  const contentSummaries = useMemo(() => {
    const s: Record<Channel, string> = {} as any;
    selectedChannels.forEach(ch => { s[ch] = getContentSummary(content, ch); });
    return s;
  }, [content, selectedChannels]);

  const hookMessages = useMemo(() => {
    const h: Record<Channel, { hookMessage?: string; hookType?: string }> = {} as any;
    selectedChannels.forEach(ch => { h[ch] = getHookForChannel(content, ch); });
    return h;
  }, [content, selectedChannels]);


  const batchOptions = useMemo(() => ({
    contentId: content?.id ?? '',
    brandTemplateId: content?.brand_template_id || '',
    channels: selectedChannels,
    contentSummaries,
    includeLogo: includeLogo && !!brandLogoUrl,
    logoPosition,
    logoUrl: brandLogoUrl || undefined,
    logoStyle, logoSizePercent: logoSize, logoOpacity,
    aspectRatio,
    imageStylePreset: imageStyle === 'auto' ? undefined : imageStyle,
    negativePrompt: negativePrompt.trim() || undefined,
    contentRole, contentAngle, hookMessages,
    imageContentType,
    textToInclude: imageContentType === 'with_text' && useSharedText ? textToInclude : undefined,
    textsPerChannel: imageContentType === 'with_text' && !useSharedText ? textsPerChannel : undefined,
    textPosition: imageContentType === 'with_text' ? textPosition : undefined,
    typographyStyle: imageContentType === 'with_text' ? typographyStyle : undefined,
    useCanvasFallback: imageContentType === 'with_text' ? true : undefined,
  }), [content?.id, content?.brand_template_id, selectedChannels, contentSummaries,
    includeLogo, brandLogoUrl, logoPosition, logoStyle, logoSize, logoOpacity,
    aspectRatio, imageStyle, negativePrompt, contentRole, contentAngle, hookMessages,
    imageContentType, textToInclude, textsPerChannel, useSharedText, textPosition, typographyStyle]);

  // ─── Handlers ─────────────────────
  const handleGenerate = async () => {
    if (!content.brand_template_id) {
      toast.error('Vui lòng chọn brand template trước');
      return;
    }
    if (selectedChannels.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 kênh');
      return;
    }
    if (imageContentType === 'with_text') {
      if (useSharedText && !textToInclude.trim()) {
        toast.error('Vui lòng nhập text để hiển thị trên ảnh');
        return;
      }
      if (!useSharedText) {
        const missing = selectedChannels.filter(ch => !textsPerChannel[ch]?.trim());
        if (missing.length > 0) {
          toast.error(`Vui lòng nhập text cho: ${missing.join(', ')}`);
          return;
        }
      }
    }

    setViewMode('streaming');
    const result = await batchGen.generateAllImages(batchOptions, onImageGenerated, true);
    if (result.successful.length > 0) setViewMode('preview');
  };



  const handleRegenerateChannel = async (channel: Channel) => {
    setRegeneratingChannel(channel);
    await batchGen.regenerateForChannel(channel, batchOptions);
    setRegeneratingChannel(null);
  };

  const handleDownloadImage = (channel: Channel) => {
    const img = batchGen.generatedImages[channel];
    if (!img) return;
    const link = document.createElement('a');
    link.href = img.imageUrl;
    link.download = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}-${channel}.png`;
    link.target = '_blank';
    link.click();
  };

  const handleEditBackground = (channel: Channel) => {
    const img = batchGen.generatedImages[channel];
    if (!img?.imageUrl) { toast.error('Không có ảnh để chỉnh sửa'); return; }
    setEditingChannel(channel);
    setBgEditorOpen(true);
  };

  const handleBackgroundEdited = async (newImageUrl: string) => {
    if (!editingChannel) return;
    batchGen.updateGeneratedImage(editingChannel, { imageUrl: newImageUrl });
    toast.success('Đã cập nhật ảnh');
  };

  const handleClose = () => {
    if (!batchGen.isGenerating) {
      batchGen.resetProgress();
      setViewMode('setup');
      onOpenChange(false);
    }
  };

  const handleBackToSetup = () => {
    if (!batchGen.isGenerating) {
      batchGen.resetProgress();
    }
    setViewMode('setup');
  };

  const handleOptimizeText = async () => {
    if (!textToInclude.trim()) return;
    setIsOptimizingText(true);
    try {
      const { data, error } = await supabase.functions.invoke('optimize-social-text', {
        body: { text: textToInclude, channel: selectedChannels[0] || 'facebook' },
      });
      if (!error && data?.optimizedText) {
        setTextToInclude(data.optimizedText);
        toast.success('Đã tối ưu text');
      }
    } catch {
      toast.error('Không thể tối ưu text');
    } finally {
      setIsOptimizingText(false);
    }
  };

  const hasImages = Object.keys(batchGen.generatedImages).length > 0;

  // ─── Shared content ───────────────────────
  const headerContent = (
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7 -ml-1" onClick={viewMode === 'setup' ? () => onOpenChange(false) : handleBackToSetup}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Sparkles className="w-5 h-5 text-primary" />
        {viewMode === 'setup' && 'Tạo ảnh AI'}
        {viewMode === 'streaming' && 'Đang tạo ảnh...'}
        {viewMode === 'preview' && 'Xem trước ảnh'}
      </div>
    </>
  );

  // Shared form fields (used by both mobile and desktop)
  const setupFields = (
    <div className="space-y-5 pb-4">
      {/* Brand template warning */}
      {!content.brand_template_id && (
        <Alert className="border-yellow-500/30 bg-yellow-500/5">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="text-xs text-yellow-800 dark:text-yellow-300">
            Chưa chọn brand template. AI sẽ tạo ảnh nhưng không áp dụng màu sắc thương hiệu.
          </AlertDescription>
        </Alert>
      )}

      {/* Step 1: Channel Picker */}
      <ImageChannelPicker
        availableChannels={content.selected_channels || []}
        selectedChannels={selectedChannels}
        onSelectedChange={setSelectedChannels}
      />



      {/* V3 Style Suggestions Preview */}
      {v3Suggestions.length > 0 && (
        <V3StylePreview
          suggestions={v3Suggestions}
          selectedStyle={imageStyle}
          onStyleSelect={(style) => setImageStyle(style)}
        />
      )}

      {/* Content Context Preview */}
      {previewKeywords.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" />
            AI sẽ tạo ảnh liên quan đến:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {previewKeywords.map((kw, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {kw}
              </span>
            ))}
          </div>
          {content.topic && (
            <p className="text-xs text-muted-foreground/80 truncate">
              Chủ đề: {content.topic}
            </p>
          )}
        </div>
      )}

      {/* Settings Summary + CTA */}
      <div className="space-y-2">
        <ImageSettingsSummary
          imageStyle={imageStyle}
          aspectRatio={aspectRatio}
          includeLogo={includeLogo}
          logoPosition={logoPosition}
          hasBrandLogo={!!brandLogoUrl}
          imageContentType={imageContentType}
          v3TopSuggestion={v3Suggestions.find(s => s.style === imageStyle)}
        />
        <Button
          onClick={handleGenerate}
          disabled={batchGen.isGenerating || selectedChannels.length === 0}
          className="w-full h-11 gap-2 text-base"
          size="lg"
        >
          {batchGen.isGenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Tạo {selectedChannels.length} ảnh</>
          )}
        </Button>
      </div>

      {/* Advanced Options */}
      <ImageAdvancedOptions
        imageStyle={imageStyle}
        onImageStyleChange={setImageStyle}
        v3Suggestions={v3Suggestions}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        includeLogo={includeLogo}
        onIncludeLogoChange={setIncludeLogo}
        logoPosition={logoPosition}
        onLogoPositionChange={setLogoPosition}
        logoStyle={logoStyle}
        onLogoStyleChange={setLogoStyle}
        logoSize={logoSize}
        onLogoSizeChange={setLogoSize}
        logoOpacity={logoOpacity}
        onLogoOpacityChange={setLogoOpacity}
        brandLogoUrl={brandLogoUrl}
        hasText={imageContentType === 'with_text'}
        textPosition={textPosition}
        onTextPositionChange={setTextPosition}
        typographyStyle={typographyStyle}
        onTypographyStyleChange={setTypographyStyle}
        textPreview={textToInclude}
        negativePrompt={negativePrompt}
        onNegativePromptChange={setNegativePrompt}
        contentRole={contentRole}
        contentAngle={contentAngle}
        selectedChannels={selectedChannels}
        hookMessages={hookMessages}
        imageContentType={imageContentType}
        onImageContentTypeChange={setImageContentType}
        useSharedText={useSharedText}
        onUseSharedTextChange={setUseSharedText}
        textToInclude={textToInclude}
        onTextToIncludeChange={setTextToInclude}
        textsPerChannel={textsPerChannel}
        onTextsPerChannelChange={setTextsPerChannel}
      />
    </div>
  );

  const streamingPreviewContent = (
    <>
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
      {viewMode === 'preview' && hasImages && (
        <div className="flex justify-end gap-2 mt-4 pb-2">
          <Button variant="outline" onClick={handleBackToSetup}>
            Tạo lại
          </Button>
        </div>
      )}
    </>
  );

  // Mobile body: no ScrollArea, uses native scroll from parent div
  const mobileBodyContent = (
    <div className="flex-1">
      {viewMode === 'setup' && setupFields}
      {(viewMode === 'streaming' || viewMode === 'preview') && streamingPreviewContent}
    </div>
  );

  const bodyContent = (
    <div className="flex-1 min-h-0 overflow-y-auto pr-2">
      {viewMode === 'setup' && setupFields}
      {(viewMode === 'streaming' || viewMode === 'preview') && streamingPreviewContent}
    </div>
  );

  const bgEditor = editingChannel ? (
    <BackgroundEditor
      open={bgEditorOpen}
      onOpenChange={setBgEditorOpen}
      imageUrl={batchGen.generatedImages[editingChannel]?.imageUrl || ''}
      channel={editingChannel}
      contentId={content.id}
      onImageEdited={handleBackgroundEdited}
    />
  ) : null;

  // ─── Render: Drawer on mobile, Dialog on desktop ───────────────────────
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(isOpen) => {
        if (!isOpen && !batchGen.isGenerating) handleClose();
      }}>
        <DrawerContent 
          className="max-h-[90vh] overflow-hidden flex flex-col"
        >
          <DrawerHeader className="flex-shrink-0 border-b border-border/50 pb-3">
            <DrawerTitle>{headerContent}</DrawerTitle>
            {viewMode === 'setup' && (
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                {brandLogoUrl && (
                  <img src={brandLogoUrl} alt="" className="w-5 h-5 rounded object-contain" />
                )}
                {content.brand_name || 'Chọn kênh và nhấn Tạo ảnh'}
              </p>
            )}
          </DrawerHeader>
          <div className="overflow-y-auto flex-1 px-4 pb-4" style={{ touchAction: 'manipulation', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
            {mobileBodyContent}
          </div>
          {bgEditor}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          "transition-all duration-300 max-h-[92vh] overflow-hidden flex flex-col",
          viewMode === 'setup' ? "sm:max-w-3xl" : "sm:max-w-5xl"
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{headerContent}</DialogTitle>
          <DialogDescription>
            {viewMode === 'setup' && (
              <span className="flex items-center gap-2">
                {brandLogoUrl && (
                  <img src={brandLogoUrl} alt="" className="w-5 h-5 rounded object-contain" />
                )}
                {content.brand_name || 'Chọn kênh và nhấn Tạo ảnh'}
              </span>
            )}
            {viewMode === 'streaming' && 'AI đang tạo ảnh cho các kênh đã chọn'}
            {viewMode === 'preview' && 'Kiểm tra và lưu ảnh'}
          </DialogDescription>
        </DialogHeader>
        {bodyContent}
        {bgEditor}
      </DialogContent>
    </Dialog>
  );
}
