import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Loader2, Video, Sparkles, Clock, Maximize, CheckCircle2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
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
  const { generateVideo, generating, currentJobId, generations, clearCurrentJob } = useVideoGeneration();
  
  const [provider, setProvider] = useState<VideoProvider>('geminigen');
  const [prompt, setPrompt] = useState(scene?.promptText || '');
  const [isPromptDirty, setIsPromptDirty] = useState(false);

  // Reset cờ "đã gõ tay" khi chuyển sang scene khác → cho phép auto-fill prompt mới
  useEffect(() => {
    setIsPromptDirty(false);
  }, [scene?.sceneNumber]);

  // Đồng bộ prompt khi scene.promptText đến muộn (load async) hoặc khi đổi scene
  useEffect(() => {
    const next = scene?.promptText?.trim();
    if (!next) return;
    if (isPromptDirty) return;
    if (next === prompt) return;
    setPrompt(next);
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
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [progressSource, setProgressSource] = useState<'estimate' | 'provider'>('estimate');

  // ETA cơ sở (giây) theo provider/duration — chỉ dùng khi provider chưa báo progress
  const estimatedSeconds = (provider === 'geminigen' ? 60 : 90) + duration * 6;

  // Tham chiếu job thực tế qua realtime (DB cột `progress` được background poller cập nhật)
  const currentJob = currentJobId ? generations.find((g) => g.id === currentJobId) : undefined;
  const providerProgress = currentJob?.progress ?? 0;

  // Ticker đếm thời gian + cập nhật progress
  // - Ưu tiên giá trị thật từ DB (`currentJob.progress`) khi > 0
  // - Fallback: ước lượng tiệm cận 92% theo elapsed/ETA
  useEffect(() => {
    if (phase !== 'sending' && phase !== 'processing') return;
    const startedAt = Date.now();
    setElapsed(0);
    const id = setInterval(() => {
      const sec = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(sec);
      const estimated = Math.min(92, Math.round((sec / estimatedSeconds) * 92));
      // Lấy max để progress không bao giờ tụt; nếu provider có số thật thì dùng nó
      if (providerProgress > 0) {
        setProgress((prev) => Math.max(prev, providerProgress));
        setProgressSource('provider');
      } else {
        setProgress((prev) => Math.max(prev, estimated));
        setProgressSource('estimate');
      }
    }, 500);
    return () => clearInterval(id);
  }, [phase, estimatedSeconds, providerProgress]);

  // Đẩy progress ngay khi DB push update (không cần đợi tick)
  useEffect(() => {
    if (providerProgress > 0 && (phase === 'processing' || phase === 'sending')) {
      setProgress((prev) => Math.max(prev, Math.min(99, providerProgress)));
      setProgressSource('provider');
    }
  }, [providerProgress, phase]);

  useEffect(() => {
    if (phase === 'done') setProgress(100);
    if (phase === 'idle' || phase === 'error') {
      setProgress(0);
      setProgressSource('estimate');
    }
  }, [phase]);

  // ETA động: khi có providerProgress thật → tính lại dựa trên tốc độ thực tế
  const dynamicEtaSeconds = (() => {
    if (progressSource === 'provider' && progress > 5 && elapsed > 2) {
      const remaining = Math.max(0, Math.round((elapsed / progress) * (100 - progress)));
      return remaining;
    }
    return Math.max(0, estimatedSeconds - elapsed);
  })();

  // Theo dõi job thực tế qua realtime: nếu DB báo completed/failed → cập nhật phase
  // (currentJob đã khai báo ở block progress phía trên)
  useEffect(() => {
    if (!currentJob) return;
    if (currentJob.status === 'completed' && currentJob.video_url) {
      setPhase('done');
      onVideoGenerated?.(currentJob.video_url);
    } else if (currentJob.status === 'failed') {
      setPhase('error');
      setLastError({
        message: currentJob.error_message || 'Provider không trả video.',
        code: 'PROVIDER_FAILED',
      });
    } else if (currentJob.status === 'processing' || currentJob.status === 'pending') {
      setPhase('processing');
    }
  }, [currentJob?.status, currentJob?.video_url]);

  // Stepper: 4 bước có thật trong pipeline submit-and-poll
  type StepState = 'pending' | 'active' | 'done' | 'error';
  const steps: { key: string; label: string; state: StepState }[] = [
    {
      key: 'submit',
      label: 'Gửi yêu cầu tới máy chủ',
      state:
        phase === 'sending' ? 'active'
        : phase === 'idle' ? 'pending'
        : phase === 'error' && !currentJobId ? 'error'
        : 'done',
    },
    {
      key: 'queue',
      label: 'Đẩy job vào hàng đợi provider',
      state:
        !currentJobId ? 'pending'
        : (currentJob?.status === 'pending') ? 'active'
        : (currentJob?.status === 'processing' || currentJob?.status === 'completed') ? 'done'
        : currentJob?.status === 'failed' ? 'error'
        : 'pending',
    },
    {
      key: 'render',
      label: `Provider render video (${provider})`,
      state:
        currentJob?.status === 'processing' ? 'active'
        : currentJob?.status === 'completed' ? 'done'
        : currentJob?.status === 'failed' ? 'error'
        : 'pending',
    },
    {
      key: 'finalize',
      label: 'Lưu vào thư viện & sẵn sàng phát',
      state:
        currentJob?.status === 'completed' && currentJob?.video_url ? 'done'
        : currentJob?.status === 'completed' ? 'active'
        : 'pending',
    },
  ];

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m > 0 ? `${m}m ${r}s` : `${r}s`;
  };

  const extractErrorCode = (err: unknown): string | undefined => {
    if (!err) return undefined;
    const anyErr = err as { errorCode?: string; code?: string; status?: number; message?: string };
    if (anyErr.errorCode) return String(anyErr.errorCode);
    if (anyErr.code) return String(anyErr.code);
    if (anyErr.status) return `HTTP_${anyErr.status}`;
    const m = anyErr.message?.match(/\b(4\d{2}|5\d{2})\b/);
    return m ? `HTTP_${m[1]}` : undefined;
  };

  // Schema validation toàn bộ payload trước khi gửi
  const validatePayload = () => {
    const errors: string[] = [];
    const validProviders = Object.keys(VIDEO_PROVIDER_CONFIG);
    const trimmed = prompt.trim();

    if (!trimmed) {
      errors.push('Prompt rỗng — hãy nhập mô tả cảnh quay.');
    } else if (trimmed.length < 5) {
      errors.push(`Prompt quá ngắn (${trimmed.length}/5 ký tự tối thiểu).`);
    } else if (trimmed.length > 4000) {
      errors.push(`Prompt quá dài (${trimmed.length}/4000 ký tự).`);
    }

    if (!provider || !validProviders.includes(provider)) {
      errors.push(`Provider "${provider}" không hợp lệ. Hỗ trợ: ${validProviders.join(', ')}.`);
    } else if (provider === 'runway') {
      errors.push('Provider Runway chưa được hỗ trợ (Coming Soon).');
    }

    // scene_number chỉ bắt buộc khi đang gắn vào storyboard scene
    if (scene && (scene.sceneNumber == null || !Number.isInteger(scene.sceneNumber) || scene.sceneNumber < 1)) {
      errors.push('Scene number không hợp lệ — hãy chọn lại scene từ storyboard.');
    }

    if (storyboardId && !script?.id) {
      errors.push('Thiếu script_id liên kết với storyboard.');
    }

    if (![5, 10].includes(duration)) {
      errors.push(`Duration ${duration}s không hợp lệ (chỉ hỗ trợ 5s hoặc 10s).`);
    }

    const allowedAspect = providerConfig.aspectRatios;
    if (!allowedAspect.includes(aspectRatio)) {
      errors.push(`Aspect ratio ${aspectRatio} không khả dụng cho ${provider}.`);
    }

    return errors;
  };

  const handleGenerate = async () => {
    const errors = validatePayload();
    if (errors.length > 0) {
      toast.error(errors[0], {
        description: errors.length > 1 ? `+${errors.length - 1} lỗi khác — xem khung bên dưới.` : undefined,
      });
      setLastError({
        message: errors.join(' • '),
        code: 'VALIDATION_FAILED',
      });
      setPhase('error');
      return;
    }

    setLastError(null);
    clearCurrentJob();
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

        {/* Stepper — tiến độ thực tế từng bước */}
        {phase !== 'idle' && (
          <div className="space-y-2.5 rounded-md border border-border bg-muted/30 px-3 py-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground/80 flex items-center gap-1.5">
                Tiến độ tạo video
                {progressSource === 'provider' && (
                  <span className="text-[9px] uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    Live
                  </span>
                )}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {progress}% · {fmtTime(elapsed)}
              </span>
            </div>
            <Progress value={progress} className="h-1" />
            <ol className="space-y-1.5 pt-1">
              {steps.map((step, idx) => {
                const Icon =
                  step.state === 'done' ? CheckCircle2
                  : step.state === 'active' ? Loader2
                  : step.state === 'error' ? AlertCircle
                  : null;
                const colorCls =
                  step.state === 'done' ? 'text-emerald-600 dark:text-emerald-400'
                  : step.state === 'active' ? 'text-primary'
                  : step.state === 'error' ? 'text-destructive'
                  : 'text-muted-foreground/60';
                return (
                  <li key={step.key} className={`flex items-center gap-2 text-xs ${colorCls}`}>
                    {Icon ? (
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${step.state === 'active' ? 'animate-spin' : ''}`} />
                    ) : (
                      <span className="h-3.5 w-3.5 shrink-0 flex items-center justify-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
                      </span>
                    )}
                    <span className="flex-1">
                      <span className="opacity-60 mr-1.5">{idx + 1}.</span>
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
            {(phase === 'sending' || phase === 'processing') && (
              <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                {progressSource === 'provider'
                  ? `Còn ~${fmtTime(dynamicEtaSeconds)} (theo tốc độ provider thực tế).`
                  : `ETA ~${fmtTime(dynamicEtaSeconds)} (ước lượng — sẽ được hiệu chỉnh khi provider báo).`}
                {' '}Bạn có thể rời tab — video sẽ tự lưu khi xong.
              </p>
            )}
          </div>
        )}
        {phase === 'done' && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Đã tạo xong video sau {fmtTime(elapsed)}.</span>
          </div>
        )}
        {phase === 'error' && lastError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive space-y-1">
            <div className="font-medium flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Tạo video thất bại
              </span>
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
