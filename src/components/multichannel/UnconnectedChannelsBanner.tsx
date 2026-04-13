import { useMemo } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSocialConnections, SocialPlatform } from '@/hooks/useSocialConnections';
import { Button } from '@/components/ui/button';

const CHANNEL_TO_PLATFORM: Record<string, SocialPlatform> = {
  facebook: 'facebook',
  instagram: 'instagram',
  tiktok: 'tiktok',
  linkedin: 'linkedin',
  threads: 'threads',
  youtube: 'youtube',
  twitter: 'twitter',
  x: 'twitter',
  website: 'website',
  blog: 'website',
  zalo: 'zalo_oa',
  google_business: 'google_business',
};

const CHANNEL_DISPLAY_NAMES: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  threads: 'Threads',
  youtube: 'YouTube',
  twitter: 'Twitter/X',
  x: 'Twitter/X',
  website: 'Website',
  blog: 'Website',
  zalo: 'Zalo OA',
  google_business: 'Google Business',
};

interface UnconnectedChannelsBannerProps {
  selectedChannels: string[];
  brandTemplateId?: string;
}

export function UnconnectedChannelsBanner({ selectedChannels, brandTemplateId }: UnconnectedChannelsBannerProps) {
  const navigate = useNavigate();
  const { connections, isLoading } = useSocialConnections({ brandTemplateId });

  const unconnectedChannels = useMemo(() => {
    if (!selectedChannels.length || isLoading) return [];

    const connectedPlatforms = new Set(
      connections
        .filter(c => c.is_active)
        .map(c => c.platform)
    );

    const seen = new Set<string>();
    return selectedChannels
      .filter(ch => {
        const platform = CHANNEL_TO_PLATFORM[ch.toLowerCase()];
        if (!platform) return false; // skip non-publishable channels
        if (seen.has(platform)) return false;
        seen.add(platform);
        return !connectedPlatforms.has(platform);
      })
      .map(ch => CHANNEL_DISPLAY_NAMES[ch.toLowerCase()] || ch);
  }, [selectedChannels, connections, isLoading]);

  if (!unconnectedChannels.length || isLoading) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          <span className="font-medium">{unconnectedChannels.length} kênh chưa kết nối:</span>{' '}
          {unconnectedChannels.join(', ')}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Bạn cần kết nối để đăng bài tự động
        </p>
      </div>
      {brandTemplateId && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 h-7 px-2"
          onClick={() => navigate(`/brand/${brandTemplateId}?tab=connections`)}
        >
          Kết nối ngay
          <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      )}
    </div>
  );
}
