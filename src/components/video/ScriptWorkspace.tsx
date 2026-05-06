import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Clapperboard,
  Maximize2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Video as VideoIcon,
  Wand2,
  Film,
} from 'lucide-react';
import { toast } from 'sonner';

import { useScriptToVideo } from '@/contexts/ScriptToVideoContext';
import { useScriptVideoGenerations } from '@/hooks/useScriptVideoGenerations';
import { useScriptVideoBatch, type BatchScene } from '@/hooks/useScriptVideoBatch';
import { useScriptMovieMerge } from '@/hooks/useScriptMovieMerge';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { buildScriptToVideoNavState } from '@/lib/scriptToVideoNav';
import { parseScriptContent } from '@/utils/parsePrompts';
import { ScriptViewer } from '@/components/ScriptViewer';
import { QuickClipTab } from './QuickClipTab';
import type { Script, ScriptPurpose } from '@/types/script';
import { cn } from '@/lib/utils';

interface Props {
  script: Script;
  onBack: () => void;
  onScriptUpdate?: (updated: Script) => void;
}

const parseDur = (s?: string): number | undefined => {
  if (!s) return undefined;
  const m = s.match(/(\d+)/);
  return m ? Math.max(3, Math.min(10, parseInt(m[1], 10))) : undefined;
};

/**
 * Workspace 2-cột cho 1 kịch bản:
 * - Cột trái: storyboard rail (status từng scene + batch render + ghép phim)
 * - Cột phải: QuickClipTab embedded — quay scene đang chọn
 *
 * Hydrate ScriptToVideoContext khi mount, clear khi back.
 */
export function ScriptWorkspace({ script, onBack, onScriptUpdate }: Props) {
  const { currentOrganization } = useOrganizationContext();
  const {
    activeScript,
    activeSceneIndex,
    setActiveScript,
    setActiveSceneIndex,
    completedSceneIds,
    clearScript,
  } = useScriptToVideo();

  const [viewerOpen, setViewerOpen] = useState(false);

  const purpose = script.script_purpose as ScriptPurpose;
  const isAiVideo = purpose === 'ai_video';

  // Hydrate context on mount / when script changes
  useEffect(() => {
    const navState = buildScriptToVideoNavState(script, 0);
    if (navState) {
      setActiveScript(navState.fromScript.script, 0);
    } else {
      // Script không có scene → vẫn set rỗng để các tab khác biết context
      setActiveScript(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script.id]);

  const { bySceneNumber } = useScriptVideoGenerations(isAiVideo ? script.id : null);
  const { progress, running, renderMissingScenes } = useScriptVideoBatch();
  const { mergeMovie, merging } = useScriptMovieMerge();

  const parsedPrompts = useMemo(
    () => parseScriptContent(script.content, purpose),
    [script.content, purpose],
  );

  const scenes = useMemo(
    () =>
      parsedPrompts.map((p) => ({
        sceneNumber: p.promptNumber,
        promptText: (p.rawContent || `${p.motion ?? ''}\n${p.dialogue ?? ''}`).trim(),
        duration: p.duration,
        clip: bySceneNumber.get(p.promptNumber),
      })),
    [parsedPrompts, bySceneNumber],
  );

  const total = scenes.length;
  const rendered = scenes.filter((s) => s.clip?.status === 'completed').length;
  const pct = total > 0 ? Math.round((rendered / total) * 100) : 0;
  const missing = scenes.filter((s) => !s.clip || s.clip.status === 'failed');
  const canMerge = rendered >= 2;

  const handleBack = () => {
    clearScript();
    onBack();
  };

  const handleRenderMissing = () => {
    if (!isAiVideo) return;
    const batch: BatchScene[] = missing.map((s) => ({
      sceneNumber: s.sceneNumber,
      prompt: s.promptText.slice(0, 1500),
      duration: parseDur(s.duration),
      aspect_ratio: '9:16',
    }));
    renderMissingScenes(batch, {
      provider: 'geminigen',
      model: 'geminigen/veo-3.1-fast',
      aspect_ratio: '9:16',
      resolution: '1080p',
      duration: 5,
      script_id: script.id,
    });
  };

  const handleMerge = async () => {
    if (!canMerge) {
      toast.info('Cần ít nhất 2 scene đã render để ghép phim.');
      return;
    }
    const ordered = scenes
      .filter((s) => s.clip?.status === 'completed' && s.clip.video_url)
      .map((s) => ({
        id: s.clip!.id,
        video_url: s.clip!.video_url!,
        scene_number: s.sceneNumber,
      }));
    await mergeMovie(ordered, {
      scriptId: script.id,
      organizationId: currentOrganization?.id,
      aspectRatio: '9:16',
    });
  };

  // Non-AI-video script → fallback đơn giản: chỉ mở viewer
  if (!isAiVideo) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Button>
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Kịch bản loại "{purpose}" không hỗ trợ workspace quay clip. Mở viewer để đọc/chỉnh sửa.
            </p>
            <Button onClick={() => setViewerOpen(true)} size="sm" className="gap-2">
              <Maximize2 className="h-4 w-4" />
              Mở viewer
            </Button>
          </CardContent>
        </Card>
        <ScriptViewer
          script={script}
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          onScriptUpdate={onScriptUpdate}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Workspace header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Danh sách kịch bản
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewerOpen(true)} className="h-8 gap-1.5 text-[11px]">
            <Maximize2 className="h-3.5 w-3.5" />
            Mở viewer fullscreen
          </Button>
        </div>
      </div>

      {/* Title strip */}
      <Card className="border-border/60 bg-gradient-to-br from-muted/30 to-transparent">
        <CardContent className="p-4 space-y-2.5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Clapperboard className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              {script.topic && (
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
                  {script.topic}
                </p>
              )}
              <h2 className="text-base font-semibold text-foreground truncate">{script.title}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-[10px] font-normal">
                  {rendered}/{total} scene đã quay
                </Badge>
                {script.duration && (
                  <span className="text-[11px] text-muted-foreground">· {script.duration}s</span>
                )}
              </div>
            </div>
          </div>
          <Progress value={pct} className="h-1.5" />
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              {running && (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Batch: {progress.completed}/{progress.total}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRenderMissing}
                disabled={running || missing.length === 0}
                className="h-8 gap-1.5 text-[11px]"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Render {missing.length} scene còn thiếu
              </Button>
              <Button
                size="sm"
                onClick={handleMerge}
                disabled={!canMerge || merging}
                className="h-8 gap-1.5 text-[11px]"
              >
                <Film className="h-3.5 w-3.5" />
                {merging ? 'Đang ghép…' : 'Ghép phim'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2-col workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Left: storyboard rail */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1">
            Storyboard
          </div>
          <div className="space-y-1.5 lg:max-h-[calc(100vh-280px)] lg:overflow-y-auto pr-1">
            {scenes.length === 0 && (
              <div className="text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg p-4 text-center">
                Kịch bản chưa có scene nào. Mở viewer để chỉnh sửa nội dung.
              </div>
            )}
            {scenes.map((s, idx) => {
              const isActive = idx === activeSceneIndex;
              const status = s.clip?.status;
              const isDone = status === 'completed' || !!completedSceneIds[s.sceneNumber];
              const isBusy = status === 'processing' || status === 'pending';
              const isFailed = status === 'failed';
              return (
                <button
                  key={s.sceneNumber}
                  type="button"
                  onClick={() => setActiveSceneIndex(idx)}
                  className={cn(
                    'w-full text-left rounded-lg border p-2.5 transition flex items-start gap-2.5',
                    isActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border/50 hover:border-border bg-card/50',
                  )}
                >
                  <div className="w-7 h-7 rounded-md bg-muted/60 flex items-center justify-center shrink-0 text-[11px] font-mono font-semibold">
                    {s.sceneNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-foreground line-clamp-2 leading-snug">
                      {s.promptText || 'Không có mô tả'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                      {isDone ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          <span>Hoàn thành</span>
                        </>
                      ) : isBusy ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                          <span>Đang render</span>
                        </>
                      ) : isFailed ? (
                        <>
                          <AlertCircle className="h-3 w-3 text-destructive" />
                          <span>Lỗi</span>
                        </>
                      ) : (
                        <>
                          <VideoIcon className="h-3 w-3" />
                          <span>Chưa quay</span>
                        </>
                      )}
                      {s.duration && <span>· {s.duration}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: QuickClip embedded */}
        <Card className="border-border/60">
          <CardContent className="p-4 md:p-6">
            {activeScript ? (
              <QuickClipTab embedded />
            ) : (
              <div className="text-center py-10 text-xs text-muted-foreground">
                Đang nạp kịch bản…
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ScriptViewer
        script={script}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        onScriptUpdate={onScriptUpdate}
      />
    </div>
  );
}
