import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BrandSuggestion {
  brand_name?: string | null;
  tagline?: string | null;
  mission?: string | null;
  industry_suggestion?: string | null;
  target_audience?: {
    age_range?: string | null;
    gender?: string | null;
    locations?: string[] | null;
  } | null;
  tone_of_voice?: string[] | null;
  content_pillars?: Array<{ name: string; description?: string }> | null;
  usps?: string[] | null;
  sample_texts?: string[] | null;
}

export interface BrandImportResult {
  success: true;
  suggestion: BrandSuggestion;
  raw_meta: Record<string, any>;
  source: 'website' | 'fanpage';
}

export type ImportableField =
  | 'brand_name'
  | 'tagline'
  | 'mission'
  | 'industry'
  | 'target_audience'
  | 'tone_of_voice'
  | 'content_pillars'
  | 'usps'
  | 'sample_texts'
  | 'logo_url'
  | 'attach_fanpage';

export function useBrandImport() {
  const [loading, setLoading] = useState(false);

  const importFromWebsite = async (
    url: string,
    options?: { extra_paths?: string[]; organization_id?: string },
  ): Promise<BrandImportResult | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-brand-from-website', {
        body: {
          url,
          extra_paths: options?.extra_paths || [],
          organization_id: options?.organization_id,
          locale: 'vi',
        },
      });
      if (error) throw new Error(error.message || 'Import thất bại');
      if (!data?.success) throw new Error(data?.error || 'AI không phân tích được nội dung');
      return { ...(data as any), source: 'website' };
    } catch (e: any) {
      console.error('[useBrandImport.website]', e);
      toast.error('Không import được website', { description: e.message });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const importFromFanpage = async (
    socialConnectionId: string,
    options?: { organization_id?: string },
  ): Promise<BrandImportResult | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-brand-from-fanpage', {
        body: {
          social_connection_id: socialConnectionId,
          organization_id: options?.organization_id,
          locale: 'vi',
        },
      });
      if (error) throw new Error(error.message || 'Import thất bại');
      if (!data?.success) throw new Error(data?.error || 'AI không phân tích được nội dung');
      return { ...(data as any), source: 'fanpage' };
    } catch (e: any) {
      console.error('[useBrandImport.fanpage]', e);
      toast.error('Không import được fanpage', { description: e.message });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, importFromWebsite, importFromFanpage };
}
