import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCarouselGeneration } from '@/contexts/CarouselGenerationContext';
import { CarouselMiniTracker } from './CarouselMiniTracker';

/**
 * Global floating mini-tracker for background carousel prompt generation.
 * Renders on every authenticated route — survives navigation.
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

  // Estimated 60s total; cap at 95% while generating
  const estimatedTotal = 60;
  const rawPercent = Math.min(95, Math.floor((elapsed / estimatedTotal) * 100));
  const percent = activeJob.status === 'done' ? 100 : activeJob.status === 'error' ? 0 : rawPercent;

  const statusText =
    activeJob.status === 'done'
      ? 'Carousel sẵn sàng'
      : activeJob.status === 'error'
        ? 'Tạo thất bại'
        : `Đang tạo prompts... ${elapsed}s`;

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
