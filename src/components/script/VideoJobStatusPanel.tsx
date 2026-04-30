import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Download,
  Activity,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { VideoGeneration } from '@/types/videoGeneration';
import { ModelUsedBadge } from '@/components/ui/ModelUsedBadge';
import { LazyVideo } from '@/components/ui/lazy-video';

interface Props {
  clips: VideoGeneration[];
  /** Tự ẩn các job hoàn thành cũ hơn N phút (default 10). 0 = luôn hiển thị tất cả completed. */
  recentCompletedWindowMinutes?: number;
}

const fmtTime = (iso?: string) =>
  iso ? formatDistanceToNow(new Date(iso), { addSuffix: true, locale: vi }) : '—';

const statusBadge = (status: VideoGeneration['status']) => {
  switch (status) {
    case 'completed':
      return (
        <Badge className="h-5 text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 border-emerald-500/20">
          <CheckCircle2 className="h-2.5 w-2.5" /> Hoàn tất
        </Badge>
      );
    case 'processing':
      return (
        <Badge className="h-5 text-[10px] gap-1 bg-amber-500/10 text-amber-600 hover:bg-amber-500/15 border-amber-500/20">
          <Loader2 className="h-2.5 w-2.5 animate-spin" /> Đang render
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="h-5 text-[10px] gap-1 bg-muted text-muted-foreground border-border/60">
          <Clock className="h-2.5 w-2.5" /> Đang xếp hàng
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="destructive" className="h-5 text-[10px] gap-1">
          <AlertCircle className="h-2.5 w-2.5" /> Thất bại
        </Badge>
      );
  }
};

export function VideoJobStatusPanel({
  clips,
  recentCompletedWindowMinutes = 10,
}: Props) {
  const visibleJobs = useMemo(() => {
    const cutoff =
      recentCompletedWindowMinutes > 0
        ? Date.now() - recentCompletedWindowMinutes * 60_000
        : 0;
    return clips
      .filter((c) => {
        if (c.status === 'pending' || c.status === 'processing' || c.status === 'failed') {
          return true;
        }
        if (c.status === 'completed') {
          if (recentCompletedWindowMinutes === 0) return true;
          const finishedAt = new Date(c.completed_at ?? c.updated_at).getTime();
          return finishedAt >= cutoff;
        }
        return false;
      })
      .sort((a, b) => {
        // active jobs trên cùng, completed mới nhất kế tiếp
        const order: Record<VideoGeneration['status'], number> = {
          processing: 0,
          pending: 1,
          completed: 2,
          failed: 3,
        };
        const diff = order[a.status] - order[b.status];
        if (diff !== 0) return diff;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [clips, recentCompletedWindowMinutes]);

  if (visibleJobs.length === 0) return null;

  const activeCount = visibleJobs.filter(
    (j) => j.status === 'processing' || j.status === 'pending',
  ).length;

  return (
    <Card className="p-3 border-border/60 bg-card/50">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Trạng thái tạo video</h3>
        {activeCount > 0 ? (
          <Badge variant="outline" className="h-5 text-[10px] font-normal gap-1">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            {activeCount} đang chạy
          </Badge>
        ) : (
          <Badge variant="outline" className="h-5 text-[10px] font-normal">
            {visibleJobs.length} job
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {visibleJobs.map((job) => {
          const sceneLabel =
            job.scene_number != null ? `Scene ${job.scene_number}` : 'Clip';
          const isActive = job.status === 'processing' || job.status === 'pending';
          const progressVal =
            job.status === 'completed'
              ? 100
              : job.status === 'failed'
              ? 100
              : Math.max(5, Math.min(95, job.progress ?? 10));

          return (
            <div
              key={job.id}
              className="rounded-md border border-border/50 bg-background/40 p-2.5"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="text-[11px] font-medium truncate">{sceneLabel}</span>
                  {statusBadge(job.status)}
                  {job.model_used && (
                    <ModelUsedBadge modelUsed={job.model_used} />
                  )}
                  <span className="text-[10px] text-muted-foreground truncate">
                    {fmtTime(job.completed_at ?? job.updated_at)}
                  </span>
                </div>

                {job.status === 'completed' && job.video_url && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px] gap-1"
                    >
                      <a href={job.video_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3 w-3" />
                        Mở
                      </a>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px] gap-1"
                    >
                      <a href={job.video_url} download target="_blank" rel="noreferrer">
                        <Download className="h-3 w-3" />
                        Tải
                      </a>
                    </Button>
                  </div>
                )}
              </div>

              {isActive && (
                <>
                  <Progress value={progressVal} className="h-1.5" />
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {progressVal}% — {job.status === 'pending' ? 'Đang chờ provider nhận task…' : 'Đang xử lý…'}
                  </div>
                </>
              )}

              {job.status === 'failed' && (
                <div className="text-[10px] text-destructive bg-destructive/5 border border-destructive/20 rounded px-2 py-1 mt-1">
                  {job.error_message ?? 'Tạo thất bại — thử lại nhé.'}
                </div>
              )}

              {job.status === 'completed' && job.video_url && (
                <div className="mt-2 rounded overflow-hidden max-h-52">
                  <LazyVideo
                    src={job.video_url}
                    poster={job.thumbnail_url ?? undefined}
                    aspectRatio={
                      (job.aspect_ratio === '9:16' || job.aspect_ratio === '1:1')
                        ? job.aspect_ratio
                        : '16:9'
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
