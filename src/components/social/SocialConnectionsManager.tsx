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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

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
    available: false,
    description: 'Đăng lên Page (sắp ra mắt)',
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'text-[#E4405F]',
    bgColor: 'bg-[#E4405F]/10',
    available: false,
    description: 'Đăng ảnh và carousel (sắp ra mắt)',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'text-[#0A66C2]',
    bgColor: 'bg-[#0A66C2]/10',
    available: false,
    description: 'Đăng bài B2B (sắp ra mắt)',
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
    available: false,
    description: 'Đăng threads (sắp ra mắt)',
  },
  youtube: {
    name: 'YouTube',
    icon: () => <span className="text-lg">▶️</span>,
    color: 'text-[#FF0000]',
    bgColor: 'bg-[#FF0000]/10',
    available: false,
    description: 'Upload video (sắp ra mắt)',
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
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{config.name}</span>
                        {connection && (
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                            Đã kết nối
                          </Badge>
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
