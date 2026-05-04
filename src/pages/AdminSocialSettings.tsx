import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useSocialPlatformSettings, SocialPlatform } from '@/hooks/useSocialPlatformSettings';
import { SocialPlatformCredentialsDialog } from '@/components/admin/SocialPlatformCredentialsDialog';
import { Settings, Check, X, Trash2, Zap, Loader2, Search, ShieldCheck, KeyRound } from 'lucide-react';
import {
  XIcon,
  FacebookIcon,
  InstagramIcon,
  ThreadsIcon,
  LinkedInIcon,
  TikTokIcon,
  YouTubeIcon,
  ZaloIcon,
  GoogleBusinessIcon,
  BloggerIcon,
  WordPressIcon,
  PinterestIcon,
  BlueskyIcon,
  ShopifyIcon,
} from '@/components/icons/SocialIcons';
import { Globe } from 'lucide-react';
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

type AuthMode = 'credentials' | 'oauth_only' | 'per_brand';

interface PlatformConfig {
  platform: SocialPlatform;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  category: 'social' | 'longform' | 'messaging';
  authMode: AuthMode;
  authNote?: string;
}

const PLATFORMS: PlatformConfig[] = [
  // Social
  { platform: 'facebook', name: 'Facebook', icon: FacebookIcon, iconColor: 'text-[#1877F2]', category: 'social', authMode: 'credentials' },
  { platform: 'instagram', name: 'Instagram', icon: InstagramIcon, iconColor: 'text-[#E4405F]', category: 'social', authMode: 'credentials' },
  { platform: 'threads', name: 'Threads', icon: ThreadsIcon, iconColor: 'text-foreground', category: 'social', authMode: 'credentials' },
  { platform: 'twitter', name: 'X (Twitter)', icon: XIcon, iconColor: 'text-foreground', category: 'social', authMode: 'credentials' },
  { platform: 'linkedin', name: 'LinkedIn', icon: LinkedInIcon, iconColor: 'text-[#0A66C2]', category: 'social', authMode: 'credentials' },
  { platform: 'tiktok', name: 'TikTok', icon: TikTokIcon, iconColor: 'text-foreground', category: 'social', authMode: 'credentials' },
  { platform: 'youtube', name: 'YouTube', icon: YouTubeIcon, iconColor: 'text-[#FF0000]', category: 'social', authMode: 'credentials' },
  { platform: 'pinterest', name: 'Pinterest', icon: PinterestIcon, iconColor: 'text-[#E60023]', category: 'social', authMode: 'credentials' },
  { platform: 'bluesky', name: 'Bluesky', icon: BlueskyIcon, iconColor: 'text-[#0085ff]', category: 'social', authMode: 'oauth_only', authNote: 'Confidential Client OAuth đã cấu hình sẵn ở app.flowa.one — không cần nhập credential.' },

  // Messaging
  { platform: 'zalo_oa', name: 'Zalo OA', icon: ZaloIcon, iconColor: 'text-[#0068FF]', category: 'messaging', authMode: 'credentials' },
  { platform: 'google_business', name: 'Google Business Profile', icon: GoogleBusinessIcon, iconColor: 'text-[#4285F4]', category: 'messaging', authMode: 'credentials' },

  // Long-form
  { platform: 'blogger', name: 'Blogger', icon: BloggerIcon, iconColor: 'text-[#F57C00]', category: 'longform', authMode: 'credentials', authNote: 'Dùng chung Google OAuth Client với Google Business — bật Blogger API v3.' },
  { platform: 'wordpress_com', name: 'WordPress.com', icon: WordPressIcon, iconColor: 'text-[#21759b]', category: 'longform', authMode: 'credentials' },
  { platform: 'wordpress', name: 'WordPress (self-hosted)', icon: WordPressIcon, iconColor: 'text-[#21759b]', category: 'longform', authMode: 'per_brand', authNote: 'Mỗi brand kết nối bằng Application Password riêng — không cấu hình toàn cục.' },
  { platform: 'shopify', name: 'Shopify', icon: ShopifyIcon, iconColor: 'text-[#96bf48]', category: 'longform', authMode: 'credentials', authNote: 'Tạo Public App tại Shopify Partners. Lưu Client ID/Secret tại đây để user kết nối shop qua OAuth.' },
  { platform: 'wix', name: 'Wix', icon: Globe, iconColor: 'text-[#0C6EFC]', category: 'longform', authMode: 'credentials', authNote: 'Tạo App tại dev.wix.com/apps. Redirect URL: https://rllyipiyuptkibqinotz.supabase.co/functions/v1/wix-oauth-callback. Lưu App ID (Client ID) + App Secret tại đây để user kết nối site qua OAuth.' },
  { platform: 'website', name: 'Website / Custom API', icon: Globe, iconColor: 'text-muted-foreground', category: 'longform', authMode: 'credentials' },
];

const CATEGORY_LABELS: Record<PlatformConfig['category'], string> = {
  social: 'Mạng xã hội',
  messaging: 'Messaging & Local',
  longform: 'Website & Long-form',
};

const AUTH_BADGE: Record<AuthMode, { label: string; variant: 'default' | 'secondary' | 'outline'; icon: React.ComponentType<{ className?: string }> }> = {
  credentials: { label: 'BYOK Credentials', variant: 'outline', icon: KeyRound },
  oauth_only: { label: 'OAuth Managed', variant: 'secondary', icon: ShieldCheck },
  per_brand: { label: 'Per-brand', variant: 'secondary', icon: ShieldCheck },
};

export default function AdminSocialSettings() {
  const { settings, isLoading, saveSettings, deleteSettings, isSaving, isDeleting } = useSocialPlatformSettings();
  const [editingPlatform, setEditingPlatform] = useState<PlatformConfig | null>(null);
  const [deletingPlatform, setDeletingPlatform] = useState<PlatformConfig | null>(null);
  const [testingPlatform, setTestingPlatform] = useState<SocialPlatform | null>(null);
  const [search, setSearch] = useState('');

  const getSettingsForPlatform = (platform: SocialPlatform) => {
    return settings?.find(s => s.platform === platform);
  };

  const stats = useMemo(() => {
    const configurable = PLATFORMS.filter(p => p.authMode === 'credentials');
    const configured = configurable.filter(p => {
      const s = getSettingsForPlatform(p.platform);
      return s?.has_credentials && s?.is_active;
    }).length;
    return { configured, total: configurable.length };
  }, [settings]);

  const filteredByCategory = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = PLATFORMS.filter(p =>
      !q || p.name.toLowerCase().includes(q) || p.platform.toLowerCase().includes(q)
    );
    return {
      social: matches.filter(p => p.category === 'social'),
      messaging: matches.filter(p => p.category === 'messaging'),
      longform: matches.filter(p => p.category === 'longform'),
    };
  }, [search]);

  const getTestErrorMessage = async (error: unknown, platform: SocialPlatform): Promise<string> => {
    const maybeError = error as { message?: string; context?: Response } | null;
    if (maybeError?.context instanceof Response) {
      try {
        const payload = await maybeError.context.clone().json();
        const errorText = typeof payload?.error === 'string' ? payload.error : '';
        const hintText = typeof payload?.hint === 'string' ? payload.hint : '';
        const combined = [errorText, hintText].filter(Boolean).join(' — ');
        if (combined) return combined;
      } catch {/* ignore */}
    }
    if (platform === 'instagram') {
      return 'Hãy dùng Instagram App ID/App Secret từ Meta App Dashboard → Instagram → API setup with Instagram login → Business login settings.';
    }
    return maybeError?.message || 'Không thể test credentials';
  };

  const handleTestConnection = async (platform: SocialPlatform) => {
    const platformSettings = getSettingsForPlatform(platform);
    const isShopify = platform === 'shopify';
    if (!isShopify && !platformSettings?.has_credentials) {
      toast.error('Chưa có credentials để test');
      return;
    }

    setTestingPlatform(platform);
    try {
      if (isShopify) {
        const { data, error } = await supabase.functions.invoke('test-shopify-credentials', { body: {} });
        if (error) throw error;
        if (data?.success) {
          toast.success(data.message || 'Shopify secrets hợp lệ!');
        } else {
          toast.error(data?.error || 'Test thất bại');
        }
        return;
      }

      const platformMap: Record<string, string> = {
        twitter: 'twitter', facebook: 'facebook', instagram: 'instagram',
        threads: 'threads', linkedin: 'linkedin', zalo_oa: 'zalo',
        google_business: 'google-business', website: 'website', pinterest: 'pinterest',
      };
      const diagnosticPlatform = platformMap[platform] || platform;
      const { data, error } = await supabase.functions.invoke('social-diagnostics', {
        body: { action: 'test-credentials', platform: diagnosticPlatform, useStoredCredentials: true },
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

  const handleSave = (data: any) => {
    saveSettings(data, { onSuccess: () => setEditingPlatform(null) });
  };

  const handleDelete = () => {
    if (!deletingPlatform) return;
    deleteSettings(deletingPlatform.platform, { onSuccess: () => setDeletingPlatform(null) });
  };

  const renderPlatformCard = (config: PlatformConfig) => {
    const platformSettings = getSettingsForPlatform(config.platform);
    const isConfigured = Boolean(platformSettings?.has_credentials);
    const isShopify = config.platform === 'shopify';
    const isOAuthOnly = config.authMode === 'oauth_only';
    const isPerBrand = config.authMode === 'per_brand';
    const canEdit = config.authMode === 'credentials' || isShopify;
    const authMeta = AUTH_BADGE[canEdit ? 'credentials' : config.authMode];
    const AuthIcon = authMeta.icon;

    return (
      <Card key={config.platform} className="group relative overflow-hidden transition-all hover:shadow-md hover:border-foreground/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2.5 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 ${config.iconColor}`}>
                <config.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm font-semibold truncate">{config.name}</CardTitle>
                <CardDescription className="text-xs font-mono text-muted-foreground/70 truncate">
                  {config.platform}
                </CardDescription>
              </div>
            </div>
            {canEdit ? (
              <Badge variant={isConfigured ? 'default' : 'outline'} className="gap-1 shrink-0">
                {isConfigured ? <><Check className="w-3 h-3" /> Đã cấu hình</> : <><X className="w-3 h-3" /> Trống</>}
              </Badge>
            ) : (
              <Badge variant={authMeta.variant} className="gap-1 shrink-0">
                <AuthIcon className="w-3 h-3" />
                {authMeta.label}
              </Badge>
            )}
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
              {(isOAuthOnly || isPerBrand) && config.authNote && (
                <p className="text-xs text-muted-foreground rounded-md bg-muted/40 border border-border/50 p-2.5 leading-relaxed">
                  {config.authNote}
                </p>
              )}

              {canEdit && platformSettings?.has_credentials && (
                <div className="text-xs space-y-1 text-muted-foreground rounded-md bg-muted/30 border border-border/40 p-2.5">
                  {platformSettings.app_name && (
                    <div className="flex justify-between gap-2">
                      <span>App</span>
                      <span className="text-foreground font-medium truncate">{platformSettings.app_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span>Key</span>
                    <span className="font-mono text-[11px] text-foreground truncate">{platformSettings.consumer_key || '••••'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Trạng thái</span>
                    <span className={platformSettings.is_active ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-amber-600 dark:text-amber-400'}>
                      {platformSettings.is_active ? 'Đang hoạt động' : 'Tạm dừng'}
                    </span>
                  </div>
                </div>
              )}

              {canEdit && !platformSettings?.has_credentials && config.authNote && (
                <p className="text-xs text-muted-foreground leading-relaxed">{config.authNote}</p>
              )}

              <div className="flex gap-2">
                {canEdit ? (
                  <>
                    <Button
                      variant={isConfigured ? 'outline' : 'default'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingPlatform(config)}
                    >
                      <Settings className="w-3.5 h-3.5 mr-1.5" />
                      {isConfigured ? 'Chỉnh sửa' : 'Cấu hình'}
                    </Button>
                    {isConfigured && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(config.platform)}
                          disabled={testingPlatform === config.platform}
                          title="Test kết nối"
                        >
                          {testingPlatform === config.platform ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Zap className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeletingPlatform(config)}
                          title="Xóa cấu hình"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  <Button variant="outline" size="sm" className="flex-1" disabled>
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                    {isOAuthOnly ? 'Quản lý qua OAuth' : 'Cấu hình ở trang Brand'}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderSection = (key: PlatformConfig['category']) => {
    const list = filteredByCategory[key];
    if (!list.length) return null;
    return (
      <section key={key} className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-foreground/80 tracking-wide uppercase">
            {CATEGORY_LABELS[key]}
          </h2>
          <span className="text-xs text-muted-foreground">{list.length} nền tảng</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(renderPlatformCard)}
        </div>
      </section>
    );
  };

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Social Platform Settings</h1>
          <p className="text-sm text-muted-foreground">
            Cấu hình API credentials toàn cục. User chỉ cần đăng nhập OAuth là kết nối được tài khoản của họ.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="rounded-lg border bg-card px-4 py-2 text-center">
            <div className="text-xs text-muted-foreground">Đã cấu hình</div>
            <div className="text-lg font-semibold">
              <span className="text-foreground">{stats.configured}</span>
              <span className="text-muted-foreground/60"> / {stats.total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Tìm nền tảng…"
          value={search}
          onChange={(e) => setSearch(e.target.value.slice(0, 40))}
          className="pl-9"
        />
      </div>

      {/* Sections */}
      {(['social', 'messaging', 'longform'] as const).map(renderSection)}

      {filteredByCategory.social.length === 0 && filteredByCategory.messaging.length === 0 && filteredByCategory.longform.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg">
          Không tìm thấy nền tảng phù hợp với "{search}"
        </div>
      )}

      {/* How it works */}
      <Card className="bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base">Cách hoạt động</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          {[
            { num: '1', text: <>Admin nhập <strong>Client ID / Secret</strong> của từng nền tảng — credential mã hoá AES-256-GCM trước khi lưu.</> },
            { num: '2', text: <><strong>X (Twitter):</strong> User nhập Access Token + Secret riêng. Các nền tảng còn lại dùng OAuth tự động.</> },
            { num: '3', text: <><strong>Bluesky:</strong> Cấu hình sẵn ở Edge Function Secrets, không cần admin chỉnh ở đây. <strong>Shopify:</strong> nhập Client ID / Secret giống Blogger.</> },
            { num: '4', text: <><strong>WordPress self-hosted:</strong> Mỗi brand tự kết nối bằng Application Password.</> },
          ].map((item) => (
            <div key={item.num} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                {item.num}
              </span>
              <p className="leading-relaxed">{item.text}</p>
            </div>
          ))}
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
              Sau khi xóa, user sẽ không thể kết nối {deletingPlatform?.name} qua OAuth managed.
              Credentials sẽ cần được cấu hình lại từ đầu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Xóa cấu hình
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
