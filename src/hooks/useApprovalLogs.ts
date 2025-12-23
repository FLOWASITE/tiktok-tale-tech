import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Json } from '@/integrations/supabase/types';

export type ApprovalAction = 'submitted' | 'approved' | 'rejected';

export interface IndustryMemorySnapshot {
  industry_template_id: string;
  industry_name: string;
  version: string;
  compliance_passed: boolean;
  checklist: {
    id: string;
    type: 'compliance' | 'forbidden' | 'claim';
    text: string;
    passed: boolean;
  }[];
  reviewer_confirmed: boolean;
  rejected_rules: string[];
}

export interface ApprovalLog {
  id: string;
  content_id: string;
  organization_id: string;
  action: ApprovalAction;
  performed_by: string;
  notes: string | null;
  created_at: string;
  industry_memory_snapshot: IndustryMemorySnapshot | null;
  performer?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

// Helper to parse industry memory snapshot from JSONB
function parseIndustrySnapshot(snapshot: Json | null): IndustryMemorySnapshot | null {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null;
  
  const s = snapshot as Record<string, unknown>;
  if (!s.industry_template_id || !s.industry_name || !s.version) return null;
  
  return {
    industry_template_id: String(s.industry_template_id),
    industry_name: String(s.industry_name),
    version: String(s.version),
    compliance_passed: Boolean(s.compliance_passed),
    checklist: Array.isArray(s.checklist) ? s.checklist.map(item => {
      const i = item as Record<string, unknown>;
      return {
        id: String(i.id || ''),
        type: (i.type as 'compliance' | 'forbidden' | 'claim') || 'compliance',
        text: String(i.text || ''),
        passed: Boolean(i.passed),
      };
    }) : [],
    reviewer_confirmed: Boolean(s.reviewer_confirmed),
    rejected_rules: Array.isArray(s.rejected_rules) ? s.rejected_rules.map(String) : [],
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
        industry_memory_snapshot: parseIndustrySnapshot(log.industry_memory_snapshot),
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
    notes?: string,
    industryMemorySnapshot?: IndustryMemorySnapshot
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
          industry_memory_snapshot: industryMemorySnapshot 
            ? (industryMemorySnapshot as unknown as Json) 
            : null,
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
