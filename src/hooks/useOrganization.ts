import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Organization } from '@/types/organization';
import { toast } from 'sonner';

export function useOrganization() {
  const { user } = useAuth();
  const { 
    organizations, 
    currentOrganization, 
    currentRole,
    loading, 
    switchOrganization,
    refreshOrganizations 
  } = useOrganizationContext();
  
  const [updating, setUpdating] = useState(false);

  const createOrganization = async (name: string): Promise<Organization | null> => {
    if (!user) return null;

    try {
      setUpdating(true);
      console.debug('[createOrganization] invoking backend function create-organization');

      const { data, error } = await supabase.functions.invoke('create-organization', {
        body: { name },
      });

      if (error) throw error;

      const org = data?.organization as Organization | undefined;
      if (!org) throw new Error('Không nhận được dữ liệu tổ chức');

      await refreshOrganizations();
      toast.success('Tạo tổ chức thành công!');
      return org;
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast.error('Lỗi khi tạo tổ chức: ' + (error?.message ?? 'Unknown error'));
      return null;
    } finally {
      setUpdating(false);
    }
  };

  const updateOrganization = async (
    orgId: string,
    updates: Partial<Pick<Organization, 'name' | 'logo_url' | 'primary_color'>>
  ): Promise<boolean> => {
    try {
      setUpdating(true);

      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', orgId);

      if (error) throw error;

      await refreshOrganizations();
      toast.success('Cập nhật tổ chức thành công!');
      return true;
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toast.error('Lỗi khi cập nhật tổ chức: ' + error.message);
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const deleteOrganization = async (orgId: string): Promise<boolean> => {
    try {
      setUpdating(true);

      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', orgId);

      if (error) throw error;

      await refreshOrganizations();
      toast.success('Xóa tổ chức thành công!');
      return true;
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      toast.error('Lỗi khi xóa tổ chức: ' + error.message);
      return false;
    } finally {
      setUpdating(false);
    }
  };

  return {
    organizations,
    currentOrganization,
    currentRole,
    loading,
    updating,
    switchOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    refreshOrganizations,
  };
}
