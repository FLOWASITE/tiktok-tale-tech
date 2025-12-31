import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ThumbsDown, MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DetailedFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string;
  messageContent: string;
  conversationId?: string;
  brandTemplateId?: string;
  organizationId?: string;
  onFeedbackSubmitted?: () => void;
}

// Common feedback categories
const FEEDBACK_CATEGORIES = [
  { id: 'too_formal', label: 'Quá trang trọng', icon: '🎩' },
  { id: 'too_casual', label: 'Quá thân mật', icon: '😎' },
  { id: 'too_long', label: 'Quá dài', icon: '📜' },
  { id: 'too_short', label: 'Quá ngắn', icon: '✂️' },
  { id: 'wrong_tone', label: 'Sai tone', icon: '🎭' },
  { id: 'not_relevant', label: 'Không liên quan', icon: '❓' },
  { id: 'factually_wrong', label: 'Sai thông tin', icon: '❌' },
  { id: 'weak_hook', label: 'Hook yếu', icon: '🎣' },
  { id: 'weak_cta', label: 'CTA yếu', icon: '📢' },
  { id: 'repetitive', label: 'Lặp lại', icon: '🔁' },
  { id: 'off_brand', label: 'Không đúng brand', icon: '🏷️' },
  { id: 'compliance_issue', label: 'Vi phạm compliance', icon: '⚠️' },
] as const;

type FeedbackCategoryId = typeof FEEDBACK_CATEGORIES[number]['id'];

export function DetailedFeedbackDialog({
  open,
  onOpenChange,
  messageId,
  messageContent,
  conversationId,
  brandTemplateId,
  organizationId,
  onFeedbackSubmitted,
}: DetailedFeedbackDialogProps) {
  const [selectedCategories, setSelectedCategories] = useState<FeedbackCategoryId[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [dontSuggestAgain, setDontSuggestAgain] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCategoryToggle = useCallback((categoryId: FeedbackCategoryId) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedCategories.length === 0 && !additionalNotes.trim()) {
      toast.error('Vui lòng chọn ít nhất 1 lý do hoặc nhập ghi chú');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Bạn cần đăng nhập để gửi feedback');
        return;
      }

      // Submit feedback to chat_feedback table with detailed info
      const { error } = await supabase
        .from('chat_feedback')
        .insert({
          user_id: user.id,
          message_id: messageId,
          conversation_id: conversationId,
          brand_template_id: brandTemplateId,
          organization_id: organizationId,
          feedback_type: 'negative',
          message_content: messageContent.slice(0, 1000), // Limit size
          user_message: JSON.stringify({
            categories: selectedCategories,
            notes: additionalNotes,
            dontSuggestAgain,
          }),
        });

      if (error) throw error;

      // Also update topic_history if this is about a topic
      // (The edge function will handle learning from this)

      toast.success('Cảm ơn feedback của bạn! AI sẽ học từ phản hồi này.');
      onOpenChange(false);
      onFeedbackSubmitted?.();
      
      // Reset form
      setSelectedCategories([]);
      setAdditionalNotes('');
      setDontSuggestAgain(false);
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast.error('Có lỗi khi gửi feedback');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedCategories, additionalNotes, dontSuggestAgain, messageId, messageContent, conversationId, brandTemplateId, organizationId, onOpenChange, onFeedbackSubmitted]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ThumbsDown className="w-5 h-5 text-destructive" />
            Phản hồi chi tiết
          </DialogTitle>
          <DialogDescription>
            Giúp AI hiểu tại sao gợi ý này chưa phù hợp để cải thiện trong tương lai.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Category selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Vấn đề là gì? (chọn nhiều nếu cần)</Label>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_CATEGORIES.map(category => (
                <Badge
                  key={category.id}
                  variant={selectedCategories.includes(category.id) ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer transition-all select-none',
                    selectedCategories.includes(category.id) 
                      ? 'bg-destructive/10 text-destructive border-destructive hover:bg-destructive/20' 
                      : 'hover:bg-muted'
                  )}
                  onClick={() => handleCategoryToggle(category.id)}
                >
                  <span className="mr-1">{category.icon}</span>
                  {category.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Additional notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Ghi chú thêm (tùy chọn)
            </Label>
            <Textarea
              id="notes"
              placeholder="Mô tả chi tiết hơn về vấn đề..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Don't suggest again option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dont-suggest"
              checked={dontSuggestAgain}
              onCheckedChange={(checked) => setDontSuggestAgain(checked === true)}
            />
            <Label htmlFor="dont-suggest" className="text-sm text-muted-foreground cursor-pointer">
              Không gợi ý pattern tương tự trong tương lai
            </Label>
          </div>

          {/* Preview of what AI learned */}
          {selectedCategories.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium text-xs uppercase text-muted-foreground mb-1">
                AI sẽ học:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                {selectedCategories.includes('too_long') && (
                  <li>Viết ngắn gọn hơn</li>
                )}
                {selectedCategories.includes('too_formal') && (
                  <li>Dùng tone thoải mái hơn</li>
                )}
                {selectedCategories.includes('too_casual') && (
                  <li>Dùng tone trang trọng hơn</li>
                )}
                {selectedCategories.includes('weak_hook') && (
                  <li>Tạo hook mạnh mẽ hơn</li>
                )}
                {selectedCategories.includes('weak_cta') && (
                  <li>CTA rõ ràng và hấp dẫn hơn</li>
                )}
                {selectedCategories.includes('off_brand') && (
                  <li>Tuân thủ brand voice chặt chẽ hơn</li>
                )}
                {dontSuggestAgain && (
                  <li className="text-destructive">Tránh pattern này hoàn toàn</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || (selectedCategories.length === 0 && !additionalNotes.trim())}
            variant="destructive"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang gửi...
              </>
            ) : (
              'Gửi feedback'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
