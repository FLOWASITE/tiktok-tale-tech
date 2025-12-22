import { useState, useEffect, useCallback } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OrgRole } from '@/types/organization';

interface OrganizationApprovalSettings {
  skip_approval: boolean;
  approver_roles: OrgRole[];
}

export function useOrganizationSettings() {
  const { currentOrganization, refreshOrganizations } = useOrganizationContext();
  const [settings, setSettings] = useState<OrganizationApprovalSettings>({
    skip_approval: false,
    approver_roles: ['owner', 'admin'],
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
        .select('skip_approval, approver_roles')
        .eq('id', currentOrganization.id)
        .single();

      if (error) throw error;

      setSettings({
        skip_approval: data?.skip_approval ?? false,
        approver_roles: (data?.approver_roles as OrgRole[]) ?? ['owner', 'admin'],
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
    approverRoles: OrgRole[]
  ): Promise<boolean> => {
    if (!currentOrganization?.id) return false;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          skip_approval: skipApproval,
          approver_roles: approverRoles,
        })
        .eq('id', currentOrganization.id);

      if (error) throw error;

      setSettings({
        skip_approval: skipApproval,
        approver_roles: approverRoles,
      });

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

  return {
    skipApproval: settings.skip_approval,
    approverRoles: settings.approver_roles,
    loading,
    updating,
    updateApprovalSettings,
    refetch: fetchSettings,
  };
}
