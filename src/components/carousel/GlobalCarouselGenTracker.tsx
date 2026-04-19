import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCarouselGeneration } from '@/contexts/CarouselGenerationContext';
import { CarouselMiniTracker } from './CarouselMiniTracker';
import { CarouselGenExpandedPanel } from './CarouselGenExpandedPanel';

/**
 * Global floating tracker for carousel prompt streaming.
 * - Mini bar by default
 * - Expand → floating panel with partial slide previews
 * - Cancel / retry / dismiss controls
 * - Smooth tweened progress + ETA
 */
export function GlobalCarouselGenTracker() {
  const { activeJob, dismissJob, cancelJob, retryJob } = useCarouselGeneration();
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

  // Tween percent (smooth interpolation toward target)
  useEffect(() => {
    if (!activeJob) {
      setTweenedPercent(0);
      return;
    }
    const target =
      activeJob.status === 'done'
        ? 100
        : activeJob.status === 'error' || activeJob.status === 'cancelled'
          ? tweenedPercent
          : Math.min(99, Math.max(activeJob.progress || 0, Math.min(95, Math.floor((elapsed / 60) * 100))));

    const id = setInterval(() => {
      setTweenedPercent((prev) => {
        if (Math.abs(target - prev) < 0.5) return target;
        return prev + (target - prev) * 0.25;
      });
    }, 80);
    return () => clearInterval(id);
  }, [activeJob, elapsed, tweenedPercent]);

  if (!activeJob) return null;

  const percent = Math.round(tweenedPercent);

  // ETA: based on per-slide pace once we have at least one done slide
  const etaText = (() => {
    if (activeJob.status !== 'generating') return null;
    if (activeJob.completedSlides > 0 && activeJob.totalSlides > 0 && elapsed > 2) {
      const perSlide = elapsed / activeJob.completedSlides;
      const remaining = Math.max(0, Math.round(perSlide * (activeJob.totalSlides - activeJob.completedSlides)));
      if (remaining === 0) return 'Sắp xong...';
      if (remaining < 60) return `Còn ~${remaining}s`;
      return `Còn ~${Math.ceil(remaining / 60)}m`;
    }
    return `${elapsed}s`;
  })();

  const statusText = (() => {
    if (activeJob.status === 'done') return 'Carousel sẵn sàng';
    if (activeJob.status === 'cancelled') return 'Đã hủy';
    if (activeJob.status === 'error') return activeJob.error || 'Tạo thất bại';
    if (activeJob.currentStep) {
      if (activeJob.totalSlides > 0 && activeJob.completedSlides > 0) {
        return `${activeJob.currentStep} (${activeJob.completedSlides}/${activeJob.totalSlides})`;
      }
      return activeJob.currentStep;
    }
    return 'Đang khởi tạo...';
  })();

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
          percent={percent}
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
            activeJob.status === 'done' || activeJob.status === 'error' || activeJob.status === 'cancelled'
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
          overallPercent={percent}
          statusText={statusText}
          etaText={etaText}
          totalSlides={activeJob.totalSlides}
          completedSlides={activeJob.completedSlides}
          status={activeJob.status}
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
            activeJob.status === 'done' || activeJob.status === 'error' || activeJob.status === 'cancelled'
              ? () => dismissJob(activeJob.id)
              : undefined
          }
        />
      )}
    </AnimatePresence>
  );
}
