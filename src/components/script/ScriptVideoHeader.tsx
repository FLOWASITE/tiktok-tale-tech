import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2, Film, CheckCircle2, AlertCircle } from 'lucide-react';
import type { BatchProgress } from '@/hooks/useScriptVideoBatch';

interface Props {
  totalScenes: number;
  renderedScenes: number;
  processingScenes: number;
  failedScenes: number;
  batch: BatchProgress;
  batchRunning: boolean;
  onRenderMissing: () => void;
  onMergeMovie: () => void;
  canMerge: boolean;
  missingCount: number;
}

export function ScriptVideoHeader({
  totalScenes,
  renderedScenes,
  processingScenes,
  failedScenes,
  batch,
  batchRunning,
  onRenderMissing,
  onMergeMovie,
  canMerge,
  missingCount,
}: Props) {
  const pct = totalScenes > 0 ? Math.round((renderedScenes / totalScenes) * 100) : 0;

  return (
    <Card className="p-4 border-border/60 bg-gradient-to-br from-muted/30 to-transparent">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <Film className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Tiến độ render kịch bản</h3>
            <Badge variant="outline" className="text-[10px] font-normal">
              {renderedScenes}/{totalScenes} scene
            </Badge>
          </div>
          <Progress value={pct} className="h-2 mb-2" />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              {renderedScenes} hoàn thành
            </span>
            {processingScenes > 0 && (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                {processingScenes} đang render
              </span>
            )}
            {failedScenes > 0 && (
              <span className="inline-flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3 w-3" />
                {failedScenes} lỗi
              </span>
            )}
            {missingCount > 0 && (
              <span className="text-muted-foreground/80">
                · {missingCount} chưa quay
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={onRenderMissing}
            disabled={batchRunning || missingCount === 0}
            className="gap-1.5"
          >
            {batchRunning ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang queue {batch.done}/{batch.total}…
              </>
            ) : (
              <>
                <Wand2 className="h-3.5 w-3.5" />
                Render {missingCount} scene chưa quay
              </>
            )}
          </Button>
          <Button
            size="sm"
            onClick={onMergeMovie}
            disabled={!canMerge}
            className="gap-1.5"
          >
            <Film className="h-3.5 w-3.5" />
            Ghép thành phim
          </Button>
        </div>
      </div>

      {batch.status === 'aborted' && (
        <div className="mt-3 text-[11px] text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Batch đã dừng do lỗi quota. Đã queue {batch.done}/{batch.total}.
        </div>
      )}
      {batch.errors.length > 0 && batch.status !== 'aborted' && (
        <div className="mt-3 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {batch.errors.length} scene lỗi: scene #{batch.errors[0].sceneNumber} — {batch.errors[0].message.slice(0, 80)}
        </div>
      )}
    </Card>
  );
}
