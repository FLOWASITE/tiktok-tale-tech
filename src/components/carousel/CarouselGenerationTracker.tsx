import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Carousel } from '@/types/carousel';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { useCarouselImages } from '@/hooks/useCarouselImages';
import { useConfetti } from '@/hooks/useConfetti';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  Check,
  Loader2,
  Circle,
  Images,
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

function extractColorPalette(slide: any): string[] | null {
  const text = slide?.colorLayout || slide?.designStyle || '';
  const hexColors = text.match(/#[0-9A-Fa-f]{3,8}/g);
  return hexColors && hexColors.length > 0 ? hexColors : null;
}

function extractBrandColors(carousel: Carousel): { textColor?: string; backgroundColor?: string } | undefined {
  if (!carousel.brand_guideline) return undefined;
  try {
    const parsed = typeof carousel.brand_guideline === 'string'
      ? JSON.parse(carousel.brand_guideline)
      : carousel.brand_guideline;
    if (parsed?.colors || parsed?.primaryColor || parsed?.textColor) {
      return {
        textColor: parsed.textColor || parsed.colors?.text || parsed.colors?.primary,
        backgroundColor: parsed.backgroundColor || parsed.colors?.background || parsed.colors?.secondary,
      };
    }
  } catch {
    const hexColors = (carousel.brand_guideline as string).match(/#[0-9A-Fa-f]{3,8}/g);
    if (hexColors && hexColors.length >= 2) return { textColor: hexColors[0], backgroundColor: hexColors[1] };
    if (hexColors && hexColors.length === 1) return { textColor: hexColors[0] };
  }
  return undefined;
}

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
  // Phase 1 state
  const [promptStep, setPromptStep] = useState(0);
  const promptDone = !!carousel && !promptGenerating;

  // Phase 2 state
  const { generateImage, generatedImages, setImages } = useImageGeneration();
  const { images: savedImages, saveImage } = useCarouselImages(carousel?.id || '');
  const [slideStatuses, setSlideStatuses] = useState<SlideStatus[]>([]);
  const [imageGenStarted, setImageGenStarted] = useState(false);
  const [imageGenDone, setImageGenDone] = useState(false);
  const imageGenRunningRef = useRef(false);

  // Timer
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  // Tips
  const [tipIndex, setTipIndex] = useState(0);

  const { fireConfetti } = useConfetti();
  const { user } = useAuth();
  const promptNotifiedRef = useRef(false);
  const doneNotifiedRef = useRef(false);

  // Rotate prompt steps during Phase 1
  useEffect(() => {
    if (promptDone) {
      setPromptStep(PROMPT_STEPS.length); // all done
      return;
    }
    if (!promptGenerating) return;
    const interval = setInterval(() => {
      setPromptStep(prev => Math.min(prev + 1, PROMPT_STEPS.length - 1));
    }, 2500);
    return () => clearInterval(interval);
  }, [promptGenerating, promptDone]);

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

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

  // Phase 2: Auto-start image generation when prompt is done
  const runImageGeneration = useCallback(async () => {
    if (!carousel || imageGenRunningRef.current) return;
    imageGenRunningRef.current = true;
    setImageGenStarted(true);

    const colorPalette = carousel.slides_content.length > 0
      ? extractColorPalette(carousel.slides_content[0])
      : null;
    const brandColors = extractBrandColors(carousel);

    const MAX_ATTEMPTS = 3;
    const INTER_BATCH_DELAY = 2500;
    const BATCH_SIZE = 3;
    const localStatuses: SlideStatus[] = Array(carousel.slides_content.length).fill('pending');

    // Extract shared visual world from first slide's prompt
    // Gemini Pro already designed all slides in the same "visual world"
    // Each fullPrompt ends with "consistent with previous slides: [description]"
    const sharedVisualWorld = (() => {
      const firstPrompt = carousel.slides_content[0]?.fullPrompt || '';
      const match = firstPrompt.match(/consistent with (?:previous slides|series):\s*(.+?)$/im);
      return match?.[1]?.trim() || carousel.slides_content[0]?.designStyle || '';
    })();
    console.log(`[tracker] Shared visual world: "${sharedVisualWorld.slice(0, 100)}..."`);

    const attemptGenerateSlide = async (i: number): Promise<boolean> => {
      const slide = carousel.slides_content[i];

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        localStatuses[i] = 'generating';
        setSlideStatuses(prev => {
          const next = [...prev];
          next[i] = 'generating';
          return next;
        });

        const result = await generateImage(slide.fullPrompt, carousel.id, slide.slideNumber, {
          textContent: slide.textContent,
          platform: carousel.platform,
          brandColors,
          carouselStyle: carousel.carousel_style,
          totalSlides: carousel.slides_content.length,
          slideObjective: slide.objective,
          visualPreset: carousel.visual_preset || 'minimalist',
          carouselTopic: carousel.topic,
          seamlessContext: {
            colorPalette,
            previousSceneDescription: sharedVisualWorld || null,
            sequencePosition: slide.slideNumber,
            totalInSequence: carousel.slides_content.length,
          },
        });

        if (result?.imageUrl) {
          await saveImage(slide.slideNumber, result.imageUrl, slide.fullPrompt);
          localStatuses[i] = 'done';
          setSlideStatuses(prev => {
            const next = [...prev];
            next[i] = 'done';
            return next;
          });
          return true;
        }

        // Failed — backoff before retry
        if (attempt < MAX_ATTEMPTS) {
          console.log(`[tracker] Slide ${i + 1} attempt ${attempt} failed, retrying in ${3000 * attempt}ms...`);
          await new Promise(r => setTimeout(r, 3000 * attempt));
        }
      }

      // All attempts exhausted
      localStatuses[i] = 'error';
      setSlideStatuses(prev => {
        const next = [...prev];
        next[i] = 'error';
        return next;
      });
      return false;
    };

    // Main pass — batch parallel (3 slides at a time)
    for (let batchStart = 0; batchStart < carousel.slides_content.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, carousel.slides_content.length);
      const batchIndices = Array.from({ length: batchEnd - batchStart }, (_, k) => batchStart + k);

      console.log(`[tracker] Batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: slides ${batchIndices.map(i => i + 1).join(', ')}`);

      await Promise.allSettled(batchIndices.map(idx => attemptGenerateSlide(idx)));

      // Inter-batch delay
      if (batchEnd < carousel.slides_content.length) {
        await new Promise(r => setTimeout(r, INTER_BATCH_DELAY));
      }
    }

    // Retry pass: sequential for failed slides
    const retryIndices = localStatuses
      .map((s, idx) => s === 'error' ? idx : -1)
      .filter(idx => idx >= 0);

    if (retryIndices.length > 0) {
      console.log(`[tracker] Retry pass for ${retryIndices.length} failed slides: ${retryIndices.map(i => i + 1).join(', ')}`);
      for (const idx of retryIndices) {
        await new Promise(r => setTimeout(r, 5000));
        await attemptGenerateSlide(idx);
      }
    }

    setImageGenDone(true);
    fireConfetti();
  }, [carousel, generateImage, saveImage, fireConfetti]);

  // Stable ref to avoid timer resets from re-renders
  const runImageGenRef = useRef(runImageGeneration);
  runImageGenRef.current = runImageGeneration;

  useEffect(() => {
    if (promptDone && !imageGenStarted) {
      const timer = setTimeout(() => runImageGenRef.current(), 500);
      return () => clearTimeout(timer);
    }
  }, [promptDone, imageGenStarted]);

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

  const currentStatusText = allDone
    ? '✅ Hoàn tất!'
    : imageGenStarted
      ? generatingSlides.length > 1
        ? `Đang tạo ảnh slide ${generatingSlides.join(', ')}...`
        : generatingSlides.length === 1
          ? `Đang tạo ảnh slide ${generatingSlides[0]}...`
          : 'Đang xử lý...'
      : promptDone
        ? 'Đang chuẩn bị tạo ảnh...'
        : PROMPT_STEPS[promptStep]?.label || 'Đang xử lý...';

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
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-300",
                      isActive && "bg-background/80",
                      isDone && "opacity-60",
                      !isActive && !isDone && "opacity-30"
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
                    <span className={cn(
                      "text-xs flex-1",
                      isActive && "font-medium text-foreground",
                      isDone && "text-muted-foreground line-through"
                    )}>
                      {step.label}
                    </span>
                    {isActive && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
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
                      "flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all duration-300",
                      status === 'done' && "bg-primary/10 border-primary/30 text-primary",
                      status === 'generating' && "bg-primary/5 border-primary/40 text-primary animate-pulse",
                      status === 'error' && "bg-destructive/10 border-destructive/30 text-destructive",
                      status === 'pending' && "bg-muted/30 border-border/50 text-muted-foreground"
                    )}
                  >
                    {status === 'done' && <Check className="w-3 h-3" />}
                    {status === 'generating' && <Loader2 className="w-3 h-3 animate-spin" />}
                    {status === 'error' && <AlertCircle className="w-3 h-3" />}
                    {status === 'pending' && <Circle className="w-3 h-3 opacity-40" />}
                    <span>Slide {i + 1}</span>
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
