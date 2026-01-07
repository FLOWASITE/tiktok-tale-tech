import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';

interface ReadingProgressProps {
  containerRef?: React.RefObject<HTMLElement>;
}

const ReadingProgress = ({ containerRef }: ReadingProgressProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const calculateProgress = () => {
      const container = containerRef?.current || document.documentElement;
      const scrollTop = window.scrollY;
      const docHeight = container.scrollHeight - window.innerHeight;
      const scrollProgress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, scrollProgress)));
    };

    window.addEventListener('scroll', calculateProgress);
    calculateProgress();

    return () => window.removeEventListener('scroll', calculateProgress);
  }, [containerRef]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[60]">
      <Progress 
        value={progress} 
        className="h-1 rounded-none bg-transparent"
      />
    </div>
  );
};

export default ReadingProgress;
