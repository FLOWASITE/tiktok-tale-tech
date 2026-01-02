import { ChannelMockupFrame } from '@/components/preview/ChannelMockupFrame';
import { Channel } from '@/types/multichannel';
import { cn } from '@/lib/utils';

interface ContentMockupToggleProps {
  channel: Channel;
  content: string;
  brandName: string;
  logoUrl?: string;
  primaryColor?: string;
  isLoading?: boolean;
  className?: string;
}

// Map multichannel Channel to ChannelMockupFrame type
const channelToMockupType: Record<Channel, 'facebook' | 'linkedin' | 'instagram' | 'tiktok' | 'email' | 'twitter' | 'general'> = {
  facebook: 'facebook',
  linkedin: 'linkedin',
  instagram: 'instagram',
  tiktok: 'tiktok',
  email: 'email',
  twitter: 'twitter',
  website: 'general',
  google_maps: 'general',
  youtube: 'general',
  zalo_oa: 'general',
  telegram: 'general',
  threads: 'general',
};

export function ContentMockupToggle({
  channel,
  content,
  brandName,
  logoUrl,
  primaryColor,
  isLoading,
  className,
}: ContentMockupToggleProps) {
  const mockupType = channelToMockupType[channel];

  return (
    <div className={cn('flex justify-center items-start p-2 bg-gradient-to-b from-muted/5 to-muted/20 rounded-xl min-h-[500px]', className)}>
      <div className="w-full max-w-xl">
        <ChannelMockupFrame
          channel={mockupType}
          content={content}
          brandName={brandName}
          logoUrl={logoUrl}
          primaryColor={primaryColor}
          isGenerating={isLoading}
        />
      </div>
    </div>
  );
}
