import { motion } from 'framer-motion';
import { User, Sparkles, ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HelpMessage, HelpAction } from '@/hooks/useHelpChat';
import ReactMarkdown from 'react-markdown';

interface HelpMessageBubbleProps {
  message: HelpMessage;
  onAction: (action: HelpAction) => void;
  isStreaming?: boolean;
}

export function HelpMessageBubble({ message, onAction, isStreaming }: HelpMessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-2",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-primary/10 text-primary"
      )}>
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
      </div>

      {/* Content */}
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-2",
        isUser 
          ? "bg-primary text-primary-foreground rounded-tr-sm" 
          : "bg-muted rounded-tl-sm"
      )}>
        {/* Message Content */}
        <div className={cn(
          "text-sm prose prose-sm max-w-none",
          isUser ? "prose-invert" : "dark:prose-invert"
        )}>
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-2 list-disc pl-4">{children}</ul>,
              ol: ({ children }) => <ol className="mb-2 list-decimal pl-4">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            }}
          >
            {message.content}
          </ReactMarkdown>
          
          {/* Streaming indicator */}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
          )}
        </div>

        {/* Action Buttons */}
        {!isUser && message.actions && message.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.actions.map((action, idx) => (
              <Button
                key={idx}
                variant="secondary"
                size="sm"
                onClick={() => onAction(action)}
                className="text-xs h-7"
              >
                {action.type === 'navigate' ? (
                  <ArrowRight className="h-3 w-3 mr-1" />
                ) : (
                  <Play className="h-3 w-3 mr-1" />
                )}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
