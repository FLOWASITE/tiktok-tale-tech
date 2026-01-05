import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Sparkles, ArrowRight, Play, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HelpMessage, HelpAction } from '@/hooks/useHelpChat';
import ReactMarkdown from 'react-markdown';
import { HelpFeedbackButtons } from './HelpFeedbackButtons';
import { toast } from 'sonner';

interface HelpMessageBubbleProps {
  message: HelpMessage;
  onAction: (action: HelpAction) => void;
  isStreaming?: boolean;
}

export function HelpMessageBubble({ message, onAction, isStreaming }: HelpMessageBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success('Đã copy!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Không thể copy');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-2 group",
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
        "max-w-[80%] rounded-2xl px-4 py-2 relative",
        isUser 
          ? "bg-primary text-primary-foreground rounded-tr-sm" 
          : "bg-muted rounded-tl-sm"
      )}>
        {/* Copy button for assistant messages */}
        {!isUser && !isStreaming && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="absolute -right-8 top-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
        )}

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

        {/* Feedback buttons for assistant messages */}
        {!isUser && !isStreaming && (
          <HelpFeedbackButtons messageId={message.id} />
        )}
      </div>
    </motion.div>
  );
}
