import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

interface ClusterMatch {
  clusterId: string;
  name: string;
  color: string | null;
  score: number;
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

/**
 * Heuristic match: tokenize topic, count overlap with cluster.name + keyword names.
 * Returns best match (score ≥ 1) or null. No backend call.
 */
export function useSuggestedPillar(topic: string, currentClusterId?: string | null) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const [suggestion, setSuggestion] = useState<ClusterMatch | null>(null);

  const { data: clusters = [] } = useQuery({
    queryKey: ['suggested-pillar-clusters', orgId],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: cls } = await supabase
        .from('seo_clusters')
        .select('id,name,color,status')
        .eq('organization_id', orgId!)
        .in('status', ['planning', 'active']);
      const ids = (cls || []).map((c: any) => c.id);
      if (ids.length === 0) return [];
      const { data: kws } = await supabase
        .from('seo_keywords')
        .select('id,keyword,cluster_id')
        .in('cluster_id', ids);
      const kwByCluster: Record<string, string[]> = {};
      for (const k of kws || []) {
        const cid = (k as any).cluster_id;
        if (!cid) continue;
        (kwByCluster[cid] ||= []).push((k as any).keyword);
      }
      return (cls || []).map((c: any) => ({
        ...c,
        keywords: kwByCluster[c.id] || [],
      }));
    },
  });

  useEffect(() => {
    if (!topic || topic.trim().length < 8 || currentClusterId) {
      setSuggestion(null);
      return;
    }
    const tokens = new Set(tokenize(topic));
    if (tokens.size === 0) { setSuggestion(null); return; }

    let best: ClusterMatch | null = null;
    for (const c of clusters as any[]) {
      const haystack = [c.name, ...(c.keywords || [])].join(' ').toLowerCase();
      const hayTokens = new Set(tokenize(haystack));
      let score = 0;
      tokens.forEach((t) => { if (hayTokens.has(t)) score++; });
      if (score >= 1 && (!best || score > best.score)) {
        best = { clusterId: c.id, name: c.name, color: c.color, score };
      }
    }
    setSuggestion(best);
  }, [topic, clusters, currentClusterId]);

  return suggestion;
}
