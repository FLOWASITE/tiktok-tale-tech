import { useState, useMemo } from 'react';
import { Sparkles, Image, Loader2, Save, Settings2, Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Channel, MultiChannelContent, ChannelImage } from '@/types/multichannel';
import { 
  useAutoImageGeneration, 
  LogoPosition, 
  ImageGenerationStatus, 
  AspectRatioOption,
  ImageStylePreset,
  CHANNEL_OPTIMAL_ASPECT_RATIO 
} from '@/hooks/useAutoImageGeneration';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageStreamingGrid } from './streaming/ImageStreamingGrid';

interface AutoImageGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: MultiChannelContent;
  brandLogoUrl?: string | null;
  brandPrimaryColor?: string | null;
  onImageGenerated?: (channel: Channel, image: ChannelImage) => Promise<void>;
}

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

const StatusIcon = ({ status }: { status: ImageGenerationStatus }) => {
  switch (status) {
    case 'pending':
      return <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />;
    case 'generating':
    case 'overlaying':
      return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
    case 'done':
      return <Check className="w-4 h-4 text-green-500" />;
    case 'error':
      return <div className="w-4 h-4 rounded-full bg-destructive" />;
    default:
      return null;
  }
};

type ViewMode = 'setup' | 'streaming' | 'preview';

export function AutoImageGenerator({
  open,
  onOpenChange,
  content,
  brandLogoUrl,
  brandPrimaryColor,
  onImageGenerated,
}: AutoImageGeneratorProps) {
  const [includeLogo, setIncludeLogo] = useState(!!brandLogoUrl);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>('bottom-right');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('auto');
  const [imageStyle, setImageStyle] = useState<ImageStylePreset | 'auto'>('auto');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>(content?.selected_channels ?? []);
  const [viewMode, setViewMode] = useState<ViewMode>('setup');
  const [regeneratingChannel, setRegeneratingChannel] = useState<Channel | null>(null);
  const [advancedMode, setAdvancedMode] = useState(false);

  const {
    isGenerating,
    progress,
    completedCount,
    totalCount,
    generatedImages,
    generateAllImages,
    regenerateForChannel,
    savePreviewImages,
    resetProgress,
    getAspectRatioForChannel,
  } = useAutoImageGeneration();

  const channelsWithoutImages = useMemo(() => {
    const channels = content?.selected_channels ?? [];
    return channels.filter(ch => !content?.channel_images?.[ch]?.url);
  }, [content?.selected_channels, content?.channel_images]);

  const contentSummaries = useMemo(() => {
    const summaries: Record<Channel, string> = {} as Record<Channel, string>;
    const channels = selectedChannels ?? [];
    channels.forEach(ch => {
      summaries[ch] = getContentSummary(content, ch);
    });
    return summaries;
  }, [content, selectedChannels]);

  const options = useMemo(() => ({
    contentId: content?.id ?? '',
    brandTemplateId: content?.brand_template_id || '',
    channels: selectedChannels ?? [],
    contentSummaries,
    includeLogo: includeLogo && !!brandLogoUrl,
    logoPosition,
    logoUrl: brandLogoUrl || undefined,
    aspectRatio,
    imageStylePreset: imageStyle === 'auto' ? undefined : imageStyle,
    negativePrompt: typeof negativePrompt === 'string' ? negativePrompt.trim() || undefined : undefined,
  }), [content?.id, content?.brand_template_id, selectedChannels, contentSummaries, includeLogo, brandLogoUrl, logoPosition, aspectRatio, imageStyle, negativePrompt]);

  const handleGenerate = async () => {
    if (!content.brand_template_id) {
      return;
    }

    // Switch to streaming view immediately
    setViewMode('streaming');

    const result = await generateAllImages(options, onImageGenerated, false);
    
    if (result.successful.length > 0) {
      setViewMode('preview');
    }
  };

  const handleSaveAll = async () => {
    if (onImageGenerated) {
      const channelsToSave = Object.keys(generatedImages) as Channel[];
      await savePreviewImages(channelsToSave, onImageGenerated);
      setViewMode('setup');
      onOpenChange(false);
    }
  };

  const handleRegenerateChannel = async (channel: Channel) => {
    setRegeneratingChannel(channel);
    await regenerateForChannel(channel, options);
    setRegeneratingChannel(null);
  };

  const handleDownloadImage = (channel: Channel) => {
    const image = generatedImages[channel];
    if (!image) return;
    
    const link = document.createElement('a');
    link.href = image.imageUrl;
    link.download = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}-${channel}.png`;
    link.target = '_blank';
    link.click();
  };

  const handleClose = () => {
    if (!isGenerating) {
      resetProgress();
      setViewMode('setup');
      onOpenChange(false);
    }
  };

  const handleBackToSetup = () => {
    if (!isGenerating) {
      resetProgress();
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

  const hasGeneratedImages = Object.keys(generatedImages).length > 0;
  const allCompleted = completedCount === totalCount && totalCount > 0;

  // Dialog size based on view mode
  const dialogSize = viewMode === 'setup' ? 'sm:max-w-lg' : 'sm:max-w-4xl';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(dialogSize, "transition-all duration-300")}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {viewMode === 'setup' && 'Tạo ảnh tự động với AI'}
            {viewMode === 'streaming' && 'Đang tạo ảnh...'}
            {viewMode === 'preview' && 'Xem trước ảnh đã tạo'}
          </DialogTitle>
          <DialogDescription>
            {viewMode === 'setup' && 'Sử dụng AI để tạo ảnh cho các kênh với tông màu và logo thương hiệu'}
            {viewMode === 'streaming' && 'AI đang tạo ảnh cho từng kênh, bạn có thể theo dõi tiến trình bên dưới'}
            {viewMode === 'preview' && 'Kiểm tra ảnh và chọn Tạo lại nếu muốn, hoặc Lưu tất cả để hoàn tất'}
          </DialogDescription>
        </DialogHeader>

        {/* Setup Mode */}
        {viewMode === 'setup' && (
          <div className="space-y-6 py-4">
            {/* Brand Preview */}
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              {brandLogoUrl ? (
                <img
                  src={brandLogoUrl}
                  alt="Brand logo"
                  className="w-12 h-12 object-contain rounded"
                />
              ) : (
                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                  <Image className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{content.brand_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {brandPrimaryColor && (
                    <div
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: brandPrimaryColor }}
                    />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {brandPrimaryColor || 'Không có màu chủ đạo'}
                  </span>
                </div>
              </div>
            </div>

            {/* Channel Selection */}
            <div className="space-y-3">
              <Label>Chọn kênh cần tạo ảnh</Label>
              <div className="grid grid-cols-2 gap-2">
                {(content?.selected_channels ?? []).map(channel => {
                  const hasImage = !!content.channel_images?.[channel]?.url;
                  const isSelected = selectedChannels.includes(channel);
                  const optimalRatio = aspectRatio === 'auto' 
                    ? CHANNEL_OPTIMAL_ASPECT_RATIO[channel] || '16:9'
                    : aspectRatio;

                  return (
                    <button
                      key={channel}
                      onClick={() => handleToggleChannel(channel)}
                      className={cn(
                        'flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <Checkbox checked={isSelected} className="pointer-events-none" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium capitalize block">{channel.replace('_', ' ')}</span>
                        {aspectRatio === 'auto' && isSelected && (
                          <span className="text-xs text-muted-foreground">{optimalRatio}</span>
                        )}
                      </div>
                      {hasImage && (
                        <span className="text-xs text-muted-foreground">Có ảnh</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {channelsWithoutImages.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {channelsWithoutImages.length} kênh chưa có ảnh
                </p>
              )}
            </div>

            {/* Aspect Ratio & Image Style Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Aspect Ratio */}
              <div className="space-y-2">
                <Label>Tỉ lệ ảnh</Label>
                <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as AspectRatioOption)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIOS.map(ratio => (
                      <SelectItem key={ratio.value} value={ratio.value}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ratio.label}</span>
                          <span className="text-muted-foreground text-xs">- {ratio.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Image Style Preset */}
              <div className="space-y-2">
                <Label>Phong cách ảnh</Label>
                <Select value={imageStyle} onValueChange={(v) => setImageStyle(v as ImageStylePreset | 'auto')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_STYLES.map(style => (
                      <SelectItem key={style.value} value={style.value}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{style.label}</span>
                          <span className="text-muted-foreground text-xs">- {style.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Logo Options */}
            {brandLogoUrl && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="include-logo"
                    checked={includeLogo}
                    onCheckedChange={(checked) => setIncludeLogo(!!checked)}
                  />
                  <Label htmlFor="include-logo" className="cursor-pointer">
                    Thêm logo vào ảnh
                  </Label>
                </div>

                {includeLogo && (
                  <div className="pl-6 space-y-2">
                    <Label className="text-sm">Vị trí logo</Label>
                    <Select
                      value={logoPosition}
                      onValueChange={(v) => setLogoPosition(v as LogoPosition)}
                    >
                      <SelectTrigger className="w-full">
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
                  </div>
                )}
              </div>
            )}

            {/* Advanced Mode Toggle */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setAdvancedMode(!advancedMode)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings2 className="w-4 h-4" />
                <span>{advancedMode ? 'Ẩn tùy chọn nâng cao' : 'Tùy chọn nâng cao'}</span>
              </button>

              {advancedMode && (
                <div className="space-y-3 pl-6 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label className="text-sm">Negative Prompt (những gì không muốn)</Label>
                    <Textarea
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="text, logo, watermark, blurry, distorted, low quality..."
                      rows={2}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Liệt kê các yếu tố bạn không muốn xuất hiện trong ảnh
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Streaming Mode - Show real-time progress */}
        {(viewMode === 'streaming' || viewMode === 'preview') && (
          <ScrollArea className="max-h-[65vh]">
            <div className="py-2">
              <ImageStreamingGrid
                progress={progress}
                generatedImages={generatedImages}
                onRetryChannel={handleRegenerateChannel}
                onDownloadImage={handleDownloadImage}
                retryingChannel={regeneratingChannel}
              />
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          {viewMode === 'setup' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Đóng
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={selectedChannels.length === 0 || !content.brand_template_id}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Tạo {selectedChannels.length} ảnh
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
              <Button variant="outline" onClick={handleBackToSetup} disabled={isGenerating}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại
              </Button>
              <Button onClick={handleSaveAll} disabled={isGenerating || !hasGeneratedImages}>
                <Save className="w-4 h-4 mr-2" />
                Lưu tất cả ({Object.keys(generatedImages).length} ảnh)
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
