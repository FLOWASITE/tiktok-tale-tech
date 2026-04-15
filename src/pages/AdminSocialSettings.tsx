import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSocialPlatformSettings, SocialPlatform } from '@/hooks/useSocialPlatformSettings';
import { SocialPlatformCredentialsDialog } from '@/components/admin/SocialPlatformCredentialsDialog';
import { Twitter, Facebook, Instagram, Linkedin, Music2, Settings, Check, X, Trash2, Zap, Loader2, AtSign, MessageCircle, MapPin, Globe } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlatformConfig {
  platform: SocialPlatform;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  available: boolean;
}

const PLATFORMS: PlatformConfig[] = [
  { platform: 'twitter', name: 'Twitter / X', icon: Twitter, color: 'text-sky-500', available: true },
  { platform: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-600', available: true },
  { platform: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-500', available: true },
  { platform: 'threads', name: 'Threads', icon: AtSign, color: 'text-foreground', available: true },
  { platform: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700', available: true },
  { platform: 'zalo_oa', name: 'Zalo OA', icon: MessageCircle, color: 'text-blue-500', available: true },
  { platform: 'google_business', name: 'Google Business', icon: MapPin, color: 'text-red-500', available: true },
  { platform: 'website', name: 'Website', icon: Globe, color: 'text-green-600', available: true },
  { platform: 'tiktok', name: 'TikTok', icon: Music2, color: 'text-foreground', available: false },
];

export default function AdminSocialSettings() {
  const { settings, isLoading, saveSettings, deleteSettings, isSaving, isDeleting } = useSocialPlatformSettings();
  const [editingPlatform, setEditingPlatform] = useState<PlatformConfig | null>(null);
  const [deletingPlatform, setDeletingPlatform] = useState<PlatformConfig | null>(null);
  const [testingPlatform, setTestingPlatform] = useState<SocialPlatform | null>(null);

  const getTestErrorMessage = async (error: unknown, platform: SocialPlatform): Promise<string> => {
    const maybeError = error as { message?: string; context?: Response } | null;

    if (maybeError?.context instanceof Response) {
      try {
        const payload = await maybeError.context.clone().json();
        const errorText = typeof payload?.error === 'string' ? payload.error : '';
        const hintText = typeof payload?.hint === 'string' ? payload.hint : '';
        const combined = [errorText, hintText].filter(Boolean).join(' — ');
        if (combined) return combined;
      } catch {
        // Ignore parse failures and use the generic fallback below.
      }
    }

    if (platform === 'instagram') {
      return 'Hãy dùng Instagram App ID/App Secret từ Meta App Dashboard → Instagram → API setup with Instagram login → Business login settings.';
    }

    return maybeError?.message || 'Không thể test credentials';
  };

  const handleTestConnection = async (platform: SocialPlatform) => {
    const platformSettings = getSettingsForPlatform(platform);
    if (!platformSettings?.has_credentials) {
      toast.error('Chưa có credentials để test');
      return;
    }

    setTestingPlatform(platform);
    try {
      const platformMap: Record<string, string> = {
        twitter: 'twitter',
        facebook: 'facebook',
        instagram: 'instagram',
        threads: 'threads',
        linkedin: 'linkedin',
        zalo_oa: 'zalo',
        google_business: 'google-business',
        website: 'website',
      };
      const diagnosticPlatform = platformMap[platform] || platform;

      const { data, error } = await supabase.functions.invoke('social-diagnostics', {
        body: {
          action: 'test-credentials',
          platform: diagnosticPlatform,
          useStoredCredentials: true,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(data.message || 'Credentials hợp lệ!');
      } else {
        toast.error(data?.error || 'Test thất bại');
      }
    } catch (error: unknown) {
      console.error('Test connection error:', error);
      toast.error(await getTestErrorMessage(error, platform));
    } finally {
      setTestingPlatform(null);
    }
  };

  const getSettingsForPlatform = (platform: SocialPlatform) => {
    return settings?.find(s => s.platform === platform);
  };

  const handleSave = (data: any) => {
    saveSettings(data, {
      onSuccess: () => {
        setEditingPlatform(null);
      },
    });
  };

  const handleDelete = () => {
    if (!deletingPlatform) return;
    deleteSettings(deletingPlatform.platform, {
      onSuccess: () => {
        setDeletingPlatform(null);
      },
    });
  };

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Social Platform Settings</h1>
        <p className="text-muted-foreground">
          Cấu hình API credentials cho các nền tảng social. User chỉ cần nhập Access Token để kết nối.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((config) => {
          const platformSettings = getSettingsForPlatform(config.platform);
          const isConfigured = platformSettings?.has_credentials && platformSettings?.is_active;

          return (
            <Card key={config.platform} className={!config.available ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${config.color}`}>
                      <config.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{config.name}</CardTitle>
                      {!config.available && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Sắp có
                        </Badge>
                      )}
                    </div>
                  </div>
                  {config.available && (
                    <Badge variant={isConfigured ? 'default' : 'secondary'} className="gap-1">
                      {isConfigured ? (
                        <>
                          <Check className="w-3 h-3" />
                          Đã cấu hình
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" />
                          Chưa cấu hình
                        </>
                      )}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : config.available ? (
                  <div className="space-y-3">
                    {platformSettings && (
                      <div className="text-sm space-y-1 text-muted-foreground">
                        {platformSettings.app_name && (
                          <p>App: <span className="text-foreground">{platformSettings.app_name}</span></p>
                        )}
                        <p>
                          {config.platform === 'instagram'
                            ? 'Instagram App ID'
                            : ['facebook', 'threads', 'zalo_oa', 'google_business'].includes(config.platform)
                              ? 'App ID'
                              : config.platform === 'website'
                                ? 'API URL'
                                : 'Consumer Key'}: <span className="font-mono text-xs">{platformSettings.consumer_key || '—'}</span>
                        </p>
                        <p>
                          Trạng thái: {platformSettings.is_active ? (
                            <span className="text-green-600">Đang hoạt động</span>
                          ) : (
                            <span className="text-yellow-600">Tạm dừng</span>
                          )}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant={isConfigured ? 'outline' : 'default'}
                        size="sm"
                        className="flex-1"
                        onClick={() => setEditingPlatform(config)}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        {isConfigured ? 'Chỉnh sửa' : 'Cấu hình'}
                      </Button>
                      {isConfigured && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestConnection(config.platform)}
                            disabled={testingPlatform === config.platform}
                          >
                            {testingPlatform === config.platform ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Zap className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeletingPlatform(config)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Tính năng này đang được phát triển và sẽ sớm khả dụng.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cách hoạt động</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">1</span>
            <p>Admin cấu hình <strong>App ID / Client ID</strong> và <strong>App Secret / Client Secret</strong> của từng nền tảng tại đây.</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">2</span>
            <p><strong>Twitter:</strong> User chỉ cần nhập <strong>Access Token</strong> và <strong>Access Token Secret</strong> của tài khoản Twitter.</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">3</span>
            <p><strong>Facebook, Instagram, LinkedIn, Threads, Zalo OA, Google Business:</strong> User click <strong>Kết nối</strong> → đăng nhập OAuth trong cửa sổ mới → tự động xác thực.</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">4</span>
            <p><strong>Website:</strong> User nhập URL và credentials của WordPress / Custom API để kết nối trực tiếp.</p>
          </div>
        </CardContent>
      </Card>

      {editingPlatform && (
        <SocialPlatformCredentialsDialog
          open={!!editingPlatform}
          onOpenChange={(open) => !open && setEditingPlatform(null)}
          platform={editingPlatform.platform}
          platformName={editingPlatform.name}
          existingSettings={getSettingsForPlatform(editingPlatform.platform)}
          onSave={handleSave}
          isSaving={isSaving}
        />
      )}

      <AlertDialog open={!!deletingPlatform} onOpenChange={(open) => !open && setDeletingPlatform(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa cấu hình {deletingPlatform?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Sau khi xóa, user sẽ không thể kết nối {deletingPlatform?.name} chỉ với Access Token.
              Họ sẽ cần nhập đầy đủ cả 4 keys.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              Xóa cấu hình
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
