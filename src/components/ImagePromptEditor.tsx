import { useState, useEffect } from 'react';
import { ImagePlus, Loader2, Sparkles, Copy, Check, Download, RefreshCw, Wand2, Palette, ImageIcon, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Channel } from '@/types/multichannel';
import { useSocialImageGeneration, IMAGE_STYLE_PRESETS, ImageStylePreset } from '@/hooks/useSocialImageGeneration';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImagePromptEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
  contentId: string;
  contentSummary: string;
  brandName?: string;
  brandGuideline?: string;
  primaryColor?: string;
  onImageGenerated?: (imageUrl: string) => void;
  // New required props for brand integration
  brandTemplateId: string;
  brandLogoUrl?: string;
  brandIndustry?: string[];
}

// Channel-specific image dimensions and styles
const CHANNEL_IMAGE_CONFIG: Record<Channel, { 
  size: string; 
  aspectRatio: string;
  style: string;
  tips: string;
}> = {
  facebook: { 
    size: '1200x630', 
    aspectRatio: '16:9',
    style: 'Eye-catching, vibrant colors, clear focal point',
    tips: 'Use high contrast, minimal text, brand colors'
  },
  instagram: { 
    size: '1080x1080', 
    aspectRatio: '1:1',
    style: 'Aesthetic, trendy, lifestyle-focused',
    tips: 'Clean composition, cohesive filter, lifestyle feel'
  },
  linkedin: { 
    size: '1200x627', 
    aspectRatio: '16:9',
    style: 'Professional, clean, business-appropriate',
    tips: 'Corporate style, data visualization, professional imagery'
  },
  twitter: { 
    size: '1600x900', 
    aspectRatio: '16:9',
    style: 'Bold, minimal text, high impact',
    tips: 'Strong visuals, minimal clutter, attention-grabbing'
  },
  youtube: { 
    size: '1280x720', 
    aspectRatio: '16:9',
    style: 'Thumbnail style, face focus, expressive',
    tips: 'Big text, expressive faces, contrasting colors'
  },
  website: { 
    size: '1200x630', 
    aspectRatio: '16:9',
    style: 'Hero banner, professional, brand-aligned',
    tips: 'High-res, brand colors, compelling imagery'
  },
  email: { 
    size: '600x300', 
    aspectRatio: '16:9',
    style: 'Clean, lightweight, email-optimized',
    tips: 'Simple, fast-loading, clear message'
  },
  google_maps: { 
    size: '720x720', 
    aspectRatio: '1:1',
    style: 'Local business, welcoming, authentic',
    tips: 'Show storefront, products, or team'
  },
  zalo_oa: { 
    size: '1080x1080', 
    aspectRatio: '1:1',
    style: 'Mobile-first, Vietnamese style, engaging',
    tips: 'Mobile-optimized, local appeal, clear CTA'
  },
  telegram: { 
    size: '1080x1080', 
    aspectRatio: '1:1',
    style: 'Clean, informative, community-focused',
    tips: 'Clear information, brand consistency'
  },
  tiktok: { 
    size: '1080x1920', 
    aspectRatio: '9:16',
    style: 'Vertical, dynamic, trend-focused',
    tips: 'Vertical format, bold text, trending style'
  },
  threads: { 
    size: '1080x1080', 
    aspectRatio: '1:1',
    style: 'Minimal, text-focused, conversational',
    tips: 'Simple imagery, text overlay, casual feel'
  },
};

const ASPECT_RATIO_OPTIONS = [
  { value: '1:1', label: '1:1 (Vuông)', description: 'Instagram, Facebook' },
  { value: '16:9', label: '16:9 (Ngang)', description: 'YouTube, LinkedIn, Twitter' },
  { value: '9:16', label: '9:16 (Dọc)', description: 'TikTok, Reels, Stories' },
  { value: '4:5', label: '4:5 (Portrait)', description: 'Instagram Feed' },
];

function generateAutoPrompt(
  channel: Channel,
  contentSummary: string,
  brandName?: string,
  brandGuideline?: string,
  primaryColor?: string,
  brandIndustry?: string[],
): string {
  const config = CHANNEL_IMAGE_CONFIG[channel];
  
  let prompt = `Create a ${config.aspectRatio} aspect ratio image for ${channel}. `;
  prompt += `Style: ${config.style}. `;
  
  // Add content context
  if (contentSummary) {
    const summary = contentSummary.slice(0, 200);
    prompt += `Content theme: ${summary}. `;
  }
  
  // Add brand guidelines
  if (brandName) {
    prompt += `Brand: ${brandName}. `;
  }
  
  if (primaryColor) {
    prompt += `Use primary color ${primaryColor} as accent. `;
  }

  if (brandIndustry && brandIndustry.length > 0) {
    prompt += `Industry: ${brandIndustry.join(', ')}. `;
  }
  
  if (brandGuideline) {
    const guideline = brandGuideline.slice(0, 300);
    prompt += `Brand style: ${guideline}. `;
  }
  
  prompt += `${config.tips}. `;
  prompt += 'High quality, professional, visually appealing. Ultra high resolution.';
  
  return prompt;
}

export function ImagePromptEditor({
  open,
  onOpenChange,
  channel,
  contentId,
  contentSummary,
  brandName,
  brandGuideline,
  primaryColor,
  onImageGenerated,
  brandTemplateId,
  brandLogoUrl,
  brandIndustry,
}: ImagePromptEditorProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // New state for enhanced features
  const [imageStyle, setImageStyle] = useState<ImageStylePreset | 'auto'>('auto');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [includeLogo, setIncludeLogo] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  
  const { generating, generateImage } = useSocialImageGeneration();
  
  const channelConfig = CHANNEL_IMAGE_CONFIG[channel];
  const isGenerating = generating === channel;

  // Auto-generate prompt when dialog opens
  useEffect(() => {
    if (open) {
      const autoPrompt = generateAutoPrompt(
        channel,
        contentSummary,
        brandName,
        brandGuideline,
        primaryColor,
        brandIndustry,
      );
      setPrompt(autoPrompt);
      setSelectedAspectRatio(channelConfig.aspectRatio);
      setGeneratedImageUrl(null);
      setIncludeLogo(!!brandLogoUrl);
    }
  }, [open, channel, contentSummary, brandName, brandGuideline, primaryColor, brandIndustry, channelConfig.aspectRatio, brandLogoUrl]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Vui lòng nhập prompt');
      return;
    }

    if (!brandTemplateId) {
      toast.error('Không tìm thấy Brand Template');
      return;
    }

    const imageUrl = await generateImage({
      prompt,
      contentId,
      channel,
      aspectRatio: selectedAspectRatio || channelConfig.aspectRatio,
      brandTemplateId,
      imageStylePreset: imageStyle === 'auto' ? undefined : imageStyle,
      negativePrompt: negativePrompt.trim() || undefined,
    });

    if (imageUrl) {
      setGeneratedImageUrl(imageUrl);
      onImageGenerated?.(imageUrl);
    }
  };

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Đã copy prompt');
  };

  const handleRegenerate = () => {
    const autoPrompt = generateAutoPrompt(
      channel,
      contentSummary,
      brandName,
      brandGuideline,
      primaryColor,
      brandIndustry,
    );
    setPrompt(autoPrompt);
  };

  const handleDownload = async () => {
    if (!generatedImageUrl) return;
    
    try {
      const response = await fetch(generatedImageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${channel}-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Đã tải ảnh');
    } catch {
      toast.error('Không thể tải ảnh');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-primary" />
            Tạo ảnh cho {channel.charAt(0).toUpperCase() + channel.slice(1).replace('_', ' ')}
          </DialogTitle>
          <DialogDescription>
            Tạo ảnh AI với brand context và style presets
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Brand Context Preview */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-3">
              {primaryColor && (
                <div 
                  className="w-8 h-8 rounded-full border-2 border-background shadow-sm"
                  style={{ backgroundColor: primaryColor }}
                />
              )}
              <div>
                <p className="text-sm font-medium">{brandName || 'Brand'}</p>
                {brandIndustry && brandIndustry.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {brandIndustry.slice(0, 2).join(', ')}
                  </p>
                )}
              </div>
            </div>
            <Badge variant="outline" className="gap-1">
              <Palette className="w-3 h-3" />
              Brand Context
            </Badge>
          </div>

          {/* Style Preset & Aspect Ratio Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Style Preset */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                Style Preset
              </Label>
              <Select 
                value={imageStyle} 
                onValueChange={(v) => setImageStyle(v as ImageStylePreset | 'auto')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <span className="flex flex-col">
                      <span>Tự động</span>
                      <span className="text-xs text-muted-foreground">Dựa trên brand style</span>
                    </span>
                  </SelectItem>
                  {Object.entries(IMAGE_STYLE_PRESETS).map(([key, preset]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex flex-col">
                        <span>{preset.label}</span>
                        <span className="text-xs text-muted-foreground">{preset.description}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <Label>Tỷ lệ khung hình</Label>
              <Select value={selectedAspectRatio} onValueChange={setSelectedAspectRatio}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tỷ lệ" />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Channel Config Info with Visual Aspect Ratio */}
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Đề xuất cho {channel}</p>
                <p className="text-sm">{channelConfig.style}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Visual Aspect Ratio Box */}
                <div 
                  className={cn(
                    "border-2 border-muted-foreground/30 rounded bg-muted/50 flex items-center justify-center",
                    selectedAspectRatio === '16:9' && "w-10 h-6",
                    selectedAspectRatio === '1:1' && "w-7 h-7",
                    selectedAspectRatio === '4:5' && "w-6 h-7",
                    selectedAspectRatio === '9:16' && "w-5 h-9"
                  )}
                >
                  <ImageIcon className="w-3 h-3 text-muted-foreground/60" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  {selectedAspectRatio || channelConfig.aspectRatio}
                </Badge>
              </div>
            </div>
          </div>

          {/* Prompt Preview Collapsible */}
          <Collapsible open={showPromptPreview} onOpenChange={setShowPromptPreview}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Xem trước prompt sẽ gửi</span>
                </div>
                {showPromptPreview ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Brand</p>
                    <p className="font-medium">{brandName || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Màu chủ đạo</p>
                    <div className="flex items-center gap-1.5">
                      {primaryColor ? (
                        <>
                          <div 
                            className="w-3 h-3 rounded-full border"
                            style={{ backgroundColor: primaryColor }}
                          />
                          <span className="font-medium">{primaryColor}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Không có</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Ngành</p>
                    <p className="font-medium">{brandIndustry?.slice(0, 2).join(', ') || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Style preset</p>
                    <p className="font-medium">
                      {imageStyle === 'auto' 
                        ? 'Tự động' 
                        : IMAGE_STYLE_PRESETS[imageStyle]?.label || imageStyle
                      }
                    </p>
                  </div>
                </div>
                {negativePrompt && (
                  <div className="pt-2 border-t space-y-1">
                    <p className="text-xs text-muted-foreground">Negative prompt</p>
                    <p className="text-xs font-medium text-destructive/80">{negativePrompt}</p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Prompt Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Image Prompt (có thể chỉnh sửa)</Label>
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleRegenerate}
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Tạo lại prompt tự động</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleCopyPrompt}
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy prompt</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Mô tả ảnh bạn muốn tạo..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Negative Prompt */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Negative Prompt (các yếu tố cần tránh)</Label>
            <Textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="text, watermark, blurry, low quality..."
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {/* Logo Toggle - Only show if brand has logo */}
          {brandLogoUrl && (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <img 
                  src={brandLogoUrl} 
                  alt="Logo" 
                  className="w-8 h-8 object-contain rounded"
                />
                <div>
                  <p className="text-sm font-medium">Thêm logo thương hiệu</p>
                  <p className="text-xs text-muted-foreground">Logo sẽ được thêm vào ảnh sau khi tạo</p>
                </div>
              </div>
              <Switch
                checked={includeLogo}
                onCheckedChange={setIncludeLogo}
              />
            </div>
          )}

          {/* Generated Image Preview */}
          {generatedImageUrl && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ảnh đã tạo</Label>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownload}
                    className="h-7 gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Tải xuống
                  </Button>
                </div>
              </div>
              <div className="relative rounded-lg overflow-hidden border bg-muted/30">
                <img
                  src={generatedImageUrl}
                  alt="Generated"
                  className="w-full h-auto max-h-80 object-contain"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || !brandTemplateId}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tạo...
                </>
              ) : generatedImageUrl ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Tạo lại
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Tạo ảnh
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
