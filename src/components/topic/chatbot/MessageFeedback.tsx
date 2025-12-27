import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Loader2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FeedbackState = 'none' | 'up' | 'down';

interface MessageFeedbackProps {
  messageId: string;
  initialFeedback?: 'up' | 'down';
  onFeedback?: (messageId: string, feedback: 'up' | 'down') => Promise<void> | void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export function MessageFeedback({ 
  messageId, 
  initialFeedback,
  onFeedback,
  onRegenerate,
  isRegenerating 
}: MessageFeedbackProps) {
  const [feedbackState, setFeedbackState] = useState<FeedbackState>(initialFeedback || 'none');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (type: 'up' | 'down') => {
    if (feedbackState !== 'none' || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      await onFeedback?.(messageId, type);
      setFeedbackState(type);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      {/* Thumbs Up */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-6 w-6 p-0 transition-all",
          feedbackState === 'up' && "text-green-500 bg-green-500/10 hover:bg-green-500/20",
          feedbackState !== 'none' && feedbackState !== 'up' && "opacity-40 pointer-events-none"
        )}
        onClick={() => handleFeedback('up')}
        disabled={feedbackState !== 'none' || isSubmitting}
        title="Phản hồi tốt"
      >
        {isSubmitting ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <ThumbsUp className={cn(
            "w-3 h-3",
            feedbackState === 'up' && "fill-current"
          )} />
        )}
      </Button>
      
      {/* Thumbs Down */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-6 w-6 p-0 transition-all",
          feedbackState === 'down' && "text-red-500 bg-red-500/10 hover:bg-red-500/20",
          feedbackState !== 'none' && feedbackState !== 'down' && "opacity-40 pointer-events-none"
        )}
        onClick={() => handleFeedback('down')}
        disabled={feedbackState !== 'none' || isSubmitting}
        title="Phản hồi chưa tốt"
      >
        <ThumbsDown className={cn(
          "w-3 h-3",
          feedbackState === 'down' && "fill-current"
        )} />
      </Button>
      
      {/* Regenerate button */}
      {onRegenerate && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-[10px] gap-1 ml-0.5 hover:bg-primary/10 hover:text-primary"
          onClick={onRegenerate}
          disabled={isRegenerating}
          title="Tạo lại phản hồi"
        >
          {isRegenerating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCcw className="w-3 h-3" />
          )}
          <span className="hidden sm:inline">Tạo lại</span>
        </Button>
      )}
    </div>
  );
}
