import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Video, Film, User, Mic, Clapperboard, LucideIcon } from 'lucide-react';
import { ScriptPurpose, SCRIPT_PURPOSE_CONFIG } from '@/types/script';
import { AnimatePresence, motion } from 'framer-motion';

interface ScriptPurposeSelectorProps {
  value: ScriptPurpose;
  onChange: (value: ScriptPurpose) => void;
  disabled?: boolean;
  compact?: boolean;
}

const ICON_MAP: Record<ScriptPurpose, LucideIcon> = {
  ai_video_veo3: Video,
  ai_video_minimax: Film,
  teleprompter: User,
  voiceover: Mic,
  production: Clapperboard,
};

export function ScriptPurposeSelector({ value, onChange, disabled }: ScriptPurposeSelectorProps) {
  const purposes = Object.entries(SCRIPT_PURPOSE_CONFIG) as [ScriptPurpose, typeof SCRIPT_PURPOSE_CONFIG[ScriptPurpose]][];
  const selectedConfig = SCRIPT_PURPOSE_CONFIG[value];

  return (
    <div className="space-y-3">
      {/* Horizontal pill/chip selector */}
      <div className="flex flex-wrap gap-2">
        {purposes.map(([key, config]) => {
          const Icon = ICON_MAP[key];
          const isSelected = value === key;
          
          return (
            <button
              key={key}
              type="button"
              onClick={() => !disabled && onChange(key)}
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
              <Icon className="w-3.5 h-3.5" />
              <span>{config.label}</span>
              {key === 'ai_video_veo3' && !isSelected && (
                <Badge variant="secondary" className="text-[9px] h-3.5 px-1 py-0 leading-none">
                  Hot
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded description for selected item */}
      <AnimatePresence mode="wait">
        <motion.div
          key={value}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="text-xs text-muted-foreground bg-muted/40 backdrop-blur-sm rounded-lg px-3.5 py-2.5 border border-border/30"
        >
          <div className="flex items-center gap-2">
            <span className="text-primary font-medium">{selectedConfig.label}</span>
            <span className="text-border">•</span>
            <span>{selectedConfig.description}</span>
          </div>
          <div className="mt-1 text-muted-foreground/70">
            📋 {selectedConfig.outputHint}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
