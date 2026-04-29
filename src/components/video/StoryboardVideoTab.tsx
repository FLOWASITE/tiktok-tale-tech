import { useState, useEffect, useMemo } from 'react';
import { Film, Loader2, Play, Music4, Mic, Type, Sparkles, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { useAudioStudio } from '@/hooks/useAudioStudio';
import { useVideoRender } from '@/hooks/useVideoRender';
import { useScriptToVideo } from '@/contexts/ScriptToVideoContext';
import { Badge } from '@/components/ui/badge';

interface Props {
  onJumpToTab?: (tab: 'quick' | 'storyboard' | 'gallery') => void;
}

export function StoryboardVideoTab({ onJumpToTab }: Props = {}) {
  const { generations, fetchGenerations } = useVideoGeneration();
  const { assets, fetchAssets } = useAudioStudio();
  const { jobs, submitting, submitRender } = useVideoRender();
  const { activeScript } = useScriptToVideo();

  const [selectedClips, setSelectedClips] = useState<string[]>([]);
  const [voiceoverId, setVoiceoverId] = useState<string>('none');
  const [bgmId, setBgmId] = useState<string>('none');
  const [bgmVolume, setBgmVolume] = useState(0.2);
  const [subtitleId, setSubtitleId] = useState<string>('none');
  const [burnSubs, setBurnSubs] = useState(true);
  const [aspect, setAspect] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [showAllClips, setShowAllClips] = useState(false);

  useEffect(() => { fetchGenerations(); fetchAssets(); }, [fetchGenerations, fetchAssets]);

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
                    <p className="text-[9px] text-white truncate">{clip.duration_seconds}s · {clip.aspect_ratio}</p>
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
      <div className="flex items-end gap-3 pt-2 border-t border-border/50">
        <div className="space-y-1.5">
          <Label className="text-xs">Tỷ lệ output</Label>
          <Select value={aspect} onValueChange={(v) => setAspect(v as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="9:16">9:16 (TikTok/Reels)</SelectItem>
              <SelectItem value="16:9">16:9 (YouTube)</SelectItem>
              <SelectItem value="1:1">1:1 (Square)</SelectItem>
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
                  <a href={job.output_url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline">Xem</Button>
                  </a>
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
