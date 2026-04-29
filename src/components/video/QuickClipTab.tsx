import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Wand2, Sparkles, Info, Video } from 'lucide-react';
import { AspectRatioPicker, VideoAspectRatio } from './AspectRatioPicker';
import { ProviderModelPicker, VIDEO_MODELS, VideoModelChoice } from './ProviderModelPicker';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { toast } from 'sonner';

const EXAMPLE_PROMPTS = [
  'Cô gái Việt 25 tuổi cười rạng rỡ trong tiệm cà phê ánh sáng vàng dịu, máy quay zoom chậm vào ánh mắt, phong cách điện ảnh ấm áp.',
  'Sản phẩm son môi đỏ xoay chậm 360 độ trên nền đá hoa cương trắng, ánh sáng studio mềm, macro shot, cinematic.',
  'Toàn cảnh phòng phẫu thuật thẩm mỹ hiện đại, ánh sáng trắng, bác sĩ đeo khẩu trang đang chuẩn bị, dolly forward chậm.',
];

export function QuickClipTab() {
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState<VideoAspectRatio>('9:16');
  const [duration, setDuration] = useState(5);
  const [model, setModel] = useState<VideoModelChoice>('geminigen/veo-3.1-fast');
  const { generateVideo, generating } = useVideoGeneration();

  const selectedModel = VIDEO_MODELS.find((m) => m.id === model);
  const estimatedCost = selectedModel ? (selectedModel.pricePerSec * duration).toFixed(2) : '0.00';

  const handleGenerate = async () => {
    if (prompt.trim().length < 10) {
      toast.error('Prompt cần ít nhất 10 ký tự để mô tả rõ ý tưởng.');
      return;
    }
    const provider = selectedModel?.provider ?? 'geminigen';
    const result = await generateVideo({
      provider,
      prompt: prompt.trim(),
      model,
      duration,
      aspect_ratio: aspect,
      resolution: '1080p',
    });
    if (result) {
      toast.success('Đã gửi yêu cầu sinh video. Theo dõi tại tab Thư viện.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header strip */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
        <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
          <Wand2 className="w-4 h-4 text-foreground/70" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Quick Clip</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mô tả 1 cảnh quay → AI sinh video 5–10s. Phù hợp test ý tưởng, B-roll, hook intro.
          </p>
        </div>
      </div>

      {/* Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="video-prompt" className="text-sm font-medium">
            Mô tả cảnh quay
          </Label>
          <span className="text-[10px] text-muted-foreground font-mono">{prompt.length} ký tự</span>
        </div>
        <Textarea
          id="video-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="VD: Cô gái cười dịu dàng trong vườn hoa hồng, ánh sáng ban mai, máy quay slow-motion zoom vào khuôn mặt..."
          className="min-h-[100px] resize-none text-sm"
          disabled={generating}
        />
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[10px] text-muted-foreground mr-1 self-center">Gợi ý nhanh:</span>
          {EXAMPLE_PROMPTS.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPrompt(p)}
              disabled={generating}
              className="text-[10px] px-2 py-1 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/30"
            >
              <Sparkles className="w-2.5 h-2.5 inline mr-1" />
              Mẫu {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Aspect ratio */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tỉ lệ khung hình</Label>
        <AspectRatioPicker value={aspect} onChange={setAspect} disabled={generating} />
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Độ dài</Label>
          <span className="text-xs text-muted-foreground font-mono">{duration} giây</span>
        </div>
        <Slider
          value={[duration]}
          onValueChange={([v]) => setDuration(v)}
          min={3}
          max={selectedModel?.maxDuration ?? 10}
          step={1}
          disabled={generating}
        />
      </div>

      {/* Model picker */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Model AI</Label>
        <ProviderModelPicker value={model} onChange={setModel} durationSec={duration} disabled={generating} />
      </div>

      {/* Cost preview */}
      <Alert className="border-border/40 bg-muted/30">
        <Info className="h-4 w-4 text-muted-foreground" />
        <AlertDescription className="text-xs text-muted-foreground">
          Ước tính chi phí: <span className="font-mono font-medium text-foreground">~${estimatedCost} USD</span> ·{' '}
          {selectedModel?.label} · {duration}s · {aspect}. Sẽ trừ vào hạn mức Video của workspace.
        </AlertDescription>
      </Alert>

      {/* Generate */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleGenerate}
          disabled={generating || prompt.trim().length < 10}
          size="lg"
          className="gap-2 min-w-[180px]"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang gửi yêu cầu...
            </>
          ) : (
            <>
              <Video className="w-4 h-4" />
              Tạo video
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
