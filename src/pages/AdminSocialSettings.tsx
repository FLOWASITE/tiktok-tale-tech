import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSocialPlatformSettings, SocialPlatform } from '@/hooks/useSocialPlatformSettings';
import { SocialPlatformCredentialsDialog } from '@/components/admin/SocialPlatformCredentialsDialog';
import { Twitter, Facebook, Instagram, Linkedin, Music2, Settings, Check, X, Trash2 } from 'lucide-react';
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

interface PlatformConfig {
  platform: SocialPlatform;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  available: boolean;
}

const PLATFORMS: PlatformConfig[] = [
  { platform: 'twitter', name: 'Twitter / X', icon: Twitter, color: 'text-sky-500', available: true },
  { platform: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-600', available: false },
  { platform: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-500', available: false },
  { platform: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700', available: false },
  { platform: 'tiktok', name: 'TikTok', icon: Music2, color: 'text-foreground', available: false },
];

export default function AdminSocialSettings() {
  const { settings, isLoading, saveSettings, deleteSettings, isSaving, isDeleting } = useSocialPlatformSettings();
  const [editingPlatform, setEditingPlatform] = useState<PlatformConfig | null>(null);
  const [deletingPlatform, setDeletingPlatform] = useState<PlatformConfig | null>(null);

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
                          Consumer Key: <span className="font-mono text-xs">{platformSettings.consumer_key || '—'}</span>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingPlatform(config)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cách hoạt động</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">1</span>
            <p>Admin cấu hình <strong>Consumer Key</strong> và <strong>Consumer Secret</strong> của Twitter App tại đây.</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">2</span>
            <p>User vào <strong>Brand → Kết nối mạng xã hội</strong>, chỉ cần nhập <strong>Access Token</strong> và <strong>Access Token Secret</strong>.</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">3</span>
            <p>Hệ thống kết hợp credentials để đăng bài lên Twitter.</p>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
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

      {/* Delete Confirmation */}
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
