import { useState } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LazyVideoProps {
  src: string;
  poster?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  className?: string;
  containerClassName?: string;
}

const ASPECT_CLASS: Record<NonNullable<LazyVideoProps['aspectRatio']>, string> = {
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16]',
  '1:1': 'aspect-square',
};

/**
 * LazyVideo — không auto-load video metadata.
 * Mặc định hiện poster (hoặc gradient + play icon). Click để load + play.
 */
export function LazyVideo({
  src,
  poster,
  aspectRatio = '16:9',
  className,
  containerClassName,
}: LazyVideoProps) {
  const [active, setActive] = useState(false);

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-muted/30',
        ASPECT_CLASS[aspectRatio],
        containerClassName,
      )}
    >
      {active ? (
        <video
          src={src}
          poster={poster}
          controls
          autoPlay
          preload="metadata"
          className={cn('w-full h-full object-contain bg-black', className)}
        />
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActive(true);
          }}
          className="group absolute inset-0 flex items-center justify-center"
          aria-label="Phát video"
        >
          {poster ? (
            <img src={poster} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted/50 to-muted/20" />
          )}
          <span className="absolute inset-0 bg-black/10 group-hover:bg-black/25 transition-colors" />
          <span className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-background/85 backdrop-blur-sm shadow-md ring-1 ring-border/40 group-hover:scale-105 transition-transform">
            <Play className="h-4 w-4 text-foreground translate-x-[1px]" fill="currentColor" />
          </span>
        </button>
      )}
    </div>
  );
}
