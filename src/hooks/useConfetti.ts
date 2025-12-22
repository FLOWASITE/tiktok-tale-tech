import confetti from 'canvas-confetti';

export function useConfetti() {
  const fireConfetti = () => {
    // First burst from left
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.1, y: 0.6 },
      colors: ['#10b981', '#22c55e', '#34d399', '#6ee7b7', '#a7f3d0'],
    });

    // Second burst from right
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.9, y: 0.6 },
      colors: ['#10b981', '#22c55e', '#34d399', '#6ee7b7', '#a7f3d0'],
    });

    // Center burst with delay
    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#fbbf24', '#f59e0b', '#10b981', '#22c55e'],
      });
    }, 150);
  };

  const fireSuccess = () => {
    const duration = 1500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#10b981', '#22c55e', '#34d399'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#10b981', '#22c55e', '#34d399'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  return { fireConfetti, fireSuccess };
}
