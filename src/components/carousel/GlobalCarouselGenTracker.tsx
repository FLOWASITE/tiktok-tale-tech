import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCarouselGeneration } from '@/contexts/CarouselGenerationContext';
import { useBackgroundGeneration } from '@/hooks/useBackgroundGeneration';
import { CarouselMiniTracker } from './CarouselMiniTracker';
import { CarouselGenExpandedPanel } from './CarouselGenExpandedPanel';

/**
 * Global floating tracker for carousel prompt streaming.
 * - Mini bar by default
 * - Expand → floating panel with partial slide previews
 * - Cancel / retry / dismiss controls
 * - Smooth tweened progress + ETA
 * - After prompt done, also surfaces auto-launched image batch progress
 */
export function GlobalCarouselGenTracker() {
  const { activeJob, dismissJob, cancelJob, retryJob } = useCarouselGeneration();
  const { activeTasks } = useBackgroundGeneration();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [tweenedPercent, setTweenedPercent] = useState(0);

  // Elapsed timer
  useEffect(() => {
    if (!activeJob || activeJob.status !== 'generating') return;
    const tick = () => setElapsed(Math.floor((Date.now() - activeJob.startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeJob]);

  // Tween percent (rAF-based smooth interpolation; stops on settle/error)
  useEffect(() => {
    if (!activeJob) {
      setTweenedPercent(0);
      return;
    }
    if (activeJob.status === 'error' || activeJob.status === 'cancelled') return;

    const target =
      activeJob.status === 'done'
        ? 100
        : Math.min(99, Math.max(activeJob.progress || 0, Math.min(95, Math.floor((elapsed / 60) * 100))));

    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(120, now - last);
      last = now;
      setTweenedPercent((prev) => {
        const diff = target - prev;
        if (Math.abs(diff) < 0.3) return target;
        const k = 1 - Math.pow(1 - 0.25, dt / 80);
        return prev + diff * k;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [activeJob, elapsed]);

  if (!activeJob) return null;

  const percent = Math.round(tweenedPercent);

  // Find image-batch task tied to this carousel (auto-launched by context)
  const imageTask = activeJob.carousel?.id
    ? activeTasks.find(
        (t) =>
          t.task_type === 'carousel_image' &&
          (t.input_params as any)?.carouselId === activeJob.carousel?.id,
      )
    : undefined;

  const imagePhaseActive = activeJob.status === 'done' && !!imageTask;

  const etaText = (() => {
    if (imagePhaseActive) return null;
    if (activeJob.status !== 'generating') return null;
    if (activeJob.phase === 'syncing') return 'Đồng bộ...';
    if (activeJob.phase === 'revealing' && activeJob.completedSlides > 0 && activeJob.totalSlides > 0 && elapsed > 2) {
      const perSlide = elapsed / activeJob.completedSlides;
      const remaining = Math.max(0, Math.round(perSlide * (activeJob.totalSlides - activeJob.completedSlides)));
      if (remaining === 0) return 'Sắp xong...';
      if (remaining < 60) return `Còn ~${remaining}s`;
      return `Còn ~${Math.ceil(remaining / 60)}m`;
    }
    return `${elapsed}s`;
  })();

  const statusText = (() => {
    if (imagePhaseActive) {
      const total = (imageTask!.input_params as any)?.slides?.length || activeJob.totalSlides || 0;
      const step = imageTask!.current_step;
      const m = step?.match(/slide_(\d+)/);
      if (m) return `Đang tạo ảnh slide ${m[1]}/${total}`;
      if (imageTask!.progress_message) return imageTask!.progress_message;
      return total ? `Đang tạo ảnh nền (${total} slides)...` : 'Đang tạo ảnh nền...';
    }
    if (activeJob.status === 'done') return 'Carousel sẵn sàng';
    if (activeJob.status === 'cancelled') return 'Đã hủy';
    if (activeJob.status === 'error') return activeJob.error || 'Tạo thất bại';
    if (activeJob.phase === 'syncing') return 'Đang đồng bộ kết quả từ máy chủ...';
    if (activeJob.revealingSlideMeta?.objective && activeJob.revealingSlide) {
      return `Slide ${activeJob.revealingSlide}: ${activeJob.revealingSlideMeta.objective}`;
    }
    if (activeJob.revealingSlide && activeJob.totalSlides > 0) {
      return `Đang viết slide ${activeJob.revealingSlide}/${activeJob.totalSlides}...`;
    }
    if (activeJob.currentStep) {
      if (activeJob.totalSlides > 0 && activeJob.completedSlides > 0 && activeJob.phase === 'revealing') {
        return `${activeJob.currentStep} (${activeJob.completedSlides}/${activeJob.totalSlides})`;
      }
      return activeJob.currentStep;
    }
    return 'Đang khởi tạo...';
  })();

  const effectivePercent = imagePhaseActive
    ? Math.max(0, Math.min(100, imageTask!.progress || 0))
    : percent;
  const imageSlideTotal = imagePhaseActive
    ? ((imageTask!.input_params as any)?.slides?.length || activeJob.totalSlides || 0)
    : 0;
  const imageSlideDone = imagePhaseActive
    ? (() => {
        const m = imageTask!.current_step?.match(/slide_(\d+)/);
        return m ? Math.max(0, parseInt(m[1], 10) - 1) : 0;
      })()
    : 0;

  const handleOpenCarousel = () => {
    navigate('/carousel');
    if (activeJob.status === 'done') dismissJob(activeJob.id);
  };

  return (
    <AnimatePresence mode="wait">
      {expanded ? (
        <CarouselGenExpandedPanel
          key={`exp-${activeJob.id}`}
          job={activeJob}
          percent={effectivePercent}
          statusText={statusText}
          etaText={etaText}
          onCollapse={() => setExpanded(false)}
          onCancel={activeJob.status === 'generating' ? () => cancelJob(activeJob.id) : undefined}
          onRetry={
            activeJob.status === 'error' || activeJob.status === 'cancelled'
              ? () => retryJob(activeJob.id)
              : undefined
          }
          onDismiss={
            !imagePhaseActive &&
            (activeJob.status === 'done' || activeJob.status === 'error' || activeJob.status === 'cancelled')
              ? () => {
                  dismissJob(activeJob.id);
                  setExpanded(false);
                }
              : undefined
          }
          onOpenCarousel={activeJob.status === 'done' && activeJob.carousel ? handleOpenCarousel : undefined}
        />
      ) : (
        <CarouselMiniTracker
          key={`mini-${activeJob.id}`}
          overallPercent={effectivePercent}
          statusText={statusText}
          etaText={etaText}
          totalSlides={imagePhaseActive ? imageSlideTotal : activeJob.totalSlides}
          completedSlides={imagePhaseActive ? imageSlideDone : activeJob.completedSlides}
          status={imagePhaseActive ? 'generating' : activeJob.status}
          onExpand={() => setExpanded(true)}
          onViewResults={
            activeJob.status === 'done' && activeJob.carousel ? handleOpenCarousel : undefined
          }
          onCancel={activeJob.status === 'generating' ? () => cancelJob(activeJob.id) : undefined}
          onRetry={
            activeJob.status === 'error' || activeJob.status === 'cancelled'
              ? () => retryJob(activeJob.id)
              : undefined
          }
          onDismiss={
            !imagePhaseActive &&
            (activeJob.status === 'done' || activeJob.status === 'error' || activeJob.status === 'cancelled')
              ? () => dismissJob(activeJob.id)
              : undefined
          }
        />
      )}
    </AnimatePresence>
  );
}
