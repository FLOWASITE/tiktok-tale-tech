import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Film, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useScriptMovies } from '@/hooks/useScriptMovies';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Props {
  scriptId: string;
}

export function ScriptMovieGallery({ scriptId }: Props) {
  const { movies, loading } = useScriptMovies(scriptId);

  if (loading && movies.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
        Đang tải danh sách phim…
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg">
        Chưa có phim nào được ghép. Bấm <span className="font-medium text-foreground">"Ghép thành phim"</span> ở trên để tạo phim đầu tiên.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Film className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Phim đã ghép</h3>
        <Badge variant="outline" className="text-[10px] font-normal">
          {movies.length}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {movies.map((m) => (
          <Card key={m.id} className="p-3 border-border/60">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  {m.status === 'completed' && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                  )}
                  {(m.status === 'processing' || m.status === 'pending') && (
                    <Loader2 className="h-3 w-3 animate-spin text-amber-500 shrink-0" />
                  )}
                  {m.status === 'failed' && (
                    <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
                  )}
                  <span className="text-[11px] font-medium capitalize">
                    {m.status === 'completed'
                      ? 'Hoàn tất'
                      : m.status === 'processing'
                      ? `Đang ghép ${m.progress}%`
                      : m.status === 'pending'
                      ? 'Đang xếp hàng'
                      : 'Thất bại'}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {m.source_clip_ids.length} scene · {m.aspect_ratio} ·{' '}
                  {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: vi })}
                </div>
              </div>
            </div>

            {m.status === 'completed' && m.output_url ? (
              <>
                <video
                  src={m.output_url}
                  controls
                  className="w-full rounded bg-black aspect-[9/16] max-h-72 object-contain"
                  poster={m.thumbnail_url ?? undefined}
                />
                <div className="flex justify-end mt-2">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] gap-1"
                  >
                    <a href={m.output_url} download target="_blank" rel="noreferrer">
                      <Download className="h-3 w-3" />
                      Tải MP4
                    </a>
                  </Button>
                </div>
              </>
            ) : m.status === 'failed' ? (
              <div className="text-[11px] text-destructive bg-destructive/5 border border-destructive/20 rounded p-2">
                {m.error_message ?? 'Ghép thất bại — vui lòng thử lại.'}
              </div>
            ) : (
              <div className="aspect-[9/16] max-h-72 rounded bg-muted/50 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
