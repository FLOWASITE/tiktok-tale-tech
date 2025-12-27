import { useCallback, useRef, useEffect } from 'react';

// Sound frequencies and durations for different effects
const SOUNDS = {
  send: { frequency: 600, duration: 80, type: 'sine' as OscillatorType },
  receive: { frequency: 800, duration: 100, type: 'sine' as OscillatorType },
  notification: { frequencies: [523, 659, 784], duration: 120, type: 'sine' as OscillatorType },
};

export function useSoundEffects(enabled: boolean = true) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasInteractedRef = useRef(false);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      if (!hasInteractedRef.current) {
        hasInteractedRef.current = true;
        // Create context on interaction to comply with browser policies
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
      }
    };

    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine', gain: number = 0.1) => {
    if (!enabled || !hasInteractedRef.current) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(gain, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);
    } catch (error) {
      console.warn('Sound effect failed:', error);
    }
  }, [enabled]);

  const playSend = useCallback(() => {
    const { frequency, duration, type } = SOUNDS.send;
    playTone(frequency, duration, type, 0.08);
  }, [playTone]);

  const playReceive = useCallback(() => {
    const { frequency, duration, type } = SOUNDS.receive;
    playTone(frequency, duration, type, 0.06);
  }, [playTone]);

  const playNotification = useCallback(() => {
    if (!enabled || !hasInteractedRef.current) return;
    
    const { frequencies, duration, type } = SOUNDS.notification;
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        playTone(freq, duration, type, 0.08);
      }, index * 100);
    });
  }, [enabled, playTone]);

  return {
    playSend,
    playReceive,
    playNotification,
    isReady: hasInteractedRef.current,
  };
}
