import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { AgentTeamMember, AgentTeamPermission, AgentAutonomyLevel } from '@/types/agent';
import { toast } from '@/hooks/use-toast';

export function useAgentTeam() {
  const { currentOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const [members, setMembers] = useState<AgentTeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!currentOrganization) return;
    setLoading(true);

    try {
      // Fetch org members with profiles
      const { data: orgMembers, error: membersError } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          role,
          profiles:user_id (id, email, full_name, avatar_url)
        `)
        .eq('organization_id', currentOrganization.id);

      if (membersError) throw membersError;

      // Fetch agent permissions
      const { data: permissions, error: permError } = await supabase
        .from('agent_team_permissions')
        .select('*')
        .eq('organization_id', currentOrganization.id);

      if (permError) throw permError;

      // Count pipelines this month per user (via agent_goals created_by)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: pipelineCounts } = await supabase
        .from('agent_pipelines')
        .select('id, goal_id')
        .eq('organization_id', currentOrganization.id)
        .gte('created_at', startOfMonth.toISOString());

      // Build member list
      const result: AgentTeamMember[] = (orgMembers || []).map((m: any) => {
        const profile = m.profiles;
        const perm = (permissions || []).find((p: any) => p.user_id === m.user_id) || null;

        return {
          user_id: m.user_id,
          email: profile?.email || '',
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
          org_role: m.role,
          permission: perm as AgentTeamPermission | null,
          pipelines_this_month: (pipelineCounts || []).length, // simplified
        };
      });

      setMembers(result);
    } catch (error) {
      console.error('Error fetching agent team:', error);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const upsertPermission = useCallback(async (
    userId: string,
    data: {
      can_create_goals: boolean;
      can_approve: boolean;
      can_override: boolean;
      max_autonomy_level: AgentAutonomyLevel;
      monthly_pipeline_limit: number | null;
      is_active: boolean;
    }
  ) => {
    if (!currentOrganization || !user) return;

    const { error } = await supabase
      .from('agent_team_permissions')
      .upsert({
        organization_id: currentOrganization.id,
        user_id: userId,
        granted_by: user.id,
        ...data,
      }, { onConflict: 'organization_id,user_id' });

    if (error) {
      toast({ title: 'Lỗi', description: 'Không thể cập nhật quyền', variant: 'destructive' });
      throw error;
    }

    toast({ title: 'Đã cập nhật', description: 'Quyền Agent đã được lưu' });
    await fetchMembers();
  }, [currentOrganization, user, fetchMembers]);

  const stats = {
    totalWithPermissions: members.filter(m => m.permission?.is_active).length,
    canApproveCount: members.filter(m => m.permission?.can_approve).length,
    pipelinesThisMonth: members.reduce((sum, m) => sum + m.pipelines_this_month, 0),
  };

  return { members, loading, stats, upsertPermission, refresh: fetchMembers };
}
