// VideoCompletionWizard — 1-nút-ra-MP4 cho ActiveScript (short-form ≤90s)
// Mount ở đầu Storyboard tab. 5 step + provider tier toggle + ETA động.
import { useMemo, useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  AlertCircle,
  Loader2,
  Wand2,
  Zap,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useVideoCompletion, type WizardStep } from '@/hooks/useVideoCompletion';
import { useScriptToVideo } from '@/contexts/ScriptToVideoContext';
import { cn } from '@/lib/utils';

interface Props {
  /** Default voiceover text (thường là scriptNarration đã clean) */
  defaultVoiceText?: string;
  /** Default BGM prompt (vd brand tone) */
  defaultBgmPrompt?: string;
}

function StepIcon({ status }: { status: WizardStep['status'] }) {
  if (status === 'done') return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
  if (status === 'running') return <Loader2 className="w-4 h-4 animate-spin text-foreground" />;
  if (status === 'failed') return <AlertCircle className="w-4 h-4 text-destructive" />;
  if (status === 'partial') return <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
  return <Circle className="w-4 h-4 text-muted-foreground/40" />;
}

function formatEta(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}p ${s}s` : `${m} phút`;
}

export function VideoCompletionWizard({ defaultVoiceText, defaultBgmPrompt }: Props) {
  const { activeScript } = useScriptToVideo();
  const {
    steps,
    running,
    lastError,
    allReady,
    completedScenesCount,
    scriptScenesCount,
    overallProgress,
    etaSeconds,
    isShortForm,
    tier,
    setTier,
    runAuto,
  } = useVideoCompletion();
  const [bgmPrompt] = useState(defaultBgmPrompt ?? 'cinematic, modern, uplifting, soft pads, gentle beat');

  const isAnyRunning = running !== null;
  const runningLabel = useMemo(
    () => steps.find((s) => s.status === 'running')?.label ?? '…',
    [steps],
  );

  if (!activeScript) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-foreground/[0.02] to-transparent p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-foreground/70" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Wizard tạo video
            </span>
            {activeScript.presetLabel && (
              <Badge variant="outline" className="text-[10px] h-5">
                {activeScript.presetLabel}
              </Badge>
            )}
            {isShortForm && (
              <Badge variant="outline" className="text-[10px] h-5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                Short-form ≤90s
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto">
              {overallProgress}%
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground truncate mt-0.5">
            {activeScript.title}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {allReady
              ? 'Sẵn sàng render MP4 ngay khi bấm "Auto chạy hết".'
              : `Hệ thống sẽ quay ${scriptScenesCount - completedScenesCount} scene song song, tạo audio và render — tất cả trong 1 lần bấm.`}
          </p>
        </div>
      </div>

      {/* Overall progress bar */}
      <Progress value={overallProgress} className="h-1.5" />

      {/* Provider tier toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Chế độ:</span>
        <button
          type="button"
          onClick={() => setTier('fast')}
          disabled={isAnyRunning}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] transition',
            tier === 'fast'
              ? 'border-foreground/30 bg-foreground/[0.04] text-foreground'
              : 'border-border/60 text-muted-foreground hover:text-foreground',
          )}
        >
          <Zap className="w-3 h-3" />
          Tiết kiệm (Seedance)
          <span className="text-[9px] text-muted-foreground">~$1-2</span>
        </button>
        <button
          type="button"
          onClick={() => setTier('hero')}
          disabled={isAnyRunning}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] transition',
            tier === 'hero'
              ? 'border-foreground/30 bg-foreground/[0.04] text-foreground'
              : 'border-border/60 text-muted-foreground hover:text-foreground',
          )}
        >
          <Crown className="w-3 h-3" />
          Chất lượng (Veo 3 Fast)
          <span className="text-[9px] text-muted-foreground">~$10-30</span>
        </button>
      </div>

      {/* 5 steps grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            className={cn(
              'flex items-center gap-2 rounded-lg border p-2.5 transition-colors',
              step.status === 'done'
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : step.status === 'running'
                  ? 'border-foreground/30 bg-foreground/[0.04]'
                  : step.status === 'partial'
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-border/60 bg-background',
            )}
          >
            <StepIcon status={step.status} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-foreground leading-tight">
                {idx + 1}. {step.label}
              </p>
              <p className="text-[10px] text-muted-foreground truncate leading-tight">
                {step.detail}
              </p>
            </div>
          </div>
        ))}
      </div>

      {lastError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-2 text-[11px] text-destructive">
          {lastError}
        </div>
      )}

      {/* Footer: ETA + CTA */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 flex-wrap">
        <p className="text-[10px] text-muted-foreground">
          {allReady
            ? '✅ Tất cả clip đã sẵn — render khoảng 1-3 phút.'
            : `⏱️ ETA ~${formatEta(etaSeconds)}. Có thể đóng tab — sẽ chạy nền và thông báo khi xong.`}
        </p>
        <Button
          size="sm"
          onClick={() =>
            runAuto({
              voiceText: defaultVoiceText && defaultVoiceText.length > 5 ? defaultVoiceText : undefined,
              bgmPrompt,
            })
          }
          disabled={isAnyRunning}
          className="gap-1.5"
        >
          {isAnyRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {running === 'scenes'
                ? `Quay ${completedScenesCount}/${scriptScenesCount} scene…`
                : `Đang ${runningLabel}…`}
            </>
          ) : (
            <>
              <Wand2 className="w-3.5 h-3.5" />
              {allReady ? 'Render ngay' : 'Auto chạy hết'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
