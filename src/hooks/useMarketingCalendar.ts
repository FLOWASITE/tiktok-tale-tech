import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import type { MarketingEvent } from '@/types/marketingCalendar';

export function useMarketingCalendar() {
  // Fetch all active events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['marketing-calendar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_calendar')
        .select('*')
        .eq('is_active', true)
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      return data as MarketingEvent[];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Get upcoming events (within next 30 days)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const thirtyDaysLater = addDays(now, 30);
    
    return events.filter(event => {
      const startDate = parseISO(event.start_date);
      return isAfter(startDate, now) && isBefore(startDate, thirtyDaysLater);
    }).map(event => ({
      ...event,
      daysUntil: differenceInDays(parseISO(event.start_date), now),
    }));
  }, [events]);

  // Get most urgent event (highest urgency, soonest, within 14 days)
  const urgentEvent = useMemo(() => {
    const now = new Date();
    const fourteenDaysLater = addDays(now, 14);
    
    const urgentEvents = events.filter(event => {
      const startDate = parseISO(event.start_date);
      return isAfter(startDate, now) && isBefore(startDate, fourteenDaysLater);
    }).map(event => ({
      ...event,
      daysUntil: differenceInDays(parseISO(event.start_date), now),
    }));
    
    if (urgentEvents.length === 0) return null;
    
    // Sort by urgency level (desc) then by days until (asc)
    urgentEvents.sort((a, b) => {
      if (b.urgency_level !== a.urgency_level) {
        return b.urgency_level - a.urgency_level;
      }
      return a.daysUntil - b.daysUntil;
    });
    
    return urgentEvents[0];
  }, [events]);

  // Get current ongoing events
  const ongoingEvents = useMemo(() => {
    const now = new Date();
    
    return events.filter(event => {
      const startDate = parseISO(event.start_date);
      const endDate = event.end_date ? parseISO(event.end_date) : startDate;
      return !isAfter(startDate, now) && !isBefore(endDate, now);
    });
  }, [events]);

  return {
    events,
    upcomingEvents,
    urgentEvent,
    ongoingEvents,
    isLoading,
  };
}
