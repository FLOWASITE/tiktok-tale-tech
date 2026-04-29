import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Loader2, Video, Sparkles, Clock, Maximize } from 'lucide-react';
import { VideoProvider, VIDEO_PROVIDER_CONFIG, ASPECT_RATIO_CONFIG } from '@/types/videoGeneration';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { Script } from '@/types/script';
import { StoryboardScene } from '@/types/storyboard';
import { MediaRetentionNotice } from '@/components/MediaRetentionNotice';
import { AdminModelBadge } from '@/components/shared/AdminModelBadge';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

const DEFAULT_VIDEO_MODEL = 'geminigen/veo-3.1-fast';

interface VideoGeneratorPanelProps {
  script?: Script;
  scene?: StoryboardScene;
  storyboardId?: string;
  onVideoGenerated?: (videoUrl: string) => void;
}

export function VideoGeneratorPanel({
  script,
  scene,
  storyboardId,
  onVideoGenerated,
}: VideoGeneratorPanelProps) {
  const { generateVideo, generating } = useVideoGeneration();
  
  const [provider, setProvider] = useState<VideoProvider>('geminigen');
  const [prompt, setPrompt] = useState(scene?.promptText || '');
  const [isPromptDirty, setIsPromptDirty] = useState(false);

  // Đồng bộ prompt khi scene.promptText đến muộn hoặc đổi scene (chỉ khi user chưa gõ tay)
  useEffect(() => {
    if (!isPromptDirty && scene?.promptText && scene.promptText !== prompt) {
      setPrompt(scene.promptText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene?.promptText, scene?.sceneNumber]);
  const [duration, setDuration] = useState<number>(5);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('1080p');
  const { currentOrganization } = useOrganizationContext();

  const providerConfig = VIDEO_PROVIDER_CONFIG[provider];
  const availableAspectRatios = providerConfig.aspectRatios;

  type Phase = 'idle' | 'sending' | 'processing' | 'error' | 'done';
  const [phase, setPhase] = useState<Phase>('idle');
  const [lastError, setLastError] = useState<{ message: string; code?: string } | null>(null);

  const extractErrorCode = (err: unknown): string | undefined => {
    if (!err) return undefined;
    const anyErr = err as { errorCode?: string; code?: string; status?: number; message?: string };
    if (anyErr.errorCode) return String(anyErr.errorCode);
    if (anyErr.code) return String(anyErr.code);
    if (anyErr.status) return `HTTP_${anyErr.status}`;
    const m = anyErr.message?.match(/\b(4\d{2}|5\d{2})\b/);
    return m ? `HTTP_${m[1]}` : undefined;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Vui lòng nhập prompt mô tả cảnh quay trước khi tạo video.');
      return;
    }

    setLastError(null);
    setPhase('sending');
    try {
      const result = await generateVideo({
        provider,
        prompt: prompt.trim(),
        // model omitted — Admin AI Function Config decides
        duration,
        aspect_ratio: aspectRatio,
        resolution,
        script_id: script?.id,
        storyboard_id: storyboardId,
        scene_number: scene?.sceneNumber,
      });

      if (!result) {
        // generateVideo trả null = request không thành công nhưng đã toast bên trong
        setPhase('error');
        setLastError({ message: 'Không nhận được phản hồi từ generate-video.', code: 'NO_RESPONSE' });
        return;
      }

      if (result.video_url) {
        onVideoGenerated?.(result.video_url);
        setPhase('done');
      } else {
        setPhase('processing');
      }
    } catch (err) {
      console.error('[VideoGeneratorPanel] generate failed:', err);
      const message = err instanceof Error ? err.message : 'Không thể tạo video.';
      const code = extractErrorCode(err);
      setLastError({ message, code });
      setPhase('error');
      toast.error(code ? `[${code}] ${message}` : message);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Video className="h-4 w-4 text-primary" />
          Text-to-Video Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Provider</Label>
          <RadioGroup
            value={provider}
            onValueChange={(v) => setProvider(v as VideoProvider)}
            className="grid grid-cols-1 gap-2"
          >
            {Object.entries(VIDEO_PROVIDER_CONFIG).map(([key, config]) => (
              <div key={key} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={key}
                  id={`provider-${key}`}
                  disabled={key === 'runway'}
                />
                <Label
                  htmlFor={`provider-${key}`}
                  className="flex-1 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span>{config.icon}</span>
                    <span className="text-sm">{config.label}</span>
                  </span>
                  {config.requiresApiKey && (
                    <Badge variant="outline" className="text-[10px]">
                      API Key
                    </Badge>
                  )}
                  {key === 'runway' && (
                    <Badge variant="secondary" className="text-[10px]">
                      Coming Soon
                    </Badge>
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Model — read-only, do Admin cấu hình tại /admin/ai */}
        <div className="space-y-2">
          <Label className="text-xs font-medium flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Model AI
          </Label>
          <AdminModelBadge
            functionName="generate-video"
            defaultModel={DEFAULT_VIDEO_MODEL}
            organizationId={currentOrganization?.id}
          />
        </div>

        {/* Prompt */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Video Prompt</Label>
          <Textarea
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setIsPromptDirty(true); }}
            placeholder="Mô tả chi tiết cảnh quay: nhân vật, hành động, góc camera, ánh sáng..."
            rows={4}
            className="text-sm resize-none"
          />
          {!prompt.trim() && scene ? (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              ⚠️ Scene chưa có mô tả — hãy nhập prompt thủ công trước khi tạo video.
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              💡 Prompt càng chi tiết, video càng đẹp. Mô tả camera motion, lighting, mood.
            </p>
          )}
        </div>

        {/* Duration & Aspect Ratio */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Duration
            </Label>
            <Select
              value={duration.toString()}
              onValueChange={(v) => setDuration(parseInt(v))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 giây</SelectItem>
                {providerConfig.maxDuration >= 10 && (
                  <SelectItem value="10">10 giây</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Maximize className="h-3 w-3" />
              Aspect Ratio
            </Label>
            <Select
              value={aspectRatio}
              onValueChange={setAspectRatio}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableAspectRatios.map((ratio) => (
                  <SelectItem key={ratio} value={ratio}>
                    {ASPECT_RATIO_CONFIG[ratio]?.label || ratio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Resolution */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Resolution</Label>
          <Select value={resolution} onValueChange={setResolution}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="480p">480p (Nhanh)</SelectItem>
              <SelectItem value="1080p">1080p (Chất lượng cao)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={generating || phase === 'sending' || !prompt.trim()}
          className="w-full"
        >
          {generating || phase === 'sending' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {phase === 'sending' ? 'Đang gửi yêu cầu...' : 'Đang tạo video...'}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Tạo Video
            </>
          )}
        </Button>

        {/* Status banner */}
        {phase === 'sending' && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Đang gửi tới <code className="font-mono">generate-video</code>…</span>
          </div>
        )}
        {phase === 'processing' && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Đang tạo video nền — sẽ thông báo khi xong.</span>
          </div>
        )}
        {phase === 'error' && lastError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive space-y-1">
            <div className="font-medium flex items-center justify-between gap-2">
              <span>Tạo video thất bại</span>
              {lastError.code && (
                <code className="font-mono text-[10px] bg-destructive/10 px-1.5 py-0.5 rounded">
                  {lastError.code}
                </code>
              )}
            </div>
            <p className="text-[11px] leading-snug break-words">{lastError.message}</p>
            <button
              type="button"
              onClick={handleGenerate}
              className="text-[11px] underline underline-offset-2 hover:no-underline"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Info */}
        <div className="text-[10px] text-muted-foreground space-y-1 pt-2 border-t">
          <p>🎬 {providerConfig.label}: {providerConfig.description}</p>
          <p>⏱️ Thời gian tạo: 1-5 phút tùy provider</p>
          <MediaRetentionNotice variant="inline" className="text-[10px] pt-1" />
        </div>
      </CardContent>
    </Card>
  );
}
