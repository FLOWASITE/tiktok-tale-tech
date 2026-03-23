import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Channel } from '@/types/multichannel';

interface RetryPublishOptions {
  scheduleId: string;
  contentId: string;
  channel: Channel;
  brandTemplateId?: string;
  organizationId?: string;
}

// Map channel to channel-publisher action
const channelToAction: Record<string, string> = {
  facebook: 'facebook',
  instagram: 'instagram',
  twitter: 'twitter',
  linkedin: 'linkedin',
  threads: 'threads',
  zalo_oa: 'zalo',
  google_maps: 'google-business',
  website: 'website',
};

export function useRetryPublish() {
  const [isRetrying, setIsRetrying] = useState<string | null>(null);

  const retryPublish = async (options: RetryPublishOptions) => {
    const { scheduleId, contentId, channel, brandTemplateId, organizationId } = options;
    
    setIsRetrying(scheduleId);

    try {
      // 1. Get content details from channel_contents
      const { data: channelContent, error: contentError } = await supabase
        .from('channel_contents' as any)
        .select('content')
        .eq('multi_channel_content_id', contentId)
        .eq('channel', channel)
        .single();

      if (contentError || !channelContent) {
        throw new Error('Không tìm thấy nội dung');
      }

      const contentText = (channelContent as any)?.content || '';

      // 2. Get connection for this platform
      const action = channelToAction[channel];
      if (!action) {
        throw new Error(`Kênh ${channel} chưa được hỗ trợ`);
      }

      // Map action back to DB platform value
      const dbPlatform = channel === 'google_maps' ? 'google_business' : (channel === 'zalo_oa' ? 'zalo_oa' : action);
      let query = supabase
        .from('social_connections')
        .select('id')
        .eq('platform', dbPlatform)
        .eq('is_active', true);

      if (brandTemplateId) {
        query = query.eq('brand_template_id', brandTemplateId);
      } else if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: connection, error: connError } = await query.limit(1).single();

      if (connError || !connection) {
        throw new Error(`Không tìm thấy kết nối ${action} hoạt động`);
      }

      // 3. Update schedule status to publishing
      await supabase
        .from('content_schedules')
        .update({ 
          publish_status: 'scheduled',
          publish_error: null,
        })
        .eq('id', scheduleId);

      // 4. Call consolidated channel-publisher
      const { data, error } = await supabase.functions.invoke('channel-publisher', {
        body: {
          action,
          connectionId: connection.id,
          content: contentText,
          scheduleId,
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Đăng bài thất bại');
      }

      // 5. Update schedule to published
      await supabase
        .from('content_schedules')
        .update({ 
          publish_status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', scheduleId);

      toast.success('Đăng bài thành công!');
      return { success: true };
    } catch (error) {
      // Update schedule to failed
      await supabase
        .from('content_schedules')
        .update({ 
          publish_status: 'failed',
          last_error: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', scheduleId);

      toast.error(`Thử lại thất bại: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
      return { success: false, error };
    } finally {
      setIsRetrying(null);
    }
  };

  return {
    retryPublish,
    isRetrying,
  };
}
