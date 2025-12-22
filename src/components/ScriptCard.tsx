import { Script, VIDEO_TYPE_LABELS, CHARACTER_TYPE_LABELS, DURATION_LABELS, STATUS_CONFIG } from '@/types/script';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Trash2, Clock, User, Film } from 'lucide-react';
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

interface ScriptCardProps {
  script: Script;
  onView: (script: Script) => void;
  onDelete: (id: string) => void;
  creatorProfile?: CreatorProfile;
  isLoadingProfile?: boolean;
}

export function ScriptCard({ script, onView, onDelete, creatorProfile, isLoadingProfile }: ScriptCardProps) {
  return (
    <Card className="relative gradient-card border-border/50 hover:border-primary/40 transition-all duration-300 ease-out group overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      <CardHeader className="p-2.5 xs:p-4 pb-2 xs:pb-3">
        <div className="flex items-start justify-between gap-1.5 xs:gap-2">
          <CardTitle className="text-sm xs:text-lg font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {script.title}
          </CardTitle>
          {script.status && (
            <Badge 
              variant={STATUS_CONFIG[script.status]?.variant || 'secondary'} 
              className="shrink-0 text-[8px] xs:text-xs px-1 xs:px-2 py-0 xs:py-0.5"
            >
              {STATUS_CONFIG[script.status]?.label || script.status}
            </Badge>
          )}
        </div>
        <p className="text-[10px] xs:text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(script.created_at), { addSuffix: true, locale: vi })}
        </p>
      </CardHeader>
      <CardContent className="p-2.5 xs:p-4 pt-0 space-y-2.5 xs:space-y-4">
        <div className="flex flex-wrap gap-1 xs:gap-2 text-[9px] xs:text-xs">
          <span className="inline-flex items-center gap-0.5 xs:gap-1 px-1.5 xs:px-2 py-0.5 xs:py-1 rounded-full bg-primary/10 text-primary">
            <Clock className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
            <span className="hidden xs:inline">{DURATION_LABELS[script.duration as keyof typeof DURATION_LABELS]}</span>
            <span className="xs:hidden">{script.duration}s</span>
          </span>
          <span className="inline-flex items-center gap-0.5 xs:gap-1 px-1.5 xs:px-2 py-0.5 xs:py-1 rounded-full bg-secondary/10 text-secondary">
            <Film className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
            <span className="truncate max-w-[60px] xs:max-w-none">
              {VIDEO_TYPE_LABELS[script.video_type as keyof typeof VIDEO_TYPE_LABELS]}
            </span>
          </span>
          <span className="inline-flex items-center gap-0.5 xs:gap-1 px-1.5 xs:px-2 py-0.5 xs:py-1 rounded-full bg-muted text-muted-foreground">
            <User className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
            <span className="hidden xs:inline">
              {CHARACTER_TYPE_LABELS[script.character_type as keyof typeof CHARACTER_TYPE_LABELS]}
            </span>
          </span>
        </div>

        {/* Creator */}
        <div className="flex items-center gap-1 xs:gap-1.5 mb-2 xs:mb-3 text-[9px] xs:text-[10px]">
          <CreatorCell profile={creatorProfile} isLoading={isLoadingProfile} />
        </div>
        
        <div className="flex gap-1.5 xs:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(script)}
            className="flex-1 h-7 xs:h-8 text-[10px] xs:text-sm border-border hover:border-primary hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Eye className="w-3 h-3 xs:w-4 xs:h-4 mr-0.5 xs:mr-1 transition-transform duration-200 group-hover:scale-110" />
            Xem
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 xs:h-8 xs:w-auto xs:px-3 border-border hover:border-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Trash2 className="w-3 h-3 xs:w-4 xs:h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận xóa kịch bản</AlertDialogTitle>
                <AlertDialogDescription>
                  Bạn có chắc chắn muốn xóa kịch bản "{script.title}"? Hành động này không thể hoàn tác.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(script.id)}
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
