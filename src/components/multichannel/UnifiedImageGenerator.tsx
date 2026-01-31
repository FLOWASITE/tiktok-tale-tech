import { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, Image, Loader2, Save, Settings2, Check, ArrowLeft, 
  Copy, Download, RefreshCw, Wand2, Palette, ChevronDown, ChevronUp, Eye,
  Layers, ImageIcon
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
  CHANNEL_OPTIMAL_ASPECT_RATIO 
} from '@/hooks/useAutoImageGeneration';
import { useSocialImageGeneration, IMAGE_STYLE_PRESETS } from '@/hooks/useSocialImageGeneration';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageStreamingGrid } from './streaming/ImageStreamingGrid';
import { toast } from 'sonner';

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

const IMAGE_STYLES: { value: ImageStylePreset | 'auto'; label: string; description: string }[] = [
  { value: 'auto', label: 'Tự động', description: 'Theo brand style' },
  { value: 'photorealistic', label: 'Chân thực', description: 'Ảnh chụp chuyên nghiệp' },
  { value: 'illustration', label: 'Minh họa', description: 'Đồ họa vector' },
  { value: 'minimalist', label: 'Tối giản', description: 'Đơn giản, thanh lịch' },
  { value: '3d_render', label: '3D Render', description: 'Đồ họa 3D' },
  { value: 'flat_design', label: 'Flat Design', description: 'Phẳng, màu đặc' },
  { value: 'watercolor', label: 'Màu nước', description: 'Nghệ thuật mềm mại' },
  { value: 'cinematic', label: 'Điện ảnh', description: 'Ánh sáng kịch tính' },
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
): string {
  const optimalRatio = CHANNEL_OPTIMAL_ASPECT_RATIO[channel] || '16:9';
  
  let prompt = `Create a ${optimalRatio} aspect ratio image for ${channel}. `;
  
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
  
  // Batch mode state
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>(content?.selected_channels ?? []);
  const [regeneratingChannel, setRegeneratingChannel] = useState<Channel | null>(null);
  
  // Single mode state
  const [singleChannel, setSingleChannel] = useState<Channel>(initialChannel || content?.selected_channels?.[0] || 'facebook');
  const [customPrompt, setCustomPrompt] = useState('');
  const [singleGeneratedUrl, setSingleGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Hooks
  const batchGen = useAutoImageGeneration();
  const singleGen = useSocialImageGeneration();

  // Auto-generate prompt for single mode
  useEffect(() => {
    if (open && mode === 'single') {
      const contentSummary = getContentSummary(content, singleChannel);
      const autoPrompt = generateAutoPrompt(
        singleChannel,
        contentSummary,
        content.brand_name,
        brandPrimaryColor || undefined,
        brandIndustry,
      );
      setCustomPrompt(autoPrompt);
      setSingleGeneratedUrl(null);
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
  }), [content?.id, content?.brand_template_id, selectedChannels, contentSummaries, includeLogo, brandLogoUrl, logoPosition, aspectRatio, imageStyle, negativePrompt]);

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

    const imageUrl = await singleGen.generateImage({
      prompt: customPrompt,
      contentId: content.id,
      channel: singleChannel,
      aspectRatio: effectiveAspectRatio,
      brandTemplateId: content.brand_template_id,
      imageStylePreset: imageStyle === 'auto' ? undefined : imageStyle,
      negativePrompt: negativePrompt.trim() || undefined,
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
    const autoPrompt = generateAutoPrompt(
      singleChannel,
      contentSummary,
      content.brand_name,
      brandPrimaryColor || undefined,
      brandIndustry,
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
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="batch" className="gap-2">
                    <Layers className="w-4 h-4" />
                    Tạo nhiều kênh
                  </TabsTrigger>
                  <TabsTrigger value="single" className="gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Tạo từng kênh
                  </TabsTrigger>
                </TabsList>

                {/* Batch Mode Content */}
                <TabsContent value="batch" className="space-y-4 mt-4">
                  {/* Brand Preview */}
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                    {brandLogoUrl ? (
                      <img src={brandLogoUrl} alt="Brand logo" className="w-10 h-10 object-contain rounded" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <Image className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{content.brand_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {brandPrimaryColor && (
                          <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: brandPrimaryColor }} />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {brandPrimaryColor || 'Không có màu chủ đạo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Channel Selection */}
                  <div className="space-y-2">
                    <Label>Chọn kênh ({selectedChannels.length})</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(content?.selected_channels ?? []).map(channel => {
                        const isSelected = selectedChannels.includes(channel);
                        const optimalRatio = CHANNEL_OPTIMAL_ASPECT_RATIO[channel] || '16:9';

                        return (
                          <button
                            key={channel}
                            onClick={() => handleToggleChannel(channel)}
                            className={cn(
                              'flex items-center gap-2 p-2 rounded-lg border text-left transition-colors text-sm',
                              isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                            )}
                          >
                            <Checkbox checked={isSelected} className="pointer-events-none" />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium capitalize block truncate">{channel.replace('_', ' ')}</span>
                              {aspectRatio === 'auto' && isSelected && (
                                <span className="text-xs text-muted-foreground">{optimalRatio}</span>
                              )}
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
                {/* Style & Aspect Ratio */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Phong cách</Label>
                    <Select value={imageStyle} onValueChange={(v) => setImageStyle(v as ImageStylePreset | 'auto')}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IMAGE_STYLES.map(style => (
                          <SelectItem key={style.value} value={style.value}>
                            <span>{style.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Tỉ lệ khung hình</Label>
                    <div className="flex items-center gap-2">
                      <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as AspectRatioOption)} >
                        <SelectTrigger className="h-9 flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASPECT_RATIOS.map(ratio => (
                            <SelectItem key={ratio.value} value={ratio.value}>
                              <span>{ratio.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className={cn(
                        "border-2 border-primary/50 rounded bg-primary/10 flex items-center justify-center shrink-0",
                        getAspectRatioClasses(effectiveAspectRatio)
                      )}>
                        <Image className="w-3 h-3 text-primary/60" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logo Options */}
                {brandLogoUrl && (
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <img src={brandLogoUrl} alt="Logo" className="w-8 h-8 object-contain rounded" />
                      <div>
                        <p className="text-sm font-medium">Thêm logo</p>
                        <p className="text-xs text-muted-foreground">Tự động overlay sau khi tạo</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {includeLogo && (
                        <Select value={logoPosition} onValueChange={(v) => setLogoPosition(v as LogoPosition)}>
                          <SelectTrigger className="h-8 w-32 text-xs">
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
                      <Switch checked={includeLogo} onCheckedChange={setIncludeLogo} />
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
                          </div>
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
