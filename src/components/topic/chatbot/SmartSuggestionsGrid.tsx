// ============================================
// SmartSuggestionsGrid Component
// Context-aware suggestion chips with animations
// ============================================

import { motion } from 'framer-motion';
import { 
  RotateCcw, 
  TrendingUp, 
  Calendar, 
  Sparkles, 
  LayoutGrid, 
  Video, 
  Images,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { SmartSuggestion } from '@/hooks/usePersonalizedWelcome';

interface SmartSuggestionsGridProps {
  suggestions: SmartSuggestion[];
  onSelect: (prompt: string) => void;
  className?: string;
}

const iconMap = {
  'rotate-ccw': RotateCcw,
  'trending-up': TrendingUp,
  'calendar': Calendar,
  'sparkles': Sparkles,
  'layout-grid': LayoutGrid,
  'video': Video,
  'images': Images,
  'message-square': MessageSquare
};

const typeStyles = {
  continue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border-blue-500/20',
  trending: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 border-orange-500/20',
  seasonal: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border-rose-500/20',
  recommended: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 border-violet-500/20',
  pillar: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20',
  format: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/20'
};

export function SmartSuggestionsGrid({
  suggestions,
  onSelect,
  className
}: SmartSuggestionsGridProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn('flex flex-wrap gap-2', className)}>
        {suggestions.map((suggestion, index) => {
          const Icon = iconMap[suggestion.icon] || Sparkles;
          const style = typeStyles[suggestion.type] || typeStyles.recommended;
          
          const button = (
            <motion.button
              key={suggestion.id}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                delay: index * 0.08,
                duration: 0.3,
                ease: [0.23, 1, 0.32, 1]
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(suggestion.prompt)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                'text-xs font-medium transition-all duration-200',
                'border shadow-sm',
                style
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="max-w-[150px] truncate">{suggestion.label}</span>
            </motion.button>
          );
          
          // Wrap with tooltip if there's a reason
          if (suggestion.reason) {
            return (
              <Tooltip key={suggestion.id}>
                <TooltipTrigger asChild>
                  {button}
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {suggestion.reason}
                </TooltipContent>
              </Tooltip>
            );
          }
          
          return button;
        })}
      </div>
    </TooltipProvider>
  );
}
