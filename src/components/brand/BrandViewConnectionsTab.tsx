import React, { useState } from 'react';
import { ChannelIcon } from '@/components/ui/channel-icon';
import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { useSocialConnections, SocialPlatform, SocialConnection } from '@/hooks/useSocialConnections';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TokenExpiryBadge } from '@/components/social/TokenExpiryBadge';
import { TokenStatusPanel } from '@/components/social/TokenStatusPanel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Share2,
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Plus,
  Trash2,
  Pencil,
  Unplug,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  Clock,
  Music2,
  AtSign,
  RefreshCw,
  ShieldCheck,
  MessageCircle,
  MapPin,
  Globe,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { WordPressConnectDialog } from './WordPressConnectDialog';
import { PinterestBoardSelector } from './PinterestBoardSelector';

interface BrandViewConnectionsTabProps {
  template: BrandTemplate;
}

interface PlatformConfig {
  name: string;
  icon: React.ReactNode;
  color: string;
  available: boolean;
  description: string;
}

const PLATFORM_CONFIG: Record<SocialPlatform, PlatformConfig> = {
  twitter: {
    name: 'X (Twitter)',
    icon: <ChannelIcon channel="twitter" className="text-foreground" size={20} />,
    color: 'bg-muted',
    available: true,
    description: 'Đăng tweets và threads',
  },
  facebook: {
    name: 'Facebook',
    icon: <ChannelIcon channel="facebook" className="text-[#1877F2]" size={20} />,
    color: 'bg-[#1877F2]/10',
    available: true,
    description: 'Đăng lên Page',
  },
  instagram: {
    name: 'Instagram',
    icon: <ChannelIcon channel="instagram" className="text-[#E4405F]" size={20} />,
    color: 'bg-[#E4405F]/10',
    available: true,
    description: 'Đăng ảnh và carousel',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: <ChannelIcon channel="linkedin" className="text-[#0A66C2]" size={20} />,
    color: 'bg-[#0A66C2]/10',
    available: true,
    description: 'Đăng bài chuyên nghiệp',
  },
  tiktok: {
    name: 'TikTok',
    icon: <ChannelIcon channel="tiktok" className="text-foreground" size={20} />,
    color: 'bg-muted',
    available: true,
    description: 'Đăng ảnh carousel',
  },
  threads: {
    name: 'Threads',
    icon: <ChannelIcon channel="threads" className="text-foreground" size={20} />,
    color: 'bg-muted',
    available: true,
    description: 'Đăng threads',
  },
  youtube: {
    name: 'YouTube',
    icon: <ChannelIcon channel="youtube" className="text-[#FF0000]" size={20} />,
    color: 'bg-[#FF0000]/10',
    available: false,
    description: 'Đăng video (sắp ra mắt)',
  },
  zalo_oa: {
    name: 'Zalo OA',
    icon: <ChannelIcon channel="zalo_oa" className="text-[#0068FF]" size={20} />,
    color: 'bg-[#0068FF]/10',
    available: true,
    description: 'Đăng tin nhắn và bài viết OA',
  },
  google_business: {
    name: 'Google Business',
    icon: <ChannelIcon channel="google_maps" className="text-[#4285F4]" size={20} />,
    color: 'bg-[#4285F4]/10',
    available: true,
    description: 'Đăng bài Local Posts',
  },
  blogger: {
    name: 'Blogger',
    icon: <ChannelIcon channel="blogger" size={20} />,
    color: 'bg-[#FF8000]/10',
    available: true,
    description: 'Đăng bài Blogger (Google) qua OAuth',
  },
  wordpress: {
    name: 'WordPress',
    icon: <ChannelIcon channel="wordpress" size={20} />,
    color: 'bg-[#21759b]/10',
    available: true,
    description: 'WordPress self-hosted (Application Password)',
  },
  wordpress_com: {
    name: 'WordPress.com',
    icon: <ChannelIcon channel="wordpress" size={20} />,
    color: 'bg-[#21759b]/10',
    available: true,
    description: 'WordPress.com hosted (OAuth — mọi plan)',
  },
  website: {
    name: 'Website',
    icon: <ChannelIcon channel="website" className="text-[#10B981]" size={20} />,
    color: 'bg-[#10B981]/10',
    available: true,
    description: 'WordPress, API hoặc Webhook',
  },
  pinterest: {
    name: 'Pinterest',
    icon: <ChannelIcon channel="pinterest" className="text-[#E60023]" size={20} />,
    color: 'bg-[#E60023]/10',
    available: true,
    description: 'Đăng Pin ảnh / video / carousel (yêu cầu Business account)',
  },
  bluesky: {
    name: 'Bluesky',
    icon: <ChannelIcon channel="bluesky" className="text-[#0085FF]" size={20} />,
    color: 'bg-[#0085FF]/10',
    available: true,
    description: 'Đăng bài lên Bluesky qua OAuth 2.0 (DPoP)',
  },
  shopify: {
    name: 'Shopify',
    icon: <ChannelIcon channel={"shopify" as any} size={20} />,
    color: 'bg-[#96BF48]/10',
    available: true,
    description: 'Auto-publish blog vào Shopify store qua OAuth',
  },
};

interface TwitterSetupForm {
  accessToken: string;
  accessTokenSecret: string;
}

export function BrandViewConnectionsTab({ template }: BrandViewConnectionsTabProps) {
  const {
    connections,
    isLoading,
    connect,
    disconnect,
    deleteConnection,
    isConnecting,
    isDisconnecting,
    isDeleting,
    getConnectionForPlatform,
    getConnectionsForPlatform,
    refetch,
  } = useSocialConnections({ brandTemplateId: template.id });

  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  
  const [twitterForm, setTwitterForm] = useState<TwitterSetupForm>({
    accessToken: '',
    accessTokenSecret: '',
  });
  const [oauthConnecting, setOauthConnecting] = useState<SocialPlatform | null>(null);
  const [showInactiveFb, setShowInactiveFb] = useState(false);
  const [websiteDialogOpen, setWebsiteDialogOpen] = useState(false);
  const [websiteForm, setWebsiteForm] = useState({
    websiteUrl: '',
    integrationType: 'wordpress' as 'wordpress' | 'nukeviet' | 'wix' | 'shopify_blog' | 'flowa_blog' | 'custom_api' | 'webhook' | 'manual',
    username: '',
    appPassword: '',
    apiKey: '',
    apiEndpoint: '',
  });
  const [isWebsiteConnecting, setIsWebsiteConnecting] = useState(false);
  const [wpDialogOpen, setWpDialogOpen] = useState(false);
  const [blueskyDialogOpen, setBlueskyDialogOpen] = useState(false);
  const [blueskyHandle, setBlueskyHandle] = useState('');
  const [isBlueskyConnecting, setIsBlueskyConnecting] = useState(false);
  const [shopifyDialogOpen, setShopifyDialogOpen] = useState(false);
  const [shopifyShop, setShopifyShop] = useState('');
  const [isShopifyConnecting, setIsShopifyConnecting] = useState(false);

  const handleConnect = async (platform: SocialPlatform) => {
    if (!PLATFORM_CONFIG[platform].available) {
      toast.info(`${PLATFORM_CONFIG[platform].name} sẽ sớm được hỗ trợ!`);
      return;
    }

    if (platform === 'website') {
      setSelectedPlatform(platform);
      setWebsiteDialogOpen(true);
      return;
    }

    // WordPress dùng dialog chuyên biệt 3 bước
    if (platform === 'wordpress') {
      setSelectedPlatform(platform);
      setWpDialogOpen(true);
      return;
    }

    // Bluesky — OAuth 2.0 (Confidential Client + DPoP). Open dialog to collect handle.
    if (platform === 'bluesky') {
      setBlueskyHandle('');
      setBlueskyDialogOpen(true);
      return;
    }

    // Shopify — Public App OAuth (multi-store). Open dialog to collect shop domain.
    if (platform === 'shopify') {
      setShopifyShop('');
      setShopifyDialogOpen(true);
      return;
    }

    // OAuth platforms (Facebook, Instagram, LinkedIn, Threads, Zalo OA, Google Business)
    setOauthConnecting(platform);
    try {
      // Snapshot existing active connections so we can detect NEW ones (multi-page support)
      const { data: existingRows } = await supabase
        .from('social_connections')
        .select('platform_user_id')
        .eq('brand_template_id', template.id)
        .eq('platform', platform)
        .eq('is_active', true);
      const existingIds = new Set(
        (existingRows || []).map((r) => r.platform_user_id).filter(Boolean) as string[]
      );

      const result = await connect({
        platform,
        brandTemplateId: template.id,
      });
      if (result?.requiresOAuth && result?.oauthUrl) {
        const popup = window.open(result.oauthUrl, '_blank', 'width=620,height=720');
        toast.info(`Đã mở trang đăng nhập ${PLATFORM_CONFIG[platform].name}`, {
          description: 'Hoàn tất đăng nhập trong cửa sổ mới để kết nối tài khoản.',
        });

        const isMultiPagePlatform = platform === 'facebook';
        let foundNew = false;

        // Poll for NEW connection (page_id not in snapshot)
        const pollInterval = setInterval(async () => {
          try {
            if (popup && popup.closed) {
              clearInterval(pollInterval);
              await refetch();
              if (isMultiPagePlatform && !foundNew) {
                toast.info('Chưa có Fanpage mới được thêm', {
                  description:
                    'Facebook chỉ trả về các Page bạn đã cấp quyền cho ứng dụng. Bấm "Thêm Fanpage khác" → trong cửa sổ chọn Page hãy bấm nút "Reset quyền & chọn lại" để Facebook hiện đầy đủ Page bạn quản lý.',
                });
              }
              return;
            }
            const { data } = await supabase
              .from('social_connections')
              .select('id, platform_user_id')
              .eq('brand_template_id', template.id)
              .eq('platform', platform)
              .eq('is_active', true);
            const newRow = (data || []).find(
              (r) => r.platform_user_id && !existingIds.has(r.platform_user_id)
            );
            if (newRow) {
              foundNew = true;
              await refetch();
              existingIds.add(newRow.platform_user_id as string);
              if (isMultiPagePlatform) {
                // Allow user to keep picking more fanpages — don't close popup, keep polling
                toast.success(
                  existingIds.size > 1
                    ? 'Đã thêm fanpage mới!'
                    : `Đã kết nối ${PLATFORM_CONFIG[platform].name} thành công!`
                );
              } else {
                clearInterval(pollInterval);
                toast.success(`Đã kết nối ${PLATFORM_CONFIG[platform].name} thành công!`);
                if (popup && !popup.closed) popup.close();
              }
            }
          } catch {
            // Ignore polling errors
          }
        }, 3000);

        // Stop polling after 5 minutes
        setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);
      }
    } catch {
      // Error handled in mutation
    } finally {
      setOauthConnecting(null);
    }
  };

  const handleWebsiteSubmit = async () => {
    if (websiteForm.integrationType !== 'flowa_blog' && !websiteForm.websiteUrl) {
      toast.error('Vui lòng nhập URL website');
      return;
    }
    setIsWebsiteConnecting(true);
    try {
      const body: Record<string, unknown> = {
        brandTemplateId: template.id,
        websiteUrl: websiteForm.integrationType === 'flowa_blog' ? 'https://flowa.vn/blog' : websiteForm.websiteUrl,
        integrationType: websiteForm.integrationType,
      };
      if (websiteForm.integrationType === 'wordpress' && websiteForm.username && websiteForm.appPassword) {
        body.wordpressConfig = { username: websiteForm.username, applicationPassword: websiteForm.appPassword };
      } else if (websiteForm.integrationType === 'nukeviet') {
        body.apiKey = websiteForm.apiKey;
        body.apiEndpoint = websiteForm.apiEndpoint;
      } else if (['wix', 'shopify_blog', 'custom_api'].includes(websiteForm.integrationType) && websiteForm.apiKey) {
        body.apiKey = websiteForm.apiKey;
      }
      const { data, error } = await supabase.functions.invoke('connect-website', { body });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Kết nối thất bại');
      toast.success('Đã kết nối Website thành công!');
      setWebsiteDialogOpen(false);
      setWebsiteForm({ websiteUrl: '', integrationType: 'wordpress', username: '', appPassword: '', apiKey: '', apiEndpoint: '' });
      refetch();
    } catch (err: unknown) {
      toast.error('Lỗi kết nối: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsWebsiteConnecting(false);
    }
  };

  const handleTwitterSubmit = async () => {
    if (!twitterForm.accessToken || !twitterForm.accessTokenSecret) {
      toast.error('Vui lòng nhập Access Token và Access Token Secret');
      return;
    }

    try {
      await connect({
        platform: 'twitter',
        brandTemplateId: template.id,
        accessToken: twitterForm.accessToken,
        accessTokenSecret: twitterForm.accessTokenSecret,
      });
      setSetupDialogOpen(false);
      setTwitterForm({ accessToken: '', accessTokenSecret: '' });
    } catch (error) {
      // Error handled in mutation
    }
  };

  const HANDLE_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

  const handleBlueskySubmit = async () => {
    const handle = blueskyHandle.trim().replace(/^@/, '').toLowerCase();
    if (!handle) {
      toast.error('Vui lòng nhập handle Bluesky', { description: 'Ví dụ: yourname.bsky.social' });
      return;
    }
    if (handle.length > 253 || !HANDLE_RE.test(handle)) {
      toast.error('Handle không hợp lệ', {
        description:
          'Hãy nhập handle như trên Bluesky (vd: yourname.bsky.social), không có dấu cách hay dấu tiếng Việt.',
      });
      return;
    }

    setIsBlueskyConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('bluesky-oauth-start', {
        body: { handle, brandTemplateId: template.id },
      });

      let errBody: any = null;
      if (error) {
        try {
          const ctx = (error as any)?.context;
          if (ctx && typeof ctx.json === 'function') errBody = await ctx.json();
        } catch { /* ignore */ }
      }

      if (error || !data?.authorization_url) {
        const msg = errBody?.error || data?.error || error?.message || 'Không khởi tạo được OAuth';
        throw new Error(msg);
      }

      window.open(data.authorization_url, '_blank', 'width=620,height=720');
      toast.info('Đã mở trang đăng nhập Bluesky', {
        description: 'Hoàn tất đăng nhập trong cửa sổ mới. Hệ thống sẽ tự động cập nhật khi xong.',
      });
      setBlueskyDialogOpen(false);

      setOauthConnecting('bluesky');
      const start = Date.now();
      const poll = setInterval(async () => {
        if (Date.now() - start > 180_000) {
          clearInterval(poll);
          setOauthConnecting(null);
          return;
        }
        try {
          const { data: rows } = await supabase
            .from('social_connections')
            .select('id, is_active, platform_username')
            .eq('brand_template_id', template.id)
            .eq('platform', 'bluesky')
            .eq('is_active', true)
            .limit(1);
          if (rows && rows.length > 0) {
            clearInterval(poll);
            setOauthConnecting(null);
            await refetch();
            toast.success(`Đã kết nối Bluesky: @${rows[0].platform_username}`);
          }
        } catch { /* ignore polling errors */ }
      }, 3000);
    } catch (e: any) {
      toast.error('Lỗi kết nối Bluesky', { description: e?.message || String(e) });
    } finally {
      setIsBlueskyConnecting(false);
    }
  };

  const SHOPIFY_SHOP_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

  const handleShopifySubmit = async () => {
    let shop = shopifyShop.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (shop && !shop.includes('.')) shop = `${shop}.myshopify.com`;
    if (!SHOPIFY_SHOP_RE.test(shop)) {
      toast.error('Shop domain không hợp lệ', {
        description: 'Nhập dạng your-store.myshopify.com (chỉ chữ thường, số, dấu gạch).',
      });
      return;
    }

    setIsShopifyConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('shopify-oauth-start', {
        body: { shopDomain: shop, shop, brandTemplateId: template.id, frontendOrigin: window.location.origin },
      });

      let errBody: any = null;
      if (error) {
        try {
          const ctx = (error as any)?.context;
          if (ctx && typeof ctx.json === 'function') errBody = await ctx.json();
        } catch { /* ignore */ }
      }

      if (error || !data?.authorization_url) {
        const msg = errBody?.error || data?.error || error?.message || 'Không khởi tạo được OAuth';
        throw new Error(msg);
      }

      window.open(data.authorization_url, '_blank', 'width=620,height=720');
      toast.info('Đã mở trang cài đặt Shopify', {
        description: 'Cấp quyền cho ứng dụng trong cửa sổ mới. Hệ thống sẽ tự động cập nhật khi xong.',
      });
      setShopifyDialogOpen(false);

      setOauthConnecting('shopify');
      const start = Date.now();
      const poll = setInterval(async () => {
        if (Date.now() - start > 180_000) {
          clearInterval(poll);
          setOauthConnecting(null);
          return;
        }
        try {
          const { data: rows } = await supabase
            .from('social_connections')
            .select('id, is_active, platform_username')
            .eq('brand_template_id', template.id)
            .eq('platform', 'shopify')
            .eq('is_active', true)
            .limit(1);
          if (rows && rows.length > 0) {
            clearInterval(poll);
            setOauthConnecting(null);
            await refetch();
            toast.success(`Đã kết nối Shopify: ${rows[0].platform_username}`);
          }
        } catch { /* ignore polling errors */ }
      }, 3000);
    } catch (e: any) {
      toast.error('Lỗi kết nối Shopify', { description: e?.message || String(e) });
    } finally {
      setIsShopifyConnecting(false);
    }
  };


  const handleDisconnect = async (connectionId: string) => {
    try {
      await disconnect(connectionId);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleDelete = async (connectionId: string) => {
    setConnectionToDelete(connectionId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!connectionToDelete) return;
    try {
      await deleteConnection(connectionToDelete);
      setDeleteConfirmOpen(false);
      setConnectionToDelete(null);
    } catch (error) {
      // Error handled in mutation
    }
  };

  // Consolidated test function via social-diagnostics
  const PLATFORM_DIAG_MAP: Record<SocialPlatform, string> = {
    twitter: 'twitter',
    facebook: 'facebook',
    instagram: 'instagram',
    linkedin: 'linkedin',
    threads: 'threads',
    tiktok: 'tiktok',
    youtube: 'youtube',
    zalo_oa: 'zalo',
    google_business: 'google-business',
    blogger: 'blogger',
    wordpress: 'wordpress',
    wordpress_com: 'wordpress-com',
    website: 'website',
    pinterest: 'pinterest',
    bluesky: 'bluesky',
    shopify: 'shopify',
  };

  const handleTestConnection = async (connectionId: string, platform: SocialPlatform) => {
    setTestingConnection(connectionId);
    try {
      const diagPlatform = PLATFORM_DIAG_MAP[platform];
      const { data, error } = await supabase.functions.invoke('social-diagnostics', {
        body: { action: 'test-connection', platform: diagPlatform, connectionId },
      });

      // Parse error context from FunctionsHttpError if available
      let errorBody: any = null;
      if (error) {
        try {
          // supabase-js wraps non-2xx responses; try to extract the JSON body
          const ctx = (error as any)?.context;
          if (ctx && typeof ctx.json === 'function') {
            errorBody = await ctx.json();
          } else if (typeof error.message === 'string') {
            errorBody = JSON.parse(error.message);
          }
        } catch {
          // ignore parse failures
        }
      }

      const resolved = errorBody || data;

      // Handle transient errors gracefully — don't mark as a failure
      if (resolved?.transient) {
        toast.warning('Instagram đang gặp sự cố tạm thời', {
          description: 'Vui lòng thử lại sau 1-2 phút. Kết nối của bạn vẫn hợp lệ.',
        });
        return;
      }

      // Handle Google Business quota exhaustion — token is still valid
      if (resolved?.errorCode === 'QUOTA_EXCEEDED' || resolved?.data?.errorCode === 'QUOTA_EXCEEDED') {
        toast.warning('Google đang giới hạn tốc độ', {
          description: resolved?.warning || resolved?.data?.warning || 'Google Business API quota mặc định rất thấp (~1 request/phút). Token vẫn hợp lệ — vui lòng thử lại sau ~60 giây.',
          duration: 8000,
        });
        refetch();
        return;
      }

      // Handle Bluesky needs_reauth
      if (resolved?.needs_reauth) {
        toast.error('Cần kết nối lại', {
          description: resolved?.error || 'App Password đã hết hạn hoặc bị thu hồi.',
          duration: 8000,
        });
        refetch();
        return;
      }

      // Handle rate limiting (Bluesky or others)
      if (resolved?.errorCode === 'RATE_LIMITED') {
        toast.warning('Bị giới hạn tốc độ', {
          description: resolved?.error || 'Vui lòng thử lại sau 1-2 phút.',
          duration: 6000,
        });
        return;
      }

      // Handle PDS/server unreachable (transient)
      if (resolved?.errorCode === 'PDS_UNREACHABLE' || resolved?.errorCode === 'PDS_TIMEOUT') {
        toast.warning('Máy chủ Bluesky không phản hồi', {
          description: resolved?.error || 'Vui lòng thử lại sau.',
          duration: 6000,
        });
        return;
      }

      if (error || !resolved?.success) {
        // Log diagnostics for debugging
        if (resolved?.diagnostics) {
          console.warn('[Test Connection Diagnostics]', resolved.diagnostics);
        }
        throw new Error(resolved?.error || error?.message || 'Không thể xác minh kết nối');
      }

      const displayName = resolved.data?.username || resolved.data?.name || resolved.data?.oa_name || resolved.data?.accountInfo?.name || 'Tài khoản';
      const extraInfo = resolved.data?.followersCount != null ? ` (${resolved.data.followersCount} followers)` : '';
      toast.success('Xác minh thành công!', {
        description: `Đã kết nối với ${displayName}${extraInfo}`,
      });

      // Refetch connections to get updated data
      refetch();
    } catch (error: any) {
      console.error('Test connection error:', error);
      toast.error('Xác minh thất bại', {
        description: error.message || 'Vui lòng kiểm tra lại cấu hình',
      });
    } finally {
      setTestingConnection(null);
    }
  };

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderConnection = (platform: SocialPlatform) => {
    const config = PLATFORM_CONFIG[platform];
    const connection = getConnectionForPlatform(platform);
    const isTesting = testingConnection === connection?.id;

    const showTokenPanel =
      !!connection &&
      (platform === 'instagram' || platform === 'facebook');

    return (
      <div
        key={platform}
        className="rounded-lg border border-border/50 bg-card hover:border-border transition-colors"
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
          {/* Platform icon with optional avatar overlay */}
          <div className="relative">
            {connection?.platform_avatar_url ? (
              <>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={connection.platform_avatar_url} alt={connection.platform_display_name || ''} />
                  <AvatarFallback className={config.color}>
                    {config.icon}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${config.color} ring-2 ring-background`}>
                  {React.cloneElement(config.icon as React.ReactElement, { className: 'w-3 h-3' })}
                </div>
              </>
            ) : (
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
                {config.icon}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {connection?.platform_display_name || config.name}
              </span>
              {!config.available && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  Sắp ra mắt
                </Badge>
              )}
            </div>
            {connection ? (
              <div className="flex items-center gap-2 mt-1">
                {connection.platform_username && (
                  <span className="text-sm text-muted-foreground">
                    @{connection.platform_username}
                  </span>
                )}
                {connection.is_active ? (
                  <>
                    {connection.last_verified_at ? (
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Đã xác thực
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Đã kết nối
                      </Badge>
                    )}
                    <TokenExpiryBadge expiresAt={connection.token_expires_at} />
                  </>
                ) : (
                  <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20">
                    <Unplug className="w-3 h-3 mr-1" />
                    Đã ngắt
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{config.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {connection ? (
            <>
              {connection.is_active && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection(connection.id, platform)}
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-1" />
                    )}
                    {isTesting ? '' : 'Test'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnect(connection.id)}
                    disabled={isDisconnecting}
                  >
                    <Unplug className="w-4 h-4 mr-1" />
                    Ngắt
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(connection.id)}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button
              variant={config.available ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleConnect(platform)}
              disabled={!config.available || oauthConnecting === platform}
            >
              {oauthConnecting === platform ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              {oauthConnecting === platform ? 'Đang kết nối...' : 'Kết nối'}
            </Button>
          )}
        </div>
        </div>
        {showTokenPanel && connection && (
          <div className="px-4 pb-4">
            <TokenStatusPanel
              connection={connection}
              platform={platform as 'instagram' | 'facebook'}
              onChecked={refetch}
            />
          </div>
        )}
        {platform === 'pinterest' && connection?.is_active && (
          <div className="px-4 pb-4">
            <PinterestBoardSelector
              brandTemplateId={template.id}
              connectionId={connection.id}
              defaultBoardId={(template as any).pinterest_default_board_id ?? null}
            />
          </div>
        )}
      </div>
    );
  };

  // Render multiple Facebook connections

  const renderFacebookPlatform = () => {
    const config = PLATFORM_CONFIG['facebook'];
    const fbConns = getConnectionsForPlatform('facebook');
    const activeConns = fbConns.filter(c => c.is_active);
    const inactiveConns = fbConns.filter(c => !c.is_active);

    const renderFbConnection = (connection: SocialConnection, isInactive = false, index?: number) => {
      const isTesting = testingConnection === connection.id;
      const connectedTimeAgo = connection.connected_at
        ? formatDistanceToNow(new Date(connection.connected_at), { addSuffix: true, locale: vi })
        : null;
      return (
        <div
          key={connection.id}
          className={`rounded-lg border bg-card hover:border-border transition-colors ${
            isInactive ? 'opacity-50 border-border/30' : index === 0 ? 'border-border' : 'border-border/50'
          }`}
        >
          <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              {connection.platform_avatar_url || (connection as any).metadata?.page_picture ? (
                <>
                  <Avatar className="w-10 h-10">
                    <AvatarImage
                      src={connection.platform_avatar_url || (connection as any).metadata?.page_picture}
                      alt={connection.platform_username || ''}
                    />
                    <AvatarFallback className={config.color}>
                      {config.icon}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${config.color} ring-2 ring-background`}>
                    {React.cloneElement(config.icon as React.ReactElement, { className: 'w-3 h-3' })}
                  </div>
                </>
              ) : (
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
                  {config.icon}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                {typeof index === 'number' && activeConns.length > 1 && (
                  <span className="text-xs text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">
                    Fanpage {index + 1}
                  </span>
                )}
                <span className="font-medium">
                  {connection.platform_display_name || connection.platform_username || config.name}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {connection.platform_username && (
                  <span className="text-sm text-muted-foreground">
                    {connection.platform_username}
                  </span>
                )}
                {connection.is_active ? (
                  <>
                    {connection.last_verified_at ? (
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Đã xác thực
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Đã kết nối
                      </Badge>
                    )}
                    <TokenExpiryBadge expiresAt={connection.token_expires_at} />
                  </>
                ) : (
                  <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20">
                    <Unplug className="w-3 h-3 mr-1" />
                    Đã ngắt
                  </Badge>
                )}
                {connectedTimeAgo && (
                  <span className="text-xs text-muted-foreground">
                    · {connectedTimeAgo}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connection.is_active && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection(connection.id, 'facebook')}
                  disabled={isTesting}
                >
                  {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                  {isTesting ? '' : 'Test'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect(connection.id)}
                  disabled={isDisconnecting}
                >
                  <Unplug className="w-4 h-4 mr-1" />
                  Ngắt
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(connection.id)}
              disabled={isDeleting}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          </div>
          {!isInactive && (
            <div className="px-4 pb-4">
              <TokenStatusPanel
                connection={connection}
                platform="facebook"
                onChecked={refetch}
              />
            </div>
          )}
        </div>
      );
    };

    return (
      <div key="facebook" className="space-y-2">
        {activeConns.length === 0 ? (
          /* Zero-state: Full Facebook branded card */
          <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/30 transition-colors bg-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#1877F2]/10">
                <ChannelIcon channel="facebook" className="text-[#1877F2]" size={22} />
              </div>
              <div>
                <div className="font-medium text-sm">Facebook</div>
                <div className="text-xs text-muted-foreground">Đăng bài lên Fanpage của bạn</div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => handleConnect('facebook')}
              disabled={oauthConnecting === 'facebook'}
            >
              {oauthConnecting === 'facebook' ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              {oauthConnecting === 'facebook' ? 'Đang kết nối...' : 'Kết nối'}
            </Button>
          </div>
        ) : (
          <>
            {activeConns.map((c, i) => renderFbConnection(c, false, i))}

            {/* Add more Fanpage button - subtle dashed style */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-muted-foreground/20 hover:border-muted-foreground/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center ${config.color}`}>
                  {React.cloneElement(config.icon as React.ReactElement, { className: 'w-4 h-4' })}
                </div>
                <span className="text-sm text-muted-foreground">Thêm Fanpage khác</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleConnect('facebook')}
                disabled={oauthConnecting === 'facebook'}
              >
                {oauthConnecting === 'facebook' ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-1" />
                )}
                {oauthConnecting === 'facebook' ? 'Đang kết nối...' : 'Kết nối'}
              </Button>
            </div>
          </>
        )}

        {inactiveConns.length > 0 && (
          <>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
              onClick={() => setShowInactiveFb(prev => !prev)}
            >
              {showInactiveFb ? 'Ẩn' : 'Hiện'} {inactiveConns.length} kết nối đã ngắt
            </button>
            {showInactiveFb && inactiveConns.map((c) => renderFbConnection(c, true))}
          </>
        )}
      </div>
    );
  };

  // Render multiple website connections
  const renderWebsitePlatform = () => {
    const config = PLATFORM_CONFIG['website' as SocialPlatform];
    if (!config) return renderConnection('website' as SocialPlatform);
    
    const websiteConns = getConnectionsForPlatform('website' as SocialPlatform);
    const activeWebsiteConns = websiteConns.filter(c => c.is_active);

    return (
      <div key="website" className="space-y-2">
        {/* Existing website connections */}
        {websiteConns.map((connection, index) => {
          const isTesting = testingConnection === connection.id;
          const intType = (connection as any).metadata?.integration_type;
          const connectedTimeAgo = connection.connected_at
            ? formatDistanceToNow(new Date(connection.connected_at), { addSuffix: true, locale: vi })
            : null;
          return (
            <div
              key={connection.id}
              className={`flex items-center justify-between p-4 rounded-lg border bg-card hover:border-border transition-colors ${
                index === 0 ? 'border-border' : 'border-border/50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  {connection.platform_avatar_url ? (
                    <>
                      <Avatar className="w-10 h-10">
                        <AvatarImage
                          src={connection.platform_avatar_url}
                          alt={connection.platform_username || ''}
                        />
                        <AvatarFallback className={config.color}>
                          {config.icon}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${config.color} ring-2 ring-background`}>
                        <Globe className="w-3 h-3" />
                      </div>
                    </>
                  ) : (
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
                      {config.icon}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {activeWebsiteConns.length > 1 && (
                      <span className="text-xs text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">
                        Website {index + 1}
                      </span>
                    )}
                    <span className="font-medium">
                      {connection.platform_display_name || connection.platform_username || config.name}
                    </span>
                    {intType && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {intType === 'nukeviet' ? 'NukeViet' : intType === 'wordpress' ? 'WordPress' : intType}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {connection.platform_username && (
                      <span className="text-sm text-muted-foreground">
                        {connection.platform_username}
                      </span>
                    )}
                    {connection.is_active ? (
                      <>
                        {connection.last_verified_at ? (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            Đã xác thực
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Đã kết nối
                          </Badge>
                        )}
                      </>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20">
                        <Unplug className="w-3 h-3 mr-1" />
                        Đã ngắt
                      </Badge>
                    )}
                    {connectedTimeAgo && (
                      <span className="text-xs text-muted-foreground">
                        · {connectedTimeAgo}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {connection.is_active && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(connection.id, 'website' as SocialPlatform)}
                      disabled={isTesting}
                    >
                      {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                      {isTesting ? '' : 'Test'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(connection.id)}
                      disabled={isDisconnecting}
                    >
                      <Unplug className="w-4 h-4 mr-1" />
                      Ngắt
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(connection.id)}
                  disabled={isDeleting}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}

        {/* Always show "Add website" button */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-dashed border-border/50 bg-card/50 hover:border-border/70 transition-colors">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color} opacity-60`}>
              {config.icon}
            </div>
            <div>
              <span className="font-medium text-muted-foreground">
                {websiteConns.length > 0 ? 'Thêm Website khác' : 'Thêm Website'}
              </span>
              {websiteConns.length === 0 && (
                <p className="text-sm text-muted-foreground">{config.description}</p>
              )}
            </div>
          </div>
          <Button
            variant={websiteConns.length > 0 ? 'outline' : 'default'}
            size="sm"
            onClick={() => handleConnect('website' as SocialPlatform)}
            className={websiteConns.length > 0 ? 'text-muted-foreground' : ''}
          >
            <Plus className="w-4 h-4 mr-1" />
            Kết nối
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 className="w-4 h-4 text-primary" />
            Kết nối mạng xã hội
          </CardTitle>
          <CardDescription>
            Kết nối tài khoản để đăng bài trực tiếp từ brand "{template.brand_name}".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(Object.keys(PLATFORM_CONFIG) as SocialPlatform[]).map(platform =>
            platform === ('website' as SocialPlatform) ? renderWebsitePlatform() :
            platform === 'facebook' ? renderFacebookPlatform() :
            renderConnection(platform)
          )}
        </CardContent>
      </Card>

      {/* Twitter Setup Dialog */}
      <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
                <Twitter className="w-4 h-4" />
              </div>
              Kết nối X (Twitter)
            </DialogTitle>
            <DialogDescription>
              Nhập API Keys từ Twitter Developer Portal để kết nối tài khoản.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Warning about token ownership */}
            <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-700">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Quan trọng:</strong> Access Token phải được tạo từ chính tài khoản Twitter mà bạn muốn đăng bài. Token từ tài khoản khác sẽ đăng bài lên tài khoản đó.
              </AlertDescription>
            </Alert>

            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-3">
              <p className="font-medium">Cách lấy Access Token từ tài khoản Twitter của bạn:</p>
              
              {/* Option 1: Team Member */}
              <div className="border-l-2 border-primary pl-3">
                <p className="font-medium text-primary">Tùy chọn 1: Được Admin mời vào App</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground mt-1">
                  <li>Yêu cầu Admin mời bạn làm Team Member trong Project trên <a href="https://developer.twitter.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">developer.twitter.com <ExternalLink className="w-3 h-3" /></a></li>
                  <li>Chấp nhận lời mời qua email</li>
                  <li>Truy cập App → <strong>Keys and Tokens</strong></li>
                  <li>Generate <strong>Access Token của tài khoản bạn</strong></li>
                  <li>Copy Access Token và Access Token Secret</li>
                </ol>
              </div>
              
              {/* Option 2: Own App */}
              <div className="border-l-2 border-muted-foreground pl-3">
                <p className="font-medium">Tùy chọn 2: Tạo App Developer riêng</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground mt-1">
                  <li>Đăng ký Twitter Developer tại <a href="https://developer.twitter.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">developer.twitter.com <ExternalLink className="w-3 h-3" /></a></li>
                  <li>Tạo Project và App mới</li>
                  <li>Trong User Authentication, bật <strong>OAuth 1.0a</strong> với <strong>Read and Write</strong></li>
                  <li>Trong Keys and Tokens, generate Access Token</li>
                  <li>Liên hệ Admin để được cung cấp Consumer Key/Secret nếu cần</li>
                </ol>
              </div>
            </div>

            {/* Access Token */}
            <div className="space-y-2">
              <Label htmlFor="accessToken" className="flex items-center gap-1">
                Access Token
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Token này đại diện cho quyền đăng bài của tài khoản Twitter. Đảm bảo bạn generate từ đúng tài khoản muốn sử dụng.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <div className="relative">
                <Input
                  id="accessToken"
                  type={showSecrets.accessToken ? 'text' : 'password'}
                  placeholder="Nhập Access Token..."
                  value={twitterForm.accessToken}
                  onChange={(e) => setTwitterForm(prev => ({ ...prev, accessToken: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => toggleSecret('accessToken')}
                >
                  {showSecrets.accessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Access Token Secret */}
            <div className="space-y-2">
              <Label htmlFor="accessTokenSecret">Access Token Secret</Label>
              <div className="relative">
                <Input
                  id="accessTokenSecret"
                  type={showSecrets.accessTokenSecret ? 'text' : 'password'}
                  placeholder="Nhập Access Token Secret..."
                  value={twitterForm.accessTokenSecret}
                  onChange={(e) => setTwitterForm(prev => ({ ...prev, accessTokenSecret: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => toggleSecret('accessTokenSecret')}
                >
                  {showSecrets.accessTokenSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleTwitterSubmit} disabled={isConnecting}>
              {isConnecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Kết nối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bluesky OAuth — handle prompt dialog */}
      <Dialog open={blueskyDialogOpen} onOpenChange={setBlueskyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChannelIcon channel="bluesky" className="text-[#0085FF]" size={20} />
              Kết nối Bluesky
            </DialogTitle>
            <DialogDescription>
              Nhập handle Bluesky của bạn (ví dụ: <code>yourname.bsky.social</code>). Đây là tên đăng nhập, không phải tên hiển thị.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="bluesky-handle">Handle Bluesky</Label>
            <Input
              id="bluesky-handle"
              autoFocus
              placeholder="yourname.bsky.social"
              value={blueskyHandle}
              onChange={(e) => setBlueskyHandle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isBlueskyConnecting) handleBlueskySubmit();
              }}
            />
            <p className="text-xs text-muted-foreground">
              Bạn sẽ được chuyển sang Bluesky để xác thực qua OAuth 2.0 (DPoP). Flowa không lưu mật khẩu của bạn.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlueskyDialogOpen(false)} disabled={isBlueskyConnecting}>
              Hủy
            </Button>
            <Button onClick={handleBlueskySubmit} disabled={isBlueskyConnecting}>
              {isBlueskyConnecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Tiếp tục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shopify OAuth — shop domain prompt dialog */}
      <Dialog open={shopifyDialogOpen} onOpenChange={setShopifyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChannelIcon channel={"shopify" as any} size={20} />
              Kết nối Shopify
            </DialogTitle>
            <DialogDescription>
              Nhập shop domain (ví dụ: <code>your-store.myshopify.com</code>). Bạn sẽ được chuyển sang Shopify để cấp quyền.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="shopify-shop">Shop domain</Label>
            <Input
              id="shopify-shop"
              autoFocus
              placeholder="your-store.myshopify.com"
              value={shopifyShop}
              onChange={(e) => setShopifyShop(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isShopifyConnecting) handleShopifySubmit();
              }}
            />
            <p className="text-xs text-muted-foreground">
              Flowa chỉ yêu cầu quyền đọc/ghi nội dung blog. Token được mã hóa AES-256-GCM trước khi lưu.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShopifyDialogOpen(false)} disabled={isShopifyConnecting}>
              Hủy
            </Button>
            <Button onClick={handleShopifySubmit} disabled={isShopifyConnecting}>
              {isShopifyConnecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Tiếp tục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WordPressConnectDialog
        open={wpDialogOpen}
        onOpenChange={setWpDialogOpen}
        brandTemplateId={template.id}
        onConnected={() => refetch()}
      />

      {/* Website Setup Dialog */}
      <Dialog open={websiteDialogOpen} onOpenChange={setWebsiteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              Kết nối Website
            </DialogTitle>
            <DialogDescription>
              Kết nối WordPress, Custom API hoặc Webhook để đăng bài từ Flowa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">URL Website <span className="text-destructive">*</span></Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://yourwebsite.com"
                value={websiteForm.websiteUrl}
                onChange={(e) => {
                  const url = e.target.value;
                  const updates: Partial<typeof websiteForm> = { websiteUrl: url };
                  if (websiteForm.integrationType === 'nukeviet' && url.trim()) {
                    let base = url.trim().endsWith('/') ? url.trim().slice(0, -1) : url.trim();
                    if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
                    updates.apiEndpoint = `${base}/api_flowa.php`;
                  }
                  setWebsiteForm(prev => ({ ...prev, ...updates }));
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="integrationType">Loại kết nối</Label>
              <select
                id="integrationType"
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={websiteForm.integrationType}
                onChange={(e) => {
                  const type = e.target.value as typeof websiteForm.integrationType;
                  const updates: Partial<typeof websiteForm> = { integrationType: type };
                  if (type === 'nukeviet' && websiteForm.websiteUrl.trim()) {
                    let base = websiteForm.websiteUrl.trim().endsWith('/') ? websiteForm.websiteUrl.trim().slice(0, -1) : websiteForm.websiteUrl.trim();
                    if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
                    updates.apiEndpoint = `${base}/api_flowa.php`;
                  }
                  setWebsiteForm(prev => ({ ...prev, ...updates }));
                }}
              >
                <option value="flowa_blog">Blog Flowa (flowa.vn/blog)</option>
                <option value="nukeviet">NukeViet CMS</option>
                
                <option value="wix">Wix Blog</option>
                <option value="shopify_blog">Shopify Blog</option>
                <option value="custom_api">Custom API</option>
                <option value="webhook">Webhook</option>
                <option value="manual">Thủ công</option>
              </select>
            </div>

            {websiteForm.integrationType === 'flowa_blog' && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Kết nối trực tiếp với blog Flowa (flowa.vn/blog). Bài viết sẽ được đăng công khai trên trang blog chính thức. Chỉ admin mới có thể sử dụng tùy chọn này.
                </AlertDescription>
              </Alert>
            )}

            {websiteForm.integrationType === 'nukeviet' && (
              <>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <p className="font-medium">Hướng dẫn cài đặt (3 bước đơn giản):</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Nhập hoặc tạo mật khẩu bảo mật bên dưới</li>
                      <li>Tải file <strong>api_flowa.php</strong> → upload lên thư mục gốc website (ngang hàng với <code>mainfile.php</code>)</li>
                      <li>Nhập đường dẫn website bên dưới rồi bấm <strong>Kết nối</strong></li>
                    </ol>
                    <p className="text-xs text-muted-foreground mt-1">💡 Mật khẩu sẽ được tự động nhúng vào file, bạn không cần mở file ra sửa gì!</p>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="nvApiKey">Mật khẩu bảo mật (API Key) *</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="nvApiKey"
                        type={showSecrets.apiKey ? 'text' : 'password'}
                        placeholder="Nhập mật khẩu hoặc bấm Tạo ngẫu nhiên"
                        value={websiteForm.apiKey}
                        onChange={(e) => setWebsiteForm(prev => ({ ...prev, apiKey: e.target.value }))}
                        className="pr-10"
                      />
                      <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => toggleSecret('apiKey')}>
                        {showSecrets.apiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                        const key = Array.from(crypto.getRandomValues(new Uint8Array(16)))
                          .map(b => chars[b % chars.length]).join('');
                        setWebsiteForm(prev => ({ ...prev, apiKey: key }));
                        toast.success('Đã tạo mật khẩu ngẫu nhiên!');
                      }}
                    >
                      🔄 Tạo ngẫu nhiên
                    </Button>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!websiteForm.apiKey}
                  onClick={() => {
                    const apiKeyValue = websiteForm.apiKey;
                    const phpCode = `<?php
// =========================================================
// CẤU HÌNH BẢO MẬT (Đã được tạo tự động bởi Flowa App)
$my_api_key = "${apiKeyValue}";
// =========================================================

define('NV_SYSTEM', true);
require_once 'mainfile.php';

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(0); }

if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    echo json_encode(["status" => "ok", "message" => "NukeViet API endpoint is ready", "version" => "1.0"]);
    exit(0);
}

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['api_key']) || $data['api_key'] !== $my_api_key) {
    http_response_code(401);
    die(json_encode(["status" => "error", "message" => "Sai mật khẩu bảo mật (API Key)!"]));
}

// Test connection mode
if (isset($data['action']) && $data['action'] === 'test') {
    echo json_encode(["status" => "ok", "message" => "Kết nối thành công!", "cms" => "NukeViet"]);
    exit(0);
}

$title = isset($data['title']) ? nv_htmlspecialchars(strip_tags($data['title'])) : '';
$content = isset($data['content']) ? $data['content'] : '';
$catid = isset($data['catid']) ? intval($data['catid']) : 1;

if (empty($title) || empty($content)) {
    die(json_encode(["status" => "error", "message" => "Tiêu đề và nội dung không được để trống!"]));
}

$alias = change_alias($title);
$addtime = NV_CURRENTTIME;
$module_name = 'news';
$table_prefix = NV_PREFIXLANG . "_" . $module_name;

try {
    $sql_rows = "INSERT INTO " . $table_prefix . "_rows 
        (catid, listcatid, topicid, admin_id, author, sourceid, addtime, edittime, publtime, title, alias, hometext, status, hitstotal, hitscm) 
        VALUES (:catid, :listcatid, 0, 1, 'Flowa App', 0, :addtime, :addtime, :addtime, :title, :alias, '', 1, 0, 0)";
    
    $sth = $db->prepare($sql_rows);
    $sth->bindParam(':catid', $catid, PDO::PARAM_INT);
    $sth->bindValue(':listcatid', $catid . ',', PDO::PARAM_STR);
    $sth->bindParam(':addtime', $addtime, PDO::PARAM_INT);
    $sth->bindParam(':title', $title, PDO::PARAM_STR);
    $sth->bindParam(':alias', $alias, PDO::PARAM_STR);
    $sth->execute();
    
    $new_post_id = $db->lastInsertId();

    if ($new_post_id) {
        $sql_body = "INSERT INTO " . $table_prefix . "_bodytext (id, bodyhtml) VALUES (:id, :bodyhtml)";
        $sth_body = $db->prepare($sql_body);
        $sth_body->bindParam(':id', $new_post_id, PDO::PARAM_INT);
        $sth_body->bindParam(':bodyhtml', $content, PDO::PARAM_STR);
        $sth_body->execute();

        echo json_encode(["status" => "success", "message" => "Đăng bài thành công!", "post_id" => $new_post_id]);
    } else {
        echo json_encode(["status" => "error", "message" => "Không thể tạo bài viết."]);
    }
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Lỗi CSDL: " . $e->getMessage()]);
}
?>`;
                    const blob = new Blob([phpCode], { type: 'application/x-php' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'api_flowa.php';
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success('Đã tải file api_flowa.php (đã nhúng mật khẩu)');
                  }}
                >
                  📥 Tải file api_flowa.php
                </Button>
                {!websiteForm.apiKey && (
                  <p className="text-xs text-muted-foreground">⚠️ Vui lòng nhập hoặc tạo mật khẩu trước khi tải file</p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="nvEndpoint">Đường dẫn file trên website <span className="text-destructive">*</span></Label>
                  <p className="text-xs text-muted-foreground">Tự động tạo từ URL website. Chỉ sửa nếu bạn đặt file ở vị trí khác.</p>
                  <Input
                    id="nvEndpoint"
                    type="url"
                    placeholder="https://ten-mien.com/api_flowa.php"
                    value={websiteForm.apiEndpoint}
                    onChange={(e) => setWebsiteForm(prev => ({ ...prev, apiEndpoint: e.target.value }))}
                  />
                </div>
              </>
            )}

            {websiteForm.integrationType === 'wordpress' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="wpUsername">WordPress Username</Label>
                  <Input
                    id="wpUsername"
                    placeholder="admin"
                    value={websiteForm.username}
                    onChange={(e) => setWebsiteForm(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wpAppPassword">Application Password</Label>
                  <div className="relative">
                    <Input
                      id="wpAppPassword"
                      type={showSecrets.wpAppPassword ? 'text' : 'password'}
                      placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                      value={websiteForm.appPassword}
                      onChange={(e) => setWebsiteForm(prev => ({ ...prev, appPassword: e.target.value }))}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => toggleSecret('wpAppPassword')}
                    >
                      {showSecrets.wpAppPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tạo tại WordPress Admin → Users → Profile → Application Passwords
                  </p>
                </div>
              </>
            )}


            {websiteForm.integrationType === 'wix' && (
              <div className="space-y-2">
                <Label htmlFor="wixApiKey">Wix API Key</Label>
                <div className="relative">
                  <Input
                    id="wixApiKey"
                    type={showSecrets.apiKey ? 'text' : 'password'}
                    placeholder="Nhập Wix API Key..."
                    value={websiteForm.apiKey}
                    onChange={(e) => setWebsiteForm(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="pr-10"
                  />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => toggleSecret('apiKey')}>
                    {showSecrets.apiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tạo tại Wix Dashboard → Settings → API Keys
                </p>
              </div>
            )}

            {websiteForm.integrationType === 'shopify_blog' && (
              <div className="space-y-2">
                <Label htmlFor="shopifyToken">Admin API Access Token</Label>
                <div className="relative">
                  <Input
                    id="shopifyToken"
                    type={showSecrets.apiKey ? 'text' : 'password'}
                    placeholder="shpat_..."
                    value={websiteForm.apiKey}
                    onChange={(e) => setWebsiteForm(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="pr-10"
                  />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => toggleSecret('apiKey')}>
                    {showSecrets.apiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tạo tại Shopify Admin → Settings → Apps → Develop apps → Admin API access token. URL dạng: mystore.myshopify.com
                </p>
              </div>
            )}

            {websiteForm.integrationType === 'custom_api' && (
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showSecrets.apiKey ? 'text' : 'password'}
                    placeholder="Nhập API Key..."
                    value={websiteForm.apiKey}
                    onChange={(e) => setWebsiteForm(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="pr-10"
                  />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => toggleSecret('apiKey')}>
                    {showSecrets.apiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWebsiteDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleWebsiteSubmit}
              disabled={isWebsiteConnecting || !websiteForm.websiteUrl}
            >
              {isWebsiteConnecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Kết nối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bluesky now uses OAuth 2.0 — no dialog needed */}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa kết nối?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn kết nối và tất cả dữ liệu liên quan. Bạn sẽ cần kết nối lại nếu muốn sử dụng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}