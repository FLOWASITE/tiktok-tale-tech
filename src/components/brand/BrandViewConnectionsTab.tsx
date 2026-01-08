import { useState } from 'react';
import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { useSocialConnections, SocialPlatform, SocialConnection } from '@/hooks/useSocialConnections';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
  consumerKey: string;
  consumerSecret: string;
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
    consumerKey: '',
    consumerSecret: '',
  });

  const handleConnect = (platform: SocialPlatform) => {
    if (!PLATFORM_CONFIG[platform].available) {
      toast.info(`${PLATFORM_CONFIG[platform].name} sẽ sớm được hỗ trợ!`);
      return;
    }
    setSelectedPlatform(platform);
    setSetupDialogOpen(true);
  };

  const handleTwitterSubmit = async () => {
    if (!twitterForm.accessToken || !twitterForm.accessTokenSecret || 
        !twitterForm.consumerKey || !twitterForm.consumerSecret) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    try {
      await connect({
        platform: 'twitter',
        brandTemplateId: template.id,
        accessToken: twitterForm.accessToken,
        accessTokenSecret: twitterForm.accessTokenSecret,
        consumerKey: twitterForm.consumerKey,
        consumerSecret: twitterForm.consumerSecret,
      });
      setSetupDialogOpen(false);
      setTwitterForm({ accessToken: '', accessTokenSecret: '', consumerKey: '', consumerSecret: '' });
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

  const TEST_FUNCTION_MAP: Record<SocialPlatform, string> = {
    twitter: 'test-twitter-connection',
    facebook: 'test-facebook-connection',
    instagram: 'test-instagram-connection',
    linkedin: 'test-linkedin-connection',
    threads: 'test-threads-connection',
    tiktok: 'test-tiktok-connection',
    youtube: 'test-youtube-connection',
    zalo_oa: 'test-zalo-connection',
    google_business: 'test-google-business-connection',
    website: 'test-website-connection',
  };

  const handleTestConnection = async (connectionId: string, platform: SocialPlatform) => {
    setTestingConnection(connectionId);
    try {
      const functionName = TEST_FUNCTION_MAP[platform];
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { connectionId },
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
                  connection.last_verified_at ? (
                    <Badge variant="default" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      Đã xác thực
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Đã kết nối
                    </Badge>
                  )
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
              disabled={!config.available}
            >
              <Plus className="w-4 h-4 mr-1" />
              Kết nối
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
            {/* Instructions */}
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-2">
              <p className="font-medium">Hướng dẫn lấy API Keys:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Truy cập <a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">developer.twitter.com <ExternalLink className="w-3 h-3" /></a></li>
                <li>Tạo Project và App (hoặc dùng có sẵn)</li>
                <li>Vào <strong>Keys and Tokens</strong></li>
                <li>Copy <strong>API Key</strong> và <strong>API Secret</strong></li>
                <li>Generate và copy <strong>Access Token</strong> và <strong>Access Token Secret</strong></li>
                <li>Đảm bảo App có quyền <strong>Read and Write</strong></li>
              </ol>
            </div>

            {/* Consumer Key */}
            <div className="space-y-2">
              <Label htmlFor="consumerKey">API Key (Consumer Key)</Label>
              <div className="relative">
                <Input
                  id="consumerKey"
                  type={showSecrets.consumerKey ? 'text' : 'password'}
                  placeholder="Nhập API Key..."
                  value={twitterForm.consumerKey}
                  onChange={(e) => setTwitterForm(prev => ({ ...prev, consumerKey: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => toggleSecret('consumerKey')}
                >
                  {showSecrets.consumerKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Consumer Secret */}
            <div className="space-y-2">
              <Label htmlFor="consumerSecret">API Secret (Consumer Secret)</Label>
              <div className="relative">
                <Input
                  id="consumerSecret"
                  type={showSecrets.consumerSecret ? 'text' : 'password'}
                  placeholder="Nhập API Secret..."
                  value={twitterForm.consumerSecret}
                  onChange={(e) => setTwitterForm(prev => ({ ...prev, consumerSecret: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => toggleSecret('consumerSecret')}
                >
                  {showSecrets.consumerSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Access Token */}
            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token</Label>
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