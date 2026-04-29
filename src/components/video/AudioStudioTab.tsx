import { useState } from 'react';
import { Mic, Music4, Type, Loader2, Play, Trash2, Download, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useAudioStudio, VOICE_OPTIONS, type AudioAsset } from '@/hooks/useAudioStudio';
import { toast } from 'sonner';

export function AudioStudioTab() {
  const { assets, generating, generateVoiceover, generateBGM, generateSubtitles, deleteAsset } = useAudioStudio();

  const [voText, setVoText] = useState('');
  const [voVoiceId, setVoVoiceId] = useState<string>(VOICE_OPTIONS[0].id);
  const [bgmPrompt, setBgmPrompt] = useState('');
  const [bgmDuration, setBgmDuration] = useState(15);
  const [subUrl, setSubUrl] = useState('');

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

      <Tabs defaultValue="voiceover" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="voiceover" className="gap-1.5"><Mic className="w-3.5 h-3.5" />Voiceover</TabsTrigger>
          <TabsTrigger value="music" className="gap-1.5"><Music4 className="w-3.5 h-3.5" />Nhạc nền</TabsTrigger>
          <TabsTrigger value="subtitle" className="gap-1.5"><Type className="w-3.5 h-3.5" />Phụ đề</TabsTrigger>
        </TabsList>

        {/* Voiceover */}
        <TabsContent value="voiceover" className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Văn bản (tối đa 5000 ký tự)</Label>
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
              <Button onClick={() => generateVoiceover(voText, voVoiceId)}
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
              <Label className="text-xs">Độ dài: {bgmDuration}s</Label>
              <span className="text-[10px] text-muted-foreground">~${(bgmDuration * 0.08).toFixed(2)}</span>
            </div>
            <Slider value={[bgmDuration]} onValueChange={([v]) => setBgmDuration(v)} min={5} max={30} step={5} />
          </div>
          <Button onClick={() => generateBGM(bgmPrompt, bgmDuration)}
            disabled={!bgmPrompt.trim() || generating === 'music'} className="w-full">
            {generating === 'music' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang tạo...</> : 'Tạo nhạc nền'}
          </Button>
        </TabsContent>

        {/* Subtitle */}
        <TabsContent value="subtitle" className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">URL video / audio</Label>
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
