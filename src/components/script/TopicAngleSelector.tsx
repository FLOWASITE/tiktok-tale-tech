import React from 'react';
import { cn } from '@/lib/utils';
import { TopicAngle, TOPIC_ANGLE_LABELS } from '@/types/script';
import { Target, X, GraduationCap, BrainCircuit, Zap, ShieldAlert, BarChart3, Sparkles, LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TopicAngleSelectorProps {
  value?: TopicAngle;
  onChange: (angle: TopicAngle) => void;
  disabled?: boolean;
  /** Recommended angle from AI analysis */
  recommendedAngle?: TopicAngle;
  /** Reason for the recommendation */
  recommendedReason?: string;
}

const ANGLES: TopicAngle[] = ['beginner', 'expert', 'quick_tips', 'myth_busting', 'data_driven'];

const ICON_MAP: Record<string, LucideIcon> = {
  GraduationCap,
  BrainCircuit,
  Zap,
  ShieldAlert,
  BarChart3,
};

export function TopicAngleSelector({ value, onChange, disabled = false, recommendedAngle, recommendedReason }: TopicAngleSelectorProps) {
  const selectedConfig = value ? TOPIC_ANGLE_LABELS[value] : null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3 animate-fade-in">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10">
            <Target className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">Góc tiếp cận</span>
          <span className="text-xs text-muted-foreground font-normal">(tuỳ chọn)</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {ANGLES.map((angle) => {
            const config = TOPIC_ANGLE_LABELS[angle];
            if (!config) return null;
            const isSelected = value === angle;
            const isRecommended = recommendedAngle === angle && !value;
            const IconComponent = ICON_MAP[config.icon];

            return (
              <Tooltip key={angle}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      if (e.pointerType === 'touch') {
                        e.preventDefault();
                        onChange(isSelected ? (undefined as any) : angle);
                      }
                    }}
                    onClick={() => onChange(isSelected ? (undefined as any) : angle)}
                    disabled={disabled}
                    className={cn(
                      "relative inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200 border",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "active:scale-[0.97]",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                        : isRecommended
                          ? "bg-primary/8 text-primary border-primary/40 ring-1 ring-primary/20"
                          : "bg-card/80 text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground hover:bg-accent/50",
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                    <span>{config.label}</span>
                    {isRecommended && (
                      <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                    )}
                    {isSelected && <X className="w-3 h-3 ml-0.5 opacity-70" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8} className="max-w-xs text-xs leading-relaxed z-[100]">
                  <p className="font-semibold mb-1">{config.label} — {config.description}</p>
                  <p className="text-muted-foreground">{config.tooltip}</p>
                  {isRecommended && recommendedReason && (
                    <p className="text-primary mt-1.5 pt-1.5 border-t border-border/30">
                      ✨ Gợi ý: {recommendedReason}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Recommendation hint when no angle selected */}
        <AnimatePresence mode="wait">
          {!value && recommendedAngle && recommendedReason && (
            <motion.button
              key="recommendation"
              type="button"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              onClick={() => onChange(recommendedAngle)}
              className="flex items-center gap-2 text-xs text-primary/80 bg-primary/5 hover:bg-primary/10 rounded-lg px-3.5 py-2 border border-primary/15 hover:border-primary/30 transition-colors cursor-pointer w-full text-left"
            >
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>
                Gợi ý: <span className="font-medium">{TOPIC_ANGLE_LABELS[recommendedAngle]?.label}</span>
                <span className="text-muted-foreground"> — {recommendedReason}</span>
              </span>
            </motion.button>
          )}
          {selectedConfig && value && (
            <motion.div
              key={value}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="text-xs text-muted-foreground bg-muted/40 backdrop-blur-sm rounded-lg px-3.5 py-2.5 border border-border/30"
            >
              <span className="text-primary font-medium">{selectedConfig.label}</span>
              <span className="text-border mx-2">•</span>
              <span>{selectedConfig.description}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}
