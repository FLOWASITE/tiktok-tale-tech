import { motion } from 'framer-motion';
import { Carousel, CAROUSEL_STATUS_CONFIG, CAROUSEL_STYLE_OPTIONS } from '@/types/carousel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, Trash2, Images, Calendar, Facebook, Instagram, Linkedin, Palette, ImageIcon, Building2 } from 'lucide-react';
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

const platformLabels: Record<string, { label: string; icon: typeof Facebook }> = {
  facebook: { label: 'Facebook', icon: Facebook },
  instagram: { label: 'Instagram', icon: Instagram },
  tiktok: { label: 'TikTok', icon: Facebook },
  linkedin: { label: 'LinkedIn', icon: Linkedin },
};

const aiToolLabels: Record<string, string> = {
  ideogram: 'Ideogram',
  midjourney: 'Midjourney',
  dalle: 'DALL·E',
  leonardo: 'Leonardo',
};

const getStatusGlow = (status?: string) => {
  switch (status) {
    case 'published':
      return 'hover:shadow-green-500/20 hover:border-green-500/40';
    case 'review':
      return 'hover:shadow-yellow-500/20 hover:border-yellow-500/40';
    case 'approved':
      return 'hover:shadow-blue-500/20 hover:border-blue-500/40';
    default:
      return 'hover:shadow-primary/20 hover:border-primary/40';
  }
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
  const styleOption = carousel.carousel_style 
    ? CAROUSEL_STYLE_OPTIONS.find(s => s.value === carousel.carousel_style) 
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300 ease-out group",
        "border-border/50 bg-gradient-to-br from-background to-muted/10",
        "hover:shadow-xl hover:-translate-y-1",
        getStatusGlow(carousel.status),
        isSelected && "ring-2 ring-primary border-primary"
      )}>
        {/* Checkbox for selection */}
        {onSelectionChange && (
          <div className={cn(
            "absolute top-2 left-2 xs:top-3 xs:left-3 z-10 transition-opacity",
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => 
                onSelectionChange(carousel.id, checked as boolean)
              }
              onClick={(e) => e.stopPropagation()}
              className="bg-background/90 border-primary/50 data-[state=checked]:bg-primary h-4 w-4 xs:h-5 xs:w-5"
            />
          </div>
        )}

        {/* Glow effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />

        {/* Status indicator line */}
        {carousel.status && (
          <div className={cn(
            "absolute top-0 left-0 right-0 h-0.5",
            carousel.status === 'published' && "bg-gradient-to-r from-green-500 to-green-400",
            carousel.status === 'review' && "bg-gradient-to-r from-yellow-500 to-yellow-400",
            carousel.status === 'approved' && "bg-gradient-to-r from-blue-500 to-blue-400",
            carousel.status === 'draft' && "bg-gradient-to-r from-muted to-muted-foreground/30"
          )} />
        )}

        {/* Image Grid Preview */}
        {imageUrls && imageUrls.length > 0 ? (
          <div className="relative aspect-[4/3] overflow-hidden cursor-pointer rounded-t-lg" onClick={() => onView(carousel)}>
            {imageUrls.length === 1 && (
              <img
                src={imageUrls[0]}
                alt={carousel.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-t-lg"
                loading="lazy"
              />
            )}
            {imageUrls.length === 2 && (
              <div className="grid grid-cols-2 gap-1 h-full">
                {imageUrls.slice(0, 2).map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className={cn(
                      "w-full h-full object-cover transition-transform duration-500 group-hover:scale-105",
                      i === 0 && "rounded-tl-lg",
                      i === 1 && "rounded-tr-lg"
                    )}
                    loading="lazy"
                  />
                ))}
              </div>
            )}
            {imageUrls.length >= 3 && (
              <div className="grid grid-cols-2 gap-1 h-full">
                <img
                  src={imageUrls[0]}
                  alt=""
                  className="w-full h-full object-cover row-span-2 rounded-tl-lg transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  style={{ gridRow: '1 / 3' }}
                />
                <img
                  src={imageUrls[1]}
                  alt=""
                  className="w-full h-full object-cover rounded-tr-lg transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                {imageUrls.length === 3 ? (
                  <img src={imageUrls[2]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                ) : (
                  <div className="relative overflow-hidden">
                    <img src={imageUrls[2]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    {imageUrls.length > 3 && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/30 backdrop-blur-[2px] flex flex-col items-center justify-center">
                        <span className="text-white font-bold text-base leading-none">+{imageUrls.length - 3}</span>
                        <span className="text-white/70 text-[9px] mt-0.5">ảnh</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* Image count badge */}
            {typeof imageCount === 'number' && (
              <Badge className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[10px] border border-white/10">
                <ImageIcon className="w-2.5 h-2.5 mr-1" />
                {imageCount}/{carousel.slide_count}
              </Badge>
            )}
          </div>
        ) : (
          <div
            className="relative aspect-[4/3] bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center cursor-pointer rounded-t-lg"
            onClick={() => onView(carousel)}
          >
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mx-auto mb-2">
                <Images className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <span className="text-[11px] text-muted-foreground/50 font-medium">Chưa có ảnh</span>
            </div>
          </div>
        )}

        <CardHeader className="p-2 xs:p-3 sm:p-3 pb-1.5 xs:pb-2">
          <div className="flex items-start justify-between gap-1.5 xs:gap-2">
            <CardTitle className="text-sm xs:text-base font-semibold line-clamp-2 group-hover:text-primary transition-colors">
              {carousel.title}
            </CardTitle>
            {statusConfig && (
              <Badge 
                variant={statusConfig.variant || 'secondary'} 
                className={cn(
                  "shrink-0 text-[10px] xs:text-xs px-1.5 xs:px-2",
                  carousel.status === 'published' && "bg-green-500/10 text-green-600 border-green-500/30",
                  carousel.status === 'review' && "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                )}
              >
                {statusConfig.label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 xs:gap-1.5 text-[10px] xs:text-xs text-muted-foreground mt-0.5 xs:mt-1">
            <Calendar className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
            {timeAgo}
          </div>
        </CardHeader>

        <CardContent className="p-2 xs:p-3 sm:p-3 pt-0">
          {/* Tags */}
          <div className="flex flex-wrap gap-1 xs:gap-1.5 mb-1.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="text-[10px] xs:text-xs px-1.5 xs:px-2 gap-1">
                    <Facebook className="w-2.5 h-2.5" />
                    {platformLabels[carousel.platform]?.label || carousel.platform}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Nền tảng: {platformLabels[carousel.platform]?.label}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[10px] xs:text-xs px-1.5 xs:px-2 gap-1">
                    <Images className="w-2.5 h-2.5" />
                    {carousel.slide_count}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{carousel.slide_count} slides</TooltipContent>
              </Tooltip>
            </TooltipProvider>


            {/* Carousel Style Badge */}
            {styleOption && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-[10px] xs:text-xs px-1.5 xs:px-2 gap-1 bg-accent/30">
                      <span>{styleOption.icon}</span>
                      {styleOption.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>{styleOption.description}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>


          {/* Brand */}
          {brandName && (
            <div className="flex items-center gap-1.5 mb-1.5">
              {brandLogoUrl ? (
                <img
                  src={brandLogoUrl}
                  alt={brandName}
                  className="w-4 h-4 xs:w-5 xs:h-5 rounded-full object-cover border border-border/50"
                />
              ) : (
                <div className="w-4 h-4 xs:w-5 xs:h-5 rounded-full bg-muted flex items-center justify-center">
                  <Building2 className="w-2.5 h-2.5 text-muted-foreground" />
                </div>
              )}
              <span className="text-[10px] xs:text-xs text-muted-foreground font-medium truncate">
                {brandName}
              </span>
            </div>
          )}

          {/* Creator */}
          <div className="flex items-center gap-1 xs:gap-1.5 mb-2 text-[9px] xs:text-[10px]">
            <CreatorCell profile={creatorProfile} isLoading={isLoadingProfile} />
          </div>

          {/* Actions */}
          <div className="flex gap-1.5 xs:gap-2 transform transition-all duration-300 group-hover:translate-y-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(carousel)}
              className="flex-1 border-border/50 hover:border-primary hover:bg-primary/10 transition-all duration-200 text-xs xs:text-sm h-8 xs:h-9 px-2 xs:px-3"
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              <span>Xem</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border/50 hover:border-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-200 h-8 xs:h-9 w-8 xs:w-9 p-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
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
        </CardContent>
      </Card>
    </motion.div>
  );
}
