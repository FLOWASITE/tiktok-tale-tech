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

interface CarouselCardProps {
  carousel: Carousel;
  onView: (carousel: Carousel) => void;
  onDelete: (id: string) => void;
  isSelected?: boolean;
  onSelectionChange?: (id: string, selected: boolean) => void;
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

export function CarouselCard({ carousel, onView, onDelete, isSelected, onSelectionChange }: CarouselCardProps) {
  const timeAgo = formatDistanceToNow(new Date(carousel.created_at), {
    addSuffix: true,
    locale: vi,
  });

  return (
    <Card className={`relative gradient-card border-border/50 hover:border-primary/40 transition-all duration-300 ease-out group overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 ${isSelected ? 'ring-2 ring-primary border-primary' : ''}`}>
      {/* Checkbox for selection */}
      {onSelectionChange && (
        <div className={`absolute top-3 left-3 z-10 transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => 
              onSelectionChange(carousel.id, checked as boolean)
            }
            onClick={(e) => e.stopPropagation()}
            className="bg-background/90 border-primary/50 data-[state=checked]:bg-primary"
          />
        </div>
      )}
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {carousel.title}
          </CardTitle>
          {carousel.status && (
            <Badge variant={CAROUSEL_STATUS_CONFIG[carousel.status]?.variant || 'secondary'} className="shrink-0">
              {CAROUSEL_STATUS_CONFIG[carousel.status]?.label || carousel.status}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
          <Calendar className="w-3 h-3" />
          {timeAgo}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Badge variant="secondary" className="text-xs">
            {platformLabels[carousel.platform]}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Images className="w-3 h-3 mr-1" />
            {carousel.slide_count} slides
          </Badge>
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
            {aiToolLabels[carousel.ai_tool]}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {carousel.topic}
        </p>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(carousel)}
            className="flex-1 border-border hover:border-primary hover:bg-primary/10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Eye className="w-4 h-4 mr-1 transition-transform duration-200 group-hover:scale-110" />
            Xem
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-border hover:border-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-200 hover:scale-105 active:scale-95"
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
      </CardContent>
    </Card>
  );
}
