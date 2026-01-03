import { useState, useMemo } from 'react';
import { Sparkles, Image, Check, Loader2, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
import { useAutoImageGeneration, LogoPosition, ImageGenerationStatus } from '@/hooks/useAutoImageGeneration';
import { cn } from '@/lib/utils';

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

const ASPECT_RATIOS: { value: '16:9' | '1:1' | '9:16' | '4:5'; label: string; description: string }[] = [
  { value: '16:9', label: '16:9', description: 'Website, YouTube, LinkedIn' },
  { value: '1:1', label: '1:1', description: 'Facebook, Instagram Feed' },
  { value: '4:5', label: '4:5', description: 'Instagram Portrait' },
  { value: '9:16', label: '9:16', description: 'Stories, Reels, TikTok' },
];

// Map channels to suggested aspect ratios
const CHANNEL_ASPECT_RATIO: Partial<Record<Channel, '16:9' | '1:1' | '9:16' | '4:5'>> = {
  website: '16:9',
  youtube: '16:9',
  linkedin: '16:9',
  facebook: '1:1',
  instagram: '1:1',
  tiktok: '9:16',
  threads: '1:1',
  twitter: '16:9',
};

function getContentSummary(content: MultiChannelContent, channel: Channel): string {
  // Extract first 200 chars from channel content for context
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
  
  // Clean markdown and truncate
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
      return <AlertCircle className="w-4 h-4 text-destructive" />;
    default:
      return null;
  }
};

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
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '1:1' | '9:16' | '4:5'>('16:9');
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>(content.selected_channels);

  const {
    isGenerating,
    progress,
    completedCount,
    totalCount,
    generateAllImages,
    resetProgress,
  } = useAutoImageGeneration();

  const channelsWithoutImages = useMemo(() => {
    return content.selected_channels.filter(ch => !content.channel_images?.[ch]?.url);
  }, [content.selected_channels, content.channel_images]);

  const contentSummaries = useMemo(() => {
    const summaries: Record<Channel, string> = {} as Record<Channel, string>;
    selectedChannels.forEach(ch => {
      summaries[ch] = getContentSummary(content, ch);
    });
    return summaries;
  }, [content, selectedChannels]);

  const handleGenerate = async () => {
    if (!content.brand_template_id) {
      return;
    }

    await generateAllImages(
      {
        contentId: content.id,
        brandTemplateId: content.brand_template_id,
        channels: selectedChannels,
        contentSummaries,
        includeLogo: includeLogo && !!brandLogoUrl,
        logoPosition,
        logoUrl: brandLogoUrl || undefined,
        aspectRatio,
      },
      onImageGenerated
    );
  };

  const handleClose = () => {
    if (!isGenerating) {
      resetProgress();
      onOpenChange(false);
    }
  };

  const handleToggleChannel = (channel: Channel) => {
    setSelectedChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Tạo ảnh tự động với AI
          </DialogTitle>
          <DialogDescription>
            Sử dụng AI để tạo ảnh cho các kênh với tông màu và logo thương hiệu
          </DialogDescription>
        </DialogHeader>

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
              {content.selected_channels.map(channel => {
                const hasImage = !!content.channel_images?.[channel]?.url;
                const isSelected = selectedChannels.includes(channel);
                const status = progress[channel];

                return (
                  <button
                    key={channel}
                    onClick={() => !isGenerating && handleToggleChannel(channel)}
                    disabled={isGenerating}
                    className={cn(
                      'flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50',
                      isGenerating && 'opacity-70 cursor-not-allowed'
                    )}
                  >
                    {status ? (
                      <StatusIcon status={status} />
                    ) : (
                      <Checkbox checked={isSelected} className="pointer-events-none" />
                    )}
                    <span className="text-sm font-medium capitalize">{channel.replace('_', ' ')}</span>
                    {hasImage && !status && (
                      <span className="ml-auto text-xs text-muted-foreground">Có ảnh</span>
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

          {/* Aspect Ratio */}
          <div className="space-y-2">
            <Label>Tỉ lệ ảnh</Label>
            <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as typeof aspectRatio)}>
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

          {/* Logo Options */}
          {brandLogoUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-logo"
                  checked={includeLogo}
                  onCheckedChange={(checked) => setIncludeLogo(!!checked)}
                  disabled={isGenerating}
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
                    disabled={isGenerating}
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

          {/* Progress */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Đang tạo ảnh...</span>
                <span className="text-muted-foreground">
                  {completedCount}/{totalCount}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
            {isGenerating ? 'Đang xử lý...' : 'Đóng'}
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || selectedChannels.length === 0 || !content.brand_template_id}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang tạo...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Tạo {selectedChannels.length} ảnh
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
