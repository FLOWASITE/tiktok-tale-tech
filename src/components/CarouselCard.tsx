import { motion } from 'framer-motion';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Carousel, CAROUSEL_STATUS_CONFIG } from '@/types/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, Trash2, Images, Facebook, Instagram, Linkedin, ImageIcon, Building2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
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
import { CreatorCell } from '@/components/CreatorCell';
import type { CreatorProfile } from '@/hooks/useCreatorProfiles';
import { cn } from '@/lib/utils';

interface CarouselCardProps {
  carousel: Carousel;
  onView: (carousel: Carousel) => void;
  onDelete: (id: string) => void;
  isSelected?: boolean;
  onSelectionChange?: (id: string, selected: boolean) => void;
  creatorProfile?: CreatorProfile;
  isLoadingProfile?: boolean;
  index?: number;
  imageUrls?: string[];
  imageCount?: number;
  brandName?: string;
  brandLogoUrl?: string | null;
}

const PlatformIcon = ({ platform }: { platform: string }) => {
  const icons: Record<string, typeof Facebook> = {
    facebook: Facebook,
    instagram: Instagram,
    linkedin: Linkedin,
    tiktok: Facebook,
  };
  const Icon = icons[platform] || Facebook;
  return <Icon className="w-3 h-3 text-muted-foreground" />;
};

const statusColors: Record<string, string> = {
  published: 'bg-emerald-500/80 text-white',
  review: 'bg-amber-500/80 text-white',
  approved: 'bg-sky-500/80 text-white',
  draft: 'bg-foreground/60 text-background',
};

export function CarouselCard({
  carousel,
  onView,
  onDelete,
  isSelected,
  onSelectionChange,
  creatorProfile,
  isLoadingProfile,
  index = 0,
  imageUrls,
  imageCount,
  brandName,
  brandLogoUrl,
}: CarouselCardProps) {
  const timeAgo = formatDistanceToNow(new Date(carousel.created_at), {
    addSuffix: true,
    locale: vi,
  });

  const statusConfig = carousel.status ? CAROUSEL_STATUS_CONFIG[carousel.status] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: 'easeOut' }}
    >
      <Card className={cn(
        "relative overflow-hidden rounded-xl transition-all duration-300 ease-out group",
        "border-border/40 bg-card",
        "hover:shadow-lg hover:shadow-foreground/5 hover:-translate-y-0.5",
        isSelected && "ring-2 ring-primary border-primary"
      )}>
        {/* Checkbox */}
        {onSelectionChange && (
          <div className={cn(
            "absolute top-3 left-3 z-20 transition-opacity duration-200",
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelectionChange(carousel.id, checked as boolean)}
              onClick={(e) => e.stopPropagation()}
              className="bg-background/80 backdrop-blur-sm border-border data-[state=checked]:bg-primary h-5 w-5 shadow-sm"
            />
          </div>
        )}

        {/* Image Grid */}
        <div className="relative aspect-[4/3] overflow-hidden cursor-pointer" onClick={() => onView(carousel)}>
          {imageUrls && imageUrls.length > 0 ? (
            <>
              {imageUrls.length === 1 && (
                <OptimizedImage
                  src={imageUrls[0]}
                  alt={carousel.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  skeletonClassName="w-full h-full"
                  preloadSrc={imageUrls[1]}
                />
              )}
              {imageUrls.length === 2 && (
                <div className="grid grid-cols-2 gap-0.5 h-full">
                  {imageUrls.slice(0, 2).map((url, i) => (
                    <OptimizedImage
                      key={i}
                      src={url}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      skeletonClassName="w-full h-full"
                    />
                  ))}
                </div>
              )}
              {imageUrls.length >= 3 && (
                <div className="grid grid-cols-2 gap-0.5 h-full">
                  <OptimizedImage
                    src={imageUrls[0]}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    skeletonClassName="w-full h-full"
                    style={{ gridRow: '1 / 3' }}
                    preloadSrc={imageUrls[1]}
                  />
                  <OptimizedImage
                    src={imageUrls[1]}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    skeletonClassName="w-full h-full"
                    preloadSrc={imageUrls[2]}
                  />
                  {imageUrls.length === 3 ? (
                    <OptimizedImage src={imageUrls[2]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" skeletonClassName="w-full h-full" />
                  ) : (
                    <div className="relative overflow-hidden">
                      <OptimizedImage src={imageUrls[2]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" skeletonClassName="w-full h-full" />
                      {imageUrls.length > 3 && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">+{imageUrls.length - 3}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-muted/30 flex items-center justify-center">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-1.5">
                  <Images className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <span className="text-[11px] text-muted-foreground/40">Chưa có ảnh</span>
              </div>
            </div>
          )}

          {/* Overlays on image */}
          {/* Status pill — top right */}
          {statusConfig && (
            <div className="absolute top-2.5 right-2.5 z-10">
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-md shadow-sm",
                statusColors[carousel.status] || 'bg-foreground/60 text-background'
              )}>
                {statusConfig.label}
              </span>
            </div>
          )}

          {/* Image count — bottom left */}
          {typeof imageCount === 'number' && (
            <div className="absolute bottom-2.5 left-2.5 z-10">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/40 backdrop-blur-md text-white/90">
                <ImageIcon className="w-2.5 h-2.5" />
                {imageCount}/{carousel.slide_count}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="p-4">
          {/* Platform + Brand line */}
          <div className="flex items-center gap-2 mb-2">
            <PlatformIcon platform={carousel.platform} />
            {brandName && (
              <>
                <span className="w-px h-3 bg-border" />
                <div className="flex items-center gap-1.5 min-w-0">
                  {brandLogoUrl ? (
                    <img
                      src={brandLogoUrl}
                      alt={brandName}
                      className="w-4 h-4 rounded-full object-cover border border-border/50"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Building2 className="w-2.5 h-2.5 text-muted-foreground" />
                    </div>
                  )}
                  <span className="text-[11px] text-muted-foreground truncate">{brandName}</span>
                </div>
              </>
            )}
          </div>

          {/* Title */}
          <h3
            className="text-[15px] font-medium leading-snug tracking-tight line-clamp-2 cursor-pointer hover:text-primary transition-colors"
            onClick={() => onView(carousel)}
          >
            {carousel.title}
          </h3>

          {/* Caption */}
          {carousel.caption_suggestion && (
            <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2 mt-1.5">
              {carousel.caption_suggestion}
            </p>
          )}

          {/* Time */}
          <p className="text-[11px] text-muted-foreground/60 mt-1">{timeAgo}</p>

          {/* Bottom row: Creator + Actions */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
            <CreatorCell profile={creatorProfile} isLoading={isLoadingProfile} />

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onView(carousel)}
                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
              >
                <Eye className="w-4 h-4" />
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xác nhận xóa carousel</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bạn có chắc chắn muốn xóa carousel "{carousel.title}"? Hành động này không thể hoàn tác.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(carousel.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Xóa
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
