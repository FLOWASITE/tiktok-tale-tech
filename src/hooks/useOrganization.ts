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
      
      // Create slug from name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const uniqueSlug = `${slug}-${Date.now()}`;

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name,
          slug: uniqueSlug,
          owner_id: user.id,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add user as owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'owner',
          joined_at: new Date().toISOString(),
        });

      if (memberError) throw memberError;

      await refreshOrganizations();
      toast.success('Tạo tổ chức thành công!');
      return org;
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast.error('Lỗi khi tạo tổ chức: ' + error.message);
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
