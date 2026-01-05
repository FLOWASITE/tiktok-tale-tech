import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface HelpSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function HelpSuggestions({ suggestions, onSelect }: HelpSuggestionsProps) {
  if (!suggestions.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2 px-3 py-2 border-t border-border/50"
    >
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        Gợi ý:
      </span>
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onSelect(suggestion)}
          className="text-xs px-2 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
        >
          {suggestion}
        </motion.button>
      ))}
    </motion.div>
  );
}
