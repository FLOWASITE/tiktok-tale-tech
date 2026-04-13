import { useState } from 'react';
import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { useSocialConnections, SocialPlatform, SocialConnection } from '@/hooks/useSocialConnections';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TokenExpiryBadge } from '@/components/social/TokenExpiryBadge';
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
    icon: <Twitter className="w-5 h-5" />,
    color: 'bg-black text-white',
    available: true,
    description: 'Đăng tweets và threads',
  },
  facebook: {
    name: 'Facebook',
    icon: <Facebook className="w-5 h-5" />,
    color: 'bg-[#1877F2] text-white',
    available: true,
    description: 'Đăng lên Page',
  },
  instagram: {
    name: 'Instagram',
    icon: <Instagram className="w-5 h-5" />,
    color: 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white',
    available: true,
    description: 'Đăng ảnh và carousel',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: <Linkedin className="w-5 h-5" />,
    color: 'bg-[#0A66C2] text-white',
    available: true,
    description: 'Đăng bài chuyên nghiệp',
  },
  tiktok: {
    name: 'TikTok',
    icon: <Music2 className="w-5 h-5" />,
    color: 'bg-black text-white',
    available: false,
    description: 'Đăng video ngắn (sắp ra mắt)',
  },
  threads: {
    name: 'Threads',
    icon: <AtSign className="w-5 h-5" />,
    color: 'bg-black text-white',
    available: true,
    description: 'Đăng threads',
  },
  youtube: {
    name: 'YouTube',
    icon: <Youtube className="w-5 h-5" />,
    color: 'bg-[#FF0000] text-white',
    available: false,
    description: 'Đăng video (sắp ra mắt)',
  },
  zalo_oa: {
    name: 'Zalo OA',
    icon: <MessageCircle className="w-5 h-5" />,
    color: 'bg-[#0068FF] text-white',
    available: true,
    description: 'Đăng tin nhắn và bài viết OA',
  },
  google_business: {
    name: 'Google Business',
    icon: <MapPin className="w-5 h-5" />,
    color: 'bg-[#4285F4] text-white',
    available: true,
    description: 'Đăng bài Local Posts',
  },
  website: {
    name: 'Website',
    icon: <Globe className="w-5 h-5" />,
    color: 'bg-[#10B981] text-white',
    available: true,
    description: 'WordPress, API hoặc Webhook',
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
  const [websiteDialogOpen, setWebsiteDialogOpen] = useState(false);
  const [websiteForm, setWebsiteForm] = useState({
    websiteUrl: '',
    integrationType: 'wordpress' as 'wordpress' | 'nukeviet' | 'blogger' | 'wix' | 'shopify_blog' | 'flowa_blog' | 'custom_api' | 'webhook' | 'manual',
    username: '',
    appPassword: '',
    apiKey: '',
    apiEndpoint: '',
  });
  const [isWebsiteConnecting, setIsWebsiteConnecting] = useState(false);

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

    // OAuth platforms (Facebook, Instagram, LinkedIn, Threads, Zalo OA, Google Business)
    setOauthConnecting(platform);
    try {
      const result = await connect({
        platform,
        brandTemplateId: template.id,
      });
      if (result?.requiresOAuth && result?.oauthUrl) {
        const popup = window.open(result.oauthUrl, '_blank', 'width=620,height=720');
        toast.info(`Đã mở trang đăng nhập ${PLATFORM_CONFIG[platform].name}`, {
          description: 'Hoàn tất đăng nhập trong cửa sổ mới để kết nối tài khoản.',
        });

        // Poll for connection completion after OAuth popup opens
        const pollInterval = setInterval(async () => {
          try {
            // Check if popup is closed
            if (popup && popup.closed) {
              clearInterval(pollInterval);
              // Give a moment for backend to finish, then refetch
              setTimeout(() => {
                refetch();
              }, 1500);
              return;
            }
            // Also poll DB for new connection
            const { data } = await supabase
              .from('social_connections')
              .select('id, platform, is_active')
              .eq('brand_template_id', template.id)
              .eq('platform', platform)
              .eq('is_active', true)
              .maybeSingle();
            if (data) {
              clearInterval(pollInterval);
              refetch();
              toast.success(`Đã kết nối ${PLATFORM_CONFIG[platform].name} thành công!`);
              if (popup && !popup.closed) popup.close();
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
      } else if (['blogger', 'wix', 'shopify_blog', 'custom_api'].includes(websiteForm.integrationType) && websiteForm.apiKey) {
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
    website: 'website',
  };

  const handleTestConnection = async (connectionId: string, platform: SocialPlatform) => {
    setTestingConnection(connectionId);
    try {
      const diagPlatform = PLATFORM_DIAG_MAP[platform];
      const { data, error } = await supabase.functions.invoke('social-diagnostics', {
        body: { action: 'test-connection', platform: diagPlatform, connectionId },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Không thể xác minh kết nối');
      }

      const displayName = data.data?.username || data.data?.name || data.data?.oa_name || 'Tài khoản';
      toast.success('Xác minh thành công!', {
        description: `Đã kết nối với ${displayName}`,
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

    return (
      <div
        key={platform}
        className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card hover:border-border transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Platform icon or user avatar */}
          {connection?.platform_avatar_url ? (
            <Avatar className="w-10 h-10">
              <AvatarImage src={connection.platform_avatar_url} alt={connection.platform_display_name || ''} />
              <AvatarFallback className={config.color}>
                {config.icon}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
              {config.icon}
            </div>
          )}
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
                      <Badge variant="default" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Đã xác thực
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Đã kết nối
                      </Badge>
                    )}
                    <TokenExpiryBadge expiresAt={connection.token_expires_at} />
                  </>
                ) : (
                  <Badge variant="secondary" className="text-xs">
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
          {(Object.keys(PLATFORM_CONFIG) as SocialPlatform[]).map(renderConnection)}
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
                    const base = websiteForm.websiteUrl.trim().endsWith('/') ? websiteForm.websiteUrl.trim().slice(0, -1) : websiteForm.websiteUrl.trim();
                    updates.apiEndpoint = `${base}/api_flowa.php`;
                  }
                  setWebsiteForm(prev => ({ ...prev, ...updates }));
                }}
              >
                <option value="flowa_blog">Blog Flowa (flowa.vn/blog)</option>
                <option value="wordpress">WordPress (REST API)</option>
                <option value="nukeviet">NukeViet CMS</option>
                <option value="blogger">Blogger (Google)</option>
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

            {websiteForm.integrationType === 'blogger' && (
              <div className="space-y-2">
                <Label htmlFor="bloggerApiKey">Google API Key</Label>
                <div className="relative">
                  <Input
                    id="bloggerApiKey"
                    type={showSecrets.apiKey ? 'text' : 'password'}
                    placeholder="AIzaSy..."
                    value={websiteForm.apiKey}
                    onChange={(e) => setWebsiteForm(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="pr-10"
                  />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => toggleSecret('apiKey')}>
                    {showSecrets.apiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tạo tại Google Cloud Console → APIs & Services → Credentials. Bật Blogger API v3.
                </p>
              </div>
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