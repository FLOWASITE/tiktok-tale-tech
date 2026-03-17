import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, Trash2, Image as ImageIcon, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageLightbox, LightboxImage } from '@/components/ui/ImageLightbox';
import { useCarouselGallery, GalleryImage } from '@/hooks/useCarouselGallery';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function CarouselGalleryView() {
  const {
    images,
    allImages,
    loading,
    carouselFilter,
    setCarouselFilter,
    carouselOptions,
    deleteImage,
  } = useCarouselGallery();

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const lightboxImages: LightboxImage[] = images.map(img => ({
    imageUrl: img.imageUrl,
    channel: 'carousel',
    channelLabel: `${img.carouselTitle} — Slide ${img.slideNumber}`,
    aspectRatio: undefined,
  }));

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const handleDownload = useCallback(async (index: number) => {
    const img = images[index];
    if (!img) return;
    try {
      const response = await fetch(img.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carousel-slide-${img.slideNumber}-v${img.version}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(img.imageUrl, '_blank');
    }
  }, [images]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={i} className="overflow-hidden border-border/50">
            <Skeleton className="aspect-square w-full" />
            <div className="p-2">
              <Skeleton className="h-3 w-3/4 mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={carouselFilter} onValueChange={setCarouselFilter}>
          <SelectTrigger className="w-[240px] h-9 text-sm border-border/50">
            <SelectValue placeholder="Tất cả carousel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả carousel ({allImages.length} ảnh)</SelectItem>
            {carouselOptions.map(opt => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-xs">
          {images.length} ảnh
        </Badge>
      </div>

      {images.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Chưa có ảnh nào</h3>
          <p className="text-sm text-muted-foreground">Tạo carousel và generate ảnh để xem tại đây.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {images.map((img, index) => (
            <motion.div
              key={img.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(index * 0.03, 0.5) }}
            >
              <Card className="group overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-200">
                {/* Thumbnail */}
                <div
                  className="relative aspect-square cursor-pointer overflow-hidden bg-muted/30"
                  onClick={() => openLightbox(index)}
                >
                  <img
                    src={img.imageUrl}
                    alt={`Slide ${img.slideNumber}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 bg-background/90 hover:bg-background"
                        onClick={(e) => { e.stopPropagation(); handleDownload(index); }}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 bg-background/90 hover:bg-destructive/90 hover:text-destructive-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xóa ảnh này?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Hành động này không thể hoàn tác.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteImage(img.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Xóa
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  {/* Version badge */}
                  {img.version > 1 && (
                    <Badge className="absolute top-1.5 right-1.5 text-[10px] h-5 bg-background/80 text-foreground border-border/50" variant="outline">
                      v{img.version}
                    </Badge>
                  )}
                  {img.isSelected && (
                    <Badge className="absolute top-1.5 left-1.5 text-[10px] h-5 bg-primary/90 text-primary-foreground">
                      Đang dùng
                    </Badge>
                  )}
                </div>

                {/* Info */}
                <div className="p-2">
                  <p className="text-xs font-medium text-foreground truncate">{img.carouselTitle}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Slide {img.slideNumber} · {new Date(img.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <ImageLightbox
        images={lightboxImages}
        currentIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
        onDownload={handleDownload}
      />
    </div>
  );
}
