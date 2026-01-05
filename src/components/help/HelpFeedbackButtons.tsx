import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HelpFeedbackButtonsProps {
  messageId: string;
  onFeedback?: (type: 'positive' | 'negative') => void;
}

export function HelpFeedbackButtons({ messageId, onFeedback }: HelpFeedbackButtonsProps) {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);

  const handleFeedback = (type: 'positive' | 'negative') => {
    setFeedback(type);
    onFeedback?.(type);
    toast.success(type === 'positive' ? 'Cảm ơn phản hồi!' : 'Cảm ơn, chúng tôi sẽ cải thiện!');
  };

  return (
    <div className="flex items-center gap-1 mt-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleFeedback('positive')}
        disabled={feedback !== null}
        className={cn(
          "h-6 w-6 p-0 hover:bg-primary/10",
          feedback === 'positive' && "text-green-500 bg-green-500/10"
        )}
      >
        <ThumbsUp className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleFeedback('negative')}
        disabled={feedback !== null}
        className={cn(
          "h-6 w-6 p-0 hover:bg-primary/10",
          feedback === 'negative' && "text-red-500 bg-red-500/10"
        )}
      >
        <ThumbsDown className="h-3 w-3" />
      </Button>
    </div>
  );
}
