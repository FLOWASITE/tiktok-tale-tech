import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

export interface CalendarNote {
  id: string;
  organization_id: string;
  note_date: string;
  content: string;
  color: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useCalendarNotes() {
  const [notes, setNotes] = useState<CalendarNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  const fetchNotes = useCallback(async () => {
    if (!user || !currentOrganization?.id) {
      setNotes([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('calendar_notes')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('note_date', { ascending: true });

      if (error) throw error;
      setNotes((data || []) as CalendarNote[]);
    } catch (error) {
      console.error('Error fetching calendar notes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentOrganization?.id]);

  const addNote = async (noteDate: string, content: string, color = 'default') => {
    if (!user || !currentOrganization?.id) return null;

    try {
      const { data, error } = await supabase
        .from('calendar_notes')
        .insert({
          organization_id: currentOrganization.id,
          note_date: noteDate,
          content,
          color,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      toast({ title: 'Đã thêm ghi chú' });
      return data as CalendarNote;
    } catch (error) {
      console.error('Error adding note:', error);
      toast({ title: 'Lỗi', description: 'Không thể thêm ghi chú', variant: 'destructive' });
      return null;
    }
  };

  const updateNote = async (noteId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('calendar_notes')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', noteId);

      if (error) throw error;
      toast({ title: 'Đã cập nhật ghi chú' });
      return true;
    } catch (error) {
      console.error('Error updating note:', error);
      toast({ title: 'Lỗi', description: 'Không thể cập nhật ghi chú', variant: 'destructive' });
      return false;
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      toast({ title: 'Đã xóa ghi chú' });
      return true;
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({ title: 'Lỗi', description: 'Không thể xóa ghi chú', variant: 'destructive' });
      return false;
    }
  };

  const getNotesForDate = (dateStr: string) => {
    return notes.filter(n => n.note_date === dateStr);
  };

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Realtime subscription
  useEffect(() => {
    if (!currentOrganization?.id) return;

    const channel = supabase
      .channel('calendar_notes_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calendar_notes',
        filter: `organization_id=eq.${currentOrganization.id}`,
      }, () => {
        fetchNotes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrganization?.id, fetchNotes]);

  return {
    notes,
    isLoading,
    addNote,
    updateNote,
    deleteNote,
    getNotesForDate,
    fetchNotes,
  };
}
