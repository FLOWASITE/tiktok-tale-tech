import { motion } from 'framer-motion';
import { Carousel, CAROUSEL_STATUS_CONFIG, CAROUSEL_STYLE_OPTIONS } from '@/types/carousel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, Trash2, Images, Calendar, Facebook, Palette, ImageIcon } from 'lucide-react';
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
  thumbnailUrl?: string;
  imageCount?: number;
}

const platformLabels: Record<string, { label: string; icon: typeof Facebook }> = {
  facebook: { label: 'Facebook', icon: Facebook },
  tiktok: { label: 'TikTok', icon: Facebook },
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
  thumbnailUrl,
  imageCount,
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

        {/* Thumbnail Preview */}
        {thumbnailUrl ? (
          <div className="relative aspect-video bg-muted/20 overflow-hidden cursor-pointer" onClick={() => onView(carousel)}>
            <img
              src={thumbnailUrl}
              alt={carousel.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            {/* Image count badge */}
            {typeof imageCount === 'number' && (
              <Badge className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] border-0">
                <ImageIcon className="w-2.5 h-2.5 mr-1" />
                {imageCount}/{carousel.slide_count}
              </Badge>
            )}
          </div>
        ) : (
          <div 
            className="relative aspect-video bg-muted/10 flex items-center justify-center cursor-pointer"
            onClick={() => onView(carousel)}
          >
            <div className="text-center">
              <Images className="w-8 h-8 text-muted-foreground/30 mx-auto mb-1" />
              <span className="text-[10px] text-muted-foreground/50">Chưa có ảnh</span>
            </div>
          </div>
        )}

        <CardHeader className="p-3 xs:p-4 sm:p-5 pb-2 xs:pb-3">
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

        <CardContent className="p-3 xs:p-4 sm:p-5 pt-0">
          {/* Tags */}
          <div className="flex flex-wrap gap-1 xs:gap-1.5 mb-2 xs:mb-3">
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

          {/* Topic */}
          <p className="text-xs xs:text-sm text-muted-foreground line-clamp-2 mb-2 xs:mb-3">
            {carousel.topic}
          </p>

          {/* Creator */}
          <div className="flex items-center gap-1 xs:gap-1.5 mb-3 text-[9px] xs:text-[10px]">
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
