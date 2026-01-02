import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FileText, Pencil, Sparkles, User, Package, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiSuggestionContext } from '@/types/multichannel';
import { JOURNEY_STAGE_CONFIG } from '@/types/journeyStageMessaging';

interface TopicContextBarProps {
  topic: string;
  brandName?: string;
  aiSuggestion?: AiSuggestionContext;
  onEdit?: () => void;
  className?: string;
}

export function TopicContextBar({
  topic,
  brandName,
  aiSuggestion,
  onEdit,
  className,
}: TopicContextBarProps) {
  const truncatedTopic = topic.length > 60 ? `${topic.substring(0, 60)}...` : topic;
  const hasAiSuggestions = aiSuggestion && (aiSuggestion.targetPersona || aiSuggestion.productFit || aiSuggestion.suggestedJourneyStage);

  return (
    <div className={cn(
      "rounded-lg border border-border/50 bg-muted/30 backdrop-blur-sm p-3 space-y-2",
      className
    )}>
      {/* Main row: Topic + Brand + Edit */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
          <FileText className="w-4 h-4 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-sm font-medium text-foreground truncate cursor-default">
                "{truncatedTopic}"
              </p>
            </TooltipTrigger>
            {topic.length > 60 && (
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-xs">{topic}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {brandName && (
          <Badge variant="secondary" className="text-[10px] shrink-0 gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            {brandName}
          </Badge>
        )}

        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-7 w-7 p-0 shrink-0"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* AI Suggestions row */}
      {hasAiSuggestions && (
        <div className="flex items-center gap-2 pl-11">
          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
          <span className="text-[10px] text-muted-foreground shrink-0">AI gợi ý:</span>
          <div className="flex flex-wrap gap-1.5">
            {aiSuggestion.targetPersona && (
              <Badge variant="secondary" className="text-[10px] gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <User className="w-2.5 h-2.5" />
                {aiSuggestion.targetPersona}
              </Badge>
            )}
            {aiSuggestion.productFit && (
              <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Package className="w-2.5 h-2.5" />
                {aiSuggestion.productFit}
              </Badge>
            )}
            {aiSuggestion.suggestedJourneyStage && (
              <Badge variant="secondary" className="text-[10px] gap-1 bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Rocket className="w-2.5 h-2.5" />
                {JOURNEY_STAGE_CONFIG[aiSuggestion.suggestedJourneyStage]?.label || aiSuggestion.suggestedJourneyStage}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
