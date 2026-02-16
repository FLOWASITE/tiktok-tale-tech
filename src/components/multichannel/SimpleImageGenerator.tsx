import { useState, useMemo, useEffect } from 'react';
import { Sparkles, Image, Loader2, Wand2, ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { BackgroundEditor } from './BackgroundEditor';
import { toast } from 'sonner';
import { suggestImageStyles, type StyleSuggestion } from '@/utils/imageStyleSuggestion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LogoPosition, LogoStyle } from './LogoOptionsPanel';

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
function getContentSummary(content: MultiChannelContent, channel: Channel): string {
  const fieldMap: Partial<Record<Channel, string | null>> = {
    website: content.website_content, facebook: content.facebook_content,
    instagram: content.instagram_content, twitter: content.twitter_content,
    linkedin: content.linkedin_content, youtube: content.youtube_content,
    tiktok: content.tiktok_content, threads: content.threads_content,
  };
  const text = (fieldMap[channel] ?? content.topic ?? '')
    .replace(/#{1,6}\s?/g, '').replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').slice(0, 300);
  return `Topic: ${content.topic}. ${text}`;
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
  const [viewMode, setViewMode] = useState<ViewMode>('setup');

  // Core settings
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>(content?.selected_channels ?? []);
  const [imageContentType, setImageContentType] = useState<ImageContentType>('background_only');
  const [textToInclude, setTextToInclude] = useState('');
  const [isOptimizingText, setIsOptimizingText] = useState(false);

  // Advanced (with smart defaults)
  const [imageStyle, setImageStyle] = useState<ImageStylePreset | 'auto'>('auto');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('auto');
  const [includeLogo, setIncludeLogo] = useState(!!brandLogoUrl);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>('bottom-right');
  const [logoStyle, setLogoStyle] = useState<LogoStyle>('clean');
  const [logoSize, setLogoSize] = useState(15);
  const [logoOpacity, setLogoOpacity] = useState(100);
  const [textPosition, setTextPosition] = useState<TextPosition>('center');
  const [typographyStyle, setTypographyStyle] = useState<TypographyStyle>('modern');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [styleSuggestions, setStyleSuggestions] = useState<StyleSuggestion[]>([]);

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

  // Auto-set style from brand
  useEffect(() => {
    const industry = brandTemplate?.industry || brandIndustry;
    const toneOfVoice = brandTemplate?.tone_of_voice as string[] | undefined;
    const explicitImageStyle = brandTemplate?.image_style as string | undefined;
    const formalityLevel = brandTemplate?.formality_level as string | undefined;
    if (industry || toneOfVoice || explicitImageStyle) {
      const suggestions = suggestImageStyles({ industry, toneOfVoice, explicitImageStyle, formalityLevel });
      setStyleSuggestions(suggestions);
      setImageStyle(cur => {
        if (cur === 'auto' && suggestions.length > 0 && suggestions[0]?.isRecommended) {
          return suggestions[0].style;
        }
        return cur;
      });
    }
  }, [brandTemplate, brandIndustry]);

  // Auto-fill text from hooks
  useEffect(() => {
    if (!open || selectedChannels.length === 0) return;
    if (!textToInclude) {
      const best = getBestOverlayText(content, selectedChannels[0]);
      if (best) setTextToInclude(best);
    }
  }, [open, selectedChannels, content]);

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
    logoStyle, logoSizePercent: logoSize, logoOpacity,
    aspectRatio,
    imageStylePreset: imageStyle === 'auto' ? undefined : imageStyle,
    negativePrompt: negativePrompt.trim() || undefined,
    contentRole, contentAngle, hookMessages,
    imageContentType,
    textToInclude: imageContentType === 'with_text' ? textToInclude : undefined,
    textPosition: imageContentType === 'with_text' ? textPosition : undefined,
    typographyStyle: imageContentType === 'with_text' ? typographyStyle : undefined,
    useCanvasFallback: imageContentType === 'with_text' ? true : undefined,
  }), [content?.id, content?.brand_template_id, selectedChannels, contentSummaries,
    includeLogo, brandLogoUrl, logoPosition, logoStyle, logoSize, logoOpacity,
    aspectRatio, imageStyle, negativePrompt, contentRole, contentAngle, hookMessages,
    imageContentType, textToInclude, textPosition, typographyStyle]);

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
    if (imageContentType === 'with_text' && !textToInclude.trim()) {
      toast.error('Vui lòng nhập text để hiển thị trên ảnh');
      return;
    }

    setViewMode('streaming');
    const result = await batchGen.generateAllImages(batchOptions, onImageGenerated, false);
    if (result.successful.length > 0) setViewMode('preview');
  };

  const handleSaveAll = async () => {
    if (onImageGenerated) {
      const channels = Object.keys(batchGen.generatedImages) as Channel[];
      await batchGen.savePreviewImages(channels, onImageGenerated);
      handleClose();
    }
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
      setViewMode('setup');
    }
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

  // ─── Render ───────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "transition-all duration-300 max-h-[90vh] overflow-hidden flex flex-col",
        viewMode === 'setup' ? "sm:max-w-lg" : "sm:max-w-3xl"
      )}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {viewMode !== 'setup' && (
              <Button variant="ghost" size="icon" className="h-7 w-7 -ml-1" onClick={handleBackToSetup} disabled={batchGen.isGenerating}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <Sparkles className="w-5 h-5 text-primary" />
            {viewMode === 'setup' && 'Tạo ảnh AI'}
            {viewMode === 'streaming' && 'Đang tạo ảnh...'}
            {viewMode === 'preview' && 'Xem trước ảnh'}
          </DialogTitle>
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

        <div className="flex-1 overflow-hidden">
          {/* ── SETUP MODE ───────────── */}
          {viewMode === 'setup' && (
            <ScrollArea className="h-full max-h-[60vh] pr-3">
              <div className="space-y-5 pb-4">
                {/* Step 1: Channel Picker */}
                <ImageChannelPicker
                  availableChannels={content.selected_channels || []}
                  selectedChannels={selectedChannels}
                  onSelectedChange={setSelectedChannels}
                />

                {/* Step 2: Image Type */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Kiểu ảnh</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setImageContentType('background_only')}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-sm",
                        imageContentType === 'background_only'
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border/50 hover:border-primary/30 text-muted-foreground"
                      )}
                    >
                      <Image className="w-4 h-4" />
                      <span className="font-medium">Ảnh nền</span>
                    </button>
                    <button
                      onClick={() => setImageContentType('with_text')}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-sm",
                        imageContentType === 'with_text'
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border/50 hover:border-primary/30 text-muted-foreground"
                      )}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="font-medium">Có text</span>
                    </button>
                  </div>
                </div>

                {/* Text input (only when with_text) */}
                {imageContentType === 'with_text' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Text trên ảnh</Label>
                      <Button
                        variant="ghost" size="sm"
                        className="h-6 text-xs gap-1 text-primary"
                        onClick={handleOptimizeText}
                        disabled={isOptimizingText || !textToInclude.trim()}
                      >
                        {isOptimizingText ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                        AI Tối ưu
                      </Button>
                    </div>
                    <Textarea
                      value={textToInclude}
                      onChange={e => setTextToInclude(e.target.value)}
                      placeholder="Nhập text hiển thị trên ảnh..."
                      className="h-20 text-sm resize-none"
                    />
                  </div>
                )}

                {/* CTA Button */}
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

                {/* Advanced Options */}
                <ImageAdvancedOptions
                  imageStyle={imageStyle}
                  onImageStyleChange={setImageStyle}
                  styleSuggestions={styleSuggestions}
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
                />
              </div>
            </ScrollArea>
          )}

          {/* ── STREAMING / PREVIEW MODE ───────────── */}
          {(viewMode === 'streaming' || viewMode === 'preview') && (
            <ScrollArea className="h-full max-h-[65vh]">
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

              {/* Save All button */}
              {viewMode === 'preview' && hasImages && (
                <div className="flex justify-end gap-2 mt-4 pb-2">
                  <Button variant="outline" onClick={handleBackToSetup}>
                    Tạo lại
                  </Button>
                  <Button onClick={handleSaveAll} className="gap-2">
                    <Save className="w-4 h-4" />
                    Lưu tất cả
                  </Button>
                </div>
              )}
            </ScrollArea>
          )}
        </div>

        {/* Background Editor */}
        {editingChannel && (
          <BackgroundEditor
            open={bgEditorOpen}
            onOpenChange={setBgEditorOpen}
            imageUrl={batchGen.generatedImages[editingChannel]?.imageUrl || ''}
            channel={editingChannel}
            contentId={content.id}
            onImageEdited={handleBackgroundEdited}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
