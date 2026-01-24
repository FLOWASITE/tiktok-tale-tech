import { useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { TopicAIChatbot } from '@/components/topic/TopicAIChatbot';
import { ContentGoal } from '@/types/multichannel';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopicBrainstormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  onSelectTopic: (topic: string) => void;
}

export function TopicBrainstormSheet({
  open,
  onOpenChange,
  brandTemplateId,
  contentGoal,
  onSelectTopic,
}: TopicBrainstormSheetProps) {
  const chatbotRef = useRef<{ focusInput: () => void } | null>(null);
  
  const handleTopicSelect = (topic: string) => {
    onSelectTopic(topic);
    onOpenChange(false);
  };

  // Auto-focus chat input when sheet opens with smooth delay for animation
  useEffect(() => {
    if (open) {
      // Wait for slide-in animation to complete before focusing
      const timer = setTimeout(() => {
        chatbotRef.current?.focusInput();
      }, 350); // Match the animation duration
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className={cn(
          "w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl p-0 flex flex-col h-full",
          // Enhanced slide-in animation
          "data-[state=open]:animate-slide-in-right data-[state=closed]:animate-slide-out-right",
          "data-[state=open]:duration-350 data-[state=closed]:duration-250"
        )}
      >
        <SheetHeader className="px-4 py-3 border-b bg-muted/30 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="w-4 h-4 text-primary animate-pulse" />
            Brainstorm Chủ đề với AI
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 min-h-0 overflow-hidden">
          <TopicAIChatbot
            ref={chatbotRef}
            brandTemplateId={brandTemplateId}
            contentGoal={contentGoal}
            mode="embedded"
            onTopicSelect={handleTopicSelect}
            onNavigate={() => {}} // Not used in embedded mode
            className="h-full border-0 rounded-none"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
