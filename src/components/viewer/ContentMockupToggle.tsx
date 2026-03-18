import { ChannelMockupFrame } from '@/components/preview/ChannelMockupFrame';
import { GoogleMapsMockup } from '@/components/preview/GoogleMapsMockup';
import { Channel, WebsiteSEOData } from '@/types/multichannel';
import { cn } from '@/lib/utils';
import { normalizeMarkdownText } from '@/utils/normalizeMarkdownText';

interface ContentMockupToggleProps {
  channel: Channel;
  content: string;
  brandName?: string | null;
  logoUrl?: string;
  primaryColor?: string;
  isLoading?: boolean;
  className?: string;
  // Website-specific props
  seoData?: WebsiteSEOData;
  channelImage?: string;
}

// Map multichannel Channel to ChannelMockupFrame type
const channelToMockupType: Record<Channel, 'facebook' | 'linkedin' | 'instagram' | 'tiktok' | 'email' | 'twitter' | 'threads' | 'general'> = {
  facebook: 'facebook',
  linkedin: 'linkedin',
  instagram: 'instagram',
  tiktok: 'tiktok',
  email: 'email',
  twitter: 'twitter',
  threads: 'threads',
  website: 'general',
  google_maps: 'general',
  youtube: 'general',
  zalo_oa: 'general',
  telegram: 'general',
};

export function ContentMockupToggle({
  channel,
  content,
  brandName,
  logoUrl,
  primaryColor,
  isLoading,
  className,
  seoData,
  channelImage,
}: ContentMockupToggleProps) {
  const mockupType = channelToMockupType[channel];
  
  // Normalize content to prevent react-markdown crashes
  const safeContent = normalizeMarkdownText(content);
  
  // Normalize brandName to prevent crashes
  const safeBrandName = typeof brandName === 'string' && brandName.trim() 
    ? brandName.trim() 
    : 'Brand';

  return (
    <div className={cn('flex justify-center items-start p-2 bg-gradient-to-b from-muted/5 to-muted/20 rounded-xl min-h-[500px]', className)}>
      <div className="w-full max-w-xl">
        <ChannelMockupFrame
          channel={mockupType}
          content={safeContent}
          brandName={safeBrandName}
          logoUrl={logoUrl}
          primaryColor={primaryColor}
          isGenerating={isLoading}
          seoData={channel === 'website' ? seoData : undefined}
          channelImage={channelImage}
        />
      </div>
    </div>
  );
}
