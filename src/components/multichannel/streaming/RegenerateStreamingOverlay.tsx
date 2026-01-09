import { useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Channel } from '@/types/multichannel';
import { ChannelIcon, getChannelLabel } from './ChannelIcon';
import { cn } from '@/lib/utils';

interface RegenerateStreamingOverlayProps {
  channel: Channel;
  streamingText: string;
  progress: number;
  message: string;
  isComplete: boolean;
  onCancel: () => void;
  onComplete: () => void;
}

export function RegenerateStreamingOverlay({
  channel,
  streamingText,
  progress,
  message,
  isComplete,
  onCancel,
  onComplete,
}: RegenerateStreamingOverlayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as content streams
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [streamingText]);

  // Auto-close after complete with delay
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, onComplete]);

  const wordCount = streamingText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in-0">
      <Card className="w-full max-w-2xl mx-4 shadow-2xl border-primary/20">
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                channel === 'facebook' && "bg-indigo-500/10",
                channel === 'instagram' && "bg-pink-500/10",
                channel === 'twitter' && "bg-slate-500/10",
                channel === 'linkedin' && "bg-sky-500/10",
                channel === 'youtube' && "bg-red-500/10",
                channel === 'website' && "bg-blue-500/10",
                channel === 'email' && "bg-amber-500/10",
                channel === 'google_maps' && "bg-green-500/10",
                channel === 'zalo_oa' && "bg-blue-500/10",
                channel === 'telegram' && "bg-sky-500/10",
                channel === 'tiktok' && "bg-pink-500/10",
                channel === 'threads' && "bg-slate-500/10",
              )}>
                <ChannelIcon channel={channel} className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {isComplete ? 'Đã tạo lại xong!' : `Đang tạo lại ${getChannelLabel(channel)}...`}
                </h3>
                <p className="text-sm text-muted-foreground">{message}</p>
              </div>
            </div>
            {!isComplete && (
              <Button variant="ghost" size="icon" onClick={onCancel}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{wordCount} từ</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <ScrollArea className="h-[300px] rounded-lg border bg-muted/30 p-4" ref={scrollRef}>
            <div ref={contentRef} className="font-mono text-sm whitespace-pre-wrap leading-relaxed">
              {streamingText}
              {!isComplete && (
                <span className="inline-block w-2 h-4 ml-0.5 bg-primary animate-pulse" />
              )}
            </div>
            {!streamingText && !isComplete && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Đang kết nối...
              </div>
            )}
          </ScrollArea>
        </CardContent>

        <CardFooter className="pt-3 border-t">
          {isComplete ? (
            <Button onClick={onComplete} className="w-full">
              Đóng
            </Button>
          ) : (
            <Button variant="outline" onClick={onCancel} className="w-full">
              Hủy
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
