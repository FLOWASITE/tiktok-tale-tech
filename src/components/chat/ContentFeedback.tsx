import { useState, useCallback, useEffect, forwardRef } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ContentFeedbackProps {
  messageId: string;
  conversationId?: string;
  traceId?: string;
  governorScore?: number;
  userId?: string;
  className?: string;
}

// Hook to get current user ID
function useCurrentUserId() {
  const [userId, setUserId] = useState<string | undefined>();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);
  return userId;
}

const POSITIVE_TAGS = [
  { label: 'Tuyệt vời', value: 'excellent' },
  { label: 'Đúng ý', value: 'on_point' },
  { label: 'Sáng tạo', value: 'creative' },
];

const NEGATIVE_TAGS = [
  { label: 'Off-brand', value: 'off_brand' },
  { label: 'Quá dài', value: 'too_long' },
  { label: 'Không liên quan', value: 'not_relevant' },
  { label: 'Sai thông tin', value: 'inaccurate' },
];

export const ContentFeedback = forwardRef<HTMLDivElement, ContentFeedbackProps>(
  function ContentFeedback(
    { messageId, conversationId, traceId, governorScore, userId: userIdProp, className },
    ref
  ) {
    const currentUserId = useCurrentUserId();
    const userId = userIdProp || currentUserId;
    const [feedbackType, setFeedbackType] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [comment, setComment] = useState('');
    const [showComment, setShowComment] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const tags = feedbackType === 'thumbs_up' ? POSITIVE_TAGS : NEGATIVE_TAGS;

    const toggleTag = useCallback((tag: string) => {
      setSelectedTags(prev =>
        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
      );
    }, []);

    const handleSubmit = useCallback(async () => {
      if (!feedbackType || !userId) return;

      setIsSubmitting(true);
      try {
        const { error } = await (supabase.from as any)('content_feedback').insert({
          user_id: userId,
          conversation_id: conversationId || null,
          message_id: messageId,
          trace_id: traceId || null,
          governor_score: governorScore || null,
          feedback_type: feedbackType,
          tags: selectedTags,
          comment: comment || null,
        });

        if (error) throw error;

        setSubmitted(true);
        toast({ title: 'Cảm ơn phản hồi của bạn! 🙏' });
      } catch (err) {
        console.error('Feedback submit error:', err);
        toast({
          variant: 'destructive',
          title: 'Lỗi',
          description: 'Không thể gửi phản hồi. Vui lòng thử lại.',
        });
      } finally {
        setIsSubmitting(false);
      }
    }, [feedbackType, userId, conversationId, messageId, traceId, governorScore, selectedTags, comment]);

    const handleThumbClick = useCallback((type: 'thumbs_up' | 'thumbs_down') => {
      if (submitted) return;
      setFeedbackType(prev => prev === type ? null : type);
      setSelectedTags([]);
      setComment('');
      setShowComment(false);
    }, [submitted]);

    if (submitted) {
      return (
        <div ref={ref} className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
          <span>✓ Đã gửi phản hồi</span>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn('space-y-2', className)}>
        {/* Thumbs buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 w-7 p-0',
              feedbackType === 'thumbs_up' && 'bg-primary/10 text-primary'
            )}
            onClick={() => handleThumbClick('thumbs_up')}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 w-7 p-0',
              feedbackType === 'thumbs_down' && 'bg-destructive/10 text-destructive'
            )}
            onClick={() => handleThumbClick('thumbs_down')}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Tags + Comment (shown after selection) */}
        {feedbackType && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <Badge
                  key={tag.value}
                  variant={selectedTags.includes(tag.value) ? 'default' : 'outline'}
                  className="cursor-pointer text-xs px-2 py-0.5"
                  onClick={() => toggleTag(tag.value)}
                >
                  {tag.label}
                </Badge>
              ))}
            </div>

            {/* Toggle comment */}
            {!showComment ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground"
                onClick={() => setShowComment(true)}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Thêm nhận xét
              </Button>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Nhận xét (tuỳ chọn)</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => { setShowComment(false); setComment(''); }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <Textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Chia sẻ thêm..."
                  className="min-h-[60px] text-xs resize-none"
                  maxLength={500}
                />
              </div>
            )}

            {/* Submit */}
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang gửi...' : 'Gửi phản hồi'}
            </Button>
          </div>
        )}
      </div>
    );
  }
);

ContentFeedback.displayName = 'ContentFeedback';
