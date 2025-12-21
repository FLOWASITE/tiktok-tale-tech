import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, ExternalLink, Trash2, ImageIcon, Package } from 'lucide-react';
import { GeneratedImage } from '@/hooks/useImageGeneration';
import { toast } from 'sonner';

interface GeneratedImagesGalleryProps {
  images: GeneratedImage[];
  totalSlides: number;
  onDeleteImage?: (slideNumber: number) => void;
}

export function GeneratedImagesGallery({
  images,
  totalSlides,
  onDeleteImage,
}: GeneratedImagesGalleryProps) {
  const handleDownloadSingle = async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slide-${image.slideNumber}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Đã tải slide ${image.slideNumber}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Không thể tải ảnh');
    }
  };

  const handleDownloadAll = async () => {
    if (images.length === 0) {
      toast.error('Chưa có ảnh nào để tải');
      return;
    }

    toast.info('Đang tải tất cả ảnh...');
    
    for (const image of images) {
      await handleDownloadSingle(image);
      // Small delay between downloads
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    
    toast.success('Đã tải tất cả ảnh!');
  };

  const handleOpenInNewTab = (imageUrl: string) => {
    window.open(imageUrl, '_blank');
  };

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-lg mb-1">Chưa có ảnh nào</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Vào tab "Slide Prompts" và nhấn "Tạo ảnh với Gemini" trên từng slide để bắt đầu tạo ảnh.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {images.length}/{totalSlides} ảnh
          </Badge>
        </div>
        <Button onClick={handleDownloadAll} size="sm" variant="outline">
          <Package className="w-4 h-4 mr-2" />
          Tải tất cả
        </Button>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((image) => (
          <Card key={image.slideNumber} className="overflow-hidden group">
            <CardContent className="p-0 relative">
              <div className="aspect-square relative">
                <img
                  src={image.imageUrl}
                  alt={`Slide ${image.slideNumber}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => handleOpenInNewTab(image.imageUrl)}
                    className="h-8 w-8"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => handleDownloadSingle(image)}
                    className="h-8 w-8"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {onDeleteImage && (
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => onDeleteImage(image.slideNumber)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <Badge className="absolute top-2 left-2 bg-black/70 text-white">
                  Slide {image.slideNumber}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Missing slides info */}
      {images.length < totalSlides && (
        <p className="text-xs text-muted-foreground text-center">
          Còn {totalSlides - images.length} slide chưa tạo ảnh
        </p>
      )}
    </div>
  );
}
