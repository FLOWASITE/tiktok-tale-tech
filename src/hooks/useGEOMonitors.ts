import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface GEOMonitor {
  id: string;
  organization_id: string;
  brand_template_id: string;
  brand_name: string;
  ai_engines: string[];
  keywords: string[];
  competitors: string[];
  scan_frequency: string;
  is_active: boolean;
  last_scanned_at: string | null;
  created_at: string;
}

export interface GEOMonitoringResult {
  id: string;
  brand_monitor_id: string;
  ai_engine: string;
  prompt: string;
  response: string | null;
  brand_mentioned: boolean;
  mention_count: number;
  citation_urls: string[];
  sentiment_score: number;
  sentiment_label: string | null;
  competitor_mentions: Record<string, any>;
  scanned_at: string;
}

export function useGEOMonitors() {
  const { currentOrganization } = useOrganizationContext();
  const [monitors, setMonitors] = useState<GEOMonitor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMonitors = useCallback(async () => {
    if (!currentOrganization?.id) {
      setMonitors([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('geo_brand_monitors')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMonitors((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching GEO monitors:', err);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id]);

  useEffect(() => {
    fetchMonitors();
  }, [fetchMonitors]);

  const createMonitor = useCallback(async (monitor: Omit<GEOMonitor, 'id' | 'created_at' | 'last_scanned_at'>) => {
    const { data, error } = await supabase
      .from('geo_brand_monitors')
      .insert(monitor as any)
      .select()
      .single();

    if (error) throw error;
    await fetchMonitors();
    return data;
  }, [fetchMonitors]);

  return { monitors, loading, fetchMonitors, createMonitor };
}
