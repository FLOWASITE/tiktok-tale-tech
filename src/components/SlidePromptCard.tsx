import { CarouselSlide } from '@/types/carousel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Target, Type, Palette, Layout, Square, Settings } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ImageGeneratorButton } from './ImageGeneratorButton';
import { GeneratedImage } from '@/hooks/useImageGeneration';

interface SlidePromptCardProps {
  slide: CarouselSlide;
  totalSlides: number;
  generatedImage?: GeneratedImage;
  isGenerating?: boolean;
  onGenerateImage?: () => void;
  canGenerateImage?: boolean;
}

export function SlidePromptCard({
  slide,
  totalSlides,
  generatedImage,
  isGenerating = false,
  onGenerateImage,
  canGenerateImage = false,
}: SlidePromptCardProps) {
  const [copiedFull, setCopiedFull] = useState(false);

  const handleCopyFullPrompt = async () => {
    try {
      await navigator.clipboard.writeText(slide.fullPrompt);
      setCopiedFull(true);
      toast.success('Đã copy prompt!');
      setTimeout(() => setCopiedFull(false), 2000);
    } catch {
      toast.error('Không thể copy');
    }
  };

  const getSlideLabel = () => {
    if (slide.slideNumber === 1) return 'Hook';
    if (slide.slideNumber === totalSlides) return 'CTA';
    return `Slide ${slide.slideNumber}`;
  };

  const getSlideColor = () => {
    if (slide.slideNumber === 1) return 'bg-primary text-primary-foreground';
    if (slide.slideNumber === totalSlides) return 'bg-green-500 text-white';
    return 'bg-secondary text-secondary-foreground';
  };

  return (
    <Card className="gradient-card border-border/50">
      <CardHeader className="pb-2 xs:pb-3 px-3 xs:px-4 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
            <Badge className={`${getSlideColor()} text-[10px] xs:text-xs px-1.5 xs:px-2`}>
              {getSlideLabel()}
            </Badge>
            <CardTitle className="text-xs xs:text-sm font-medium text-muted-foreground truncate">
              Ảnh {slide.slideNumber}/{totalSlides}
            </CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyFullPrompt}
            className="border-border hover:border-primary h-7 xs:h-8 px-2 xs:px-3 text-xs shrink-0"
          >
            {copiedFull ? (
              <Check className="w-3 xs:w-4 h-3 xs:h-4 text-green-500" />
            ) : (
              <Copy className="w-3 xs:w-4 h-3 xs:h-4" />
            )}
            <span className="ml-1 xs:ml-1.5 hidden xs:inline">Copy Prompt</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 xs:space-y-3 sm:space-y-4 px-3 xs:px-4 sm:px-6 py-2 xs:py-3">
        {/* Objective */}
        <div className="space-y-1 xs:space-y-1.5">
          <div className="flex items-center gap-1 xs:gap-1.5 text-[10px] xs:text-xs font-medium text-muted-foreground">
            <Target className="w-3 xs:w-3.5 h-3 xs:h-3.5" />
            <span className="hidden xs:inline">[1] Mục tiêu slide</span>
            <span className="xs:hidden">Mục tiêu</span>
          </div>
          <p className="text-xs xs:text-sm bg-muted/30 p-2 xs:p-2.5 rounded-lg">{slide.objective}</p>
        </div>

        {/* Text Content */}
        <div className="space-y-1 xs:space-y-1.5">
          <div className="flex items-center gap-1 xs:gap-1.5 text-[10px] xs:text-xs font-medium text-muted-foreground">
            <Type className="w-3 xs:w-3.5 h-3 xs:h-3.5" />
            <span className="hidden xs:inline">[2] Nội dung chữ trên ảnh</span>
            <span className="xs:hidden">Nội dung</span>
          </div>
          <p className="text-xs xs:text-sm bg-muted/30 p-2 xs:p-2.5 rounded-lg whitespace-pre-wrap">{slide.textContent}</p>
        </div>

        {/* Design Style */}
        <div className="space-y-1 xs:space-y-1.5">
          <div className="flex items-center gap-1 xs:gap-1.5 text-[10px] xs:text-xs font-medium text-muted-foreground">
            <Palette className="w-3 xs:w-3.5 h-3 xs:h-3.5" />
            <span className="hidden xs:inline">[3] Phong cách thiết kế</span>
            <span className="xs:hidden">Phong cách</span>
          </div>
          <p className="text-xs xs:text-sm bg-muted/30 p-2 xs:p-2.5 rounded-lg">{slide.designStyle}</p>
        </div>

        {/* Color & Layout */}
        <div className="space-y-1 xs:space-y-1.5">
          <div className="flex items-center gap-1 xs:gap-1.5 text-[10px] xs:text-xs font-medium text-muted-foreground">
            <Layout className="w-3 xs:w-3.5 h-3 xs:h-3.5" />
            <span className="hidden xs:inline">[4] Màu sắc – bố cục</span>
            <span className="xs:hidden">Màu sắc</span>
          </div>
          <p className="text-xs xs:text-sm bg-muted/30 p-2 xs:p-2.5 rounded-lg">{slide.colorLayout}</p>
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-1 xs:space-y-1.5">
          <div className="flex items-center gap-1 xs:gap-1.5 text-[10px] xs:text-xs font-medium text-muted-foreground">
            <Square className="w-3 xs:w-3.5 h-3 xs:h-3.5" />
            <span className="hidden xs:inline">[5] Tỉ lệ khung hình</span>
            <span className="xs:hidden">Tỉ lệ</span>
          </div>
          <p className="text-xs xs:text-sm bg-muted/30 p-2 xs:p-2.5 rounded-lg">{slide.aspectRatio}</p>
        </div>

        {/* Technical Requirements */}
        <div className="space-y-1 xs:space-y-1.5">
          <div className="flex items-center gap-1 xs:gap-1.5 text-[10px] xs:text-xs font-medium text-muted-foreground">
            <Settings className="w-3 xs:w-3.5 h-3 xs:h-3.5" />
            <span className="hidden xs:inline">[6] Yêu cầu kỹ thuật</span>
            <span className="xs:hidden">Kỹ thuật</span>
          </div>
          <p className="text-xs xs:text-sm bg-muted/30 p-2 xs:p-2.5 rounded-lg">{slide.technicalRequirements}</p>
        </div>

        {/* Full Prompt */}
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between mb-1.5 xs:mb-2">
            <span className="text-[10px] xs:text-xs font-medium text-primary">PROMPT HOÀN CHỈNH</span>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-2 xs:p-3">
            <p className="text-[10px] xs:text-xs sm:text-sm whitespace-pre-wrap font-mono leading-relaxed">{slide.fullPrompt}</p>
          </div>
        </div>

        {/* Image Generation Section */}
        {onGenerateImage && (
          <div className="pt-2 xs:pt-3 border-t border-border/50">
            <ImageGeneratorButton
              slideNumber={slide.slideNumber}
              isGenerating={isGenerating}
              generatedImage={generatedImage}
              onGenerate={onGenerateImage}
              disabled={!canGenerateImage}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
