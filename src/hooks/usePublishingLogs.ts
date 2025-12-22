import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PublishingLog } from '@/types/publishing';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export function usePublishingLogs(contentId?: string) {
  const [logs, setLogs] = useState<PublishingLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  const fetchLogs = useCallback(async () => {
    if (!user) {
      setLogs([]);
      setIsLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('content_publishing_logs')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(100);

      if (contentId) {
        query = query.eq('content_id', contentId);
      } else if (currentOrganization?.id) {
        query = query.eq('organization_id', currentOrganization.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs((data || []) as PublishingLog[]);
    } catch (error) {
      console.error('Error fetching publishing logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, contentId, currentOrganization?.id]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    isLoading,
    fetchLogs,
  };
}
