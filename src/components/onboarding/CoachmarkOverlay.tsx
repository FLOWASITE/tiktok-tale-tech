import { useEffect, useState, useCallback, CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCoachmark } from './CoachmarkContext';
import { CoachmarkTooltip } from './CoachmarkTooltip';

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function CoachmarkOverlay() {
  const { isActive, currentStep, steps, next, prev, skip, complete } = useCoachmark();
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  // Scroll element into view and measure
  const scrollAndMeasure = useCallback(() => {
    if (!step) return;

    const element = document.querySelector(step.target);
    if (element) {
      // Check if element is in viewport
      const rect = element.getBoundingClientRect();
      const isInViewport = 
        rect.top >= 0 &&
        rect.bottom <= window.innerHeight;

      if (!isInViewport) {
        setIsScrolling(true);
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        // Wait for scroll to finish
        setTimeout(() => {
          const newRect = element.getBoundingClientRect();
          setTargetRect({
            top: newRect.top,
            left: newRect.left,
            width: newRect.width,
            height: newRect.height,
          });
          setIsScrolling(false);
        }, 400);
      } else {
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }
    } else {
      setTargetRect(null);
    }
  }, [step]);

  // Measure on step change
  useEffect(() => {
    if (isActive) {
      scrollAndMeasure();
    }
  }, [isActive, currentStep, scrollAndMeasure]);

  // Update position on resize/scroll
  useEffect(() => {
    if (!isActive) return;

    const handleUpdate = () => {
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
      }
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);
    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isActive, step]);

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

  // Calculate tooltip position with viewport bounds checking
  const getTooltipPosition = (): CSSProperties => {
    if (!targetRect || step.placement === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = step.spotlightPadding || 12;
    const tooltipOffset = 8;
    const isMobile = window.innerWidth < 640;
    const tooltipWidth = isMobile ? 280 : 320;
    // More accurate height estimation
    const tooltipHeight = step.action ? 280 : 200;
    
    // Check available space
    const spaceAbove = targetRect.top - padding;
    const spaceBelow = window.innerHeight - (targetRect.top + targetRect.height + padding);
    const spaceLeft = targetRect.left - padding;
    const spaceRight = window.innerWidth - (targetRect.left + targetRect.width + padding);

    // If target is very tall (like QuickActionGrid), position overlay on top of it
    const targetIsTall = targetRect.height > window.innerHeight * 0.5;
    
    // On mobile with tall targets, show tooltip at fixed bottom position
    if (isMobile && targetIsTall) {
      return {
        bottom: 16,
        left: 16,
        right: 16,
        width: 'auto',
      };
    }

    let position: CSSProperties = {};

    // Determine best placement - use string type to allow 'center'
    let bestPlacement: string = step.placement;
    
    // Auto-adjust placement based on available space
    if (step.placement === 'bottom' && spaceBelow < tooltipHeight + tooltipOffset) {
      bestPlacement = spaceAbove > tooltipHeight + tooltipOffset ? 'top' : 'center';
    } else if (step.placement === 'top' && spaceAbove < tooltipHeight + tooltipOffset) {
      bestPlacement = spaceBelow > tooltipHeight + tooltipOffset ? 'bottom' : 'center';
    }

    // If no good placement found, use center
    if (bestPlacement === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    // Calculate position based on final placement
    switch (bestPlacement) {
      case 'bottom':
        position = {
          top: targetRect.top + targetRect.height + padding + tooltipOffset,
          left: Math.max(12, Math.min(
            targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - 12
          )),
        };
        break;
      case 'top':
        position = {
          top: Math.max(12, targetRect.top - padding - tooltipOffset - tooltipHeight),
          left: Math.max(12, Math.min(
            targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - 12
          )),
        };
        break;
      case 'left':
        position = {
          top: Math.max(20, Math.min(
            targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
            window.innerHeight - tooltipHeight - 20
          )),
          left: Math.max(12, targetRect.left - padding - tooltipOffset - tooltipWidth),
        };
        break;
      case 'right':
        position = {
          top: Math.max(20, Math.min(
            targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
            window.innerHeight - tooltipHeight - 20
          )),
          left: targetRect.left + targetRect.width + padding + tooltipOffset,
        };
        break;
    }

    // Final safety check - ensure tooltip is within viewport
    if (position.top !== undefined && (position.top as number) < 12) {
      position.top = 12;
    }
    if (position.top !== undefined && (position.top as number) + tooltipHeight > window.innerHeight - 12) {
      position.top = window.innerHeight - tooltipHeight - 12;
    }

    return position;
  };

  if (!isActive || !step || isScrolling) return null;

  const padding = step.spotlightPadding || 12;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentStep}
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
                <motion.rect
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
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
            fill="rgba(0,0,0,0.75)"
            width="100%"
            height="100%"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {/* Spotlight border glow */}
        {targetRect && (
          <motion.div
            layoutId="spotlight-border"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute rounded-xl border-2 border-primary shadow-lg shadow-primary/30"
            style={{
              top: targetRect.top - padding,
              left: targetRect.left - padding,
              width: targetRect.width + padding * 2,
              height: targetRect.height + padding * 2,
            }}
          >
            {/* Pulse animation */}
            <div className="absolute inset-0 rounded-xl border-2 border-primary/40 animate-pulse" />
          </motion.div>
        )}

        {/* Tooltip */}
        <CoachmarkTooltip
          step={step}
          currentIndex={currentStep}
          totalSteps={steps.length}
          position={getTooltipPosition()}
          placement={step.placement}
          onNext={next}
          onPrev={prev}
          onSkip={skip}
          onComplete={complete}
        />
      </motion.div>
    </AnimatePresence>
  );
}
