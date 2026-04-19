import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Carousel } from '@/types/carousel';
import { useConfetti } from '@/hooks/useConfetti';
import { useAuth } from '@/contexts/AuthContext';
import { useBackgroundGeneration } from '@/hooks/useBackgroundGeneration';
import { useCarouselGeneration, CarouselGenPhase } from '@/contexts/CarouselGenerationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Check,
  Loader2,
  Circle,
  Eye,
  Lightbulb,
  Clock,
  AlertCircle,
  Sparkles,
  Search,
  LayoutGrid,
  PenLine,
  Minimize2,
  type LucideIcon,
} from 'lucide-react';

type PromptPhase = 'analyzing' | 'structuring' | 'writing' | 'finalizing';

const PROMPT_STEPS: { id: PromptPhase; label: string; icon: LucideIcon }[] = [
  { id: 'analyzing', label: 'Phân tích chủ đề & ngữ cảnh', icon: Search },
  { id: 'structuring', label: 'Thiết kế cấu trúc carousel', icon: LayoutGrid },
  { id: 'writing', label: 'Viết nội dung từng slide', icon: PenLine },
  { id: 'finalizing', label: 'Hoàn thiện prompt ảnh', icon: Sparkles },
];

/**
 * Map real backend phase → which PROMPT_STEPS index is currently active.
 * Steps before that index are "done", steps after are "pending".
 */
function phaseToStepIndex(phase: CarouselGenPhase): number {
  switch (phase) {
    case 'init':
    case 'planning':
      return 0; // analyzing
    case 'ai_generating':
      return 1; // structuring
    case 'parsing':
    case 'compliance':
      return 2; // writing
    case 'revealing':
      return 2; // still writing (live count shown)
    case 'finalizing':
    case 'syncing':
      return 3; // finalizing
    case 'done':
      return PROMPT_STEPS.length;
    case 'error':
    case 'cancelled':
    default:
      return 0;
  }
}

const TIPS = [
  'Carousel 6 slides thường mất khoảng 1-2 phút',
  'Ảnh AI sẽ tự động áp dụng màu thương hiệu của bạn',
  'Bạn có thể tạo lại ảnh từng slide sau khi hoàn tất',
  'Phong cách "Trượt liền mạch" giữ tính liên tục giữa các slide',
  'Prompt được tối ưu riêng cho từng nền tảng',
];

type SlideStatus = 'pending' | 'generating' | 'done' | 'error';

interface CarouselGenerationTrackerProps {
  /** Called when user clicks back */
  onBack: () => void;
  /** Called when user clicks minimize */
  onMinimize?: () => void;
  /** Reports progress changes to parent */
  onProgressChange?: (data: { overallPercent: number; statusText: string; allDone: boolean }) => void;
  /** The carousel form data topic for display */
  topic: string;
  platform: string;
  slideCount: number;
  /** Phase 1: prompt generation status */
  promptGenerating: boolean;
  /** The carousel result once prompt is done */
  carousel: Carousel | null;
  /** Called when all done + user clicks "View results" */
  onViewResults: (carousel: Carousel) => void;
}

// Brand-color extraction & series-bible helpers were moved to
// src/lib/carouselImageBatch.ts so the image batch can be launched from
// CarouselGenerationContext (UI-independent). The tracker no longer needs them.


export function CarouselGenerationTracker({
  onBack,
  onMinimize,
  onProgressChange,
  topic,
  platform,
  slideCount,
  promptGenerating,
  carousel,
  onViewResults,
}: CarouselGenerationTrackerProps) {
  // Phase 1 state — bound to real stream phase from context
  const { activeJob } = useCarouselGeneration();
  const currentPhase: CarouselGenPhase = activeJob?.phase || (promptGenerating ? 'planning' : 'init');
  const promptDone = !!carousel && !promptGenerating;
  const promptStep = promptDone ? PROMPT_STEPS.length : phaseToStepIndex(currentPhase);

  // Live slide reveal info from context
  const revealCompleted = activeJob?.completedSlides || 0;
  const revealTotal = activeJob?.totalSlides || slideCount;
  const lastRevealedSlide = revealCompleted > 0 ? activeJob?.partialSlides?.[revealCompleted - 1] : undefined;

  // Phase 2 state — observe background generation tasks (auto-launched by context)
  const [slideStatuses, setSlideStatuses] = useState<SlideStatus[]>([]);
  const [imageGenStarted, setImageGenStarted] = useState(false);
  const [imageGenDone, setImageGenDone] = useState(false);
  const [backgroundTaskId, setBackgroundTaskId] = useState<string | null>(null);

  const { fireConfetti } = useConfetti();
  const { user } = useAuth();

  // Background generation hook
  const { activeTasks } = useBackgroundGeneration({
    onTaskComplete: (task) => {
      if (task.id === backgroundTaskId || task.input_params?.carouselId === carousel?.id) {
        setImageGenDone(true);
        fireConfetti();
        // Parse result_metadata for slide statuses
        const meta = (task as any).result_metadata;
        if (meta?.results) {
          const newStatuses: SlideStatus[] = [];
          for (const r of meta.results) {
            newStatuses[r.slideNumber - 1] = r.success ? 'done' : 'error';
          }
          setSlideStatuses(newStatuses);
        } else {
          // Fallback: mark all as done
          setSlideStatuses(Array(slideCount).fill('done'));
        }
      }
    },
    onTaskError: (task) => {
      if (task.id === backgroundTaskId || task.input_params?.carouselId === carousel?.id) {
        setImageGenDone(true);
        toast.error(task.error_message || 'Tạo ảnh thất bại');
        setSlideStatuses(Array(slideCount).fill('error'));
      }
    },
    onTaskProgress: (task) => {
      if (task.id === backgroundTaskId || task.input_params?.carouselId === carousel?.id) {
        // Update slide statuses from progress
        const step = task.current_step;
        if (step?.startsWith('slide_')) {
          const slideNum = parseInt(step.replace('slide_', ''));
          if (!isNaN(slideNum)) {
            setSlideStatuses(prev => {
              const next = [...prev];
              // Mark previous slides as done if they aren't error
              for (let i = 0; i < slideNum - 1; i++) {
                if (next[i] !== 'error') next[i] = 'done';
              }
              next[slideNum - 1] = 'generating';
              return next;
            });
          }
        }
      }
    },
  });

  const promptNotifiedRef = useRef(false);
  const doneNotifiedRef = useRef(false);

  // Timer
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  // Tips
  const [tipIndex, setTipIndex] = useState(0);

  // (Prompt step is now derived from real stream phase — no fake timer)

  // Elapsed timer
  useEffect(() => {
    if (imageGenDone) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, imageGenDone]);

  // Rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % TIPS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Initialize slide statuses
  useEffect(() => {
    if (carousel && slideStatuses.length === 0) {
      setSlideStatuses(Array(carousel.slides_content.length).fill('pending'));
    }
  }, [carousel, slideStatuses.length]);

  // Check if there's already an active task for this carousel
  useEffect(() => {
    if (!carousel?.id) return;
    const existingTask = activeTasks.find(
      t => t.task_type === 'carousel_image' && t.input_params?.carouselId === carousel.id
    );
    if (existingTask) {
      setBackgroundTaskId(existingTask.id);
      setImageGenStarted(true);
    }
  }, [carousel?.id, activeTasks]);

  // Phase 2 image generation is now launched automatically by
  // CarouselGenerationContext (independent of UI mount) right after the
  // carousel prompt completes. The tracker just observes activeTasks.
  // We keep a defensive fallback: if for some reason no task was created
  // (e.g. tracker opened on an existing carousel without auto flag), allow
  // a manual launch via launchCarouselImageBatch when an explicit need arises.
  // No proactive useEffect here.

  // Progress calculation
  const promptProgress = promptDone ? PROMPT_STEPS.length : promptStep;
  const imageProgress = slideStatuses.filter(s => s === 'done' || s === 'error').length;
  const totalSteps = PROMPT_STEPS.length + slideCount;
  const completedSteps = promptProgress + imageProgress;
  const overallPercent = Math.round((completedSteps / totalSteps) * 100);

  const allDone = imageGenDone;
  const successCount = slideStatuses.filter(s => s === 'done').length;
  const errorCount = slideStatuses.filter(s => s === 'error').length;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const generatingSlides = slideStatuses
    .map((s, idx) => s === 'generating' ? idx + 1 : -1)
    .filter(n => n > 0);

  // Get active task's progress message if available
  const activeTask = activeTasks.find(
    t => t.id === backgroundTaskId || t.input_params?.carouselId === carousel?.id
  );
  const taskProgressMessage = activeTask?.progress_message;

  const currentStatusText = allDone
    ? '✅ Hoàn tất!'
    : imageGenStarted
      ? taskProgressMessage || (
          generatingSlides.length > 1
            ? `Đang tạo ảnh slide ${generatingSlides.join(', ')}...`
            : generatingSlides.length === 1
              ? `Đang tạo ảnh slide ${generatingSlides[0]}...`
              : 'Đang xử lý dưới nền...'
        )
      : promptDone
        ? 'Đang chuẩn bị tạo ảnh...'
        : currentPhase === 'syncing'
          ? 'Đang đồng bộ kết quả...'
          : currentPhase === 'revealing' && revealTotal > 0
            ? `Đang viết slide ${Math.min(revealCompleted + 1, revealTotal)}/${revealTotal}...`
            : activeJob?.currentStep || PROMPT_STEPS[promptStep]?.label || 'Đang xử lý...';

  // Report progress to parent
  useEffect(() => {
    onProgressChange?.({ overallPercent, statusText: currentStatusText, allDone });
  }, [overallPercent, currentStatusText, allDone, onProgressChange]);

  // Notification: Phase 1 done (with dedup guard)
  useEffect(() => {
    if (promptDone && user && carousel?.id && !promptNotifiedRef.current) {
      promptNotifiedRef.current = true;
      // Check for existing notification before inserting
      supabase.from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'carousel_prompt_done')
        .contains('data', { carousel_id: carousel.id })
        .limit(1)
        .then(({ data: existing }) => {
          if (existing && existing.length > 0) return;
          supabase.from('notifications').insert({
            user_id: user.id,
            type: 'carousel_prompt_done',
            title: 'Nội dung carousel đã sẵn sàng',
            message: `Nội dung ${slideCount} slide cho "${topic}" đã được tạo xong. Đang tiến hành tạo ảnh...`,
            data: { carousel_id: carousel.id },
          }).then(({ error }) => { if (error) console.error('Notification insert error:', error); });
        });
    }
  }, [promptDone, user, carousel?.id, slideCount, topic]);

  // Notification: All done
  useEffect(() => {
    if (allDone && user && !doneNotifiedRef.current) {
      doneNotifiedRef.current = true;
      supabase.from('notifications').insert({
        user_id: user.id,
        type: 'carousel_generation_complete',
        title: 'Carousel đã hoàn tất!',
        message: `${successCount}/${slideCount} slide đã tạo ảnh thành công cho "${topic}"`,
        data: { carousel_id: carousel?.id, success_count: successCount, total_count: slideCount },
      }).then(({ error }) => { if (error) console.error('Notification insert error:', error); });
    }
  }, [allDone, user, carousel, successCount, slideCount, topic]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="p-3 sm:p-6 max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">{topic}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                {platform === 'facebook' ? 'Facebook' : 'TikTok'}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{slideCount} slides</span>
            </div>
          </div>
          {onMinimize && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMinimize}
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              title="Thu nhỏ"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Phase 1: Prompt Generation */}
        <Card className={cn(
          "border transition-all duration-500",
          promptDone
            ? "border-primary/20 bg-primary/5"
            : "border-primary/40 bg-primary/5 shadow-[0_0_15px_-5px_hsl(var(--primary)/0.3)]"
        )}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                promptDone
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/20 text-primary"
              )}>
                {promptDone ? <Check className="w-3.5 h-3.5" /> : '1'}
              </div>
              <span className="text-sm font-semibold text-foreground">Tạo Prompt</span>
              {promptDone && (
                <Badge variant="default" className="text-[10px] h-4 px-1.5 bg-primary/20 text-primary border-0">
                  Xong
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              {PROMPT_STEPS.map((step, idx) => {
                const isDone = idx < promptStep || promptDone;
                const isActive = idx === promptStep && !promptDone;
                const isWritingStep = step.id === 'writing';
                const showLiveCount =
                  isActive && isWritingStep && currentPhase === 'revealing' && revealTotal > 0;
                const label = showLiveCount
                  ? `Đang viết slide ${Math.min(revealCompleted + 1, revealTotal)}/${revealTotal}`
                  : step.label;
                return (
                  <div key={step.id}>
                    <div
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-300',
                        isActive && 'bg-background/80',
                        isDone && 'opacity-60',
                        !isActive && !isDone && 'opacity-30'
                      )}
                    >
                      <span className="w-5 flex items-center justify-center">
                        {isDone ? (
                          <Check className="w-4 h-4 text-primary" />
                        ) : isActive ? (
                          <step.icon className="w-4 h-4 text-primary animate-pulse" />
                        ) : (
                          <step.icon className="w-4 h-4 text-muted-foreground" />
                        )}
                      </span>
                      <span
                        className={cn(
                          'text-xs flex-1',
                          isActive && 'font-medium text-foreground',
                          isDone && 'text-muted-foreground line-through'
                        )}
                      >
                        {label}
                      </span>
                      {isActive && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                    </div>

                    {/* Live preview of last revealed slide under "writing" step */}
                    {isActive && isWritingStep && lastRevealedSlide && (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={revealCompleted}
                          initial={{ opacity: 0, y: -3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="ml-10 mr-2 mt-0.5 mb-1 px-2 py-1 rounded-md bg-primary/5 border border-primary/10"
                        >
                          <p className="text-[10px] text-muted-foreground leading-snug">
                            <span className="text-primary font-medium">
                              Slide {lastRevealedSlide.slideNumber} ✓
                            </span>{' '}
                            <span className="line-clamp-1">{lastRevealedSlide.objective}</span>
                          </p>
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Phase 2: Image Generation */}
        <Card className={cn(
          "border transition-all duration-500",
          imageGenDone
            ? "border-primary/20 bg-primary/5"
            : imageGenStarted
              ? "border-primary/40 bg-primary/5 shadow-[0_0_15px_-5px_hsl(var(--primary)/0.3)]"
              : "border-border/50 bg-muted/5 opacity-60"
        )}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                imageGenDone
                  ? "bg-primary text-primary-foreground"
                  : imageGenStarted
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              )}>
                {imageGenDone ? <Check className="w-3.5 h-3.5" /> : '2'}
              </div>
              <span className="text-sm font-semibold text-foreground">Tạo Ảnh</span>
              {imageGenDone && (
                <Badge variant="default" className="text-[10px] h-4 px-1.5 bg-primary/20 text-primary border-0">
                  {successCount}/{slideCount} ảnh
                </Badge>
              )}
            </div>

            {/* Slide grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {Array.from({ length: slideCount }, (_, i) => {
                const status: SlideStatus = slideStatuses[i] || 'pending';
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg border text-xs font-medium transition-all duration-300",
                      status === 'done' && "bg-primary/10 border-primary/30 text-primary",
                      status === 'generating' && "bg-primary/5 border-primary/40 text-primary animate-pulse",
                      status === 'error' && "bg-destructive/10 border-destructive/30 text-destructive",
                      status === 'pending' && "bg-muted/30 border-border/50 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {status === 'done' && <Check className="w-3 h-3" />}
                      {status === 'generating' && <Loader2 className="w-3 h-3 animate-spin" />}
                      {status === 'error' && <AlertCircle className="w-3 h-3" />}
                      {status === 'pending' && <Circle className="w-3 h-3 opacity-40" />}
                      <span>Slide {i + 1}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Progress bar + status */}
        <div className="space-y-2">
          <Progress value={overallPercent} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              {!allDone && <Loader2 className="w-3 h-3 animate-spin" />}
              {currentStatusText}
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <Clock className="w-3 h-3" />
              {formatTime(elapsed)} · {overallPercent}%
            </span>
          </div>
        </div>

        {/* Tip */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tipIndex}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/30"
          >
            <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground">{TIPS[tipIndex]}</p>
          </motion.div>
        </AnimatePresence>

        {/* Completion CTA */}
        {allDone && carousel && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-3 py-4"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Carousel đã sẵn sàng!</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {successCount} ảnh thành công
                {errorCount > 0 && `, ${errorCount} lỗi`}
                {' · '}{formatTime(elapsed)}
              </p>
            </div>
            <Button
              onClick={() => onViewResults(carousel)}
              className="gap-2 gradient-primary"
            >
              <Eye className="w-4 h-4" />
              Xem kết quả
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
