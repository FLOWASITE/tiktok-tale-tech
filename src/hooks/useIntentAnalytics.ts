import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo, useState } from 'react';

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
  durationMs: number | null;
  tokensUsed: number | null;
  costUsd: number | null;
}

export interface IntentAnalytics {
  decisions: ParsedDecision[];
  totalDecisions: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  ambiguityRate: number;
  avgConfidence: number;
  avgDurationMs: number;
  intentDistribution: { name: string; value: number }[];
  confidenceBuckets: { range: string; count: number }[];
  falsePositives: ParsedDecision[];
  dailyTrend: { date: string; hit: number; miss: number; total: number }[];
  topIntents: { intent: string; count: number; avgConf: number; hitRate: number }[];
  isLoading: boolean;
  refetch: () => void;
  dateRange: string;
  setDateRange: (range: string) => void;
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

function getDateFilter(range: string): string | null {
  const now = new Date();
  switch (range) {
    case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    default: return null;
  }
}

export function useIntentAnalytics(): IntentAnalytics {
  const [dateRange, setDateRange] = useState('7d');

  const { data: rawLogs = [], isLoading, refetch } = useQuery({
    queryKey: ['intent-analytics-logs', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('agent_pipeline_logs')
        .select('id, action, input_summary, output_summary, created_at, duration_ms, tokens_used, cost_usd')
        .eq('agent_name', 'orchestrator_fastpath')
        .order('created_at', { ascending: false })
        .limit(500);

      const dateFilter = getDateFilter(dateRange);
      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data, error } = await query;
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
        durationMs: row.duration_ms,
        tokensUsed: row.tokens_used,
        costUsd: row.cost_usd,
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

    // Top intents with details
    const intentDetails = new Map<string, { count: number; confSum: number; hitCount: number }>();
    decisions.forEach(d => {
      const entry = intentDetails.get(d.intent) || { count: 0, confSum: 0, hitCount: 0 };
      entry.count++;
      entry.confSum += d.confidence;
      if (d.action === 'fast_path_hit') entry.hitCount++;
      intentDetails.set(d.intent, entry);
    });
    const topIntents = Array.from(intentDetails.entries())
      .map(([intent, stats]) => ({
        intent,
        count: stats.count,
        avgConf: stats.count > 0 ? stats.confSum / stats.count : 0,
        hitRate: stats.count > 0 ? (stats.hitCount / stats.count) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Confidence buckets
    const buckets = { '< 0.5': 0, '0.5–0.7': 0, '0.7–0.8': 0, '0.8–0.9': 0, '0.9–1.0': 0 };
    decisions.forEach(d => {
      if (d.confidence < 0.5) buckets['< 0.5']++;
      else if (d.confidence < 0.7) buckets['0.5–0.7']++;
      else if (d.confidence < 0.8) buckets['0.7–0.8']++;
      else if (d.confidence < 0.9) buckets['0.8–0.9']++;
      else buckets['0.9–1.0']++;
    });
    const confidenceBuckets = Object.entries(buckets).map(([range, count]) => ({ range, count }));

    // Daily trend
    const dayMap = new Map<string, { hit: number; miss: number }>();
    decisions.forEach(d => {
      const day = d.createdAt.slice(0, 10);
      const entry = dayMap.get(day) || { hit: 0, miss: 0 };
      if (d.action === 'fast_path_hit') entry.hit++;
      else entry.miss++;
      dayMap.set(day, entry);
    });
    const dailyTrend = Array.from(dayMap.entries())
      .map(([date, v]) => ({ date, hit: v.hit, miss: v.miss, total: v.hit + v.miss }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // False positives
    const falsePositives = decisions
      .filter(d => d.ambiguityFlag && d.confidence < 0.85)
      .slice(0, 20);

    const avgConfidence = total > 0
      ? decisions.reduce((s, d) => s + d.confidence, 0) / total
      : 0;

    const durationsValid = decisions.filter(d => d.durationMs != null);
    const avgDurationMs = durationsValid.length > 0
      ? durationsValid.reduce((s, d) => s + (d.durationMs || 0), 0) / durationsValid.length
      : 0;

    return {
      decisions,
      totalDecisions: total,
      hitCount,
      missCount,
      hitRate: total > 0 ? (hitCount / total) * 100 : 0,
      ambiguityRate: total > 0 ? (ambiguousCount / total) * 100 : 0,
      avgConfidence,
      avgDurationMs,
      intentDistribution,
      confidenceBuckets,
      falsePositives,
      dailyTrend,
      topIntents,
      isLoading,
      refetch,
      dateRange,
      setDateRange,
    };
  }, [rawLogs, isLoading, refetch, dateRange, setDateRange]);
}
