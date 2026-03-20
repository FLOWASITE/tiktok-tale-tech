import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, RefreshCw, Download, ExternalLink } from 'lucide-react';
import { GeneratedImage } from '@/hooks/useImageGeneration';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

interface ImageGeneratorButtonProps {
  slideNumber: number;
  isGenerating: boolean;
  generatedImage?: GeneratedImage;
  onGenerate: () => void;
  disabled?: boolean;
}

export function ImageGeneratorButton({
  slideNumber,
  isGenerating,
  generatedImage,
  onGenerate,
  disabled = false,
}: ImageGeneratorButtonProps) {
  const handleDownload = async () => {
    if (!generatedImage?.imageUrl) return;
    
    try {
      const response = await fetch(generatedImage.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slide-${slideNumber}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handleOpenInNewTab = () => {
    if (generatedImage?.imageUrl) {
      window.open(generatedImage.imageUrl, '_blank');
    }
  };

  return (
    <div className="space-y-3">
      {/* Generate/Regenerate Button */}
      <Button
        onClick={onGenerate}
        disabled={disabled || isGenerating}
        variant={generatedImage ? 'outline' : 'default'}
        size="sm"
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Đang tạo ảnh...
          </>
        ) : generatedImage ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Tạo lại ảnh
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Tạo ảnh với Gemini
          </>
        )}
      </Button>

      {/* Generated Image Preview */}
      {generatedImage && (
        <div className="space-y-2">
          <div className="relative group rounded-lg overflow-hidden border border-border">
            <OptimizedImage
              src={generatedImage.imageUrl}
              alt={`Slide ${slideNumber}`}
              className="w-full h-auto object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                size="icon"
                variant="secondary"
                onClick={handleOpenInNewTab}
                className="h-8 w-8"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onClick={handleDownload}
                className="h-8 w-8"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Tạo lúc: {new Date(generatedImage.generatedAt).toLocaleString('vi-VN')}
          </p>
        </div>
      )}
    </div>
  );
}
