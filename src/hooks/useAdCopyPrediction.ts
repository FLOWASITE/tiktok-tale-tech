import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PerformancePrediction, IndustryBenchmark } from '@/types/adCopyPrediction';

interface PredictionResult {
  prediction: PerformancePrediction;
  variation: {
    id: string;
    label: string;
  };
  benchmark: {
    platform: string;
    industry: string | null;
    objective: string | null;
    sample_count: number;
  } | null;
}

export function useAdCopyPrediction() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const predictPerformance = useCallback(async (adCopyId: string, variationId?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        throw new Error('Not authenticated');
      }

      const { data, error: fnError } = await supabase.functions.invoke('predict-ad-performance', {
        body: { adCopyId, variationId },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to predict performance';
      setError(message);
      toast.error('Không thể dự đoán hiệu suất', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    isLoading,
    result,
    error,
    predictPerformance,
    reset,
  };
}
