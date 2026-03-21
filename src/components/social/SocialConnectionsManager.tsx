import { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useSocialConnections, SocialPlatform } from '@/hooks/useSocialConnections';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Twitter, 
  Facebook, 
  Instagram, 
  Linkedin,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { TokenExpiryBadge } from './TokenExpiryBadge';

const MessageCircleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>
);

const MapPinIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const PLATFORM_CONFIG: Record<SocialPlatform, {
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  available: boolean;
  description: string;
}> = {
  twitter: {
    name: 'Twitter / X',
    icon: Twitter,
    color: 'text-[#1DA1F2]',
    bgColor: 'bg-[#1DA1F2]/10',
    available: true,
    description: 'Đăng tweets và threads',
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'text-[#1877F2]',
    bgColor: 'bg-[#1877F2]/10',
    available: true,
    description: 'Đăng lên Page',
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'text-[#E4405F]',
    bgColor: 'bg-[#E4405F]/10',
    available: true,
    description: 'Đăng ảnh và carousel',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'text-[#0A66C2]',
    bgColor: 'bg-[#0A66C2]/10',
    available: true,
    description: 'Đăng bài B2B',
  },
  tiktok: {
    name: 'TikTok',
    icon: () => <span className="text-lg">🎵</span>,
    color: 'text-foreground',
    bgColor: 'bg-muted',
    available: false,
    description: 'Đăng video (sắp ra mắt)',
  },
  threads: {
    name: 'Threads',
    icon: () => <span className="text-lg">🧵</span>,
    color: 'text-foreground',
    bgColor: 'bg-muted',
    available: true,
    description: 'Đăng threads',
  },
  youtube: {
    name: 'YouTube',
    icon: () => <span className="text-lg">▶️</span>,
    color: 'text-[#FF0000]',
    bgColor: 'bg-[#FF0000]/10',
    available: false,
    description: 'Upload video (sắp ra mắt)',
  },
  zalo_oa: {
    name: 'Zalo OA',
    icon: MessageCircleIcon,
    color: 'text-[#0068FF]',
    bgColor: 'bg-[#0068FF]/10',
    available: true,
    description: 'Đăng tin nhắn và bài viết OA',
  },
  google_business: {
    name: 'Google Business',
    icon: MapPinIcon,
    color: 'text-[#4285F4]',
    bgColor: 'bg-[#4285F4]/10',
    available: true,
    description: 'Đăng bài Local Posts',
  },
  website: {
    name: 'Website',
    icon: GlobeIcon,
    color: 'text-[#10B981]',
    bgColor: 'bg-[#10B981]/10',
    available: true,
    description: 'WordPress, API hoặc Webhook',
  },
};

interface TwitterSetupForm {
  accessToken: string;
  accessTokenSecret: string;
  username: string;
}

export function SocialConnectionsManager() {
  const { currentOrganization } = useOrganization();
  const {
    connections,
    isLoading,
    connect,
    isConnecting,
    disconnect,
    deleteConnection,
    isDeleting,
  } = useSocialConnections({ organizationId: currentOrganization?.id });

  const [setupDialog, setSetupDialog] = useState<{
    open: boolean;
    platform: SocialPlatform | null;
    instructions?: any;
  }>({ open: false, platform: null });

  const [twitterForm, setTwitterForm] = useState<TwitterSetupForm>({
    accessToken: '',
    accessTokenSecret: '',
    username: '',
  });

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleConnect = async (platform: SocialPlatform) => {
    if (!PLATFORM_CONFIG[platform].available) {
      return;
    }

    try {
      const result = await connect({ platform });
      
      if (result.requiresManualSetup) {
        setSetupDialog({
          open: true,
          platform,
          instructions: result.instructions,
        });
      }
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleTwitterSubmit = async () => {
    if (!twitterForm.accessToken || !twitterForm.accessTokenSecret) {
      return;
    }

    try {
      await connect({
        platform: 'twitter',
        accessToken: twitterForm.accessToken,
        accessTokenSecret: twitterForm.accessTokenSecret,
      });
      
      setSetupDialog({ open: false, platform: null });
      setTwitterForm({ accessToken: '', accessTokenSecret: '', username: '' });
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDelete = async (connectionId: string) => {
    try {
      await deleteConnection(connectionId);
      setDeleteConfirm(null);
    } catch (error) {
      // Error handled by hook
    }
  };

  const getConnectionForPlatform = (platform: SocialPlatform) => {
    return connections.find(c => c.platform === platform && c.is_active);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Kết nối mạng xã hội
          </CardTitle>
          <CardDescription>
            Kết nối tài khoản để đăng bài trực tiếp từ Flowa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(Object.entries(PLATFORM_CONFIG) as [SocialPlatform, typeof PLATFORM_CONFIG[SocialPlatform]][]).map(
            ([platform, config]) => {
              const connection = getConnectionForPlatform(platform);
              const Icon = config.icon;

              return (
                <div
                  key={platform}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-lg border',
                    connection ? 'border-primary/20 bg-primary/5' : 'border-border',
                    !config.available && 'opacity-60'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', config.bgColor)}>
                      <Icon className={cn('h-5 w-5', config.color)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{config.name}</span>
                        {connection && (
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                            Đã kết nối
                          </Badge>
                        )}
                        {connection && (
                          <TokenExpiryBadge expiresAt={connection.token_expires_at} />
                        )}
                        {!config.available && (
                          <Badge variant="secondary" className="text-xs">
                            Sắp ra mắt
                          </Badge>
                        )}
                      </div>
                      {connection?.platform_username && (
                        <p className="text-sm text-muted-foreground">
                          @{connection.platform_username}
                        </p>
                      )}
                      {connection?.last_used_at && (
                        <p className="text-xs text-muted-foreground">
                          Dùng lần cuối: {formatDistanceToNow(new Date(connection.last_used_at), { addSuffix: true, locale: vi })}
                        </p>
                      )}
                      {connection?.last_error && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          {connection.last_error}
                        </p>
                      )}
                      {connection && platform === 'zalo_oa' && (connection as any).metadata?.oa_package && ['Cơ bản', 'Basic'].includes((connection as any).metadata.oa_package) && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <AlertTriangle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                          <span className="text-xs text-yellow-700 dark:text-yellow-300">
                            Gói cơ bản — Hạn chế đăng bài API.{' '}
                            <a href="https://oa.zalo.me/home/pricing" target="_blank" rel="noopener noreferrer" className="underline">
                              Nâng cấp
                            </a>
                          </span>
                        </div>
                      )}
                      {!connection && (
                        <p className="text-sm text-muted-foreground">{config.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {connection ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => disconnect(connection.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Ngắt kết nối
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm(connection.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnect(platform)}
                        disabled={!config.available || isConnecting}
                      >
                        {isConnecting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Plus className="h-4 w-4 mr-1" />
                        )}
                        Kết nối
                      </Button>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </CardContent>
      </Card>

      {/* Twitter Setup Dialog */}
      <Dialog 
        open={setupDialog.open && setupDialog.platform === 'twitter'} 
        onOpenChange={(open) => !open && setSetupDialog({ open: false, platform: null })}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Twitter className="h-5 w-5 text-[#1DA1F2]" />
              Kết nối Twitter / X
            </DialogTitle>
            <DialogDescription>
              Nhập thông tin API từ Twitter Developer Portal
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="text-sm text-muted-foreground">
                <ol className="list-decimal list-inside space-y-1">
                  <li>Truy cập <a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer" className="underline text-primary">developer.twitter.com</a></li>
                  <li>Tạo App mới hoặc chọn App có sẵn</li>
                  <li>Vào <strong>User authentication settings</strong>, chọn <strong>Read and Write</strong></li>
                  <li>Vào <strong>Keys and tokens</strong>, tạo Access Token</li>
                  <li>Copy và dán các giá trị bên dưới</li>
                </ol>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="accessToken">Access Token *</Label>
                <Input
                  id="accessToken"
                  value={twitterForm.accessToken}
                  onChange={(e) => setTwitterForm(f => ({ ...f, accessToken: e.target.value }))}
                  placeholder="Nhập Access Token"
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessTokenSecret">Access Token Secret *</Label>
                <Input
                  id="accessTokenSecret"
                  type="password"
                  value={twitterForm.accessTokenSecret}
                  onChange={(e) => setTwitterForm(f => ({ ...f, accessTokenSecret: e.target.value }))}
                  placeholder="Nhập Access Token Secret"
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username (không bắt buộc)</Label>
                <Input
                  id="username"
                  value={twitterForm.username}
                  onChange={(e) => setTwitterForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="username (không có @)"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSetupDialog({ open: false, platform: null })}
            >
              Hủy
            </Button>
            <Button
              onClick={handleTwitterSubmit}
              disabled={!twitterForm.accessToken || !twitterForm.accessTokenSecret || isConnecting}
            >
              {isConnecting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Kết nối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa kết nối?</AlertDialogTitle>
            <AlertDialogDescription>
              Thao tác này sẽ xóa hoàn toàn kết nối. Bạn sẽ cần kết nối lại nếu muốn sử dụng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
