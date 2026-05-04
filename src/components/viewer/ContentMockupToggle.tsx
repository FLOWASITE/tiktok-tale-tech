import { ChannelMockupFrame } from '@/components/preview/ChannelMockupFrame';
import { GoogleMapsMockup } from '@/components/preview/GoogleMapsMockup';
import { ZaloOAMockup } from '@/components/preview/ZaloOAMockup';
import { MockupScoreBar } from '@/components/preview/MockupScoreBar';
import { Channel, WebsiteSEOData } from '@/types/multichannel';
import { cn } from '@/lib/utils';
import { normalizeMarkdownText } from '@/utils/normalizeMarkdownText';
import type { BrandFooterInfo } from '@/components/BrandForm';

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
  // Score props
  critiqueScore?: number | null;
  geoScore?: number | null;
  engagementScore?: number | null;
  seoScore?: number | null;
  onTriggerGEO?: () => void;
  isGEOLoading?: boolean;
  geoFactorScores?: Record<string, number> | null;
  // Brand metadata for richer mockups (Google Maps, etc.)
  footerInfo?: BrandFooterInfo | null;
  industryLabel?: string;
  // Pinterest-only: dedicated Pin title
  pinterestTitle?: string;
  // Wix override: when website channel is connected via Wix, render WixMockup
  useWixMockup?: boolean;
}

// Map multichannel Channel to ChannelMockupFrame type
const channelToMockupType: Record<Channel, 'facebook' | 'linkedin' | 'instagram' | 'tiktok' | 'email' | 'twitter' | 'threads' | 'pinterest' | 'bluesky' | 'blogger' | 'wordpress' | 'shopify' | 'wix' | 'general'> = {
  facebook: 'facebook',
  linkedin: 'linkedin',
  instagram: 'instagram',
  pinterest: 'pinterest',
  tiktok: 'tiktok',
  email: 'email',
  twitter: 'twitter',
  threads: 'threads',
  website: 'general',
  blogger: 'blogger',
  wordpress: 'wordpress',
  shopify: 'shopify',
  wix: 'wix',
  medium: 'wix',
  google_maps: 'general',
  youtube: 'general',
  zalo_oa: 'general',
  telegram: 'general',
  bluesky: 'bluesky',
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
  critiqueScore,
  geoScore,
  engagementScore,
  seoScore,
  onTriggerGEO,
  isGEOLoading,
  geoFactorScores,
  footerInfo,
  industryLabel,
  pinterestTitle,
  useWixMockup,
}: ContentMockupToggleProps) {
  const mockupType = useWixMockup && channel === 'website' ? 'wix' : channelToMockupType[channel];
  
  // Normalize content to prevent react-markdown crashes
  const safeContent = normalizeMarkdownText(content);
  
  // Normalize brandName to prevent crashes
  const safeBrandName = typeof brandName === 'string' && brandName.trim() 
    ? brandName.trim() 
    : 'Brand';

  const isWebsiteLike = channel === 'website' || channel === 'blogger' || channel === 'wordpress' || channel === 'shopify';
  const scoreBar = <MockupScoreBar critiqueScore={critiqueScore} geoScore={geoScore} engagementScore={engagementScore} seoScore={isWebsiteLike ? seoScore : undefined} onTriggerGEO={onTriggerGEO} isGEOLoading={isGEOLoading} geoFactorScores={geoFactorScores} content={content} />;

  // Use dedicated Google Maps mockup
  if (channel === 'google_maps') {
    return (
      <div className={cn('flex justify-center items-start p-2 bg-gradient-to-b from-muted/5 to-muted/20 rounded-xl min-h-[500px]', className)}>
        <div className="w-full max-w-xl">
          {scoreBar}
          <GoogleMapsMockup
            content={safeContent}
            brandName={safeBrandName}
            logoUrl={logoUrl}
            isGenerating={isLoading}
            channelImage={channelImage}
            footerInfo={footerInfo}
            industryLabel={industryLabel}
          />
        </div>
      </div>
    );
  }

  // Use dedicated Zalo OA mockup
  if (channel === 'zalo_oa') {
    return (
      <div className={cn('flex justify-center items-start p-2 bg-gradient-to-b from-muted/5 to-muted/20 rounded-xl min-h-[500px]', className)}>
        <div className="w-full max-w-xl">
          {scoreBar}
          <ZaloOAMockup
            content={safeContent}
            brandName={safeBrandName}
            logoUrl={logoUrl}
            isGenerating={isLoading}
            channelImage={channelImage}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex justify-center items-start p-2 bg-gradient-to-b from-muted/5 to-muted/20 rounded-xl', className)}>
      <div className="w-full max-w-2xl">
        {scoreBar}
        <ChannelMockupFrame
          channel={mockupType}
          content={safeContent}
          brandName={safeBrandName}
          logoUrl={logoUrl}
          primaryColor={primaryColor}
          isGenerating={isLoading}
          seoData={isWebsiteLike ? seoData : undefined}
          channelImage={channelImage}
          pinterestTitle={channel === 'pinterest' ? pinterestTitle : undefined}
        />
      </div>
    </div>
  );
}
