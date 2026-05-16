import { Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyImageCTAProps {
  channelLabel: string;
  onClick: () => void;
  className?: string;
}

/**
 * Prominent CTA shown below a channel mockup when text content exists
 * but no image has been generated yet for that channel.
 */
export function EmptyImageCTA({ channelLabel, onClick, className }: EmptyImageCTAProps) {
  return (
    <div
      className={cn(
        'relative rounded-xl border border-primary/25 overflow-hidden',
        'transition-all duration-300 hover:-translate-y-0.5',
        'hover:shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.35)]',
        className,
      )}
    >
      {/* Soft gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-purple-500/[0.04] to-blue-500/[0.06] pointer-events-none" />
      {/* Shimmer */}
      <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,hsl(var(--primary)/0.05)_50%,transparent_75%)] bg-[length:250%_100%] animate-[shimmer_3s_ease-in-out_infinite] pointer-events-none" />

      <div className="relative flex items-center gap-3 p-3 sm:p-4">
        {/* Icon */}
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>

        {/* Copy */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">
            Bài này chưa có ảnh cho {channelLabel}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
            AI sẽ tự chọn phong cách, tỉ lệ và bố cục tối ưu cho kênh
          </p>
        </div>

        {/* CTA */}
        <Button
          onClick={onClick}
          size="sm"
          aria-label={`Tạo ảnh AI cho kênh ${channelLabel}`}
          className={cn(
            'shrink-0 gap-1.5 font-semibold rounded-lg',
            'bg-gradient-to-r from-primary to-primary/80',
            'hover:from-primary/90 hover:to-primary/70',
            'shadow-[0_0_16px_-4px_hsl(var(--primary)/0.4)]',
          )}
        >
          <Wand2 className="w-4 h-4" />
          <span className="hidden sm:inline">Tạo ảnh AI ngay</span>
          <span className="sm:hidden">Tạo ảnh</span>
        </Button>
      </div>
    </div>
  );
}
