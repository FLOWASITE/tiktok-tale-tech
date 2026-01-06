import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMarketingCalendar } from '@/hooks/useMarketingCalendar';
import { EVENT_TYPE_CONFIG } from '@/types/marketingCalendar';
import { Sparkles, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SeasonalSuggestionChipsProps {
  onApplyTheme: (theme: string, eventName: string) => void;
  maxItems?: number;
}

export function SeasonalSuggestionChips({ onApplyTheme, maxItems = 6 }: SeasonalSuggestionChipsProps) {
  const { urgentEvent, upcomingEvents } = useMarketingCalendar();

  // Collect all themes from upcoming events
  const allThemes: { theme: string; eventName: string; eventType: string }[] = [];
  
  upcomingEvents.slice(0, 3).forEach(event => {
    event.suggested_themes?.forEach(theme => {
      allThemes.push({
        theme,
        eventName: event.event_name_vi || event.event_name,
        eventType: event.event_type,
      });
    });
  });

  if (allThemes.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>Gợi ý theo mùa/xu hướng:</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {allThemes.slice(0, maxItems).map((item, i) => {
          const config = EVENT_TYPE_CONFIG[item.eventType as keyof typeof EVENT_TYPE_CONFIG];
          return (
            <TooltipProvider key={i}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={cn(
                      "cursor-pointer hover:bg-primary/10 transition-colors",
                      config?.color
                    )}
                    onClick={() => onApplyTheme(item.theme, item.eventName)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {item.theme}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Click để thêm theme "{item.theme}" từ {item.eventName}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}
