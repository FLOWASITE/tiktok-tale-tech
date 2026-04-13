// ============================================
// SmartInputSuggestions Component
// Pill chips above input based on agent output
// ============================================

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartInputSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  className?: string;
}

export function SmartInputSuggestions({ suggestions, onSelect, className }: SmartInputSuggestionsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className={cn(
      "flex items-center gap-1.5 overflow-x-auto scrollbar-none px-0.5 py-1 animate-in fade-in-0 slide-in-from-bottom-1 duration-200",
      className
    )}>
      <Sparkles className="w-3 h-3 text-primary/60 shrink-0" />
      {suggestions.slice(0, 3).map((suggestion, idx) => (
        <button
          key={idx}
          className={cn(
            "shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-200",
            "bg-muted text-muted-foreground",
            "hover:bg-foreground/10 hover:text-foreground",
            "border border-border hover:border-foreground/20",
            "max-w-[180px] truncate"
          )}
          onClick={() => onSelect(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
