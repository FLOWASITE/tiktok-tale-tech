import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  AdCopyPerformance, 
  PerformanceSummary, 
  PerformanceFormData,
  PerformanceByDate,
  calculateMetrics 
} from '@/types/adCopyPerformance';

export function useAdCopyPerformance(adCopyId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all performance records for an ad copy
  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['ad-copy-performance', adCopyId],
    queryFn: async () => {
      if (!adCopyId) return [];
      
      const { data, error } = await supabase
        .from('ad_copy_performance')
        .select('*')
        .eq('ad_copy_id', adCopyId)
        .order('logged_at', { ascending: false });
      
      if (error) throw error;
      return data as AdCopyPerformance[];
    },
    enabled: !!adCopyId,
  });

  // Calculate summary from performance data
  const summary: PerformanceSummary | null = performanceData && performanceData.length > 0
    ? {
        total_impressions: performanceData.reduce((sum, p) => sum + (p.impressions || 0), 0),
        total_reach: performanceData.reduce((sum, p) => sum + (p.reach || 0), 0),
        total_clicks: performanceData.reduce((sum, p) => sum + (p.clicks || 0), 0),
        total_conversions: performanceData.reduce((sum, p) => sum + (p.conversions || 0), 0),
        total_spend: performanceData.reduce((sum, p) => sum + Number(p.spend || 0), 0),
        total_conversion_value: performanceData.reduce((sum, p) => sum + Number(p.conversion_value || 0), 0),
        avg_ctr: performanceData.reduce((sum, p) => sum + Number(p.ctr || 0), 0) / performanceData.length,
        avg_cpc: performanceData.reduce((sum, p) => sum + Number(p.cpc || 0), 0) / performanceData.length,
        avg_cpm: performanceData.reduce((sum, p) => sum + Number(p.cpm || 0), 0) / performanceData.length,
        avg_conversion_rate: performanceData.reduce((sum, p) => sum + Number(p.conversion_rate || 0), 0) / performanceData.length,
        overall_roas: performanceData.reduce((sum, p) => sum + Number(p.spend || 0), 0) > 0
          ? performanceData.reduce((sum, p) => sum + Number(p.conversion_value || 0), 0) / 
            performanceData.reduce((sum, p) => sum + Number(p.spend || 0), 0)
          : 0,
        total_engagement: performanceData.reduce((sum, p) => 
          sum + (p.likes || 0) + (p.comments || 0) + (p.shares || 0) + (p.saves || 0), 0),
        avg_engagement_rate: performanceData.reduce((sum, p) => sum + Number(p.engagement_rate || 0), 0) / performanceData.length,
      }
    : null;

  // Get time series data for charts
  const timeSeries: PerformanceByDate[] = performanceData
    ? performanceData
        .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
        .map(p => ({
          date: p.logged_at,
          impressions: p.impressions || 0,
          clicks: p.clicks || 0,
          conversions: p.conversions || 0,
          spend: Number(p.spend || 0),
          ctr: Number(p.ctr || 0),
        }))
    : [];

  // Log performance mutation
  const logPerformance = useMutation({
    mutationFn: async (formData: PerformanceFormData) => {
      if (!adCopyId) throw new Error('Ad copy ID is required');
      
      const metrics = calculateMetrics(formData);
      
      const { data, error } = await supabase
        .from('ad_copy_performance')
        .upsert({
          ad_copy_id: adCopyId,
          variation_id: formData.variation_id || null,
          logged_at: formData.logged_at,
          impressions: formData.impressions,
          reach: formData.reach,
          clicks: formData.clicks,
          likes: formData.likes,
          comments: formData.comments,
          shares: formData.shares,
          saves: formData.saves,
          leads: formData.leads,
          conversions: formData.conversions,
          conversion_value: formData.conversion_value,
          spend: formData.spend,
          ctr: metrics.ctr,
          cpc: metrics.cpc,
          cpm: metrics.cpm,
          conversion_rate: metrics.conversion_rate,
          roas: metrics.roas,
          engagement_rate: metrics.engagement_rate,
          notes: formData.notes || null,
          data_source: 'manual',
        }, {
          onConflict: 'ad_copy_id,variation_id,logged_at',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-copy-performance', adCopyId] });
      toast({ title: 'Đã lưu dữ liệu performance' });
    },
    onError: (error) => {
      toast({ 
        title: 'Lỗi khi lưu performance', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Delete performance record
  const deletePerformance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ad_copy_performance')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-copy-performance', adCopyId] });
      toast({ title: 'Đã xóa dữ liệu performance' });
    },
    onError: (error) => {
      toast({ 
        title: 'Lỗi khi xóa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return {
    performanceData: performanceData || [],
    summary,
    timeSeries,
    isLoading,
    logPerformance,
    deletePerformance,
  };
}
