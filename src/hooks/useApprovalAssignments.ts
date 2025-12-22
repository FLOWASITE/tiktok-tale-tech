import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ApprovalAssignment } from '@/types/approvalAssignment';

export function useApprovalAssignments() {
  const { currentOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<ApprovalAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
    if (!currentOrganization?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('approval_assignments')
        .select('*')
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching approval assignments:', error);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const addAssignment = async (approverId: string, creatorId: string): Promise<boolean> => {
    if (!currentOrganization?.id || !user?.id) return false;

    try {
      const { data, error } = await supabase
        .from('approval_assignments')
        .insert({
          organization_id: currentOrganization.id,
          approver_id: approverId,
          creator_id: creatorId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Phân công này đã tồn tại');
          return false;
        }
        throw error;
      }

      setAssignments(prev => [...prev, data]);
      toast.success('Đã thêm phân công');
      return true;
    } catch (error: any) {
      console.error('Error adding assignment:', error);
      toast.error('Lỗi khi thêm phân công: ' + error.message);
      return false;
    }
  };

  const removeAssignment = async (assignmentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('approval_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      toast.success('Đã xóa phân công');
      return true;
    } catch (error: any) {
      console.error('Error removing assignment:', error);
      toast.error('Lỗi khi xóa phân công: ' + error.message);
      return false;
    }
  };

  const getApproversForCreator = useCallback((creatorId: string): string[] => {
    return assignments
      .filter(a => a.creator_id === creatorId)
      .map(a => a.approver_id);
  }, [assignments]);

  const getCreatorsForApprover = useCallback((approverId: string): string[] => {
    return assignments
      .filter(a => a.approver_id === approverId)
      .map(a => a.creator_id);
  }, [assignments]);

  const canApproveForCreator = useCallback((approverId: string, creatorId: string): boolean => {
    return assignments.some(
      a => a.approver_id === approverId && a.creator_id === creatorId
    );
  }, [assignments]);

  return {
    assignments,
    loading,
    addAssignment,
    removeAssignment,
    getApproversForCreator,
    getCreatorsForApprover,
    canApproveForCreator,
    refetch: fetchAssignments,
  };
}
