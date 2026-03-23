import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GEOMonitoringResult } from '@/hooks/useGEOMonitors';

interface GEOStats {
  sov: number;
  citationRate: number;
  avgSentiment: number;
  totalScans: number;
}

export function useGEOResults(monitorId?: string) {
  const [results, setResults] = useState<GEOMonitoringResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GEOStats>({ sov: 0, citationRate: 0, avgSentiment: 0, totalScans: 0 });

  const fetchResults = useCallback(async () => {
    if (!monitorId) {
      setResults([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('geo_monitoring_results')
        .select('*')
        .eq('brand_monitor_id', monitorId)
        .order('scanned_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      const rows = (data as any[]) || [];
      setResults(rows);

      // Calculate stats
      const total = rows.length;
      const mentioned = rows.filter(r => r.brand_mentioned).length;
      const withCitations = rows.filter(r => (r.citation_urls?.length || 0) > 0).length;
      const sentiments = rows.filter(r => r.sentiment_score != null).map(r => Number(r.sentiment_score));
      const avgSent = sentiments.length > 0 ? Math.round(sentiments.reduce((a, b) => a + b, 0) / sentiments.length) : 0;

      setStats({
        sov: total > 0 ? Math.round((mentioned / total) * 100) : 0,
        citationRate: total > 0 ? Math.round((withCitations / total) * 100) : 0,
        avgSentiment: avgSent,
        totalScans: total,
      });
    } catch (err) {
      console.error('Error fetching GEO results:', err);
    } finally {
      setLoading(false);
    }
  }, [monitorId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  return { results, stats, loading, refetch: fetchResults };
}
