import { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ExternalLink, Trash2, ImageIcon, FileArchive, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { GeneratedImage } from '@/hooks/useImageGeneration';
import { CarouselSlide } from '@/types/carousel';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface GeneratedImagesGalleryProps {
  images: GeneratedImage[];
  totalSlides: number;
  slides?: CarouselSlide[];
  carouselTitle?: string;
  onDeleteImage?: (slideNumber: number) => void;
}

export function GeneratedImagesGallery({
  images,
  totalSlides,
  slides,
  carouselTitle,
  onDeleteImage,
}: GeneratedImagesGalleryProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'center' });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [downloadingZip, setDownloadingZip] = useState(false);

  // Sync selectedIndex when user swipes manually
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

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

  const handleDownloadZip = async () => {
    if (images.length === 0) {
      toast.error('Chưa có ảnh nào để tải');
      return;
    }

    setDownloadingZip(true);
    toast.info('Đang đóng gói ảnh...');

    try {
      const zip = new JSZip();
      const folder = zip.folder('carousel-slides');

      for (const image of images) {
        try {
          const response = await fetch(image.imageUrl);
          const blob = await response.blob();
          const ext = blob.type.includes('svg') ? 'svg' : 'png';
          folder?.file(`slide-${image.slideNumber}.${ext}`, blob);
        } catch (err) {
          console.error(`Failed to fetch slide ${image.slideNumber}:`, err);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const fileName = carouselTitle
        ? `carousel-${carouselTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.zip`
        : 'carousel-slides.zip';
      saveAs(zipBlob, fileName);
      toast.success('Đã tải ZIP thành công!');
    } catch (error) {
      console.error('ZIP error:', error);
      toast.error('Không thể tạo file ZIP');
    } finally {
      setDownloadingZip(false);
    }
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
        <div className="flex gap-1.5">
          <Button
            onClick={handleDownloadZip}
            size="sm"
            variant="outline"
            disabled={downloadingZip}
            className="gap-1.5"
          >
            <FileArchive className="w-4 h-4" />
            <span className="hidden xs:inline">{downloadingZip ? 'Đang nén...' : 'Tải ZIP'}</span>
          </Button>
        </div>
      </div>

      {/* Carousel Swipe Preview */}
      {images.length > 0 && (
        <div className="relative">
          <div className="overflow-hidden rounded-xl border border-border" ref={emblaRef}>
            <div className="flex">
              {images.map((image) => (
                <div key={image.slideNumber} className="flex-[0_0_100%] min-w-0 relative">
                  <div className="aspect-square xs:aspect-[4/5] relative bg-muted/20">
                    <img
                      src={image.imageUrl}
                      alt={`Slide ${image.slideNumber}`}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                    {/* Overlay with slide text */}
                    {slides && slides[image.slideNumber - 1] && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 xs:p-4">
                        <p className="text-white text-xs xs:text-sm font-medium line-clamp-2">
                          {slides[image.slideNumber - 1].textContent}
                        </p>
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-black/70 text-white text-[10px] xs:text-xs">
                      Slide {image.slideNumber}/{totalSlides}
                    </Badge>
                    {/* Action buttons */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleOpenInNewTab(image.imageUrl)}
                        className="h-7 w-7 xs:h-8 xs:w-8 bg-black/50 hover:bg-black/70 text-white border-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleDownloadSingle(image)}
                        className="h-7 w-7 xs:h-8 xs:w-8 bg-black/50 hover:bg-black/70 text-white border-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      {onDeleteImage && (
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => onDeleteImage(image.slideNumber)}
                          className="h-7 w-7 xs:h-8 xs:w-8"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <Button
                size="icon"
                variant="secondary"
                onClick={scrollPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 shadow-lg z-10"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onClick={scrollNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 shadow-lg z-10"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.slideNumber}
              onClick={() => scrollTo(index)}
              className={`flex-shrink-0 w-14 h-14 xs:w-16 xs:h-16 rounded-lg overflow-hidden border-2 transition-all ${
                selectedIndex === index
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <img
                src={image.imageUrl}
                alt={`Slide ${image.slideNumber}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}


      {/* Missing slides info */}
      {images.length < totalSlides && (
        <p className="text-xs text-muted-foreground text-center">
          Còn {totalSlides - images.length} slide chưa tạo ảnh
        </p>
      )}
    </div>
  );
}
