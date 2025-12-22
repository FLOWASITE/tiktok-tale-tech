import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export type ApprovalAction = 'submitted' | 'approved' | 'rejected';

export interface ApprovalLog {
  id: string;
  content_id: string;
  organization_id: string;
  action: ApprovalAction;
  performed_by: string;
  notes: string | null;
  created_at: string;
  performer?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export function useApprovalLogs(contentId?: string) {
  const { currentOrganization } = useOrganizationContext();
  const [logs, setLogs] = useState<ApprovalLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!contentId || !currentOrganization) {
      setLogs([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('approval_logs')
        .select('*')
        .eq('content_id', contentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch performer profiles
      const performerIds = [...new Set((data || []).map(log => log.performed_by))];
      
      let profilesMap: Record<string, { full_name: string | null; email: string; avatar_url: string | null }> = {};
      
      if (performerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', performerIds);

        if (profiles) {
          profilesMap = profiles.reduce((acc, profile) => {
            acc[profile.id] = {
              full_name: profile.full_name,
              email: profile.email,
              avatar_url: profile.avatar_url,
            };
            return acc;
          }, {} as Record<string, { full_name: string | null; email: string; avatar_url: string | null }>);
        }
      }

      const logsWithPerformers: ApprovalLog[] = (data || []).map(log => ({
        ...log,
        action: log.action as ApprovalAction,
        performer: profilesMap[log.performed_by],
      }));

      setLogs(logsWithPerformers);
    } catch (error) {
      console.error('Error fetching approval logs:', error);
    } finally {
      setLoading(false);
    }
  }, [contentId, currentOrganization]);

  const addLog = useCallback(async (
    contentId: string,
    action: ApprovalAction,
    performedBy: string,
    notes?: string
  ): Promise<boolean> => {
    if (!currentOrganization) return false;

    try {
      const { error } = await supabase
        .from('approval_logs')
        .insert({
          content_id: contentId,
          organization_id: currentOrganization.id,
          action,
          performed_by: performedBy,
          notes: notes || null,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding approval log:', error);
      return false;
    }
  }, [currentOrganization]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!contentId) return;

    const channel = supabase
      .channel(`approval_logs_${contentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'approval_logs',
          filter: `content_id=eq.${contentId}`,
        },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contentId, fetchLogs]);

  return {
    logs,
    loading,
    addLog,
    refetch: fetchLogs,
  };
}
