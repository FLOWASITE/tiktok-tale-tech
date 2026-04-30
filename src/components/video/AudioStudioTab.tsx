import { useEffect, useMemo, useState } from 'react';
import { Mic, Music4, Type, Loader2, Trash2, Download, Copy, Wand2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useAudioStudio, VOICE_OPTIONS, type AudioAsset } from '@/hooks/useAudioStudio';
import { useScriptToVideo } from '@/contexts/ScriptToVideoContext';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { toast } from 'sonner';

export function AudioStudioTab() {
  const { assets, generating, generateVoiceover, generateBGM, generateSubtitles, deleteAsset } = useAudioStudio();
  const { activeScript } = useScriptToVideo();
  const { generations, fetchGenerations } = useVideoGeneration();

  const [voText, setVoText] = useState('');
  const [voVoiceId, setVoVoiceId] = useState<string>(VOICE_OPTIONS[0].id);
  const [bgmPrompt, setBgmPrompt] = useState('');
  const scriptDuration = activeScript?.totalDuration ?? 0;
  const [bgmDuration, setBgmDuration] = useState(scriptDuration > 0 ? Math.min(120, scriptDuration) : 15);
  const [subUrl, setSubUrl] = useState('');

  // Khi activeScript đổi → đề xuất BGM khớp đúng tổng duration script
  useEffect(() => {
    if (scriptDuration > 0) setBgmDuration(Math.min(120, scriptDuration));
  }, [scriptDuration]);

  useEffect(() => { fetchGenerations(); }, [fetchGenerations]);

  // Chuẩn hóa 1 đoạn narration: bỏ [tags], (notes), timecode, scene headers, speaker labels
  const cleanNarration = (raw: string): string => {
    if (!raw) return '';
    let t = raw;
    // 1. Bỏ block tags & ghi chú đạo diễn: [B-roll], (cười nhẹ), {SFX}, <cut>
    t = t.replace(/\[[^\]]*\]/g, ' ')
         .replace(/\([^)]*\)/g, ' ')
         .replace(/\{[^}]*\}/g, ' ')
         .replace(/<[^>]+>/g, ' ');
    // 2. Bỏ timecode: 00:05, 0:00-0:03, 00:00:05, [00:05], (0:03 - 0:08)
    t = t.replace(/\b\d{1,2}:\d{2}(?::\d{2})?(?:\s*[-–—~]\s*\d{1,2}:\d{2}(?::\d{2})?)?\b/g, ' ');
    // 3. Bỏ markers dòng: "SCENE 1:", "Cảnh 2 -", "Shot 3.", "VO:", "NARRATOR:", "MC:"
    t = t.replace(/^\s*(scene|cảnh|canh|shot|cut|take|vo|voice[\s-]?over|narrator|mc|host|speaker|người\s*dẫn)\s*\d*\s*[:.\-–—)]\s*/gim, '');
    // 4. Bỏ markdown nhẹ
    t = t.replace(/[*_`#>]+/g, ' ');
    // 5. Gộp khoảng trắng
    t = t.replace(/[ \t]+/g, ' ')
         .replace(/\s*\n\s*/g, '\n')
         .replace(/\n{2,}/g, '\n')
         .trim();
    return t;
  };

  // Cắt mềm tại ranh giới câu để giữ mạch lạc trong giới hạn ký tự
  const truncateAtSentence = (text: string, max: number): string => {
    if (text.length <= max) return text;
    const slice = text.slice(0, max);
    const lastBreak = Math.max(
      slice.lastIndexOf('.'), slice.lastIndexOf('!'), slice.lastIndexOf('?'),
      slice.lastIndexOf('…'), slice.lastIndexOf('\n')
    );
    if (lastBreak > max * 0.6) return slice.slice(0, lastBreak + 1).trim();
    const lastSpace = slice.lastIndexOf(' ');
    return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim() + '…';
  };

  // Ghép narration text từ kịch bản
  const scriptNarration = useMemo(() => {
    if (!activeScript?.scenes?.length) return '';
    const joined = activeScript.scenes
      .map((s) => cleanNarration(s.prompt ?? ''))
      .filter(Boolean)
      .join('\n\n');
    return truncateAtSentence(joined, 5000);
  }, [activeScript]);

  // Clip mới nhất completed của kịch bản hiện tại — dùng để auto-fill phụ đề
  const latestScriptClip = useMemo(() => {
    if (!activeScript) return null;
    return generations
      .filter((g) => g.script_id === activeScript.id && g.status === 'completed' && g.video_url)
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0] ?? null;
  }, [activeScript, generations]);

  const fillFromScript = () => {
    if (!scriptNarration) { toast.error('Kịch bản chưa có nội dung dùng được.'); return; }
    setVoText(scriptNarration);
    toast.success(`Đã nạp ${scriptNarration.length} ký tự từ "${activeScript?.title}"`);
  };
  const fillSubtitleFromLatestClip = () => {
    if (!latestScriptClip?.video_url) { toast.error('Chưa có clip hoàn thành cho kịch bản này.'); return; }
    setSubUrl(latestScriptClip.video_url);
    toast.success(`Đã nạp clip Scene ${latestScriptClip.scene_number ?? '?'}`);
  };

  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success('Đã copy'); };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center">
          <Music4 className="w-5 h-5 text-foreground/70" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Audio Studio</h3>
          <p className="text-xs text-muted-foreground">Voiceover · Nhạc nền · Phụ đề tự động — ElevenLabs</p>
        </div>
      </div>

      {activeScript && (
        <div className="rounded-xl border border-border/60 bg-foreground/[0.03] p-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs">
            <span className="text-muted-foreground">Kịch bản đang dùng:</span>{' '}
            <span className="font-medium text-foreground">{activeScript.title}</span>{' '}
            <Badge variant="outline" className="ml-1 text-[10px] h-5">{activeScript.scenes.length} scene</Badge>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {scriptNarration ? `~${scriptNarration.length} ký tự sẵn cho voiceover` : 'Không có narration dùng được'}
          </div>
        </div>
      )}

      <Tabs defaultValue="voiceover" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="voiceover" className="gap-1.5"><Mic className="w-3.5 h-3.5" />Voiceover</TabsTrigger>
          <TabsTrigger value="music" className="gap-1.5"><Music4 className="w-3.5 h-3.5" />Nhạc nền</TabsTrigger>
          <TabsTrigger value="subtitle" className="gap-1.5"><Type className="w-3.5 h-3.5" />Phụ đề</TabsTrigger>
        </TabsList>

        {/* Voiceover */}
        <TabsContent value="voiceover" className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Văn bản (tối đa 5000 ký tự)</Label>
              {activeScript && scriptNarration && (
                <Button size="sm" variant="ghost" onClick={fillFromScript} className="h-6 gap-1 text-[10px]">
                  <Wand2 className="w-3 h-3" />Nạp từ kịch bản ({activeScript.scenes.length} scene)
                </Button>
              )}
            </div>
            <Textarea rows={5} value={voText} onChange={(e) => setVoText(e.target.value)}
              placeholder="Chào bạn! Hôm nay mình giới thiệu sản phẩm mới..."
              className="resize-none" maxLength={5000} />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{voText.length} / 5000</span>
              <span>~{Math.ceil((voText.length / 150) * 60)}s | ~${((voText.length / 1000) * 0.30).toFixed(3)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Giọng đọc</Label>
              <Select value={voVoiceId} onValueChange={setVoVoiceId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VOICE_OPTIONS.map((v) => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => generateVoiceover(voText, voVoiceId, 'vi', activeScript?.id)}
                disabled={!voText.trim() || generating === 'voiceover'} className="w-full">
                {generating === 'voiceover' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang tạo...</> : 'Tạo voiceover'}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Music */}
        <TabsContent value="music" className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Mô tả nhạc nền</Label>
            <Textarea rows={3} value={bgmPrompt} onChange={(e) => setBgmPrompt(e.target.value)}
              placeholder="upbeat corporate, motivational, electronic, perfect for tech product launch" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Độ dài: {bgmDuration}s {scriptDuration > 0 && bgmDuration === scriptDuration && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-1">· khớp kịch bản</span>
              )}</Label>
              <span className="text-[10px] text-muted-foreground">~${(bgmDuration * 0.08).toFixed(2)}</span>
            </div>
            <Slider value={[bgmDuration]} onValueChange={([v]) => setBgmDuration(v)} min={5} max={120} step={5} />
            {scriptDuration > 0 && bgmDuration !== scriptDuration && (
              <button
                type="button"
                onClick={() => setBgmDuration(Math.min(120, scriptDuration))}
                className="text-[10px] text-muted-foreground hover:text-foreground underline"
              >
                Khớp với kịch bản ({scriptDuration}s)
              </button>
            )}
          </div>
          <Button onClick={() => generateBGM(bgmPrompt, bgmDuration, activeScript?.id)}
            disabled={!bgmPrompt.trim() || generating === 'music'} className="w-full">
            {generating === 'music' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang tạo...</> : 'Tạo nhạc nền'}
          </Button>
        </TabsContent>

        {/* Subtitle */}
        <TabsContent value="subtitle" className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">URL video / audio</Label>
              {latestScriptClip && (
                <Button size="sm" variant="ghost" onClick={fillSubtitleFromLatestClip} className="h-6 gap-1 text-[10px]">
                  <FileText className="w-3 h-3" />Dùng clip mới nhất của kịch bản
                </Button>
              )}
            </div>
            <Input value={subUrl} onChange={(e) => setSubUrl(e.target.value)}
              placeholder="https://...mp4 (từ Thư viện video)" />
            <p className="text-[10px] text-muted-foreground">
              Whisper-grade STT, tự sinh SRT + VTT. Có thể burn vào video khi render.
            </p>
          </div>
          <Button onClick={() => generateSubtitles(subUrl)}
            disabled={!subUrl.trim() || generating === 'subtitle'} className="w-full">
            {generating === 'subtitle' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang transcribe...</> : 'Tạo phụ đề'}
          </Button>
        </TabsContent>
      </Tabs>

      {/* Library */}
      {assets.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/50">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Thư viện audio</h4>
          <div className="grid gap-2">
            {assets.slice(0, 10).map((a) => <AssetRow key={a.id} asset={a} onDelete={deleteAsset} onCopy={copy} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function AssetRow({ asset, onDelete, onCopy }: { asset: AudioAsset; onDelete: (id: string) => void; onCopy: (s: string) => void }) {
  const Icon = asset.asset_type === 'voiceover' ? Mic : asset.asset_type === 'music' ? Music4 : Type;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/20">
      <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{asset.source_text || asset.prompt || `${asset.asset_type} asset`}</p>
        <p className="text-[10px] text-muted-foreground">
          {asset.duration_seconds ? `${Math.round(asset.duration_seconds)}s` : ''} · {new Date(asset.created_at).toLocaleString('vi-VN')}
        </p>
      </div>
      {asset.audio_url && (
        <audio controls src={asset.audio_url} className="h-8 w-40 hidden md:block" />
      )}
      {asset.audio_url && (
        <Button size="sm" variant="ghost" onClick={() => onCopy(asset.audio_url!)} title="Copy URL">
          <Copy className="w-3.5 h-3.5" />
        </Button>
      )}
      {asset.srt_content && (
        <Button size="sm" variant="ghost" onClick={() => {
          const blob = new Blob([asset.srt_content!], { type: 'text/plain' });
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
          a.download = `subtitle-${asset.id}.srt`; a.click();
        }} title="Tải SRT">
          <Download className="w-3.5 h-3.5" />
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={() => onDelete(asset.id)}>
        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
      </Button>
    </div>
  );
}
