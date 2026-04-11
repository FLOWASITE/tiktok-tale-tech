import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

interface ParsedDecision {
  id: string;
  action: string;
  inputSummary: string | null;
  createdAt: string;
  intent: string;
  confidence: number;
  ambiguityFlag: boolean;
  allScores: Record<string, number>;
  matchedPatterns: string[];
  templateChosen: string | null;
}

export interface IntentAnalytics {
  decisions: ParsedDecision[];
  totalDecisions: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  ambiguityRate: number;
  avgConfidence: number;
  intentDistribution: { name: string; value: number }[];
  confidenceBuckets: { range: string; count: number }[];
  falsePositives: ParsedDecision[];
  isLoading: boolean;
}

function parseOutputSummary(raw: string | null): Partial<ParsedDecision> {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    return {
      intent: obj.intent || obj.detectedIntent || 'unknown',
      confidence: typeof obj.confidence === 'number' ? obj.confidence : 0,
      ambiguityFlag: !!obj.ambiguityFlag || !!obj.isAmbiguous,
      allScores: obj.allScores || obj.scores || {},
      matchedPatterns: obj.matchedPatterns || [],
      templateChosen: obj.templateChosen || obj.template || null,
    };
  } catch {
    return { intent: 'unknown', confidence: 0, ambiguityFlag: false, allScores: {}, matchedPatterns: [], templateChosen: null };
  }
}

export function useIntentAnalytics(): IntentAnalytics {
  const { data: rawLogs = [], isLoading } = useQuery({
    queryKey: ['intent-analytics-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_pipeline_logs')
        .select('id, action, input_summary, output_summary, created_at')
        .eq('agent_name', 'orchestrator_fastpath')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  return useMemo(() => {
    const decisions: ParsedDecision[] = rawLogs.map((row: any) => {
      const parsed = parseOutputSummary(row.output_summary);
      return {
        id: row.id,
        action: row.action,
        inputSummary: row.input_summary,
        createdAt: row.created_at,
        intent: parsed.intent || 'unknown',
        confidence: parsed.confidence || 0,
        ambiguityFlag: parsed.ambiguityFlag || false,
        allScores: parsed.allScores || {},
        matchedPatterns: parsed.matchedPatterns || [],
        templateChosen: parsed.templateChosen || null,
      };
    });

    const hitCount = decisions.filter(d => d.action === 'fast_path_hit').length;
    const missCount = decisions.filter(d => d.action === 'fast_path_miss').length;
    const total = decisions.length;
    const ambiguousCount = decisions.filter(d => d.ambiguityFlag).length;

    // Intent distribution
    const intentMap = new Map<string, number>();
    decisions.forEach(d => intentMap.set(d.intent, (intentMap.get(d.intent) || 0) + 1));
    const intentDistribution = Array.from(intentMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Confidence buckets
    const buckets = { '< 0.7': 0, '0.7–0.8': 0, '0.8–0.9': 0, '0.9–1.0': 0 };
    decisions.forEach(d => {
      if (d.confidence < 0.7) buckets['< 0.7']++;
      else if (d.confidence < 0.8) buckets['0.7–0.8']++;
      else if (d.confidence < 0.9) buckets['0.8–0.9']++;
      else buckets['0.9–1.0']++;
    });
    const confidenceBuckets = Object.entries(buckets).map(([range, count]) => ({ range, count }));

    // False positives
    const falsePositives = decisions
      .filter(d => d.ambiguityFlag && d.confidence < 0.85)
      .slice(0, 20);

    const avgConfidence = total > 0
      ? decisions.reduce((s, d) => s + d.confidence, 0) / total
      : 0;

    return {
      decisions,
      totalDecisions: total,
      hitCount,
      missCount,
      hitRate: total > 0 ? (hitCount / total) * 100 : 0,
      ambiguityRate: total > 0 ? (ambiguousCount / total) * 100 : 0,
      avgConfidence,
      intentDistribution,
      confidenceBuckets,
      falsePositives,
      isLoading,
    };
  }, [rawLogs, isLoading]);
}
