import { useEffect, useMemo, useState } from 'react';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GalleryHorizontalEnd, Loader2, AlertCircle, CheckCircle2, Trash2, Download, RefreshCw, Video as VideoIcon, Clapperboard, Clock, Timer } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PublishVideoMenu } from './PublishVideoMenu';
import { ModelUsedBadge } from '@/components/ui/ModelUsedBadge';
import { LazyVideo } from '@/components/ui/lazy-video';

type AspectFilter = 'all' | '9:16' | '16:9' | '1:1';
type ScriptFilter = 'all' | 'standalone' | string;

const ASPECT_CLASS: Record<string, string> = {
  '9:16': 'aspect-[9/16] max-h-[320px]',
  '1:1': 'aspect-square',
  '16:9': 'aspect-video',
};

export function VideoGalleryTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { generations, loading, fetchGenerations, deleteGeneration } = useVideoGeneration();
  const [aspectFilter, setAspectFilter] = useState<AspectFilter>('all');
  const [scriptFilter, setScriptFilter] = useState<ScriptFilter>('all');
  const [scriptTitles, setScriptTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  useEffect(() => {
    if (!user) return;
    const ids = Array.from(new Set(generations.map((g) => g.script_id).filter(Boolean))) as string[];
    if (ids.length === 0) {
      setScriptTitles({});
      return;
    }
    const missing = ids.filter((id) => !(id in scriptTitles));
    if (missing.length === 0) return;
    supabase
      .from('scripts')
      .select('id, title')
      .in('id', missing)
      .then(({ data }) => {
        if (!data) return;
        setScriptTitles((prev) => {
          const next = { ...prev };
          for (const row of data) next[row.id] = row.title ?? 'Kịch bản';
          return next;
        });
      });
  }, [generations, user, scriptTitles]);

  const scriptOptions = useMemo(() => {
    const map = new Map<string, { id: string; title: string; count: number }>();
    for (const g of generations) {
      if (!g.script_id) continue;
      const existing = map.get(g.script_id);
      if (existing) existing.count += 1;
      else map.set(g.script_id, { id: g.script_id, title: scriptTitles[g.script_id] ?? 'Kịch bản…', count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [generations, scriptTitles]);

  const standaloneCount = useMemo(
    () => generations.filter((g) => !g.script_id).length,
    [generations],
  );

  const filtered = useMemo(() => {
    let list = generations;
    if (scriptFilter === 'standalone') list = list.filter((g) => !g.script_id);
    else if (scriptFilter !== 'all') {
      list = list
        .filter((g) => g.script_id === scriptFilter)
        .sort((a, b) => (a.scene_number ?? 0) - (b.scene_number ?? 0));
    }
    if (aspectFilter !== 'all') list = list.filter((g) => g.aspect_ratio === aspectFilter);
    return list;
  }, [generations, scriptFilter, aspectFilter]);

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
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={scriptFilter} onValueChange={(v) => setScriptFilter(v as ScriptFilter)}>
          <SelectTrigger className="h-8 w-[220px] text-xs">
            <SelectValue placeholder="Lọc theo kịch bản" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả ({generations.length})</SelectItem>
            {standaloneCount > 0 && (
              <SelectItem value="standalone">Quick Clip rời ({standaloneCount})</SelectItem>
            )}
            {scriptOptions.length > 0 && (
              <>
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Kịch bản</div>
                {scriptOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="truncate max-w-[180px] inline-block align-middle">{s.title}</span>
                    <span className="ml-1 text-muted-foreground">({s.count})</span>
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>

        <Select value={aspectFilter} onValueChange={(v) => setAspectFilter(v as AspectFilter)}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Tỉ lệ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi tỉ lệ</SelectItem>
            <SelectItem value="9:16">9:16 (Reels)</SelectItem>
            <SelectItem value="16:9">16:9 (YouTube)</SelectItem>
            <SelectItem value="1:1">1:1 (Square)</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <p className="text-xs text-muted-foreground">{filtered.length}/{generations.length} video</p>
        <Button variant="ghost" size="sm" onClick={handleRefresh} className="gap-1.5 h-8">
          <RefreshCw className="w-3.5 h-3.5" />
          Làm mới
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Không có video phù hợp bộ lọc.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((g) => {
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
            const scriptTitle = g.script_id ? scriptTitles[g.script_id] : null;
            const aspectClass = ASPECT_CLASS[g.aspect_ratio] ?? 'aspect-video';
            const lazyAspect = (g.aspect_ratio === '9:16' || g.aspect_ratio === '1:1') ? g.aspect_ratio : '16:9';

            return (
              <Card key={g.id} className="overflow-hidden border-border/60 group flex flex-col">
                {/* Video preview — aspect-ratio aware */}
                <div className={cn('bg-muted/50 relative overflow-hidden', aspectClass)}>
                  {g.video_url ? (
                    <LazyVideo
                      src={g.video_url}
                      poster={g.thumbnail_url ?? undefined}
                      aspectRatio={lazyAspect as '16:9' | '9:16' | '1:1'}
                      className="w-full h-full"
                      containerClassName="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {g.status === 'processing' || g.status === 'pending' ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Đang render…</span>
                        </div>
                      ) : (
                        <VideoIcon className="w-8 h-8 text-muted-foreground/40" />
                      )}
                    </div>
                  )}
                  <Badge className={cn('absolute top-2 right-2 h-5 px-1.5 text-[10px] font-medium border-0 gap-1', statusBadge.tone)}>
                    <Icon className={cn('w-2.5 h-2.5', statusBadge.spin && 'animate-spin')} />
                    {statusBadge.label}
                  </Badge>
                </div>

                {/* Body */}
                <div className="p-3 space-y-2 flex-1 flex flex-col">
                  {/* Script scene link */}
                  {g.script_id && g.scene_number && (
                    <button
                      onClick={() => navigate('/scripts')}
                      className="inline-flex items-center gap-1 h-5 px-1.5 rounded-md border border-foreground/20 text-foreground/70 text-[10px] hover:bg-muted/50 transition max-w-full self-start"
                      title={scriptTitle ? `Mở kịch bản: ${scriptTitle}` : 'Mở kịch bản'}
                    >
                      <Clapperboard className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">
                        Scene {g.scene_number}
                        {scriptTitle ? ` · ${scriptTitle}` : ''}
                      </span>
                    </button>
                  )}

                  {/* Model badge */}
                  {g.model_used && (
                    <ModelUsedBadge modelUsed={g.model_used} />
                  )}

                  {/* Prompt */}
                  <p className="text-xs text-foreground line-clamp-2 leading-snug">{g.prompt}</p>

                  {/* Meta row */}
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[10px] text-muted-foreground font-mono">
                    <span>{g.aspect_ratio} · {g.duration_seconds}s</span>
                    {g.generation_time_ms && (
                      <span className="inline-flex items-center gap-0.5">
                        <Timer className="w-2.5 h-2.5" />
                        {(g.generation_time_ms / 1000).toFixed(1)}s render
                      </span>
                    )}
                    {g.cost_estimate != null && g.cost_estimate > 0 && (
                      <span className="text-foreground/60">~${g.cost_estimate.toFixed(3)}</span>
                    )}
                    <span className="ml-auto">{formatDistanceToNow(new Date(g.created_at), { addSuffix: true, locale: vi })}</span>
                  </div>

                  {/* Actions */}
                  {g.status === 'completed' && g.video_url && (
                    <div className="flex items-center gap-1.5 pt-1 mt-auto">
                      <Button asChild variant="outline" size="sm" className="h-7 text-[10px] gap-1 flex-1">
                        <a href={g.video_url} download target="_blank" rel="noreferrer">
                          <Download className="w-3 h-3" />
                          Tải về
                        </a>
                      </Button>
                      <PublishVideoMenu
                        videoUrl={g.video_url}
                        aspectRatio={lazyAspect as '9:16' | '16:9' | '1:1'}
                        defaultCaption={g.prompt?.slice(0, 200) ?? ''}
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px]"
                      />
                      <Button variant="ghost" size="sm" onClick={() => deleteGeneration(g.id)} className="h-7 w-7 p-0">
                        <Trash2 className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </div>
                  )}
                  {g.status === 'failed' && g.error_message && (
                    <p className="text-[10px] text-destructive line-clamp-2 mt-auto">{g.error_message}</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
