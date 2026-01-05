import { useEffect, useState, useCallback, CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCoachmark } from './CoachmarkContext';
import { CoachmarkTooltip } from './CoachmarkTooltip';
import confetti from 'canvas-confetti';

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function CoachmarkOverlay() {
  const { isActive, currentStep, steps, next, prev, skip, complete } = useCoachmark();
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  // Find and measure target element
  const measureTarget = useCallback(() => {
    if (!step) return;

    const element = document.querySelector(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      // If element not found, center the tooltip
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (isActive) {
      measureTarget();
      window.addEventListener('resize', measureTarget);
      window.addEventListener('scroll', measureTarget);
      return () => {
        window.removeEventListener('resize', measureTarget);
        window.removeEventListener('scroll', measureTarget);
      };
    }
  }, [isActive, measureTarget]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        prev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, next, prev, skip]);

  // Confetti on complete
  const handleNext = useCallback(() => {
    if (isLast) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
    next();
  }, [isLast, next]);

  const handleComplete = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
    complete();
  }, [complete]);

  // Calculate tooltip position
  const getTooltipPosition = (): CSSProperties => {
    if (!targetRect || step.placement === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = step.spotlightPadding || 12;
    const tooltipOffset = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 200; // Approximate

    switch (step.placement) {
      case 'bottom':
        return {
          top: targetRect.top + targetRect.height + padding + tooltipOffset,
          left: Math.max(16, Math.min(
            targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - 16
          )),
        };
      case 'top':
        return {
          top: targetRect.top - padding - tooltipOffset - tooltipHeight,
          left: Math.max(16, Math.min(
            targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - 16
          )),
        };
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.left - padding - tooltipOffset - tooltipWidth,
        };
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.left + targetRect.width + padding + tooltipOffset,
        };
      default:
        return {
          top: targetRect.top + targetRect.height + padding + tooltipOffset,
          left: targetRect.left,
        };
    }
  };

  if (!isActive || !step) return null;

  const padding = step.spotlightPadding || 12;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000]"
      >
        {/* SVG Spotlight Overlay */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect fill="white" width="100%" height="100%" />
              {targetRect && (
                <rect
                  fill="black"
                  x={targetRect.left - padding}
                  y={targetRect.top - padding}
                  width={targetRect.width + padding * 2}
                  height={targetRect.height + padding * 2}
                  rx="12"
                />
              )}
            </mask>
          </defs>
          <rect
            fill="rgba(0,0,0,0.7)"
            width="100%"
            height="100%"
            mask="url(#spotlight-mask)"
            className="backdrop-blur-sm"
          />
        </svg>

        {/* Spotlight border glow */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute rounded-xl border-2 border-primary/50 shadow-lg shadow-primary/20"
            style={{
              top: targetRect.top - padding,
              left: targetRect.left - padding,
              width: targetRect.width + padding * 2,
              height: targetRect.height + padding * 2,
            }}
          >
            {/* Pulse animation */}
            <div className="absolute inset-0 rounded-xl border-2 border-primary/30 animate-pulse" />
          </motion.div>
        )}

        {/* Tooltip */}
        <CoachmarkTooltip
          step={step}
          currentIndex={currentStep}
          totalSteps={steps.length}
          position={getTooltipPosition()}
          placement={step.placement}
          onNext={handleNext}
          onPrev={prev}
          onSkip={skip}
          onComplete={handleComplete}
        />
      </motion.div>
    </AnimatePresence>
  );
}
