import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Calendar, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMarketingCalendar } from '@/hooks/useMarketingCalendar';
import { EVENT_TYPE_CONFIG } from '@/types/marketingCalendar';
import type { MarketingEvent } from '@/types/marketingCalendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface TrendAlertBannerProps {
  onCreateAd?: (event: MarketingEvent & { daysUntil: number }) => void;
}

export function TrendAlertBanner({ onCreateAd }: TrendAlertBannerProps) {
  const { urgentEvent, upcomingEvents } = useMarketingCalendar();
  const [isDismissed, setIsDismissed] = useState(() => {
    if (!urgentEvent) return false;
    const dismissed = localStorage.getItem(`trend_dismissed_${urgentEvent.id}`);
    return dismissed === 'true';
  });
  const [showMore, setShowMore] = useState(false);

  if (!urgentEvent || isDismissed) return null;

  const eventConfig = EVENT_TYPE_CONFIG[urgentEvent.event_type];
  const otherEvents = upcomingEvents.filter(e => e.id !== urgentEvent.id).slice(0, 3);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(`trend_dismissed_${urgentEvent.id}`, 'true');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 border border-primary/20 p-4"
    >
      {/* Dismiss button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 opacity-60 hover:opacity-100"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        {/* Icon & Event Info */}
        <div className="flex items-center gap-3">
          <div className="text-3xl">{eventConfig.icon}</div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">
                {urgentEvent.event_name_vi || urgentEvent.event_name}
              </h4>
              <Badge variant="outline" className={cn(eventConfig.color, "text-xs")}>
                {eventConfig.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              {format(new Date(urgentEvent.start_date), 'dd/MM/yyyy', { locale: vi })}
              <span className="font-medium text-primary">
                • Còn {urgentEvent.daysUntil} ngày
              </span>
            </p>
          </div>
        </div>

        {/* Suggested Themes */}
        {urgentEvent.suggested_themes && urgentEvent.suggested_themes.length > 0 && (
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">Gợi ý themes:</p>
            <div className="flex flex-wrap gap-1">
              {urgentEvent.suggested_themes.slice(0, 4).map((theme, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {theme}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <Button
          size="sm"
          className="gap-2 whitespace-nowrap"
          onClick={() => onCreateAd?.(urgentEvent)}
        >
          <Sparkles className="h-4 w-4" />
          Tạo Ad Copy
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Other upcoming events */}
      {otherEvents.length > 0 && (
        <div className="mt-3 pt-3 border-t border-primary/10">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowMore(!showMore)}
          >
            {showMore ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            {showMore ? 'Ẩn bớt' : `+${otherEvents.length} sự kiện sắp tới`}
          </Button>
          
          <AnimatePresence>
            {showMore && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 mt-2">
                  {otherEvents.map(event => {
                    const config = EVENT_TYPE_CONFIG[event.event_type];
                    return (
                      <Badge
                        key={event.id}
                        variant="outline"
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => onCreateAd?.(event)}
                      >
                        {config.icon} {event.event_name_vi || event.event_name} ({event.daysUntil} ngày)
                      </Badge>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
