import React from 'react';
import { cn } from '@/lib/utils';
import { TopicAngle, TOPIC_ANGLE_LABELS } from '@/types/script';
import { Target, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface TopicAngleSelectorProps {
  value?: TopicAngle;
  onChange: (angle: TopicAngle) => void;
  disabled?: boolean;
}

const ANGLES: TopicAngle[] = ['beginner', 'expert', 'quick_tips', 'myth_busting', 'data_driven'];

export function TopicAngleSelector({ value, onChange, disabled = false }: TopicAngleSelectorProps) {
  const selectedConfig = value ? TOPIC_ANGLE_LABELS[value] : null;

  return (
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

          return (
            <button
              key={angle}
              type="button"
              onClick={() => onChange(isSelected ? (undefined as any) : angle)}
              disabled={disabled}
              className={cn(
                "inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200 border",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                  : "bg-card/80 text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground hover:bg-accent/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className="text-sm leading-none">{config.icon}</span>
              <span>{config.label}</span>
              {isSelected && <X className="w-3 h-3 ml-0.5 opacity-70" />}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {selectedConfig && value && (
          <motion.div
            key={value}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="text-xs text-muted-foreground bg-muted/40 backdrop-blur-sm rounded-lg px-3.5 py-2.5 border border-border/30"
          >
            <span className="text-primary font-medium">{selectedConfig.icon} {selectedConfig.label}</span>
            <span className="text-border mx-2">•</span>
            <span>{selectedConfig.description}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
