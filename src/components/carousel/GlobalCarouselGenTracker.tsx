import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCarouselGeneration } from '@/contexts/CarouselGenerationContext';
import { CarouselMiniTracker } from './CarouselMiniTracker';

/**
 * Global floating mini-tracker for background carousel prompt generation.
 * Renders on every authenticated route — survives navigation.
 * Uses real streaming progress from SSE events when available.
 */
export function GlobalCarouselGenTracker() {
  const { activeJob, dismissJob } = useCarouselGeneration();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeJob || activeJob.status !== 'generating') return;
    const tick = () => setElapsed(Math.floor((Date.now() - activeJob.startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeJob]);

  if (!activeJob) return null;

  // Prefer real streaming progress; fall back to elapsed-based estimate only if missing.
  const realPercent = typeof activeJob.progress === 'number' ? activeJob.progress : 0;
  const fallbackPercent = Math.min(95, Math.floor((elapsed / 60) * 100));
  const rawPercent = realPercent > 0 ? realPercent : fallbackPercent;
  const percent =
    activeJob.status === 'done' ? 100 :
    activeJob.status === 'error' ? 0 :
    Math.min(99, rawPercent);

  const statusText = (() => {
    if (activeJob.status === 'done') return 'Carousel sẵn sàng';
    if (activeJob.status === 'error') return 'Tạo thất bại';
    if (activeJob.currentStep) {
      if (activeJob.totalSlides > 0 && activeJob.completedSlides > 0) {
        return `${activeJob.currentStep} (${activeJob.completedSlides}/${activeJob.totalSlides})`;
      }
      return activeJob.currentStep;
    }
    return `Đang tạo prompts... ${elapsed}s`;
  })();

  return (
    <AnimatePresence>
      <CarouselMiniTracker
        key={activeJob.id}
        overallPercent={percent}
        statusText={statusText}
        allDone={activeJob.status === 'done'}
        onExpand={() => {
          navigate('/carousel');
          if (activeJob.status !== 'generating') dismissJob(activeJob.id);
        }}
        onViewResults={
          activeJob.status === 'done' && activeJob.carousel
            ? () => {
                navigate('/carousel');
                dismissJob(activeJob.id);
              }
            : undefined
        }
      />
    </AnimatePresence>
  );
}
