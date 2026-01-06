import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import type { ABTest, ABTestResult, ABTestWithResults, ABTestVariable, ABTestMetric, ABTestStatus } from '@/types/adCopyABTest';

interface CreateABTestInput {
  adCopyId: string;
  name: string;
  hypothesis?: string;
  testVariable: ABTestVariable;
  variationIds: string[];
  metricsToTrack: ABTestMetric[];
  confidenceThreshold?: number;
}

interface LogResultInput {
  abTestId: string;
  variationId: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  loggedAt?: string;
}

export function useAdCopyABTests(adCopyId?: string) {
  const { currentOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const organizationId = currentOrganization?.id;

  // Fetch all A/B tests for an ad copy
  const { data: abTests = [], isLoading } = useQuery({
    queryKey: ['ab-tests', adCopyId],
    queryFn: async () => {
      if (!adCopyId) return [];
      
      const { data, error } = await supabase
        .from('ad_copy_ab_tests')
        .select('*')
        .eq('ad_copy_id', adCopyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ABTest[];
    },
    enabled: !!adCopyId,
  });

  // Fetch single A/B test with results
  const fetchTestWithResults = async (testId: string): Promise<ABTestWithResults | null> => {
    const { data: test, error: testError } = await supabase
      .from('ad_copy_ab_tests')
      .select(`
        *,
        ad_copy:ad_copies(title, platform)
      `)
      .eq('id', testId)
      .single();

    if (testError) throw testError;

    const { data: results, error: resultsError } = await supabase
      .from('ad_copy_ab_results')
      .select('*')
      .eq('ab_test_id', testId)
      .order('logged_at', { ascending: true });

    if (resultsError) throw resultsError;

    return {
      ...test,
      results: results || [],
    } as ABTestWithResults;
  };

  // Create A/B test
  const createTest = useMutation({
    mutationFn: async (input: CreateABTestInput) => {
      if (!organizationId) throw new Error('No organization');

      const { data, error } = await supabase
        .from('ad_copy_ab_tests')
        .insert({
          organization_id: organizationId,
          ad_copy_id: input.adCopyId,
          name: input.name,
          hypothesis: input.hypothesis || null,
          test_variable: input.testVariable,
          variation_ids: input.variationIds,
          metrics_to_track: input.metricsToTrack,
          confidence_threshold: input.confidenceThreshold || 95,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      toast.success('Đã tạo A/B test');
    },
    onError: (error: Error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  // Update test status
  const updateStatus = useMutation({
    mutationFn: async ({ testId, status }: { testId: string; status: ABTestStatus }) => {
      const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      
      if (status === 'running' && !abTests.find(t => t.id === testId)?.start_date) {
        updates.start_date = new Date().toISOString();
      }
      if (status === 'completed') {
        updates.end_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('ad_copy_ab_tests')
        .update(updates)
        .eq('id', testId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      toast.success('Đã cập nhật trạng thái');
    },
    onError: (error: Error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  // Declare winner
  const declareWinner = useMutation({
    mutationFn: async ({ testId, variationId }: { testId: string; variationId: string }) => {
      const { error } = await supabase
        .from('ad_copy_ab_tests')
        .update({
          winner_variation_id: variationId,
          status: 'completed',
          end_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', testId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      toast.success('Đã chọn winner');
    },
    onError: (error: Error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  // Log results (upsert)
  const logResult = useMutation({
    mutationFn: async (input: LogResultInput) => {
      const loggedAt = input.loggedAt || new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('ad_copy_ab_results')
        .upsert({
          ab_test_id: input.abTestId,
          variation_id: input.variationId,
          impressions: input.impressions,
          clicks: input.clicks,
          conversions: input.conversions,
          spend: input.spend,
          logged_at: loggedAt,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'ab_test_id,variation_id,logged_at',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      toast.success('Đã lưu kết quả');
    },
    onError: (error: Error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  // Delete test
  const deleteTest = useMutation({
    mutationFn: async (testId: string) => {
      const { error } = await supabase
        .from('ad_copy_ab_tests')
        .delete()
        .eq('id', testId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      toast.success('Đã xóa A/B test');
    },
    onError: (error: Error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  return {
    abTests,
    isLoading,
    createTest,
    updateStatus,
    declareWinner,
    logResult,
    deleteTest,
    fetchTestWithResults,
  };
}
