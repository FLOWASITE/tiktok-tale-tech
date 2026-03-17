import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, Trash2, Image as ImageIcon, Filter, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageLightbox, LightboxImage } from '@/components/ui/ImageLightbox';
import { useCarouselGallery } from '@/hooks/useCarouselGallery';
import { ChannelIcon, getChannelLabel } from '@/components/multichannel/streaming/ChannelIcon';
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
    sourceFilter,
    setSourceFilter,
    channelFilter,
    setChannelFilter,
    carouselOptions,
    channelOptions,
    sourceCounts,
    deleteImage,
  } = useCarouselGallery();

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const lightboxImages: LightboxImage[] = images.map(img => ({
    imageUrl: img.imageUrl,
    channel: img.channel || 'carousel',
    channelLabel: img.source === 'carousel'
      ? `${img.carouselTitle} — Slide ${img.slideNumber}`
      : `${img.carouselTitle} — ${getChannelLabel(img.channel || '')}`,
    aspectRatio: undefined,
  }));

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const handleDownload = useCallback(async (index: number) => {
    const img = images[index];
    if (!img) return;
    const prefix = img.source === 'carousel' ? 'carousel' : (img.channel || 'image');
    try {
      const response = await fetch(img.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prefix}-v${img.version}.png`;
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
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />

        {/* Source filter */}
        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setChannelFilter('all'); setCarouselFilter('all'); }}>
          <SelectTrigger className="w-[200px] h-9 text-sm border-border/50">
            <SelectValue placeholder="Tất cả nguồn" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả nguồn ({sourceCounts.all})</SelectItem>
            <SelectItem value="carousel">Carousel ({sourceCounts.carousel})</SelectItem>
            <SelectItem value="multichannel">Multichannel ({sourceCounts.multichannel})</SelectItem>
          </SelectContent>
        </Select>

        {/* Channel filter — only show when multichannel or all */}
        {sourceFilter !== 'carousel' && channelOptions.length > 0 && (
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-[180px] h-9 text-sm border-border/50">
              <SelectValue placeholder="Tất cả kênh" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả kênh</SelectItem>
              {channelOptions.map(ch => (
                <SelectItem key={ch} value={ch} textValue={getChannelLabel(ch)}>
                  <div className="flex items-center gap-2">
                    <ChannelIcon channel={ch} size="sm" />
                    <span>{getChannelLabel(ch)}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Content filter */}
        {carouselOptions.length > 0 && (
          <Select value={carouselFilter} onValueChange={setCarouselFilter}>
            <SelectTrigger className="w-[220px] h-9 text-sm border-border/50">
              <SelectValue placeholder="Tất cả nội dung" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nội dung</SelectItem>
              {carouselOptions.map(opt => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

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
          <p className="text-sm text-muted-foreground">Tạo nội dung và generate ảnh để xem tại đây.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {images.map((img, index) => (
            <GalleryImageCard
              key={img.id}
              img={img}
              index={index}
              onOpenLightbox={openLightbox}
              onDownload={handleDownload}
              onDelete={deleteImage}
            />
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

// Extracted card component
function GalleryImageCard({
  img,
  index,
  onOpenLightbox,
  onDownload,
  onDelete,
}: {
  img: ReturnType<typeof useCarouselGallery>['images'][number];
  index: number;
  onOpenLightbox: (i: number) => void;
  onDownload: (i: number) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.03, 0.5) }}
    >
      <Card className="group overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-200">
        {/* Thumbnail */}
        <div
          className="relative aspect-square cursor-pointer overflow-hidden bg-muted/30"
          onClick={() => onOpenLightbox(index)}
        >
          <img
            src={img.imageUrl}
            alt={`Image ${index + 1}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-background/90 hover:bg-background"
                onClick={(e) => { e.stopPropagation(); onDownload(index); }}
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
                    <AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(img.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Xóa
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Source badge */}
          {img.source === 'multichannel' && img.channel && (
            <div className="absolute top-1.5 left-1.5">
              <ChannelIcon channel={img.channel} size="sm" />
            </div>
          )}
          {img.source === 'carousel' && (
            <Badge className="absolute top-1.5 left-1.5 text-[10px] h-5 bg-primary/90 text-primary-foreground" variant="default">
              <Layers className="w-3 h-3 mr-0.5" />
              S{img.slideNumber}
            </Badge>
          )}

          {/* Version badge */}
          {img.version > 1 && (
            <Badge className="absolute top-1.5 right-1.5 text-[10px] h-5 bg-background/80 text-foreground border-border/50" variant="outline">
              v{img.version}
            </Badge>
          )}
          {img.isSelected && (
            <Badge className="absolute bottom-1.5 left-1.5 text-[10px] h-5 bg-primary/90 text-primary-foreground">
              Đang dùng
            </Badge>
          )}
        </div>

        {/* Info */}
        <div className="p-2">
          <p className="text-xs font-medium text-foreground truncate">{img.carouselTitle}</p>
          <p className="text-[10px] text-muted-foreground">
            {img.source === 'multichannel' && img.channel ? getChannelLabel(img.channel) + ' · ' : ''}
            {new Date(img.createdAt).toLocaleDateString('vi-VN')}
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
