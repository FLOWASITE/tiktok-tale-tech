import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2, ExternalLink, Download, Layers, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { VideoGeneration } from '@/types/videoGeneration';
import { VideoGallery } from './VideoGallery';

interface Props {
  scriptId: string;
  clips: VideoGeneration[];
  loading: boolean;
}

export function ScriptVideoGalleryGrouped({ scriptId, clips, loading }: Props) {
  const [view, setView] = useState<'scene' | 'time'>('scene');

  const grouped = useMemo(() => {
    const map = new Map<number, VideoGeneration[]>();
    for (const c of clips) {
      const k = c.scene_number ?? 0;
      const list = map.get(k) ?? [];
      list.push(c);
      map.set(k, list);
    }
    // Sort versions desc by created_at
    for (const list of map.values()) {
      list.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [clips]);

  return (
    <Card className="p-3 border-border/60">
      <Tabs value={view} onValueChange={(v) => setView(v as 'scene' | 'time')}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-muted-foreground" />
            Thư viện video
          </h3>
          <TabsList className="h-7">
            <TabsTrigger value="scene" className="text-[11px] px-2.5 h-6">
              Theo scene
            </TabsTrigger>
            <TabsTrigger value="time" className="text-[11px] px-2.5 h-6">
              Theo thời gian
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="scene" className="mt-0">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-xs">Đang tải…</span>
            </div>
          ) : grouped.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Chưa có video nào cho kịch bản này.
            </p>
          ) : (
            <Accordion type="multiple" className="space-y-1">
              {grouped.map(([sceneNum, versions]) => (
                <AccordionItem
                  key={sceneNum}
                  value={`scene-${sceneNum}`}
                  className="border border-border/50 rounded-md px-3"
                >
                  <AccordionTrigger className="hover:no-underline py-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        Scene #{sceneNum || '—'}
                      </Badge>
                      <span className="text-muted-foreground">
                        {versions.length} version{versions.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {versions.map((v, idx) => (
                        <VersionCard key={v.id} clip={v} isLatest={idx === 0} />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsContent>

        <TabsContent value="time" className="mt-0">
          <VideoGallery scriptId={scriptId} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function VersionCard({ clip, isLatest }: { clip: VideoGeneration; isLatest: boolean }) {
  const created = formatDistanceToNow(new Date(clip.created_at), {
    addSuffix: true,
    locale: vi,
  });
  return (
    <div className="border border-border/40 rounded-md overflow-hidden bg-muted/20">
      {clip.video_url && clip.status === 'completed' ? (
        <video
          src={clip.video_url}
          controls
          preload="metadata"
          className="w-full aspect-video bg-black object-contain"
        />
      ) : (
        <div className="w-full aspect-video flex items-center justify-center text-[10px] text-muted-foreground">
          {clip.status === 'processing' || clip.status === 'pending' ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Đang render
            </span>
          ) : clip.status === 'failed' ? (
            <span className="text-destructive">Lỗi</span>
          ) : (
            'Chưa có video'
          )}
        </div>
      )}
      <div className="p-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {isLatest && (
            <Badge className="text-[9px] h-4 px-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">
              Mới nhất
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1 truncate">
            <Clock className="h-2.5 w-2.5" />
            {created}
          </span>
        </div>
        {clip.video_url && (
          <div className="flex items-center gap-0.5 shrink-0">
            <Button asChild size="sm" variant="ghost" className="h-6 w-6 p-0">
              <a href={clip.video_url} target="_blank" rel="noopener noreferrer" title="Mở">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-6 w-6 p-0">
              <a href={clip.video_url} download title="Tải về">
                <Download className="h-3 w-3" />
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
