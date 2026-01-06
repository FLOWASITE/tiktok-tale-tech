import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function HelpHeaderButton() {
  const [hasUnread, setHasUnread] = useState(false);

  // Listen for unread notifications from chat widget
  useEffect(() => {
    const handleUnread = (e: CustomEvent) => setHasUnread(e.detail?.hasUnread ?? false);
    window.addEventListener('help-chat-unread' as any, handleUnread);
    return () => window.removeEventListener('help-chat-unread' as any, handleUnread);
  }, []);

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('open-help-chat'));
    setHasUnread(false);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClick}
          className={cn(
            "relative h-8 gap-1.5 px-2.5",
            "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent",
            "hover:from-primary/20 hover:via-primary/10 hover:to-primary/5",
            "border border-primary/20 hover:border-primary/40",
            "text-primary hover:text-primary",
            "transition-all duration-300",
            "group"
          )}
        >
          {/* Animated icon */}
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </motion.div>
          
          <span className="text-xs font-medium hidden sm:inline">Trợ lý AI</span>
          
          {/* Unread indicator */}
          {hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
            </span>
          )}
          
          {/* Subtle glow on hover */}
          <div className="absolute inset-0 rounded-md bg-primary/0 group-hover:bg-primary/5 transition-colors" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-primary" />
        <span>Trợ lý hướng dẫn AI</span>
      </TooltipContent>
    </Tooltip>
  );
}
