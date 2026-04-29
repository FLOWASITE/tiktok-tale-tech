import { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Clapperboard, Play, RotateCw, Video as VideoIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { VideoGeneration } from '@/types/videoGeneration';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Props {
  sceneNumber: number;
  clip?: VideoGeneration;
  onShoot: () => void;
  onReshoot?: () => void;
}

/**
 * Strip nhỏ hiển thị status video của một scene + actions.
 * 4 trạng thái: chưa quay / đang xử lý / đã quay / lỗi.
 */
export function SceneVideoStrip({ sceneNumber, clip, onShoot, onReshoot }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);

  // Chưa quay
  if (!clip) {
    return (
      <div className="flex items-center justify-between gap-3 mt-2 px-3 py-2 rounded-lg border border-dashed border-border/60 bg-muted/20">
        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
          <VideoIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Chưa quay scene này</span>
        </div>
        <Button size="sm" variant="outline" onClick={onShoot} className="h-7 gap-1 text-[11px] shrink-0">
          <Clapperboard className="w-3 h-3" />
          Quay scene này
        </Button>
      </div>
    );
  }

  // Đang xử lý
  if (clip.status === 'processing' || clip.status === 'pending') {
    return (
      <div className="flex items-center justify-between gap-3 mt-2 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/5">
        <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 min-w-0">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span className="truncate">
            Đang render… {clip.duration_seconds}s · {clip.aspect_ratio}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {formatDistanceToNow(new Date(clip.created_at), { addSuffix: true, locale: vi })}
        </span>
      </div>
    );
  }

  // Lỗi
  if (clip.status === 'failed') {
    return (
      <div className="flex items-center justify-between gap-3 mt-2 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/5">
        <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-400 min-w-0">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate" title={clip.error_message ?? undefined}>
            Lỗi render{clip.error_message ? `: ${clip.error_message}` : ''}
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={onReshoot ?? onShoot} className="h-7 gap-1 text-[11px] shrink-0">
          <RotateCw className="w-3 h-3" />
          Thử lại
        </Button>
      </div>
    );
  }

  // Đã quay (completed)
  return (
    <>
      <div className="flex items-center gap-3 mt-2 px-2.5 py-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5">
        {/* Thumbnail */}
        <button
          onClick={() => setPreviewOpen(true)}
          className="relative w-12 h-16 rounded-md overflow-hidden bg-muted shrink-0 group"
          title="Xem video"
        >
          {clip.thumbnail_url ? (
            <img src={clip.thumbnail_url} alt={`Scene ${sceneNumber}`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <VideoIcon className="w-4 h-4 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            <Play className="w-4 h-4 text-white fill-white" />
          </div>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              Đã quay
            </span>
            <span className="text-[10px] text-muted-foreground">
              · {clip.duration_seconds}s · {clip.aspect_ratio}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{clip.prompt}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="ghost" onClick={() => setPreviewOpen(true)} className="h-7 px-2 text-[11px] gap-1">
            <Play className="w-3 h-3" />
            Xem
          </Button>
          <Button size="sm" variant="ghost" onClick={onReshoot ?? onShoot} className="h-7 w-7 p-0" title="Quay lại">
            <RotateCw className="w-3 h-3 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Scene {sceneNumber}</DialogTitle>
          </DialogHeader>
          <div className={cn(
            'rounded-lg overflow-hidden bg-black mx-auto',
            clip.aspect_ratio === '9:16' ? 'aspect-[9/16] max-h-[70vh]' : 'aspect-video w-full',
          )}>
            {clip.video_url && (
              <video src={clip.video_url} controls autoPlay className="w-full h-full" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-3">{clip.prompt}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
