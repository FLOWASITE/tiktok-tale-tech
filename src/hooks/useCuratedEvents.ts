import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { CuratedEvent } from '@/types/curatedData';

export function useCuratedEvents() {
  const { currentOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.id;

  const { data: events = [], isLoading, error, refetch } = useQuery({
    queryKey: ['curated-events', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curated_events')
        .select('*')
        .order('event_date', { ascending: true });
      
      if (error) throw error;
      return data as CuratedEvent[];
    },
    enabled: true,
  });

  const createEvent = useMutation({
    mutationFn: async (event: Partial<CuratedEvent>) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('curated_events')
        .insert([{
          name: event.name!,
          description: event.description || null,
          event_date: event.event_date!,
          end_date: event.end_date || null,
          event_type: event.event_type || 'holiday',
          industries: event.industries || [],
          suggested_topics: event.suggested_topics || [],
          suggested_angles: event.suggested_angles || [],
          priority: event.priority || 3,
          is_active: event.is_active ?? true,
          organization_id: orgId || null,
          created_by: userData.user?.id || null,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curated-events'] });
      toast.success('Đã thêm sự kiện mới');
    },
    onError: (error) => {
      toast.error('Không thể thêm sự kiện: ' + error.message);
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CuratedEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from('curated_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curated-events'] });
      toast.success('Đã cập nhật sự kiện');
    },
    onError: (error) => {
      toast.error('Không thể cập nhật: ' + error.message);
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('curated_events')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curated-events'] });
      toast.success('Đã xóa sự kiện');
    },
    onError: (error) => {
      toast.error('Không thể xóa: ' + error.message);
    },
  });

  // Get upcoming events (within next N days)
  const getUpcomingEvents = useCallback((daysAhead: number = 60) => {
    const now = new Date();
    const maxDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    
    return events.filter(event => {
      if (!event.is_active) return false;
      const eventDate = new Date(event.event_date);
      return eventDate >= now && eventDate <= maxDate;
    }).sort((a, b) => 
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
  }, [events]);

  return {
    events,
    isLoading,
    error,
    refetch,
    createEvent: createEvent.mutate,
    updateEvent: updateEvent.mutate,
    deleteEvent: deleteEvent.mutate,
    isCreating: createEvent.isPending,
    isUpdating: updateEvent.isPending,
    isDeleting: deleteEvent.isPending,
    getUpcomingEvents,
  };
}
