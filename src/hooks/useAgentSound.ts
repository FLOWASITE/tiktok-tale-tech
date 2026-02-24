import { useCallback, useRef } from 'react';

export function useAgentSound(enabled: boolean) {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback((freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.08) => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = volume;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch { /* ignore audio errors */ }
  }, [enabled, getCtx]);

  const playAgentComplete = useCallback(() => {
    playTone(880, 0.15, 'sine', 0.06);
  }, [playTone]);

  const playApproved = useCallback(() => {
    playTone(523, 0.12);
    setTimeout(() => playTone(659, 0.12), 100);
    setTimeout(() => playTone(784, 0.2), 200);
  }, [playTone]);

  const playInsight = useCallback(() => {
    playTone(660, 0.1, 'triangle', 0.05);
  }, [playTone]);

  return { playAgentComplete, playApproved, playInsight };
}
