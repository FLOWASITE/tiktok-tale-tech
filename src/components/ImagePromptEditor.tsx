import { useState, useEffect } from 'react';
import { ImagePlus, Loader2, Sparkles, Copy, Check, Download, RefreshCw, Settings, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Channel } from '@/types/multichannel';
import { useAIProviders } from '@/hooks/useAIProviders';
import { AI_PROVIDERS } from '@/types/aiProvider';
import { useSocialImageGeneration } from '@/hooks/useSocialImageGeneration';
import { toast } from 'sonner';

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
    aspectRatio: '1.91:1',
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
    aspectRatio: '1.91:1',
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
    aspectRatio: '1.91:1',
    style: 'Hero banner, professional, brand-aligned',
    tips: 'High-res, brand colors, compelling imagery'
  },
  email: { 
    size: '600x300', 
    aspectRatio: '2:1',
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
};

function generateAutoPrompt(
  channel: Channel,
  contentSummary: string,
  brandName?: string,
  brandGuideline?: string,
  primaryColor?: string,
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
}: ImagePromptEditorProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const { config, getProviderConfig } = useAIProviders();
  const { generating, generateImage, isConfigured } = useSocialImageGeneration();
  
  const activeProvider = AI_PROVIDERS.find(p => p.id === config.selectedProvider);
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
      );
      setPrompt(autoPrompt);
      setSelectedSize(channelConfig.size);
      setGeneratedImageUrl(null);
    }
  }, [open, channel, contentSummary, brandName, brandGuideline, primaryColor, channelConfig.size]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Vui lòng nhập prompt');
      return;
    }

    const imageUrl = await generateImage({
      prompt,
      contentId,
      channel,
      size: selectedSize,
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
            Tạo ảnh AI tự động dựa trên nội dung và brand guidelines
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Provider Info */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <span className="text-xl">{activeProvider?.icon}</span>
              <div>
                <p className="text-sm font-medium">{activeProvider?.name}</p>
                <p className="text-xs text-muted-foreground">{activeProvider?.description}</p>
              </div>
            </div>
            {isConfigured ? (
              <Badge variant="outline" className="gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Đã cấu hình
              </Badge>
            ) : (
              <Badge variant="destructive">Chưa cấu hình API key</Badge>
            )}
          </div>

          {/* Channel Config */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-xs text-muted-foreground mb-1">Kích thước đề xuất</p>
              <p className="font-medium">{channelConfig.size}</p>
              <p className="text-xs text-muted-foreground">{channelConfig.aspectRatio}</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-xs text-muted-foreground mb-1">Style</p>
              <p className="text-sm">{channelConfig.style}</p>
            </div>
          </div>

          {/* Size Selector */}
          <div className="space-y-2">
            <Label>Kích thước ảnh</Label>
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn kích thước" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={channelConfig.size}>
                  {channelConfig.size} (Đề xuất cho {channel})
                </SelectItem>
                <SelectItem value="1024x1024">1024x1024 (Vuông)</SelectItem>
                <SelectItem value="1536x1024">1536x1024 (Ngang)</SelectItem>
                <SelectItem value="1024x1536">1024x1536 (Dọc)</SelectItem>
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
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Bạn có thể chỉnh sửa prompt hoặc copy để dùng với công cụ khác (Midjourney, DALL-E...)
            </p>
          </div>

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

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !isConfigured || !prompt.trim()}
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
