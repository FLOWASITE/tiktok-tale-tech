import { useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Channel } from '@/types/multichannel';
import { cn } from '@/lib/utils';

interface QuickChannelNavProps {
  channels: Channel[];
  activeChannel: Channel;
  onChannelChange: (channel: Channel) => void;
  className?: string;
}

export function QuickChannelNav({
  channels,
  activeChannel,
  onChannelChange,
  className,
}: QuickChannelNavProps) {
  const currentIndex = channels.indexOf(activeChannel);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < channels.length - 1;

  const goToPrev = useCallback(() => {
    if (canGoPrev) {
      onChannelChange(channels[currentIndex - 1]);
    }
  }, [canGoPrev, channels, currentIndex, onChannelChange]);

  const goToNext = useCallback(() => {
    if (canGoNext) {
      onChannelChange(channels[currentIndex + 1]);
    }
  }, [canGoNext, channels, currentIndex, onChannelChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext]);

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      {/* Previous Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrev}
              disabled={!canGoPrev}
              className="h-8 w-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Kênh trước (←)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Progress Indicator / Mini-map */}
      <div className="flex items-center gap-1.5">
        {channels.map((channel, index) => (
          <button
            key={channel}
            onClick={() => onChannelChange(channel)}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-200',
              index === currentIndex
                ? 'bg-primary w-6'
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            )}
            title={channel}
          />
        ))}
      </div>

      {/* Next Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              disabled={!canGoNext}
              className="h-8 w-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Kênh sau (→)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Keyboard hint */}
      <Badge variant="outline" className="text-[10px] gap-1 ml-2 text-muted-foreground">
        <Keyboard className="w-3 h-3" />
        ← →
      </Badge>
    </div>
  );
}
