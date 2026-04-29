import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LayoutGrid, ListOrdered } from 'lucide-react';
import type { Script, ScriptPurpose } from '@/types/script';
import { parseScriptContent } from '@/utils/parsePrompts';
import { useScriptVideoGenerations } from '@/hooks/useScriptVideoGenerations';
import { useScriptVideoBatch, type BatchScene } from '@/hooks/useScriptVideoBatch';
import { useScriptMovieMerge } from '@/hooks/useScriptMovieMerge';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { ScriptVideoHeader } from './ScriptVideoHeader';
import { ScriptSceneGrid, type SceneGridItem } from './ScriptSceneGrid';
import { ScriptVideoGalleryGrouped } from './ScriptVideoGalleryGrouped';
import { ScriptMovieGallery } from './ScriptMovieGallery';
import { SceneManagerPanel } from './SceneManagerPanel';
import { VideoGeneratorPanel } from './VideoGeneratorPanel';
import { VideoGallery } from './VideoGallery';

interface Props {
  script: Script;
  onSendToVideoStudio: (sceneIdx?: number) => void;
  onScriptUpdate?: (updated: Script) => void;
}

const parseDur = (s?: string): number | undefined => {
  if (!s) return undefined;
  const m = s.match(/(\d+)/);
  return m ? Math.max(3, Math.min(10, parseInt(m[1], 10))) : undefined;
};

export function ScriptVideoTab({ script, onSendToVideoStudio, onScriptUpdate }: Props) {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganizationContext();
  const purpose = script.script_purpose as ScriptPurpose;
  const isAiVideo = purpose === 'ai_video';
  const [view, setView] = useState<'grid' | 'manage'>('grid');

  const { clips, bySceneNumber, loading } = useScriptVideoGenerations(
    isAiVideo ? script.id : null,
  );
  const { progress, running, renderMissingScenes } = useScriptVideoBatch();
  const { mergeMovie, merging } = useScriptMovieMerge();

  // Fallback: kịch bản loại khác chỉ có generator + gallery flat
  if (!isAiVideo) {
    return (
      <div className="space-y-4 pr-2 xs:pr-4">
        <VideoGeneratorPanel script={script} />
        <VideoGallery scriptId={script.id} />
      </div>
    );
  }

  const parsedPrompts = parseScriptContent(script.content, purpose);

  const scenes: SceneGridItem[] = useMemo(
    () =>
      parsedPrompts.map((p) => ({
        sceneNumber: p.promptNumber,
        promptText: (p.rawContent || `${p.motion ?? ''}\n${p.dialogue ?? ''}`).trim(),
        duration: p.duration,
        clip: bySceneNumber.get(p.promptNumber),
      })),
    [parsedPrompts, bySceneNumber],
  );

  const totalScenes = scenes.length;
  const renderedScenes = scenes.filter((s) => s.clip?.status === 'completed').length;
  const processingScenes = scenes.filter(
    (s) => s.clip?.status === 'processing' || s.clip?.status === 'pending',
  ).length;
  const failedScenes = scenes.filter((s) => s.clip?.status === 'failed').length;
  const missingScenes = scenes.filter(
    (s) => !s.clip || s.clip.status === 'failed',
  );
  const canMerge = renderedScenes >= 2;

  const handleRenderMissing = () => {
    const batch: BatchScene[] = missingScenes.map((s) => ({
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
    // Lấy clips đã hoàn thành theo đúng thứ tự scene
    const orderedClips = scenes
      .filter((s) => s.clip?.status === 'completed' && s.clip.video_url)
      .map((s) => ({
        id: s.clip!.id,
        video_url: s.clip!.video_url!,
        scene_number: s.sceneNumber,
      }));

    await mergeMovie(orderedClips, {
      scriptId: script.id,
      organizationId: currentOrganization?.id,
      aspectRatio: '9:16',
    });
  };

  return (
    <div className="space-y-4 pr-2 xs:pr-4">
      <ScriptVideoHeader
        totalScenes={totalScenes}
        renderedScenes={renderedScenes}
        processingScenes={processingScenes}
        failedScenes={failedScenes}
        batch={progress}
        batchRunning={running}
        onRenderMissing={handleRenderMissing}
        onMergeMovie={handleMerge}
        canMerge={canMerge}
        missingCount={missingScenes.length}
      />

      {totalScenes > 0 || view === 'manage' ? (
        <Tabs value={view} onValueChange={(v) => setView(v as 'grid' | 'manage')}>
          <TabsList className="h-8 mb-3">
            <TabsTrigger value="grid" className="text-[11px] gap-1.5 h-6">
              <LayoutGrid className="h-3 w-3" />
              Lưới scene
            </TabsTrigger>
            <TabsTrigger value="manage" className="text-[11px] gap-1.5 h-6">
              <ListOrdered className="h-3 w-3" />
              Quản lý &amp; sắp xếp
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="mt-0">
            {totalScenes > 0 ? (
              <ScriptSceneGrid
                script={script}
                scenes={scenes}
                onOpenStudio={(idx) => onSendToVideoStudio(idx)}
              />
            ) : (
              <div className="text-center py-10 text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg">
                Kịch bản chưa có scene nào. Chuyển sang tab "Quản lý" để thêm scene đầu tiên.
              </div>
            )}
          </TabsContent>

          <TabsContent value="manage" className="mt-0">
            <SceneManagerPanel
              script={script}
              bySceneNumber={bySceneNumber}
              onScriptUpdate={onScriptUpdate}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-center py-10 text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg">
          Kịch bản chưa có scene nào.{' '}
          <button
            type="button"
            onClick={() => setView('manage')}
            className="text-primary hover:underline"
          >
            Thêm scene đầu tiên
          </button>
        </div>
      )}

      <Separator className="my-4" />

      <ScriptVideoGalleryGrouped scriptId={script.id} clips={clips} loading={loading} />
    </div>
  );
}
