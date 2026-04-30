import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  AlertCircle,
  Clapperboard,
  RotateCw,
  Play,
  Video as VideoIcon,
  ExternalLink,
  MoreHorizontal,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VideoGeneration } from '@/types/videoGeneration';
import type { StoryboardScene } from '@/types/storyboard';
import { LazyVideo } from '@/components/ui/lazy-video';
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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

  const statusMeta = (() => {
    if (!clip) return { label: 'Chưa quay', dot: 'bg-muted-foreground/40' };
    if (status === 'completed') return { label: 'Hoàn thành', dot: 'bg-emerald-500' };
    if (status === 'processing' || status === 'pending')
      return { label: 'Đang render', dot: 'bg-amber-500 animate-pulse' };
    if (status === 'failed') return { label: 'Lỗi', dot: 'bg-destructive' };
    return { label: status ?? '—', dot: 'bg-muted-foreground/40' };
  })();

  const aspectRatio = (clip?.aspect_ratio === '9:16' || clip?.aspect_ratio === '1:1')
    ? clip.aspect_ratio
    : '16:9';

  const isCompleted = status === 'completed' && clip?.video_url;
  const isBusy = status === 'processing' || status === 'pending';

  return (
    <Card className="overflow-hidden border-border/50 hover:border-border hover:shadow-sm transition-all flex flex-col">
      {/* Preview */}
      <div className="relative">
        {isCompleted ? (
          <LazyVideo
            src={clip!.video_url!}
            aspectRatio={aspectRatio as '16:9' | '9:16' | '1:1'}
          />
        ) : (
          <div className="aspect-video bg-muted/30 flex items-center justify-center">
            {isBusy ? (
              <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-[10px]">Đang render…</span>
              </div>
            ) : status === 'failed' ? (
              <div className="flex flex-col items-center gap-1.5 text-destructive px-3">
                <AlertCircle className="h-5 w-5" />
                <span className="text-[10px] text-center line-clamp-2">
                  {clip?.error_message?.slice(0, 80) ?? 'Lỗi render'}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-muted-foreground/60">
                <VideoIcon className="h-5 w-5" />
                <span className="text-[10px]">Chưa render</span>
              </div>
            )}
          </div>
        )}

        <Badge
          variant="secondary"
          className="absolute top-2 left-2 text-[10px] font-medium h-5 px-1.5 bg-background/85 backdrop-blur-sm border-0 shadow-sm"
        >
          #{sceneNumber}
        </Badge>
      </div>

      {/* Body */}
      <div className="p-2.5 flex-1 flex flex-col gap-1.5">
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
          {promptText || 'Không có mô tả'}
        </p>

        {/* Status + meta inline */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusMeta.dot)} />
          <span>{statusMeta.label}</span>
          {(clip?.duration_seconds || duration) && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span>{clip?.duration_seconds ?? duration}s</span>
            </>
          )}
          {clip?.aspect_ratio && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span>{clip.aspect_ratio}</span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 mt-auto pt-1.5">
          <Button
            size="sm"
            variant={isCompleted ? 'outline' : 'default'}
            onClick={onRender}
            disabled={isBusy}
            className="flex-1 h-7 text-[11px] gap-1"
          >
            {isCompleted ? (
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground/70 hover:text-foreground"
                title="Thêm hành động"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onOpenStudio} className="text-xs gap-2">
                <ExternalLink className="h-3.5 w-3.5" />
                Mở Video Studio
              </DropdownMenuItem>
              {isCompleted && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="text-xs gap-2">
                    <a href={clip!.video_url!} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Mở video
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-xs gap-2">
                    <a href={clip!.video_url!} download>
                      <Download className="h-3.5 w-3.5" />
                      Tải về
                    </a>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
