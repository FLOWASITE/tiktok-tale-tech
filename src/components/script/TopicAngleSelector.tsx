import React from 'react';
import { cn } from '@/lib/utils';
import { TopicAngle, TOPIC_ANGLE_LABELS } from '@/types/script';
import { Target } from 'lucide-react';

interface TopicAngleSelectorProps {
  value?: TopicAngle;
  onChange: (angle: TopicAngle) => void;
  disabled?: boolean;
}

const ANGLES: TopicAngle[] = ['beginner', 'expert', 'quick_tips', 'myth_busting', 'data_driven'];

export function TopicAngleSelector({ value, onChange, disabled = false }: TopicAngleSelectorProps) {
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Target className="w-4 h-4 text-primary" />
        <span>Góc tiếp cận</span>
        <span className="text-xs text-muted-foreground font-normal">(tuỳ chọn)</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {ANGLES.map((angle) => {
          const config = TOPIC_ANGLE_LABELS[angle];
          const isSelected = value === angle;
          
          return (
            <button
              key={angle}
              type="button"
              onClick={() => onChange(angle)}
              disabled={disabled}
              className={cn(
                "p-3 rounded-lg border-2 text-left transition-all duration-200",
                "hover:border-primary/50 hover:bg-primary/5",
                isSelected 
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20" 
                  : "border-border bg-muted/30",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="text-xl mb-1">{config.icon}</div>
              <div className="text-sm font-medium text-foreground">{config.label}</div>
              <div className="text-xs text-muted-foreground line-clamp-1">{config.description}</div>
            </button>
          );
        })}
      </div>

      {value && (
        <button
          type="button"
          onClick={() => onChange(undefined as any)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Xóa lựa chọn
        </button>
      )}
    </div>
  );
}
