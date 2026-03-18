import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/hooks/useOrganization';
import { useSocialConnections, SocialPlatform } from '@/hooks/useSocialConnections';
import { useDirectPublish } from '@/hooks/useDirectPublish';
import { 
  Send, 
  Twitter, 
  Facebook, 
  Instagram, 
  Linkedin, 
  Loader2,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface DirectPublishButtonProps {
  content: string;
  contentId?: string;
  channel: string;
  brandTemplateId?: string;
  mediaUrls?: string[];
  disabled?: boolean;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

const CHANNEL_TO_PLATFORM: Record<string, SocialPlatform> = {
  twitter: 'twitter',
  facebook: 'facebook',
  instagram: 'instagram',
  linkedin: 'linkedin',
  tiktok: 'tiktok',
  threads: 'threads',
  youtube: 'youtube',
  zalo_oa: 'zalo_oa',
  google_business: 'google_business',
  website: 'website',
};

const PLATFORM_ICONS: Record<SocialPlatform, React.ElementType> = {
  twitter: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  tiktok: () => <span>🎵</span>,
  threads: () => <span>🧵</span>,
  youtube: () => <span>▶️</span>,
  zalo_oa: () => <span>💬</span>,
  google_business: () => <span>📍</span>,
  website: () => <span>🌐</span>,
};

export function DirectPublishButton({
  content,
  contentId,
  channel,
  brandTemplateId,
  mediaUrls,
  disabled,
  variant = 'outline',
  size = 'sm',
  className,
}: DirectPublishButtonProps) {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  // Prioritize brand-level connections, fallback to organization-level
  const { connections, getConnectionForPlatform } = useSocialConnections({ 
    brandTemplateId,
    organizationId: !brandTemplateId ? currentOrganization?.id : undefined,
  });
  const { publishToTwitter, publishToFacebook, isPublishing, publishResult } = useDirectPublish();

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    platform: SocialPlatform | null;
  }>({ open: false, platform: null });

  const platform = CHANNEL_TO_PLATFORM[channel];
  const connection = platform ? getConnectionForPlatform(platform) : null;
  const Icon = platform ? PLATFORM_ICONS[platform] : Send;

  const handlePublish = async () => {
    if (!connection || !platform) return;

    setConfirmDialog({ open: false, platform: null });

    try {
      const publishOptions = {
        connectionId: connection.id,
        contentId,
        content,
        mediaUrls,
      };

      switch (platform) {
        case 'twitter':
          await publishToTwitter(publishOptions);
          break;
        case 'facebook':
          await publishToFacebook(publishOptions);
          break;
        default:
          console.warn(`Platform ${platform} not yet supported`);
      }
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleClick = () => {
    if (!connection) {
      // No connection, open settings
      navigate('/settings?tab=social');
      return;
    }

    // Show confirmation dialog
    setConfirmDialog({ open: true, platform });
  };

  // If no platform mapping for this channel, don't show button
  if (!platform) {
    return null;
  }

  // Check if platform is supported
  const isSupported = platform === 'twitter' || platform === 'facebook';

  if (!isSupported) {
    return (
      <Button
        variant="ghost"
        size={size}
        disabled
        className={cn('opacity-50', className)}
      >
        <Send className="h-4 w-4 mr-1" />
        Sắp ra mắt
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        disabled={disabled || isPublishing || !content}
        onClick={handleClick}
        className={cn(
          connection ? 'text-primary border-primary/30 hover:bg-primary/10' : '',
          className
        )}
      >
        {isPublishing ? (
          <Loader2 className="h-4 w-4 animate-spin mr-1" />
        ) : (
          <Icon className="h-4 w-4 mr-1" />
        )}
        {connection ? 'Đăng ngay' : 'Kết nối để đăng'}
      </Button>

      {/* Confirmation Dialog */}
      <Dialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, platform: null })}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              Xác nhận đăng bài
            </DialogTitle>
            <DialogDescription>
              Nội dung sẽ được đăng lên {platform === 'twitter' ? 'Twitter / X' : platform}
              {connection?.platform_username && ` (@${connection.platform_username})`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-3 rounded-lg bg-muted/50 max-h-48 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">
                {content.length > 280 && platform === 'twitter' 
                  ? content.substring(0, 277) + '...'
                  : content
                }
              </p>
            </div>
            {content.length > 280 && platform === 'twitter' && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Nội dung sẽ được cắt ngắn còn 280 ký tự
              </p>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, platform: null })}
              className="sm:flex-1"
            >
              Hủy
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="sm:flex-1"
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Đăng ngay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
