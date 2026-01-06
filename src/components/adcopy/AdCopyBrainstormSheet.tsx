import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { TopicAIChatbot } from '@/components/topic/TopicAIChatbot';
import { Megaphone } from 'lucide-react';
import type { AdPlatform, AdObjective, AdFunnelStage } from '@/types/adCopy';
import type { ContentGoal } from '@/types/multichannel';

interface AdCopyBrainstormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandTemplateId?: string;
  platform?: AdPlatform;
  objective?: AdObjective;
  funnelStage?: AdFunnelStage;
  onSelectTopic: (topic: string) => void;
}

// Map AdCopy objective to ContentGoal for TopicAIChatbot
function mapToContentGoal(objective?: AdObjective): ContentGoal | undefined {
  if (!objective) return undefined;
  
  const goalMap: Record<AdObjective, ContentGoal> = {
    traffic: 'awareness',
    conversions: 'conversion',
    engagement: 'engagement',
    awareness: 'awareness',
    leads: 'conversion',
    app_installs: 'conversion',
    video_views: 'awareness',
    messages: 'engagement',
  };

  return goalMap[objective];
}

export function AdCopyBrainstormSheet({
  open,
  onOpenChange,
  brandTemplateId,
  platform,
  objective,
  funnelStage,
  onSelectTopic,
}: AdCopyBrainstormSheetProps) {
  const handleTopicSelect = (topic: string) => {
    onSelectTopic(topic);
    onOpenChange(false);
  };

  const contentGoal = mapToContentGoal(objective);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl p-0 flex flex-col h-full"
      >
        <SheetHeader className="px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-accent/5 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <Megaphone className="w-4 h-4 text-primary" />
            </div>
            Brainstorm Ý tưởng Ad Copy
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 min-h-0 overflow-hidden">
          <TopicAIChatbot
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
