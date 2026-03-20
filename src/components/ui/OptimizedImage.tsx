import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageOff } from 'lucide-react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Show skeleton while loading */
  skeleton?: boolean;
  /** Skeleton aspect ratio class e.g. "aspect-square" */
  skeletonClassName?: string;
  /** Fade-in duration in ms */
  fadeDuration?: number;
  /** Preload next image URL */
  preloadSrc?: string;
}

export function OptimizedImage({
  src,
  alt,
  className,
  skeleton: showSkeleton = true,
  skeletonClassName,
  fadeDuration = 300,
  preloadSrc,
  style,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reset state when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  // Preload next image
  useEffect(() => {
    if (!preloadSrc) return;
    const img = new Image();
    img.src = preloadSrc;
  }, [preloadSrc]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true);
  }, []);

  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted/50 rounded-lg',
          skeletonClassName,
          className
        )}
        style={style}
      >
        <ImageOff className="w-6 h-6 text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <div className={cn('relative', skeletonClassName)} style={style}>
      {showSkeleton && !isLoaded && (
        <Skeleton className="absolute inset-0 rounded-lg" />
      )}
      <img
        src={src}
        alt={alt}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          className,
          'transition-opacity',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        style={{ transitionDuration: `${fadeDuration}ms` }}
        {...props}
      />
    </div>
  );
}
