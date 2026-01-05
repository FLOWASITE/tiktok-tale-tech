import { useMemo } from 'react';
import { useSocialConnections } from './useSocialConnections';
import { Campaign, CampaignContent } from '@/types/campaign';

export interface ChannelStatus {
  channel: string;
  isConnected: boolean;
  contentCount: number;
  connectionAvatar?: string;
  connectionUsername?: string;
}

interface UseCampaignChannelIntegrationOptions {
  campaign: Campaign;
  contents: CampaignContent[];
  contentChannelsMap: Map<string, string[]>; // content_id -> selected_channels
}

export function useCampaignChannelIntegration({ 
  campaign, 
  contents,
  contentChannelsMap
}: UseCampaignChannelIntegrationOptions) {
  const { connections, isLoading } = useSocialConnections({ 
    brandTemplateId: campaign.brand_template_id || undefined 
  });

  const channelStatuses = useMemo(() => {
    if (!campaign.target_channels) return [];
    
    return campaign.target_channels.map(channel => {
      const normalizedChannel = channel.toLowerCase();
      
      // Check if this channel has active social connection
      const connection = connections?.find(c => 
        c.platform.toLowerCase() === normalizedChannel && c.is_active
      );
      
      // Count contents that include this channel
      let contentCount = 0;
      contents.forEach(content => {
        const channels = contentChannelsMap.get(content.content_id);
        if (channels?.some(ch => ch.toLowerCase() === normalizedChannel)) {
          contentCount++;
        }
      });
      
      return {
        channel,
        isConnected: !!connection,
        contentCount,
        connectionAvatar: connection?.platform_avatar_url || undefined,
        connectionUsername: connection?.platform_username || undefined,
      };
    });
  }, [campaign.target_channels, connections, contents, contentChannelsMap]);

  const unconnectedChannels = useMemo(() => 
    channelStatuses.filter(s => !s.isConnected).map(s => s.channel),
    [channelStatuses]
  );

  const channelsWithoutContent = useMemo(() =>
    channelStatuses.filter(s => s.contentCount === 0).map(s => s.channel),
    [channelStatuses]
  );

  const connectedCount = useMemo(() =>
    channelStatuses.filter(s => s.isConnected).length,
    [channelStatuses]
  );

  return {
    channelStatuses,
    unconnectedChannels,
    channelsWithoutContent,
    connectedCount,
    totalChannels: campaign.target_channels?.length || 0,
    isLoading,
  };
}
