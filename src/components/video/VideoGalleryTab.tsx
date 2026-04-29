import { useEffect } from 'react';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GalleryHorizontalEnd, Loader2, AlertCircle, CheckCircle2, Trash2, Download, RefreshCw, Video as VideoIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function VideoGalleryTab() {
  const { generations, loading, fetchGenerations, deleteGeneration } = useVideoGeneration();

  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  const handleRefresh = () => fetchGenerations();

  if (loading && generations.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
          <GalleryHorizontalEnd className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Chưa có video nào</h3>
          <p className="text-sm text-muted-foreground mt-1">Bắt đầu từ tab Quick Clip để tạo video đầu tiên.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{generations.length} video</p>
        <Button variant="ghost" size="sm" onClick={handleRefresh} className="gap-1.5 h-8">
          <RefreshCw className="w-3.5 h-3.5" />
          Làm mới
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {generations.map((g) => {
          const statusBadge = (() => {
            switch (g.status) {
              case 'completed':
                return { icon: CheckCircle2, label: 'Hoàn thành', tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' };
              case 'failed':
                return { icon: AlertCircle, label: 'Lỗi', tone: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
              case 'processing':
                return { icon: Loader2, label: 'Đang xử lý', tone: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', spin: true };
              default:
                return { icon: Loader2, label: 'Chờ', tone: 'bg-muted text-muted-foreground' };
            }
          })();
          const Icon = statusBadge.icon;
          return (
            <Card key={g.id} className="overflow-hidden border-border/60 group">
              <div className="aspect-video bg-muted/50 relative overflow-hidden">
                {g.video_url ? (
                  <video src={g.video_url} controls className="w-full h-full object-cover" preload="metadata" poster={g.thumbnail_url} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <VideoIcon className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                )}
                <Badge className={cn('absolute top-2 right-2 h-5 px-1.5 text-[10px] font-medium border-0 gap-1', statusBadge.tone)}>
                  <Icon className={cn('w-2.5 h-2.5', statusBadge.spin && 'animate-spin')} />
                  {statusBadge.label}
                </Badge>
              </div>
              <div className="p-3 space-y-2">
                <p className="text-xs text-foreground line-clamp-2 leading-snug">{g.prompt}</p>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span>{g.aspect_ratio} · {g.duration_seconds}s</span>
                  <span>{formatDistanceToNow(new Date(g.created_at), { addSuffix: true, locale: vi })}</span>
                </div>
                {g.status === 'completed' && g.video_url && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <Button asChild variant="outline" size="sm" className="h-7 text-[10px] gap-1 flex-1">
                      <a href={g.video_url} download target="_blank" rel="noreferrer">
                        <Download className="w-3 h-3" />
                        Tải về
                      </a>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteGeneration(g.id)} className="h-7 w-7 p-0">
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </div>
                )}
                {g.status === 'failed' && g.error_message && (
                  <p className="text-[10px] text-red-600 dark:text-red-400 line-clamp-2">{g.error_message}</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
