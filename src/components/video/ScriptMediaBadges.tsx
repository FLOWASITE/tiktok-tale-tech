import { Film, Clapperboard, Loader2, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ScriptMediaStatus } from '@/hooks/useScriptsMediaStatus';
import { cn } from '@/lib/utils';

interface Props {
  status?: ScriptMediaStatus;
  /** Total scenes from script — dùng để hiển thị N/Total */
  expectedScenes?: number;
  className?: string;
  size?: 'sm' | 'xs';
}

/**
 * Hiển thị 1-2 badge trạng thái media của 1 kịch bản:
 *  - Movie completed → "🎞 Đã ghép phim" (emerald)
 *  - Movie processing → "🎞 Đang ghép…" (amber + spinner)
 *  - Clips → "🎬 N scene" / "🎬 N/Total" / "🎬 Đang quay…"
 *
 * Trả về null nếu không có gì để show (giữ layout sạch).
 */
export function ScriptMediaBadges({ status, expectedScenes, className, size = 'sm' }: Props) {
  if (!status) return null;
  const { clips, movies } = status;
  if (clips.total === 0 && movies.total === 0) return null;

  const text = size === 'xs' ? 'text-[9px]' : 'text-[10px]';
  const pad = size === 'xs' ? 'px-1.5 py-0.5' : 'px-1.5 py-1';
  const ic = size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  const tooltipLines: string[] = [];
  if (clips.total > 0) {
    tooltipLines.push(
      `🎬 ${clips.completed}/${expectedScenes ?? clips.total} scene đã quay xong` +
        (clips.processing > 0 ? ` · ${clips.processing} đang xử lý` : ''),
    );
  }
  if (movies.total > 0) {
    if (movies.completed > 0) tooltipLines.push(`🎞 ${movies.completed} phim đã ghép xong`);
    if (movies.processing > 0) tooltipLines.push(`🎞 ${movies.processing} phim đang ghép`);
  }

  // Movie badge (ưu tiên completed > processing)
  let movieBadge: React.ReactNode = null;
  if (movies.completed > 0) {
    movieBadge = (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md font-medium border',
          'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
          text,
          pad,
        )}
      >
        <Film className={ic} />
        {movies.completed > 1 ? `${movies.completed} phim đã ghép` : 'Đã ghép phim'}
      </span>
    );
  } else if (movies.processing > 0) {
    movieBadge = (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md font-medium border',
          'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
          text,
          pad,
        )}
      >
        <Loader2 className={cn(ic, 'animate-spin')} />
        Đang ghép phim
      </span>
    );
  }

  // Clips badge
  let clipsBadge: React.ReactNode = null;
  if (clips.total > 0) {
    const total = expectedScenes ?? clips.total;
    const allDone = clips.completed >= total && total > 0;
    if (clips.processing > 0) {
      clipsBadge = (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-md font-medium border',
            'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
            text,
            pad,
          )}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
          </span>
          <Clapperboard className={ic} />
          Đang quay {clips.completed}/{total}
        </span>
      );
    } else if (allDone) {
      clipsBadge = (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-md font-medium border',
            'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
            text,
            pad,
          )}
        >
          <CheckCircle2 className={ic} />
          {clips.completed} scene
        </span>
      );
    } else {
      clipsBadge = (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-md font-medium border border-border/60 bg-muted/40 text-muted-foreground',
            text,
            pad,
          )}
        >
          <Clapperboard className={ic} />
          {clips.completed}/{total} scene
        </span>
      );
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex items-center gap-1 flex-wrap', className)}>
          {movieBadge}
          {clipsBadge}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {tooltipLines.map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}
