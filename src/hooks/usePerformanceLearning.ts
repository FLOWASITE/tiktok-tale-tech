import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import type { PredictionHistory } from '@/types/creativeScore';

interface SavePredictionParams {
  variationId: string;
  predictedCtr?: number;
  predictedCpc?: number;
  predictedCpm?: number;
  predictedConversionRate?: number;
  predictedRoas?: number;
  confidenceScore?: number;
  predictionFactors?: Record<string, unknown>;
}

interface ValidatePredictionParams {
  predictionId: string;
  actualCtr?: number;
  actualCpc?: number;
  actualCpm?: number;
  actualConversionRate?: number;
  actualRoas?: number;
}

export function usePerformanceLearning(variationId?: string) {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  // Fetch prediction history for a variation
  const { data: predictionHistory, isLoading } = useQuery({
    queryKey: ['prediction-history', variationId],
    queryFn: async () => {
      if (!variationId) return [];
      
      const { data, error } = await supabase
        .from('ad_copy_prediction_history')
        .select('*')
        .eq('variation_id', variationId)
        .order('predicted_at', { ascending: false });
      
      if (error) throw error;
      return data as PredictionHistory[];
    },
    enabled: !!variationId,
  });

  // Save a new prediction
  const savePrediction = useMutation({
    mutationFn: async (params: SavePredictionParams) => {
      const { data, error } = await supabase
        .from('ad_copy_prediction_history')
        .insert([{
          variation_id: params.variationId,
          predicted_ctr: params.predictedCtr,
          predicted_cpc: params.predictedCpc,
          predicted_cpm: params.predictedCpm,
          predicted_conversion_rate: params.predictedConversionRate,
          predicted_roas: params.predictedRoas,
          confidence_score: params.confidenceScore,
          prediction_factors: params.predictionFactors as unknown as null,
          organization_id: currentOrganization?.id,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prediction-history', variationId] });
    },
  });

  // Validate a prediction with actual values
  const validatePrediction = useMutation({
    mutationFn: async (params: ValidatePredictionParams) => {
      // Calculate accuracy score based on how close predictions were to actuals
      const prediction = predictionHistory?.find(p => p.id === params.predictionId);
      if (!prediction) throw new Error('Prediction not found');
      
      let totalMetrics = 0;
      let totalAccuracy = 0;
      
      const calculateMetricAccuracy = (predicted?: number | null, actual?: number) => {
        if (predicted === null || predicted === undefined || actual === undefined) return null;
        const error = Math.abs(predicted - actual) / Math.max(predicted, actual, 0.001);
        return Math.max(0, 100 - (error * 100));
      };
      
      const ctrAccuracy = calculateMetricAccuracy(prediction.predicted_ctr, params.actualCtr);
      const cpcAccuracy = calculateMetricAccuracy(prediction.predicted_cpc, params.actualCpc);
      const cpmAccuracy = calculateMetricAccuracy(prediction.predicted_cpm, params.actualCpm);
      const conversionAccuracy = calculateMetricAccuracy(prediction.predicted_conversion_rate, params.actualConversionRate);
      const roasAccuracy = calculateMetricAccuracy(prediction.predicted_roas, params.actualRoas);
      
      [ctrAccuracy, cpcAccuracy, cpmAccuracy, conversionAccuracy, roasAccuracy].forEach(acc => {
        if (acc !== null) {
          totalMetrics++;
          totalAccuracy += acc;
        }
      });
      
      const overallAccuracy = totalMetrics > 0 ? totalAccuracy / totalMetrics : null;
      
      const { error } = await supabase
        .from('ad_copy_prediction_history')
        .update({
          actual_ctr: params.actualCtr,
          actual_cpc: params.actualCpc,
          actual_cpm: params.actualCpm,
          actual_conversion_rate: params.actualConversionRate,
          actual_roas: params.actualRoas,
          accuracy_score: overallAccuracy,
          validated_at: new Date().toISOString(),
        })
        .eq('id', params.predictionId);
      
      if (error) throw error;
      return overallAccuracy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prediction-history', variationId] });
      queryClient.invalidateQueries({ queryKey: ['prediction-accuracy'] });
    },
  });

  // Get latest prediction
  const latestPrediction = predictionHistory?.[0];

  return {
    predictionHistory: predictionHistory || [],
    latestPrediction,
    isLoading,
    savePrediction,
    validatePrediction,
  };
}

// Hook to get organization-wide prediction accuracy stats
export function usePredictionAccuracy() {
  const { currentOrganization } = useOrganization();

  const { data: accuracyStats, isLoading } = useQuery({
    queryKey: ['prediction-accuracy', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return null;
      
      const { data, error } = await supabase
        .from('ad_copy_prediction_history')
        .select('accuracy_score')
        .eq('organization_id', currentOrganization.id)
        .not('accuracy_score', 'is', null);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return { averageAccuracy: null, validatedCount: 0 };
      }
      
      const scores = data.map(d => d.accuracy_score).filter((s): s is number => s !== null);
      const averageAccuracy = scores.reduce((a, b) => a + b, 0) / scores.length;
      
      return {
        averageAccuracy: Math.round(averageAccuracy),
        validatedCount: scores.length,
      };
    },
    enabled: !!currentOrganization?.id,
  });

  return {
    accuracyStats,
    isLoading,
  };
}
