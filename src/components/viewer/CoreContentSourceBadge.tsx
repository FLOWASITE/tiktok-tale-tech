import { FileText, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CoreContent } from '@/types/coreContent';

interface CoreContentSourceBadgeProps {
  coreContentId: string;
  className?: string;
  onViewSource?: (coreContent: CoreContent) => void;
}

export function CoreContentSourceBadge({ coreContentId, className, onViewSource }: CoreContentSourceBadgeProps) {
  const { data: coreContent, isLoading, error } = useQuery({
    queryKey: ['core-content-source', coreContentId],
    queryFn: async (): Promise<CoreContent | null> => {
      const { data, error } = await supabase
        .from('core_contents')
        .select('*')
        .eq('id', coreContentId)
        .single();
      
      if (error) throw error;
      return data as CoreContent;
    },
    enabled: !!coreContentId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (isLoading) {
    return (
      <Skeleton className="h-5 w-24 rounded-full" />
    );
  }

  if (error || !coreContent) {
    return null;
  }

  // Truncate title to max 20 chars
  const truncatedTitle = coreContent.title.length > 20 
    ? `${coreContent.title.slice(0, 18)}…` 
    : coreContent.title;

  // Format word count
  const wordCountDisplay = coreContent.word_count 
    ? `${coreContent.word_count.toLocaleString('vi-VN')} từ`
    : null;

  const isClickable = !!onViewSource;

  const handleClick = () => {
    if (onViewSource && coreContent) {
      onViewSource(coreContent);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          onClick={handleClick}
          className={cn(
            "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
            "gap-1.5 transition-colors",
            "max-w-[200px]",
            isClickable && "cursor-pointer hover:bg-violet-500/20 hover:border-violet-500/30",
            !isClickable && "cursor-default hover:bg-violet-500/15",
            className
          )}
        >
          <FileText className="w-3 h-3 shrink-0" />
          <span className="truncate text-xs font-medium">
            {truncatedTitle}
          </span>
          {wordCountDisplay && (
            <>
              <span className="text-violet-400/60">•</span>
              <span className="text-xs shrink-0">{wordCountDisplay}</span>
            </>
          )}
          {isClickable && (
            <Eye className="w-3 h-3 shrink-0 ml-0.5 opacity-60" />
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="w-4 h-4 text-violet-500" />
            <span>Nguồn từ Core Content</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p className="font-medium text-foreground">{coreContent.title}</p>
            {wordCountDisplay && (
              <p>Độ dài: {wordCountDisplay}</p>
            )}
            {isClickable && (
              <p className="text-violet-400">Click để xem chi tiết</p>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
