import { Carousel, CAROUSEL_STATUS_CONFIG } from '@/types/carousel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, Trash2, Images, Calendar } from 'lucide-react';
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

interface CarouselCardProps {
  carousel: Carousel;
  onView: (carousel: Carousel) => void;
  onDelete: (id: string) => void;
  isSelected?: boolean;
  onSelectionChange?: (id: string, selected: boolean) => void;
  creatorProfile?: CreatorProfile;
  isLoadingProfile?: boolean;
}

const platformLabels: Record<string, string> = {
  facebook: 'Facebook',
  tiktok: 'TikTok',
};

const aiToolLabels: Record<string, string> = {
  ideogram: 'Ideogram',
  midjourney: 'Midjourney',
  dalle: 'DALL·E',
  leonardo: 'Leonardo',
};

export function CarouselCard({ carousel, onView, onDelete, isSelected, onSelectionChange, creatorProfile, isLoadingProfile }: CarouselCardProps) {
  const timeAgo = formatDistanceToNow(new Date(carousel.created_at), {
    addSuffix: true,
    locale: vi,
  });

  return (
    <Card className={`relative gradient-card border-border/50 hover:border-primary/40 transition-all duration-300 ease-out group overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 ${isSelected ? 'ring-2 ring-primary border-primary' : ''}`}>
      {/* Checkbox for selection */}
      {onSelectionChange && (
        <div className={`absolute top-2 left-2 xs:top-3 xs:left-3 z-10 transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
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
      <CardHeader className="p-3 xs:p-4 sm:p-6 pb-2 xs:pb-3">
        <div className="flex items-start justify-between gap-1.5 xs:gap-2">
          <CardTitle className="text-sm xs:text-base font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {carousel.title}
          </CardTitle>
          {carousel.status && (
            <Badge variant={CAROUSEL_STATUS_CONFIG[carousel.status]?.variant || 'secondary'} className="shrink-0 text-[10px] xs:text-xs px-1.5 xs:px-2">
              {CAROUSEL_STATUS_CONFIG[carousel.status]?.label || carousel.status}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 xs:gap-1.5 text-[10px] xs:text-xs text-muted-foreground mt-0.5 xs:mt-1">
          <Calendar className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
          {timeAgo}
        </div>
      </CardHeader>
      <CardContent className="p-3 xs:p-4 sm:p-6 pt-0">
        <div className="flex flex-wrap gap-1 xs:gap-1.5 mb-2 xs:mb-3 sm:mb-4">
          <Badge variant="secondary" className="text-[10px] xs:text-xs px-1.5 xs:px-2">
            {platformLabels[carousel.platform]}
          </Badge>
          <Badge variant="outline" className="text-[10px] xs:text-xs px-1.5 xs:px-2">
            <Images className="w-2.5 h-2.5 xs:w-3 xs:h-3 mr-0.5 xs:mr-1" />
            {carousel.slide_count}
          </Badge>
          <Badge variant="outline" className="text-[10px] xs:text-xs bg-primary/10 text-primary border-primary/30 px-1.5 xs:px-2">
            {aiToolLabels[carousel.ai_tool]}
          </Badge>
        </div>

        <p className="text-xs xs:text-sm text-muted-foreground line-clamp-2 mb-2 xs:mb-3">
          {carousel.topic}
        </p>

        {/* Creator */}
        <div className="flex items-center gap-1 xs:gap-1.5 mb-2 xs:mb-3 text-[9px] xs:text-[10px]">
          <CreatorCell profile={creatorProfile} isLoading={isLoadingProfile} />
        </div>

        <div className="flex gap-1.5 xs:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(carousel)}
            className="flex-1 border-border hover:border-primary hover:bg-primary/10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-xs xs:text-sm h-7 xs:h-8 sm:h-9 px-2 xs:px-3"
          >
            <Eye className="w-3 h-3 xs:w-4 xs:h-4 mr-0.5 xs:mr-1 transition-transform duration-200 group-hover:scale-110" />
            <span className="hidden xs:inline">Xem</span>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-border hover:border-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-200 hover:scale-105 active:scale-95 h-7 xs:h-8 sm:h-9 w-7 xs:w-8 sm:w-9 p-0"
              >
                <Trash2 className="w-3 h-3 xs:w-4 xs:h-4" />
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
  );
}
