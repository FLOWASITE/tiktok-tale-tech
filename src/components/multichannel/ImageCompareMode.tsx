import { useState } from 'react';
import { ArrowLeftRight, X, Check, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ImageVersion {
  id: string;
  image_url: string;
  prompt?: string | null;
  aspect_ratio: string | null;
  is_selected: boolean;
  created_at: string;
  version: number;
}

interface ImageCompareModeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: ImageVersion[];
  channelLabel: string;
  onSelectImage?: (imageId: string, imageUrl: string) => void;
}

export function ImageCompareMode({
  open,
  onOpenChange,
  images,
  channelLabel,
  onSelectImage,
}: ImageCompareModeProps) {
  const [leftImage, setLeftImage] = useState<ImageVersion | null>(null);
  const [rightImage, setRightImage] = useState<ImageVersion | null>(null);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'slider'>('side-by-side');
  const [sliderPosition, setSliderPosition] = useState(50);

  // Auto-select first two images when opening
  const handleOpen = () => {
    if (images.length >= 2) {
      setLeftImage(images[0]);
      setRightImage(images[1]);
    } else if (images.length === 1) {
      setLeftImage(images[0]);
      setRightImage(null);
    }
  };

  const handleDownload = async (image: ImageVersion, label: string) => {
    try {
      const response = await fetch(image.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${channelLabel}-v${image.version}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPosition(Number(e.target.value));
  };

  if (images.length < 2) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-5xl max-h-[90vh]"
        onOpenAutoFocus={handleOpen}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            So sánh phiên bản - {channelLabel}
          </DialogTitle>
          <DialogDescription>
            Chọn 2 phiên bản để so sánh chi tiết
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Selection Row */}
          <div className="flex gap-4">
            {/* Left Image Selector */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Phiên bản A</label>
              <ScrollArea className="h-20 border rounded-lg p-2">
                <div className="flex gap-2">
                  {images.map((img) => (
                    <button
                      key={`left-${img.id}`}
                      onClick={() => setLeftImage(img)}
                      className={cn(
                        'relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all',
                        leftImage?.id === img.id 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-transparent hover:border-muted-foreground/30',
                        rightImage?.id === img.id && 'opacity-40 cursor-not-allowed'
                      )}
                      disabled={rightImage?.id === img.id}
                    >
                      <img
                        src={img.image_url}
                        alt={`v${img.version}`}
                        className="w-full h-full object-cover"
                      />
                      <Badge 
                        variant="secondary" 
                        className="absolute bottom-0 left-0 right-0 text-[10px] rounded-none justify-center"
                      >
                        v{img.version}
                      </Badge>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Right Image Selector */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Phiên bản B</label>
              <ScrollArea className="h-20 border rounded-lg p-2">
                <div className="flex gap-2">
                  {images.map((img) => (
                    <button
                      key={`right-${img.id}`}
                      onClick={() => setRightImage(img)}
                      className={cn(
                        'relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all',
                        rightImage?.id === img.id 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-transparent hover:border-muted-foreground/30',
                        leftImage?.id === img.id && 'opacity-40 cursor-not-allowed'
                      )}
                      disabled={leftImage?.id === img.id}
                    >
                      <img
                        src={img.image_url}
                        alt={`v${img.version}`}
                        className="w-full h-full object-cover"
                      />
                      <Badge 
                        variant="secondary" 
                        className="absolute bottom-0 left-0 right-0 text-[10px] rounded-none justify-center"
                      >
                        v{img.version}
                      </Badge>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex justify-center gap-2">
            <Button
              variant={viewMode === 'side-by-side' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('side-by-side')}
            >
              Cạnh nhau
            </Button>
            <Button
              variant={viewMode === 'slider' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('slider')}
            >
              Thanh trượt
            </Button>
          </div>

          {/* Comparison View */}
          {leftImage && rightImage ? (
            viewMode === 'side-by-side' ? (
              <div className="grid grid-cols-2 gap-4">
                {/* Left Image */}
                <CompareCard
                  image={leftImage}
                  label="A"
                  onSelect={onSelectImage}
                  onDownload={handleDownload}
                />
                {/* Right Image */}
                <CompareCard
                  image={rightImage}
                  label="B"
                  onSelect={onSelectImage}
                  onDownload={handleDownload}
                />
              </div>
            ) : (
              /* Slider Mode */
              <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                {/* Right Image (Background) */}
                <img
                  src={rightImage.image_url}
                  alt={`v${rightImage.version}`}
                  className="absolute inset-0 w-full h-full object-contain"
                />
                
                {/* Left Image (Overlay with clip) */}
                <div 
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                >
                  <img
                    src={leftImage.image_url}
                    alt={`v${leftImage.version}`}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                </div>

                {/* Slider Handle */}
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
                  style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                    <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Slider Input (Invisible, for interaction) */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPosition}
                  onChange={handleSliderChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                />

                {/* Version Labels */}
                <Badge className="absolute top-2 left-2">v{leftImage.version}</Badge>
                <Badge variant="secondary" className="absolute top-2 right-2">v{rightImage.version}</Badge>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/50">
              <p className="text-muted-foreground">Chọn 2 phiên bản để so sánh</p>
            </div>
          )}

          {/* Prompt Comparison */}
          {leftImage && rightImage && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Prompt v{leftImage.version}</label>
                <p className="text-xs bg-muted/50 p-2 rounded-md line-clamp-3">
                  {leftImage.prompt || 'Không có prompt'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Prompt v{rightImage.version}</label>
                <p className="text-xs bg-muted/50 p-2 rounded-md line-clamp-3">
                  {rightImage.prompt || 'Không có prompt'}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Sub-component for comparison card
interface CompareCardProps {
  image: ImageVersion;
  label: string;
  onSelect?: (imageId: string, imageUrl: string) => void;
  onDownload: (image: ImageVersion, label: string) => void;
}

function CompareCard({ image, label, onSelect, onDownload }: CompareCardProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{label}</Badge>
          <Badge variant="secondary">v{image.version}</Badge>
          {image.is_selected && (
            <Badge className="gap-1">
              <Check className="w-3 h-3" />
              Đang dùng
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {format(new Date(image.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
        </span>
      </div>
      
      <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted group">
        <img
          src={image.image_url}
          alt={`Version ${image.version}`}
          className="w-full h-full object-contain"
        />
        
        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {!image.is_selected && onSelect && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onSelect(image.id, image.image_url)}
            >
              <Check className="w-4 h-4 mr-1" />
              Chọn
            </Button>
          )}
          <Button
            size="icon"
            variant="secondary"
            onClick={() => window.open(image.image_url, '_blank')}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={() => onDownload(image, label)}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {image.aspect_ratio && (
        <Badge variant="outline" className="text-xs">
          {image.aspect_ratio}
        </Badge>
      )}
    </div>
  );
}
