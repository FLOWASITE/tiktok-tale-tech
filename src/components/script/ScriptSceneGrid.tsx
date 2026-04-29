import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clapperboard,
  RotateCw,
  Play,
  Video as VideoIcon,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VideoGeneration } from '@/types/videoGeneration';
import type { StoryboardScene } from '@/types/storyboard';
import { VideoGeneratorPanel } from './VideoGeneratorPanel';
import type { Script } from '@/types/script';

export interface SceneGridItem {
  sceneNumber: number;
  promptText: string;
  duration?: string;
  clip?: VideoGeneration;
}

interface Props {
  script: Script;
  scenes: SceneGridItem[];
  onOpenStudio: (sceneIdx: number) => void;
}

export function ScriptSceneGrid({ script, scenes, onOpenStudio }: Props) {
  const [activeScene, setActiveScene] = useState<SceneGridItem | null>(null);

  const closeDialog = () => setActiveScene(null);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {scenes.map((s) => (
          <SceneCard
            key={s.sceneNumber}
            item={s}
            onRender={() => setActiveScene(s)}
            onOpenStudio={() => onOpenStudio(s.sceneNumber - 1)}
          />
        ))}
      </div>

      <Dialog open={!!activeScene} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clapperboard className="h-4 w-4" />
              Render scene #{activeScene?.sceneNumber}
            </DialogTitle>
          </DialogHeader>
          {activeScene && (
            <VideoGeneratorPanel
              script={script}
              scene={
                {
                  sceneNumber: activeScene.sceneNumber,
                  promptText: activeScene.promptText,
                } as StoryboardScene
              }
              onVideoGenerated={() => {
                // Auto-close khi xong; realtime sẽ refresh grid
                setTimeout(closeDialog, 800);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface CardProps {
  item: SceneGridItem;
  onRender: () => void;
  onOpenStudio: () => void;
}

function SceneCard({ item, onRender, onOpenStudio }: CardProps) {
  const { clip, sceneNumber, promptText, duration } = item;
  const status = clip?.status;

  const statusBadge = (() => {
    if (!clip) return { label: 'Chưa quay', cls: 'bg-muted text-muted-foreground' };
    if (status === 'completed')
      return { label: 'Hoàn thành', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' };
    if (status === 'processing' || status === 'pending')
      return { label: 'Đang render', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' };
    if (status === 'failed')
      return { label: 'Lỗi', cls: 'bg-destructive/10 text-destructive' };
    return { label: status ?? '—', cls: 'bg-muted text-muted-foreground' };
  })();

  return (
    <Card className="overflow-hidden border-border/60 hover:border-border transition-colors flex flex-col">
      {/* Preview area */}
      <div className="aspect-video bg-muted/40 relative flex items-center justify-center">
        {clip?.video_url && status === 'completed' ? (
          <video
            src={clip.video_url}
            controls
            className="w-full h-full object-contain bg-black"
            preload="metadata"
          />
        ) : status === 'processing' || status === 'pending' ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-[11px]">Đang render…</span>
          </div>
        ) : status === 'failed' ? (
          <div className="flex flex-col items-center gap-2 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <span className="text-[11px] px-2 text-center line-clamp-2">
              {clip?.error_message?.slice(0, 80) ?? 'Lỗi render'}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <VideoIcon className="h-6 w-6" />
            <span className="text-[11px]">Chưa render</span>
          </div>
        )}

        <Badge
          className={cn(
            'absolute top-2 left-2 text-[10px] font-normal border-0 shadow-sm',
            statusBadge.cls,
          )}
        >
          {status === 'processing' && <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" />}
          {status === 'completed' && <CheckCircle2 className="h-2.5 w-2.5 mr-1" />}
          {statusBadge.label}
        </Badge>
        <Badge variant="secondary" className="absolute top-2 right-2 text-[10px] font-normal">
          #{sceneNumber}
        </Badge>
      </div>

      {/* Body */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
          {promptText || 'Không có mô tả'}
        </p>
        {(duration || clip?.duration_seconds || clip?.aspect_ratio) && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80">
            {(clip?.duration_seconds || duration) && (
              <span>{clip?.duration_seconds ?? duration}s</span>
            )}
            {clip?.aspect_ratio && <span>· {clip.aspect_ratio}</span>}
          </div>
        )}

        <div className="flex gap-1.5 mt-auto pt-2">
          <Button
            size="sm"
            variant={status === 'completed' ? 'outline' : 'default'}
            onClick={onRender}
            disabled={status === 'processing' || status === 'pending'}
            className="flex-1 h-7 text-[11px] gap-1"
          >
            {status === 'completed' ? (
              <>
                <RotateCw className="h-3 w-3" />
                Re-render
              </>
            ) : (
              <>
                <Play className="h-3 w-3" />
                Render
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenStudio}
            className="h-7 text-[11px] gap-1"
            title="Mở trong Video Studio"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
