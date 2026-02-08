import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Script } from '@/types/script';
import { ScriptApproval, ScriptApprovalStatus } from '@/types/scriptCollaboration';
import { toast } from 'sonner';

export function useScriptApproval(scriptId?: string) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const [approval, setApproval] = useState<ScriptApproval | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<ScriptApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchApproval = useCallback(async () => {
    if (!scriptId || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('script_approvals')
        .select('*')
        .eq('script_id', scriptId)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setApproval(data as ScriptApproval | null);
    } catch (error) {
      console.error('Error fetching approval:', error);
    } finally {
      setLoading(false);
    }
  }, [scriptId, user]);

  const fetchPendingApprovals = useCallback(async () => {
    if (!user || !currentOrganization) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('script_approvals')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'pending_approval')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setPendingApprovals(data as ScriptApproval[]);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentOrganization]);

  const requestApproval = useCallback(async (
    script: Script,
    notes?: string
  ): Promise<boolean> => {
    if (!user || !currentOrganization) {
      toast.error('Vui lòng đăng nhập và chọn tổ chức');
      return false;
    }

    setSubmitting(true);
    try {
      // Get current script version
      const currentVersion = (script as unknown as { version?: number }).version || 1;

      const approvalData = {
        script_id: script.id,
        requested_by: user.id,
        version_at_request: currentVersion,
        notes,
        organization_id: currentOrganization.id,
        status: 'pending_approval' as ScriptApprovalStatus,
      };

      const { data, error } = await supabase
        .from('script_approvals')
        .insert(approvalData)
        .select()
        .single();

      if (error) throw error;

      // Update script status
      await supabase
        .from('scripts')
        .update({ status: 'pending_approval' })
        .eq('id', script.id);

      setApproval(data as ScriptApproval);
      toast.success('Đã gửi yêu cầu phê duyệt!');
      return true;
    } catch (error) {
      console.error('Error requesting approval:', error);
      toast.error('Không thể gửi yêu cầu phê duyệt');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [user, currentOrganization]);

  const reviewApproval = useCallback(async (
    approvalId: string,
    decision: 'approved' | 'rejected',
    notes?: string
  ): Promise<boolean> => {
    if (!user) {
      toast.error('Vui lòng đăng nhập');
      return false;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('script_approvals')
        .update({
          status: decision,
          reviewer_id: user.id,
          reviewed_at: new Date().toISOString(),
          notes,
        })
        .eq('id', approvalId)
        .select()
        .single();

      if (error) throw error;

      const approvalData = data as ScriptApproval;

      // Update script status
      await supabase
        .from('scripts')
        .update({ 
          status: decision,
          approved_by: decision === 'approved' ? user.id : null,
          approved_at: decision === 'approved' ? new Date().toISOString() : null,
          rejection_reason: decision === 'rejected' ? notes : null,
        })
        .eq('id', approvalData.script_id);

      setApproval(approvalData);
      setPendingApprovals(prev => prev.filter(a => a.id !== approvalId));
      
      toast.success(decision === 'approved' ? 'Đã phê duyệt!' : 'Đã từ chối!');
      return true;
    } catch (error) {
      console.error('Error reviewing approval:', error);
      toast.error('Không thể xử lý yêu cầu');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [user]);

  const cancelApproval = useCallback(async (approvalId: string): Promise<boolean> => {
    if (!user) return false;

    setSubmitting(true);
    try {
      const currentApproval = approval || pendingApprovals.find(a => a.id === approvalId);
      
      const { error } = await supabase
        .from('script_approvals')
        .delete()
        .eq('id', approvalId);

      if (error) throw error;

      // Reset script status to draft
      if (currentApproval) {
        await supabase
          .from('scripts')
          .update({ status: 'draft' })
          .eq('id', currentApproval.script_id);
      }

      setApproval(null);
      toast.success('Đã hủy yêu cầu phê duyệt');
      return true;
    } catch (error) {
      console.error('Error canceling approval:', error);
      toast.error('Không thể hủy yêu cầu');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [user, approval, pendingApprovals]);

  return {
    approval,
    pendingApprovals,
    loading,
    submitting,
    fetchApproval,
    fetchPendingApprovals,
    requestApproval,
    reviewApproval,
    cancelApproval,
  };
}
