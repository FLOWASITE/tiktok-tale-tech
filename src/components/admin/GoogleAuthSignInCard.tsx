import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Check, X, Settings, Zap, Trash2, Loader2 } from 'lucide-react';
import { useSocialPlatformSettings } from '@/hooks/useSocialPlatformSettings';
import { SocialPlatformCredentialsDialog } from './SocialPlatformCredentialsDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export function GoogleAuthSignInCard() {
  const { settings, isLoading, saveSettings, deleteSettings, isSaving } = useSocialPlatformSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [testing, setTesting] = useState(false);

  const platformSettings = settings?.find((s) => s.platform === 'google_signin');
  const isConfigured = Boolean(platformSettings?.has_credentials);

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-diagnostics', {
        body: { action: 'test-credentials', platform: 'google_signin' },
      });
      if (error) throw error;
      if (data?.success) toast.success(data.message || 'Credentials hợp lệ!');
      else toast.error(data?.error || 'Test thất bại');
    } catch (e: any) {
      console.error('[GoogleAuthSignInCard] test error:', e);
      toast.error(e?.message || 'Không thể test credentials');
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <Card className="group relative overflow-hidden transition-all hover:shadow-md hover:border-foreground/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                <GoogleIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm font-semibold truncate">Google Sign-In</CardTitle>
                <CardDescription className="text-xs font-mono text-muted-foreground/70 truncate">
                  google_signin
                </CardDescription>
              </div>
            </div>
            <Badge variant={isConfigured ? 'default' : 'outline'} className="gap-1 shrink-0">
              {isConfigured ? <><Check className="w-3 h-3" /> Đã cấu hình</> : <><X className="w-3 h-3" /> Trống</>}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <>
              {isConfigured ? (
                <div className="text-xs space-y-1 text-muted-foreground rounded-md bg-muted/30 border border-border/40 p-2.5">
                  {platformSettings?.app_name && (
                    <div className="flex justify-between gap-2">
                      <span>App</span>
                      <span className="text-foreground font-medium truncate">{platformSettings.app_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span>Key</span>
                    <span className="font-mono text-[11px] text-foreground truncate">{platformSettings?.consumer_key || '••••'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Trạng thái</span>
                    <span className={platformSettings?.is_active ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-amber-600 dark:text-amber-400'}>
                      {platformSettings?.is_active ? 'Đang hoạt động' : 'Tạm dừng'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Cấu hình OAuth Client (Google Cloud Console) để dùng "Đăng nhập với Google" cho user. Sau khi lưu Client ID/Secret tại đây, dán cùng cặp đó vào Auth Providers → Google.
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  variant={isConfigured ? 'outline' : 'default'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setDialogOpen(true)}
                >
                  <Settings className="w-3.5 h-3.5 mr-1.5" />
                  {isConfigured ? 'Chỉnh sửa' : 'Cấu hình'}
                </Button>
                {isConfigured && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTest}
                      disabled={testing}
                      title="Test kết nối"
                    >
                      {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirmDelete(true)}
                      title="Xóa cấu hình"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SocialPlatformCredentialsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        platform="google_signin"
        platformName="Google Sign-In"
        existingSettings={platformSettings}
        isSaving={isSaving}
        onSave={(data) => {
          saveSettings(data, { onSuccess: () => setDialogOpen(false) });
        }}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa cấu hình Google Sign-In?</AlertDialogTitle>
            <AlertDialogDescription>
              Sẽ xóa Client ID/Secret đã lưu. Auth Providers → Google trên Lovable Cloud không bị ảnh hưởng — bạn cần xóa thủ công ở đó nếu muốn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteSettings('google_signin', { onSuccess: () => setConfirmDelete(false) });
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
