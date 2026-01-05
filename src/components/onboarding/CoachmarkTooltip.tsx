import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CoachmarkStep } from './types';
import { Link } from 'react-router-dom';
import { CSSProperties } from 'react';

interface CoachmarkTooltipProps {
  step: CoachmarkStep;
  currentIndex: number;
  totalSteps: number;
  position: CSSProperties;
  placement: CoachmarkStep['placement'];
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export function CoachmarkTooltip({
  step,
  currentIndex,
  totalSteps,
  position,
  placement,
  onNext,
  onPrev,
  onSkip,
  onComplete,
}: CoachmarkTooltipProps) {
  const Icon = step.icon;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalSteps - 1;

  const getArrowStyles = () => {
    const baseStyles = "absolute w-3 h-3 bg-card border rotate-45";
    switch (placement) {
      case 'top':
        return cn(baseStyles, "bottom-[-7px] left-1/2 -translate-x-1/2 border-t-0 border-l-0");
      case 'bottom':
        return cn(baseStyles, "top-[-7px] left-1/2 -translate-x-1/2 border-b-0 border-r-0");
      case 'left':
        return cn(baseStyles, "right-[-7px] top-1/2 -translate-y-1/2 border-l-0 border-b-0");
      case 'right':
        return cn(baseStyles, "left-[-7px] top-1/2 -translate-y-1/2 border-r-0 border-t-0");
      default:
        return "";
    }
  };

  const handleAction = () => {
    if (step.action?.href) {
      onComplete();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: placement === 'bottom' ? -10 : placement === 'top' ? 10 : 0 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className={cn(
        "fixed z-[10001] w-80 p-4 rounded-xl",
        "bg-card border shadow-2xl shadow-primary/20"
      )}
      style={position}
    >
      {/* Arrow */}
      {placement !== 'center' && <div className={getArrowStyles()} />}

      {/* Close button */}
      <button
        onClick={onSkip}
        className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted transition-colors"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Icon + Title */}
      <div className="flex items-center gap-2 mb-2 pr-6">
        <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h4 className="font-semibold text-sm text-foreground">{step.title}</h4>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {step.description}
      </p>

      {/* Action button if provided */}
      {step.action && (
        <div className="mb-4">
          {step.action.href ? (
            <Button asChild size="sm" className="w-full" onClick={handleAction}>
              <Link to={step.action.href}>
                {step.action.label}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          ) : (
            <Button size="sm" className="w-full">
              {step.action.label}
            </Button>
          )}
        </div>
      )}

      {/* Progress + Navigation */}
      <div className="flex items-center justify-between">
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === currentIndex 
                  ? "w-4 bg-primary" 
                  : i < currentIndex
                    ? "w-1.5 bg-primary/50"
                    : "w-1.5 bg-muted"
              )}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-2">
          {!isFirst && (
            <Button variant="ghost" size="sm" onClick={onPrev} className="h-8 px-2">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          <Button size="sm" onClick={onNext} className="h-8">
            {isLast ? 'Hoàn thành' : 'Tiếp'}
            {!isLast && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
