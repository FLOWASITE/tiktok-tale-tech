import { Brain, Sparkles, CheckCircle2, TrendingUp, Star, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TopicAILearningBadgeProps {
  isPersonalized: boolean;
  isEnhancing?: boolean;
  learningCount?: number;
  favoritesCount?: number;
  usedCount?: number;
  source?: 'ai' | 'cache' | 'fallback';
  className?: string;
}

export function TopicAILearningBadge({
  isPersonalized,
  isEnhancing = false,
  learningCount = 0,
  favoritesCount = 0,
  usedCount = 0,
  source = 'fallback',
  className,
}: TopicAILearningBadgeProps) {
  const hasLearningData = learningCount > 0 || favoritesCount > 0;

  if (isEnhancing) {
    return (
      <Badge 
        variant="secondary" 
        className={cn(
          'gap-1.5 animate-pulse bg-primary/10 text-primary',
          className
        )}
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        Đang cập nhật từ AI...
      </Badge>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={isPersonalized ? 'default' : 'secondary'}
            className={cn(
              'gap-1.5 cursor-help transition-colors',
              isPersonalized 
                ? 'bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90' 
                : 'bg-muted hover:bg-muted/80',
              className
            )}
          >
            {isPersonalized ? (
              <>
                <Brain className="w-3 h-3" />
                Cá nhân hóa
                <CheckCircle2 className="w-3 h-3" />
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                Gợi ý chung
              </>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[260px] p-3">
          <div className="space-y-2">
            <p className="text-xs font-medium flex items-center gap-1.5">
              {isPersonalized ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  AI đã được cá nhân hóa
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                  Chọn Brand để cá nhân hóa
                </>
              )}
            </p>
            
            {hasLearningData && (
              <div className="space-y-1.5 pt-1 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">
                  AI đang học từ:
                </p>
                {usedCount > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    <span>{usedCount} topics đã sử dụng</span>
                  </div>
                )}
                {favoritesCount > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <Star className="w-3 h-3 text-amber-500" />
                    <span>{favoritesCount} topics yêu thích</span>
                  </div>
                )}
                {learningCount > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <Brain className="w-3 h-3 text-primary" />
                    <span>{learningCount} mẫu học</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="pt-1 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground">
                Nguồn: {source === 'ai' ? '✨ AI mới tạo' : source === 'cache' ? '⚡ Cache' : '📋 Mặc định'}
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
