import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { OrganizationMember, OrgRole } from '@/types/organization';
import { toast } from 'sonner';

export function useOrganizationMembers(organizationId?: string) {
  const { currentOrganization } = useOrganizationContext();
  const orgId = organizationId || currentOrganization?.id;
  
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!orgId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          organization_id,
          user_id,
          role,
          invited_by,
          invited_at,
          joined_at,
          created_at,
          profile:profiles!organization_members_user_id_fkey (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true });

      if (error) {
        // If foreign key doesn't exist, fetch without profile join
        if (error.code === 'PGRST200') {
          const { data: membersOnly, error: membersError } = await supabase
            .from('organization_members')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: true });

          if (membersError) throw membersError;

          // Fetch profiles separately
          const userIds = (membersOnly || []).map((m) => m.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url')
            .in('id', userIds);

          const membersWithProfiles = (membersOnly || []).map((m) => ({
            ...m,
            profile: profiles?.find((p) => p.id === m.user_id),
          }));

          setMembers(membersWithProfiles as OrganizationMember[]);
          return;
        }
        throw error;
      }

      setMembers((data || []) as unknown as OrganizationMember[]);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Invite existing user (legacy method)
  const inviteMember = async (email: string, role: OrgRole = 'member'): Promise<boolean> => {
    if (!orgId) return false;

    try {
      setUpdating(true);

      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profileError || !profile) {
        toast.error('Không tìm thấy người dùng với email này');
        return false;
      }

      // Check if already a member
      const existingMember = members.find((m) => m.user_id === profile.id);
      if (existingMember) {
        toast.error('Người dùng đã là thành viên của tổ chức');
        return false;
      }

      const { error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: orgId,
          user_id: profile.id,
          role,
          joined_at: new Date().toISOString(),
        });

      if (error) throw error;

      await fetchMembers();
      toast.success('Đã thêm thành viên thành công!');
      return true;
    } catch (error: any) {
      console.error('Error inviting member:', error);
      toast.error('Lỗi khi thêm thành viên: ' + error.message);
      return false;
    } finally {
      setUpdating(false);
    }
  };

  // Create new member with default password
  const createMember = async (
    email: string,
    role: OrgRole = 'member',
    password: string = 'abc123',
    fullName?: string
  ): Promise<boolean> => {
    if (!orgId) return false;

    try {
      setUpdating(true);

      const { data, error } = await supabase.functions.invoke('create-org-member', {
        body: {
          email,
          password,
          fullName,
          organizationId: orgId,
          role,
        },
      });

      if (error) {
        console.error('Error creating member:', error);
        toast.error('Lỗi khi tạo thành viên: ' + error.message);
        return false;
      }

      if (data.error) {
        toast.error(data.error);
        return false;
      }

      await fetchMembers();
      
      if (data.isNewUser) {
        toast.success(`Đã tạo tài khoản mới cho ${email} với mật khẩu mặc định`);
      } else {
        toast.success(`Đã thêm ${email} vào tổ chức`);
      }
      
      return true;
    } catch (error: any) {
      console.error('Error creating member:', error);
      toast.error('Lỗi khi tạo thành viên: ' + error.message);
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const updateMemberRole = async (memberId: string, newRole: OrgRole): Promise<boolean> => {
    try {
      setUpdating(true);

      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      await fetchMembers();
      toast.success('Đã cập nhật vai trò thành công!');
      return true;
    } catch (error: any) {
      console.error('Error updating member role:', error);
      toast.error('Lỗi khi cập nhật vai trò: ' + error.message);
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const removeMember = async (memberId: string): Promise<boolean> => {
    try {
      setUpdating(true);

      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      await fetchMembers();
      toast.success('Đã xóa thành viên thành công!');
      return true;
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error('Lỗi khi xóa thành viên: ' + error.message);
      return false;
    } finally {
      setUpdating(false);
    }
  };

  // Bulk create members
  const bulkCreateMembers = async (
    emails: string[],
    role: OrgRole = 'member',
    password: string = 'abc123',
    onProgress?: (completed: number, total: number, results: { success: string[]; failed: { email: string; error: string }[] }) => void
  ): Promise<{ success: string[]; failed: { email: string; error: string }[] }> => {
    if (!orgId) return { success: [], failed: [] };

    const results: { success: string[]; failed: { email: string; error: string }[] } = {
      success: [],
      failed: [],
    };

    setUpdating(true);

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i].trim();
      if (!email) continue;

      try {
        const { data, error } = await supabase.functions.invoke('create-org-member', {
          body: { email, password, organizationId: orgId, role },
        });

        if (error) {
          results.failed.push({ email, error: error.message });
        } else if (data?.error) {
          results.failed.push({ email, error: data.error });
        } else {
          results.success.push(email);
        }
      } catch (err: any) {
        results.failed.push({ email, error: err.message });
      }

      onProgress?.(i + 1, emails.length, results);
    }

    await fetchMembers();
    setUpdating(false);

    if (results.success.length > 0) {
      toast.success(`Đã thêm ${results.success.length} thành viên thành công`);
    }
    if (results.failed.length > 0) {
      toast.error(`${results.failed.length} thành viên thêm thất bại`);
    }

    return results;
  };

  return {
    members,
    loading,
    updating,
    inviteMember,
    createMember,
    bulkCreateMembers,
    updateMemberRole,
    removeMember,
    refreshMembers: fetchMembers,
  };
}
