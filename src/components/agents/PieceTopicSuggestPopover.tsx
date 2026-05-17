import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useSuggestPieceTopics,
  type PieceTopicSuggestion,
  type SuggestPieceTopicsInput,
} from '@/hooks/agents/useSuggestPieceTopics';

interface PieceTopicSuggestPopoverProps {
  input: SuggestPieceTopicsInput;
  onPick: (s: PieceTopicSuggestion) => void;
  /** Size of the trigger button. Default 'icon-sm'. */
  variant?: 'icon-sm' | 'icon-xs';
  className?: string;
}

export function PieceTopicSuggestPopover({
  input,
  onPick,
  variant = 'icon-sm',
  className,
}: PieceTopicSuggestPopoverProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<PieceTopicSuggestion[]>([]);
  const mutate = useSuggestPieceTopics();

  const load = () => {
    mutate.mutate(input, {
      onSuccess: (data) => setSuggestions(data.suggestions || []),
      onError: (err) => {
        toast.error(err.message || 'Không lấy được gợi ý');
      },
    });
  };

  const handleOpen = (next: boolean) => {
    setOpen(next);
    if (next && suggestions.length === 0 && !mutate.isPending) {
      load();
    }
  };

  const handlePick = (s: PieceTopicSuggestion) => {
    onPick(s);
    setOpen(false);
    toast.success('Đã cập nhật chủ đề');
  };

  const sizeClass = variant === 'icon-xs' ? 'h-5 w-5 p-0' : 'h-6 w-6 p-0';
  const iconClass = variant === 'icon-xs' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(sizeClass, 'text-muted-foreground hover:text-foreground', className)}
          title="Gợi ý chủ đề khác"
          onClick={(e) => e.stopPropagation()}
        >
          <Sparkles className={iconClass} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-[360px] p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold">Gợi ý chủ đề</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] gap-1"
            onClick={load}
            disabled={mutate.isPending}
          >
            {mutate.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Tạo lại
          </Button>
        </div>

        <div className="max-h-[360px] overflow-y-auto p-2 space-y-1.5">
          {mutate.isPending && suggestions.length === 0 && (
            <>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="p-2 space-y-1.5 rounded-md border border-border/60">
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </>
          )}

          {!mutate.isPending && suggestions.length === 0 && !mutate.isError && (
            <p className="text-[11px] text-muted-foreground px-1 py-3 text-center">
              Đang tải gợi ý…
            </p>
          )}

          {mutate.isError && (
            <p className="text-[11px] text-destructive px-1 py-3 text-center">
              Không lấy được gợi ý. Bấm “Tạo lại”.
            </p>
          )}

          {suggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handlePick(s)}
              className="w-full text-left p-2 rounded-md border border-border/60 hover:border-foreground/30 hover:bg-muted/40 transition-colors space-y-1"
            >
              <p className="text-xs font-medium leading-tight">{s.title}</p>
              {s.hook && (
                <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{s.hook}</p>
              )}
              {s.key_message && (
                <p className="text-[10px] text-muted-foreground/80 italic leading-snug line-clamp-1">
                  → {s.key_message}
                </p>
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
