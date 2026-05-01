import { useState, useEffect, useMemo } from 'react';
import { Film, Loader2, Play, Music4, Mic, Type, Sparkles, X, AlertTriangle, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { useAudioStudio } from '@/hooks/useAudioStudio';
import { useVideoRender } from '@/hooks/useVideoRender';
import { useScriptToVideo } from '@/contexts/ScriptToVideoContext';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { PublishVideoMenu } from './PublishVideoMenu';
import { VideoCompletionWizard } from './VideoCompletionWizard';
import { MultiCharacterPicker } from './MultiCharacterPicker';
import { CharacterVoicePreview } from './CharacterVoicePreview';
import { type CharacterProfile } from '@/hooks/useCharacterProfiles';

interface Props {
  onJumpToTab?: (tab: 'quick' | 'storyboard' | 'gallery') => void;
}

export function StoryboardVideoTab({ onJumpToTab }: Props = {}) {
  const { generations, fetchGenerations, generateVideo, generating } = useVideoGeneration();
  const { assets, fetchAssets } = useAudioStudio();
  const { jobs, submitting, submitRender } = useVideoRender();
  const { activeScript } = useScriptToVideo();

  const [selectedClips, setSelectedClips] = useState<string[]>([]);
  const [voiceoverId, setVoiceoverId] = useState<string>('none');
  const [bgmId, setBgmId] = useState<string>('none');
  const [bgmVolume, setBgmVolume] = useState(0.2);
  const [subtitleId, setSubtitleId] = useState<string>('none');
  const [burnSubs, setBurnSubs] = useState(true);
  const [aspect, setAspect] = useState<'9:16' | '16:9' | '1:1' | '2:3' | '4:5'>('9:16');
  const [showAllClips, setShowAllClips] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number; currentScene?: number }>({ done: 0, total: 0 });
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>(
    activeScript?.characterProfileIds ?? (activeScript?.characterProfileId ? [activeScript.characterProfileId] : [])
  );
  const [selectedCharacters, setSelectedCharacters] = useState<CharacterProfile[]>([]);

  useEffect(() => { fetchGenerations(); fetchAssets(); }, [fetchGenerations, fetchAssets]);

  // Auto-sync aspect from script preset (e.g. Pinterest 2:3, FB Reels 9:16, IG Portrait 4:5)
  useEffect(() => {
    if (activeScript?.aspectRatio) setAspect(activeScript.aspectRatio);
  }, [activeScript?.aspectRatio]);

  const allCompletedClips = generations.filter((g) => g.status === 'completed' && g.video_url);

  // Filter theo activeScript trừ khi user toggle "Hiện tất cả"
  const completedClips = useMemo(() => {
    if (!activeScript || showAllClips) return allCompletedClips;
    return allCompletedClips
      .filter((g) => g.script_id === activeScript.id)
      .sort((a, b) => (a.scene_number ?? 0) - (b.scene_number ?? 0));
  }, [allCompletedClips, activeScript, showAllClips]);

  const voiceovers = assets.filter((a) => a.asset_type === 'voiceover' && a.audio_url);
  const bgms = assets.filter((a) => a.asset_type === 'music' && a.audio_url);
  const subs = assets.filter((a) => a.asset_type === 'subtitle' && a.srt_content);

  // Auto pre-select theo thứ tự scene khi vừa vào với activeScript
  useEffect(() => {
    if (!activeScript || showAllClips) return;
    if (selectedClips.length > 0) return; // user đã thao tác — không ghi đè
    const ids = allCompletedClips
      .filter((g) => g.script_id === activeScript.id)
      .sort((a, b) => (a.scene_number ?? 0) - (b.scene_number ?? 0))
      .map((g) => g.id);
    if (ids.length > 0) setSelectedClips(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScript?.id, allCompletedClips.length, showAllClips]);

  const totalScenes = activeScript?.scenes.length ?? 0;
  const scenesWithClips = activeScript
    ? new Set(allCompletedClips.filter((g) => g.script_id === activeScript.id).map((g) => g.scene_number).filter(Boolean))
    : null;
  const missingScenes = activeScript ? totalScenes - (scenesWithClips?.size ?? 0) : 0;

  const toggleClip = (id: string) => {
    setSelectedClips((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const moveClip = (id: string, dir: -1 | 1) => {
    setSelectedClips((prev) => {
      const i = prev.indexOf(id); if (i === -1) return prev;
      const j = i + dir; if (j < 0 || j >= prev.length) return prev;
      const next = [...prev]; [next[i], next[j]] = [next[j], next[i]]; return next;
    });
  };
  const selectAllByScene = () => {
    if (!activeScript) return;
    const ids = allCompletedClips
      .filter((g) => g.script_id === activeScript.id)
      .sort((a, b) => (a.scene_number ?? 0) - (b.scene_number ?? 0))
      .map((g) => g.id);
    setSelectedClips(ids);
  };

  // ============= AUTO-BATCH: Quay tự động tất cả scene chưa có =============
  const runBatchGenerate = async () => {
    if (!activeScript) return;
    const existingScenes = new Set(
      allCompletedClips
        .filter((g) => g.script_id === activeScript.id)
        .map((g) => g.scene_number)
        .filter(Boolean) as number[],
    );
    // Cũng skip những scene đang processing để không double-submit
    const inFlightScenes = new Set(
      generations
        .filter((g) => g.script_id === activeScript.id && (g.status === 'pending' || g.status === 'processing'))
        .map((g) => g.scene_number)
        .filter(Boolean) as number[],
    );
    const todo = activeScript.scenes.filter(
      (s) => !existingScenes.has(s.sceneNumber) && !inFlightScenes.has(s.sceneNumber),
    );
    if (todo.length === 0) {
      toast.info('Tất cả scene đã có clip rồi.');
      return;
    }

    setBatchRunning(true);
    setBatchProgress({ done: 0, total: todo.length });
    let success = 0;
    let failed = 0;

    let previousVideoUrl: string | null = null;

    for (let i = 0; i < todo.length; i++) {
      const scene = todo[i];
      setBatchProgress({ done: i, total: todo.length, currentScene: scene.sceneNumber });
      try {
        // Character injection is handled server-side by generate-video edge function

        // Last-frame chaining: use previous video URL as starting frame for continuity
        const startingFrame = previousVideoUrl
          || selectedCharacters[0]?.reference_image_url
          || undefined;

        const res = await generateVideo({
          provider: 'geminigen',
          prompt: scene.prompt,
          duration: Math.max(3, Math.min(scene.duration ?? 5, 10)),
          aspect_ratio: scene.aspect ?? aspect,
          resolution: '1080p',
          script_id: activeScript.id,
          scene_number: scene.sceneNumber,
          character_profile_id: selectedCharacterIds[0] || undefined,
          character_profile_ids: selectedCharacterIds.length > 0 ? selectedCharacterIds : undefined,
          starting_frame_url: startingFrame,
        });
        if (res) {
          success += 1;
          // Store video URL for chaining to next scene
          if (res.video_url) previousVideoUrl = res.video_url;
        } else {
          failed += 1;
        }
      } catch (e) {
        console.error('[batch] scene', scene.sceneNumber, e);
        failed += 1;
      }
      // Nhỏ delay để tránh rate-limit provider
      await new Promise((r) => setTimeout(r, 800));
    }

    setBatchProgress({ done: todo.length, total: todo.length });
    setBatchRunning(false);
    if (failed === 0) {
      toast.success(`Đã submit ${success}/${todo.length} scene. Theo dõi tiến độ ở đây hoặc tab Thư viện.`);
    } else {
      toast.warning(`Hoàn tất với ${success} thành công, ${failed} lỗi. Hãy thử lại các scene lỗi ở Quick Clip.`);
    }
    // Trigger refetch để hiện clip mới
    fetchGenerations();
  };

  const orderedUrls = selectedClips
    .map((id) => completedClips.find((c) => c.id === id)?.video_url)
    .filter(Boolean) as string[];

  const submit = async () => {
    if (orderedUrls.length === 0) return;
    const vo = voiceoverId !== 'none' ? voiceovers.find((v) => v.id === voiceoverId)?.audio_url : undefined;
    const bgm = bgmId !== 'none' ? bgms.find((b) => b.id === bgmId)?.audio_url : undefined;
    const srt = subtitleId !== 'none' ? subs.find((s) => s.id === subtitleId)?.srt_content : undefined;
    await submitRender({
      clip_urls: orderedUrls,
      voiceover_url: vo ?? undefined,
      bgm_url: bgm ?? undefined,
      bgm_volume: bgmVolume,
      subtitle_srt: srt ?? undefined,
      burn_subtitles: burnSubs,
      aspect_ratio: aspect,
      source_clip_ids: selectedClips,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center">
          <Film className="w-5 h-5 text-foreground/70" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Ghép video từ Storyboard</h3>
          <p className="text-xs text-muted-foreground">Chọn clip → thêm voiceover/nhạc/phụ đề → render qua Creatomate</p>
        </div>
      </div>

      {/* End-to-end Wizard — chỉ hiện khi có activeScript */}
      {activeScript && (
        <VideoCompletionWizard
          defaultVoiceText={activeScript.scenes.map((s) => s.prompt).join(' ').slice(0, 800)}
          defaultBgmPrompt="cinematic, modern, uplifting, soft pads, gentle beat"
        />
      )}

      {/* Script-mode banner */}
      {activeScript && (
        <div className="rounded-xl border border-border/60 bg-foreground/[0.03] p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs">
              <span className="text-muted-foreground">Đang ghép theo kịch bản:</span>{' '}
              <span className="font-medium text-foreground">{activeScript.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="show-all" checked={showAllClips} onCheckedChange={setShowAllClips} />
              <Label htmlFor="show-all" className="text-[10px] text-muted-foreground cursor-pointer">
                Hiện tất cả clip
              </Label>
            </div>
          </div>
          {!showAllClips && missingScenes > 0 && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-[11px]">
                  <p className="text-foreground">
                    Còn <strong>{missingScenes}/{totalScenes}</strong> scene chưa quay.
                  </p>
                  {onJumpToTab && (
                    <button
                      onClick={() => onJumpToTab('quick')}
                      className="text-amber-700 dark:text-amber-300 underline hover:no-underline"
                    >
                      → Quay từng scene ở Quick Clip
                    </button>
                  )}
                </div>
              </div>
              <MultiCharacterPicker
                value={selectedCharacterIds}
                onChange={(ids, profiles) => {
                  setSelectedCharacterIds(ids);
                  setSelectedCharacters(profiles);
                }}
                className="mt-1"
              />
              {selectedCharacters.length > 0 && selectedCharacters.some(c => c.default_voice_id) && (
                <CharacterVoicePreview
                  characters={selectedCharacters}
                  scenePrompts={activeScript?.scenes?.map(s => s.prompt)}
                  className="mt-2"
                />
              )}
              <Button
                size="sm"
                onClick={runBatchGenerate}
                disabled={batchRunning || generating}
                className="h-8 text-[11px] w-full gap-1.5"
              >
                {batchRunning ? (
                  <><Loader2 className="w-3 h-3 animate-spin" />Đang quay scene {batchProgress.currentScene} ({batchProgress.done}/{batchProgress.total})…</>
                ) : (
                  <><Wand2 className="w-3 h-3" />Quay tự động {missingScenes} scene còn lại</>
                )}
              </Button>
              {batchRunning && (
                <Progress value={(batchProgress.done / Math.max(1, batchProgress.total)) * 100} className="h-1" />
              )}
            </div>
          )}
          {!showAllClips && missingScenes === 0 && (
            <Button size="sm" variant="outline" onClick={selectAllByScene} className="h-7 text-[11px] w-full">
              Chọn tất cả theo đúng thứ tự kịch bản
            </Button>
          )}
        </div>
      )}

      {/* Step 1: Select clips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">1. Chọn các cảnh ({selectedClips.length})</Label>
          {selectedClips.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setSelectedClips([])}>Bỏ chọn tất cả</Button>
          )}
        </div>
        {completedClips.length === 0 ? (
          <div className="text-center py-8 rounded-xl border border-dashed border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">Chưa có clip nào hoàn thành. Hãy tạo ở tab Quick Clip trước.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-72 overflow-y-auto">
            {completedClips.map((clip) => {
              const order = selectedClips.indexOf(clip.id);
              const selected = order !== -1;
              return (
                <button key={clip.id} onClick={() => toggleClip(clip.id)}
                  className={`relative aspect-[9/16] rounded-lg overflow-hidden border-2 transition ${
                    selected ? 'border-foreground' : 'border-border/40 hover:border-border'
                  }`}>
                  {clip.thumbnail_url ? (
                    <img src={clip.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Play className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  {selected && (
                    <div className="absolute top-1 left-1 w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center">
                      {order + 1}
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                    <p className="text-[9px] text-white truncate">
                      {clip.scene_number ? `Scene ${clip.scene_number} · ` : ''}{clip.duration_seconds}s · {clip.aspect_ratio}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Order list */}
        {selectedClips.length > 1 && (
          <div className="space-y-1 mt-2">
            <Label className="text-[10px] text-muted-foreground">Thứ tự ghép:</Label>
            <div className="flex flex-wrap gap-1">
              {selectedClips.map((id, i) => (
                <Badge key={id} variant="outline" className="gap-1 pr-1">
                  <span className="text-[10px]">#{i + 1}</span>
                  <button onClick={() => moveClip(id, -1)} disabled={i === 0} className="text-[10px] disabled:opacity-30">←</button>
                  <button onClick={() => moveClip(id, 1)} disabled={i === selectedClips.length - 1} className="text-[10px] disabled:opacity-30">→</button>
                  <button onClick={() => toggleClip(id)}><X className="w-3 h-3" /></button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Audio */}
      <div className="grid md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5"><Mic className="w-3 h-3" />Voiceover</Label>
          <Select value={voiceoverId} onValueChange={setVoiceoverId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Không dùng</SelectItem>
              {voiceovers.map((v) => <SelectItem key={v.id} value={v.id}>
                {v.source_text?.slice(0, 30) || 'Voiceover'}...
              </SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5"><Music4 className="w-3 h-3" />Nhạc nền</Label>
          <Select value={bgmId} onValueChange={setBgmId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Không dùng</SelectItem>
              {bgms.map((b) => <SelectItem key={b.id} value={b.id}>
                {b.prompt?.slice(0, 30) || 'BGM'}...
              </SelectItem>)}
            </SelectContent>
          </Select>
          {bgmId !== 'none' && (
            <div className="pt-1">
              <Label className="text-[10px] text-muted-foreground">Volume: {Math.round(bgmVolume * 100)}%</Label>
              <Slider value={[bgmVolume]} onValueChange={([v]) => setBgmVolume(v)} min={0} max={1} step={0.05} />
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5"><Type className="w-3 h-3" />Phụ đề</Label>
          <Select value={subtitleId} onValueChange={setSubtitleId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Không dùng</SelectItem>
              {subs.map((s) => <SelectItem key={s.id} value={s.id}>
                {s.source_text?.slice(0, 30) || 'Subtitle'}...
              </SelectItem>)}
            </SelectContent>
          </Select>
          {subtitleId !== 'none' && (
            <div className="flex items-center gap-2 pt-1">
              <Switch checked={burnSubs} onCheckedChange={setBurnSubs} id="burn" />
              <Label htmlFor="burn" className="text-[10px] cursor-pointer">Burn vào video</Label>
            </div>
          )}
        </div>
      </div>

      {/* Step 3: Aspect + submit */}
      <div className="flex items-end gap-3 pt-2 border-t border-border/50 flex-wrap">
        <div className="space-y-1.5">
          <Label className="text-xs">
            Tỷ lệ output {activeScript?.aspectRatio && (
              <span className="text-[10px] text-muted-foreground">(đồng bộ từ kịch bản)</span>
            )}
          </Label>
          <Select value={aspect} onValueChange={(v) => setAspect(v as any)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="9:16">9:16 (TikTok/Reels/Shorts)</SelectItem>
              <SelectItem value="4:5">4:5 (IG Feed Portrait)</SelectItem>
              <SelectItem value="2:3">2:3 (Pinterest)</SelectItem>
              <SelectItem value="1:1">1:1 (Square)</SelectItem>
              <SelectItem value="16:9">16:9 (YouTube)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={submit} disabled={orderedUrls.length === 0 || submitting} className="ml-auto">
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang submit...</> : <><Sparkles className="w-4 h-4 mr-2" />Render video ghép</>}
        </Button>
      </div>

      {/* Render jobs */}
      {jobs.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/50">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Render gần đây</h4>
          <div className="grid gap-2">
            {jobs.slice(0, 5).map((job) => (
              <div key={job.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60">
                <div className="w-12 h-16 rounded bg-muted shrink-0 overflow-hidden">
                  {job.thumbnail_url ? <img src={job.thumbnail_url} className="w-full h-full object-cover" alt="" /> : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">
                    {job.source_clip_ids.length} cảnh · {job.aspect_ratio}
                    {job.burn_subtitles && job.subtitle_srt ? ' · phụ đề burn-in' : ''}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {job.status === 'processing' && `Đang render... ${job.progress}%`}
                    {job.status === 'completed' && `Hoàn thành · ${Math.round(job.duration_seconds ?? 0)}s`}
                    {job.status === 'failed' && (job.error_message || 'Thất bại')}
                  </p>
                </div>
                {job.status === 'completed' && job.output_url && (
                  <div className="flex items-center gap-1.5">
                    <a href={job.output_url} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline">Xem</Button>
                    </a>
                    <PublishVideoMenu
                      videoUrl={job.output_url}
                      aspectRatio={job.aspect_ratio as '9:16' | '16:9' | '1:1' | '2:3' | '4:5'}
                      defaultCaption={activeScript?.title ? `${activeScript.title}` : ''}
                    />
                  </div>
                )}
                {job.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
