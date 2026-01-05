import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CampaignContent } from '@/types/campaign';

export interface ContentDetailInfo {
  id: string;
  title: string;
  status?: string;
  type: 'multichannel' | 'script' | 'carousel';
}

export function useContentDetails(contents: CampaignContent[]) {
  return useQuery({
    queryKey: ['content-details', contents.map(c => `${c.content_type}-${c.content_id}`).join(',')],
    queryFn: async () => {
      if (contents.length === 0) return new Map<string, ContentDetailInfo>();
      
      const multichannelIds = contents
        .filter(c => c.content_type === 'multichannel')
        .map(c => c.content_id);
      const scriptIds = contents
        .filter(c => c.content_type === 'script')
        .map(c => c.content_id);
      const carouselIds = contents
        .filter(c => c.content_type === 'carousel')
        .map(c => c.content_id);
      
      const [mcResult, scriptResult, carouselResult] = await Promise.all([
        multichannelIds.length > 0 
          ? supabase
              .from('multi_channel_contents')
              .select('id, title, status')
              .in('id', multichannelIds)
          : { data: [] },
        scriptIds.length > 0 
          ? supabase
              .from('scripts')
              .select('id, title, status')
              .in('id', scriptIds)
          : { data: [] },
        carouselIds.length > 0 
          ? supabase
              .from('carousels')
              .select('id, title, status')
              .in('id', carouselIds)
          : { data: [] },
      ]);
      
      const detailsMap = new Map<string, ContentDetailInfo>();
      
      (mcResult.data || []).forEach(item => {
        detailsMap.set(item.id, {
          id: item.id,
          title: item.title,
          status: item.status || undefined,
          type: 'multichannel',
        });
      });
      
      (scriptResult.data || []).forEach(item => {
        detailsMap.set(item.id, {
          id: item.id,
          title: item.title,
          status: item.status || undefined,
          type: 'script',
        });
      });
      
      (carouselResult.data || []).forEach(item => {
        detailsMap.set(item.id, {
          id: item.id,
          title: item.title,
          status: item.status || undefined,
          type: 'carousel',
        });
      });
      
      return detailsMap;
    },
    enabled: contents.length > 0,
  });
}
