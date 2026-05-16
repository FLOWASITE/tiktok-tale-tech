import { useState, useEffect, useCallback } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OrgRole } from '@/types/organization';

export type DefaultAutonomyLevel = 'human_in_loop' | 'human_on_loop' | 'full_auto';

interface OrganizationApprovalSettings {
  skip_approval: boolean;
  approver_roles: OrgRole[];
  use_specific_approvers: boolean;
  auto_submit_review: boolean;
  default_autonomy_level: DefaultAutonomyLevel;
}

export function useOrganizationSettings() {
  const { currentOrganization, refreshOrganizations } = useOrganizationContext();
  const [settings, setSettings] = useState<OrganizationApprovalSettings>({
    skip_approval: false,
    approver_roles: ['owner', 'admin'],
    use_specific_approvers: false,
    auto_submit_review: false,
    default_autonomy_level: 'full_auto',
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!currentOrganization?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('skip_approval, approver_roles, use_specific_approvers, auto_submit_review, default_autonomy_level')
        .eq('id', currentOrganization.id)
        .single();

      if (error) throw error;

      setSettings({
        skip_approval: data?.skip_approval ?? false,
        approver_roles: (data?.approver_roles as OrgRole[]) ?? ['owner', 'admin'],
        use_specific_approvers: data?.use_specific_approvers ?? false,
        auto_submit_review: data?.auto_submit_review ?? false,
        default_autonomy_level: ((data as any)?.default_autonomy_level as DefaultAutonomyLevel) ?? 'full_auto',
      });
    } catch (error) {
      console.error('Error fetching organization settings:', error);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateApprovalSettings = async (
    skipApproval: boolean,
    approverRoles: OrgRole[],
    useSpecificApprovers?: boolean
  ): Promise<boolean> => {
    if (!currentOrganization?.id) return false;

    setUpdating(true);
    try {
      const updateData: any = {
        skip_approval: skipApproval,
        approver_roles: approverRoles,
      };
      
      if (useSpecificApprovers !== undefined) {
        updateData.use_specific_approvers = useSpecificApprovers;
      }

      const { error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', currentOrganization.id);

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        skip_approval: skipApproval,
        approver_roles: approverRoles,
        use_specific_approvers: useSpecificApprovers ?? prev.use_specific_approvers,
      }));

      await refreshOrganizations();
      toast.success('Đã cập nhật cài đặt phê duyệt');
      return true;
    } catch (error: any) {
      console.error('Error updating approval settings:', error);
      toast.error('Lỗi khi cập nhật: ' + error.message);
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const updateUseSpecificApprovers = async (useSpecificApprovers: boolean): Promise<boolean> => {
    if (!currentOrganization?.id) return false;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ use_specific_approvers: useSpecificApprovers })
        .eq('id', currentOrganization.id);

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        use_specific_approvers: useSpecificApprovers,
      }));

      await refreshOrganizations();
      toast.success('Đã cập nhật chế độ phê duyệt');
      return true;
    } catch (error: any) {
      console.error('Error updating use_specific_approvers:', error);
      toast.error('Lỗi khi cập nhật: ' + error.message);
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const updateAutoSubmitReview = async (autoSubmitReview: boolean): Promise<boolean> => {
    if (!currentOrganization?.id) return false;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ auto_submit_review: autoSubmitReview })
        .eq('id', currentOrganization.id);

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        auto_submit_review: autoSubmitReview,
      }));

      await refreshOrganizations();
      toast.success('Đã cập nhật cài đặt tự động gửi duyệt');
      return true;
    } catch (error: any) {
      console.error('Error updating auto_submit_review:', error);
      toast.error('Lỗi khi cập nhật: ' + error.message);
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const updateDefaultAutonomyLevel = async (level: DefaultAutonomyLevel): Promise<boolean> => {
    if (!currentOrganization?.id) return false;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ default_autonomy_level: level } as any)
        .eq('id', currentOrganization.id);
      if (error) throw error;
      setSettings(prev => ({ ...prev, default_autonomy_level: level }));
      toast.success('Đã cập nhật mức tự động mặc định');
      return true;
    } catch (error: any) {
      console.error('Error updating default_autonomy_level:', error);
      toast.error('Lỗi khi cập nhật: ' + error.message);
      return false;
    } finally {
      setUpdating(false);
    }
  };

  return {
    skipApproval: settings.skip_approval,
    approverRoles: settings.approver_roles,
    useSpecificApprovers: settings.use_specific_approvers,
    autoSubmitReview: settings.auto_submit_review,
    defaultAutonomyLevel: settings.default_autonomy_level,
    loading,
    updating,
    updateApprovalSettings,
    updateUseSpecificApprovers,
    updateAutoSubmitReview,
    updateDefaultAutonomyLevel,
    refetch: fetchSettings,
  };
}
