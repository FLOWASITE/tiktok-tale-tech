import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { ContentAssignment, AssignmentStatus, AssignmentPriority } from '@/types/assignment';
import { Channel } from '@/types/multichannel';
import { toast } from 'sonner';

export const useContentAssignments = (contentId?: string) => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const [assignments, setAssignments] = useState<ContentAssignment[]>([]);
  const [myAssignments, setMyAssignments] = useState<ContentAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAssignments = useCallback(async () => {
    if (!currentOrganization) return;
    
    setIsLoading(true);
    try {
      let query = supabase
        .from('content_assignments')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (contentId) {
        query = query.eq('content_id', contentId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles for assignees and assigners
      const userIds = [...new Set([
        ...data.map(a => a.assigned_to),
        ...data.map(a => a.assigned_by)
      ])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const enrichedData = data.map(assignment => ({
        ...assignment,
        channel: assignment.channel as Channel,
        status: assignment.status as AssignmentStatus,
        priority: assignment.priority as AssignmentPriority,
        assignee: profileMap.get(assignment.assigned_to),
        assigner: profileMap.get(assignment.assigned_by),
      }));

      setAssignments(enrichedData);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization, contentId]);

  const fetchMyAssignments = useCallback(async () => {
    if (!user || !currentOrganization) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('content_assignments')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('assigned_to', user.id)
        .not('status', 'in', '("completed","cancelled")')
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;

      const enrichedData = data.map(assignment => ({
        ...assignment,
        channel: assignment.channel as Channel,
        status: assignment.status as AssignmentStatus,
        priority: assignment.priority as AssignmentPriority,
      }));

      setMyAssignments(enrichedData);
    } catch (error) {
      console.error('Error fetching my assignments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentOrganization]);

  const createAssignment = async (
    contentId: string,
    channel: Channel,
    assignedTo: string,
    priority: AssignmentPriority = 'normal',
    dueDate?: string,
    notes?: string
  ) => {
    if (!user || !currentOrganization) return null;

    try {
      const { data, error } = await supabase
        .from('content_assignments')
        .insert({
          content_id: contentId,
          channel,
          assigned_to: assignedTo,
          assigned_by: user.id,
          organization_id: currentOrganization.id,
          priority,
          due_date: dueDate || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Create notification for assignee
      await createNotification(
        assignedTo,
        'assignment_new',
        'Nhiệm vụ mới',
        `Bạn được phân công task cho kênh ${channel}`,
        { content_id: contentId, channel, assignment_id: data.id }
      );

      toast.success('Đã phân công nhiệm vụ');
      await fetchAssignments();
      return data;
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('Không thể phân công nhiệm vụ');
      return null;
    }
  };

  const updateAssignmentStatus = async (assignmentId: string, status: AssignmentStatus) => {
    try {
      const updateData: Record<string, unknown> = { status };
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('content_assignments')
        .update(updateData)
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success('Đã cập nhật trạng thái');
      await fetchAssignments();
      await fetchMyAssignments();
    } catch (error) {
      console.error('Error updating assignment status:', error);
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  const deleteAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('content_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success('Đã xóa phân công');
      await fetchAssignments();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Không thể xóa phân công');
    }
  };

  const createNotification = async (
    userId: string,
    type: string,
    title: string,
    message: string,
    notificationData: Record<string, unknown> = {}
  ) => {
    try {
      await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          organization_id: currentOrganization?.id || null,
          type,
          title,
          message,
          data: JSON.parse(JSON.stringify(notificationData)),
        }]);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  useEffect(() => {
    fetchAssignments();
    fetchMyAssignments();
  }, [fetchAssignments, fetchMyAssignments]);

  return {
    assignments,
    myAssignments,
    isLoading,
    createAssignment,
    updateAssignmentStatus,
    deleteAssignment,
    refreshAssignments: fetchAssignments,
    refreshMyAssignments: fetchMyAssignments,
  };
};
