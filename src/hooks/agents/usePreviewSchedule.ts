import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SchedulePiece } from '@/lib/scheduleExport';

type PreviewRequest = {
  campaign_title: string;
  campaign_description?: string;
  target_channels: string[];
  campaign_duration_days: number;
  campaign_start_date: string;
  brand_template_id?: string;
  clarification_context?: Record<string, any>;
  organization_id: string;
  target_post_count?: number;
  per_channel_targets?: Record<string, number>;
};

type PreviewResult = {
  plan: SchedulePiece[];
  strategy_summary?: string;
  content_mix?: Record<string, number>;
  campaign_start_date?: string;
  campaign_end_date?: string;
};

export function usePreviewSchedule() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (req: PreviewRequest): Promise<PreviewResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke(
        'generate-campaign-strategy',
        { body: { ...req, preview: true } },
      );
      if (invokeErr) throw invokeErr;
      if (!data?.success) throw new Error(data?.error || 'Preview failed');
      return {
        plan: data.plan || [],
        strategy_summary: data.strategy_summary,
        content_mix: data.content_mix,
        campaign_start_date: data.campaign_start_date,
        campaign_end_date: data.campaign_end_date,
      };
    } catch (e: any) {
      const msg = e?.message || 'Không sinh được lịch';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { run, loading, error };
}
