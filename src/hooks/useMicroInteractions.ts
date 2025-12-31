import { useCallback, useRef, useEffect, useState } from 'react';
import { useConfetti } from './useConfetti';
import { useSoundEffects } from './useSoundEffects';
import { useToast } from './use-toast';

interface MicroInteractionsOptions {
  enableSounds?: boolean;
  enableConfetti?: boolean;
}

export function useMicroInteractions(options: MicroInteractionsOptions = {}) {
  const { enableSounds = false, enableConfetti = true } = options;
  const { fireConfetti, fireSuccess } = useConfetti();
  const { playSend, playReceive, playNotification } = useSoundEffects(enableSounds);
  const { toast } = useToast();
  const prevCompletenessRef = useRef<number | null>(null);
  const [hasTriggered100, setHasTriggered100] = useState(false);

  // Celebrate 100% completeness
  const celebrateCompleteness = useCallback((currentScore: number) => {
    // Only trigger if we just reached 100% (wasn't 100% before)
    if (
      currentScore === 100 && 
      prevCompletenessRef.current !== null && 
      prevCompletenessRef.current < 100 &&
      !hasTriggered100
    ) {
      if (enableConfetti) {
        fireConfetti();
      }
      if (enableSounds) {
        playNotification();
      }
      toast({
        title: "🎉 Hoàn thiện 100%!",
        description: "Brand của bạn đã hoàn thiện đầy đủ thông tin!",
        className: "border-emerald-500/50 bg-emerald-500/5",
      });
      setHasTriggered100(true);
    }
    prevCompletenessRef.current = currentScore;
  }, [enableConfetti, enableSounds, fireConfetti, playNotification, toast, hasTriggered100]);

  // Action completed feedback
  const onActionComplete = useCallback((action: 'save' | 'delete' | 'create' | 'update') => {
    if (enableSounds) {
      if (action === 'save' || action === 'create') {
        playSend();
      } else {
        playReceive();
      }
    }
  }, [enableSounds, playSend, playReceive]);

  // Success celebration (mini confetti)
  const celebrateSuccess = useCallback(() => {
    if (enableConfetti) {
      fireSuccess();
    }
    if (enableSounds) {
      playNotification();
    }
  }, [enableConfetti, enableSounds, fireSuccess, playNotification]);

  // Ripple effect handler
  const createRipple = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: currentColor;
      opacity: 0.2;
      border-radius: 50%;
      transform: scale(0);
      animation: ripple-effect 0.6s linear;
      pointer-events: none;
    `;

    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);

    ripple.addEventListener('animationend', () => {
      ripple.remove();
    });
  }, []);

  return {
    celebrateCompleteness,
    onActionComplete,
    celebrateSuccess,
    createRipple,
    fireConfetti,
    fireSuccess,
  };
}

// Hook to track completeness and auto-celebrate
export function useCompletenessTracker(score: number | undefined) {
  const { celebrateCompleteness } = useMicroInteractions({ enableConfetti: true });
  
  useEffect(() => {
    if (score !== undefined) {
      celebrateCompleteness(score);
    }
  }, [score, celebrateCompleteness]);
}
