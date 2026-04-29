import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Eye, EyeOff, ExternalLink, Copy, Check, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SocialPlatform, PlatformSettings } from '@/hooks/useSocialPlatformSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SocialPlatformCredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: SocialPlatform;
  platformName: string;
  existingSettings?: PlatformSettings;
  onSave: (data: {
    platform: SocialPlatform;
    app_name?: string;
    consumer_key?: string;
    consumer_secret?: string;
    is_active?: boolean;
  }) => void;
  isSaving: boolean;
}

const PLATFORM_HELP: Record<SocialPlatform, { url: string; instructions: string }> = {
  twitter: {
    url: 'https://developer.twitter.com/en/portal/dashboard',
    instructions: 'Tạo App tại Twitter Developer Portal → Keys and Tokens → Consumer Keys',
  },
  facebook: {
    url: 'https://developers.facebook.com/apps/',
    instructions: 'Tạo App tại Meta for Developers → Settings → Basic',
  },
  instagram: {
    url: 'https://developers.facebook.com/apps/',
    instructions: 'Meta App Dashboard → App của bạn → Instagram → API setup with Instagram login → Business login settings → Instagram App ID & Instagram App Secret.',
  },
  threads: {
    url: 'https://developers.facebook.com/apps/',
    instructions: 'Tạo App tại Meta for Developers → Add Threads Product → Configure Threads API → App ID & Secret',
  },
  linkedin: {
    url: 'https://www.linkedin.com/developers/apps',
    instructions: 'Tạo App tại LinkedIn Developers → Auth → Client ID & Secret',
  },
  tiktok: {
    url: 'https://developers.tiktok.com/',
    instructions: 'Tạo App tại TikTok for Developers → Manage apps',
  },
  youtube: {
    url: 'https://console.cloud.google.com/apis/credentials',
    instructions: 'Tạo OAuth 2.0 Client tại Google Cloud Console → APIs & Services → YouTube Data API',
  },
  zalo_oa: {
    url: 'https://developers.zalo.me/apps',
    instructions: 'Tạo App tại Zalo Developers → Thông tin ứng dụng → App ID & Secret Key',
  },
  google_business: {
    url: 'https://console.cloud.google.com/apis/credentials',
    instructions: 'Tạo OAuth 2.0 Client tại Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs',
  },
  blogger: {
    url: 'https://console.cloud.google.com/apis/credentials',
    instructions: 'Tái dùng OAuth Client của Google Business hoặc tạo mới. Bật Blogger API v3 và thêm scope https://www.googleapis.com/auth/blogger',
  },
  wordpress: {
    url: '',
    instructions: 'WordPress self-hosted: kết nối per-brand bằng Application Password (không cần admin credential). Để trống ở đây.',
  },
  website: {
    url: '',
    instructions: 'Nhập URL API endpoint hoặc WordPress REST API URL và API Key/Password nếu cần xác thực',
  },
  pinterest: {
    url: 'https://developers.pinterest.com/apps/',
    instructions: 'Tạo App tại Pinterest Developer Portal → Apps → Tạo app mới (yêu cầu Business account). Lấy App ID và App Secret. Thêm scope: boards:read, pins:read, pins:write, user_accounts:read.',
  },
};

const CALLBACK_URL_MAP: Partial<Record<SocialPlatform, string>> = {
  twitter: 'x-oauth-callback',
  facebook: 'facebook-oauth-callback',
  instagram: 'instagram-oauth-callback',
  threads: 'threads-oauth-callback',
  linkedin: 'linkedin-oauth-callback',
  tiktok: 'tiktok-oauth-callback',
  zalo_oa: 'zalo-oauth-callback',
  google_business: 'google-business-oauth-callback',
  blogger: 'blogger-oauth-callback',
  pinterest: 'pinterest-oauth-callback',
};

function getCallbackUrl(platform: SocialPlatform): string | null {
  const path = CALLBACK_URL_MAP[platform];
  if (!path) return null;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/${path}`;
}

export function SocialPlatformCredentialsDialog({
  open,
  onOpenChange,
  platform,
  platformName,
  existingSettings,
  onSave,
  isSaving,
}: SocialPlatformCredentialsDialogProps) {
  const [appName, setAppName] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [revealingKey, setRevealingKey] = useState(false);
  const [revealingSecret, setRevealingSecret] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState(false);

  const help = PLATFORM_HELP[platform];
  const callbackUrl = getCallbackUrl(platform);
  const isMetaPlatform = platform === 'facebook' || platform === 'instagram' || platform === 'threads';
  const isInstagram = platform === 'instagram';
  const isLinkedIn = platform === 'linkedin';
  const isZalo = platform === 'zalo_oa';
  const isGoogle = platform === 'google_business';
  const isWebsite = platform === 'website';
  const isTikTok = platform === 'tiktok';

  const handleCopyCallback = async () => {
    if (!callbackUrl) return;
    try {
      await navigator.clipboard.writeText(callbackUrl);
      setCopiedCallback(true);
      setTimeout(() => setCopiedCallback(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const keyLabel = isWebsite
    ? 'API URL / WordPress URL'
    : isGoogle
      ? 'Google Client ID'
      : isZalo
        ? 'Zalo App ID'
        : isTikTok
          ? 'TikTok Client Key'
          : isLinkedIn
            ? 'LinkedIn Client ID'
            : isMetaPlatform
              ? (platform === 'instagram' ? 'Instagram App ID' : platform === 'threads' ? 'Threads App ID' : 'App ID')
              : 'Consumer Key (API Key)';

  const secretLabel = isWebsite
    ? 'API Key / Application Password'
    : isGoogle
      ? 'Google Client Secret'
      : isZalo
        ? 'Zalo Secret Key'
        : isTikTok
          ? 'TikTok Client Secret'
          : isLinkedIn
            ? 'LinkedIn Client Secret'
            : isMetaPlatform
              ? (platform === 'instagram' ? 'Instagram App Secret' : platform === 'threads' ? 'Threads App Secret' : 'App Secret')
              : 'Consumer Secret (API Secret)';

  useEffect(() => {
    if (open && existingSettings) {
      setAppName(existingSettings.app_name || '');
      setIsActive(existingSettings.is_active);
      setConsumerKey('');
      setConsumerSecret('');
    } else if (open) {
      setAppName('');
      setConsumerKey('');
      setConsumerSecret('');
      setIsActive(true);
    }
    // Reset reveal state mỗi lần đóng/mở
    setShowKey(false);
    setShowSecret(false);
    setRevealedKey(null);
    setRevealedSecret(null);
  }, [open, existingSettings]);

  const handleToggleReveal = async (field: 'consumer_key' | 'consumer_secret') => {
    const isKey = field === 'consumer_key';
    const typedValue = isKey ? consumerKey : consumerSecret;
    const currentlyShown = isKey ? showKey : showSecret;
    const cached = isKey ? revealedKey : revealedSecret;
    const setShown = isKey ? setShowKey : setShowSecret;
    const setRevealed = isKey ? setRevealedKey : setRevealedSecret;
    const setLoading = isKey ? setRevealingKey : setRevealingSecret;

    // Đang hiển thị -> ẩn đi
    if (currentlyShown) {
      setShown(false);
      return;
    }

    // User đã gõ giá trị mới -> chỉ toggle visibility input
    if (typedValue) {
      setShown(true);
      return;
    }

    // Chưa fetch và có credentials đã lưu -> gọi reveal endpoint
    if (!cached && existingSettings?.has_credentials) {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('reveal-platform-credential', {
          body: { platform, field },
        });
        if (error) throw error;
        if (!data?.value) throw new Error('Không có giá trị');
        setRevealed(data.value);
        setShown(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể hiện giá trị';
        toast.error(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Cached rồi -> chỉ show
    setShown(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: any = {
      platform,
      app_name: appName || undefined,
      is_active: isActive,
    };

    if (consumerKey) data.consumer_key = consumerKey;
    if (consumerSecret) data.consumer_secret = consumerSecret;

    onSave(data);
  };

  const isValid = existingSettings?.has_credentials
    ? true
    : consumerKey && consumerSecret;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cấu hình {platformName}</DialogTitle>
          <DialogDescription>
            {isInstagram
              ? 'Nhập Instagram App ID và Instagram App Secret từ mục "Business login settings" trong Meta App Dashboard.'
              : `Nhập API credentials để user có thể kết nối ${platformName} chỉ với Access Token.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {existingSettings?.has_credentials && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm flex items-start gap-2">
              <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Credentials đã được lưu</p>
                <p className="text-muted-foreground mt-0.5">
                  Thông tin xác thực hiện tại vẫn đang hoạt động. Chỉ nhập giá trị mới nếu bạn muốn thay đổi.
                </p>
              </div>
            </div>
          )}

          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="text-muted-foreground mb-2">{help.instructions}</p>
            <a
              href={help.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Mở Developer Portal
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {isInstagram && (
            <div className="rounded-lg border bg-muted/50 p-3 text-sm">
              <p className="font-medium text-foreground">⚠️ Lưu ý cho Instagram</p>
              <p className="text-muted-foreground">
                Dùng <strong>Instagram App ID</strong> và <strong>Instagram App Secret</strong> từ <strong>Instagram → API setup with Instagram login → Business login settings</strong>. KHÔNG dùng Facebook App ID/Secret ở Settings → Basic.
              </p>
            </div>
          )}

          {callbackUrl && (
            <div className="space-y-2">
              <Label>OAuth Callback URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={callbackUrl}
                  className="text-xs font-mono bg-muted/50"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={handleCopyCallback}
                >
                  {copiedCallback ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Dán URL này vào <strong>Valid OAuth Redirect URIs</strong> trên Developer Console
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="appName">Tên App (tuỳ chọn)</Label>
            <Input
              id="appName"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Flowa App"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="consumerKey">
                {keyLabel} {!existingSettings?.has_credentials && <span className="text-destructive">*</span>}
              </Label>
              {existingSettings?.consumer_key && (
                <Badge variant="secondary" className="text-xs font-mono">
                  {existingSettings.consumer_key}
                </Badge>
              )}
            </div>
            <div className="relative">
              <Input
                id="consumerKey"
                type={showKey ? 'text' : 'password'}
                value={showKey && !consumerKey && revealedKey ? revealedKey : consumerKey}
                readOnly={showKey && !consumerKey && !!revealedKey}
                onChange={(e) => setConsumerKey(e.target.value)}
                placeholder={existingSettings?.has_credentials
                  ? `${existingSettings.consumer_key || '••••'} — nhập mới để thay đổi`
                  : isInstagram ? 'Nhập Instagram App ID' : `Nhập ${isMetaPlatform ? 'App ID' : 'Consumer Key'}`}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => handleToggleReveal('consumer_key')}
                disabled={revealingKey}
                aria-label={showKey ? 'Ẩn' : 'Hiện'}
              >
                {revealingKey
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : showKey
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="consumerSecret">
                {secretLabel} {!existingSettings?.has_credentials && <span className="text-destructive">*</span>}
              </Label>
              {existingSettings?.consumer_secret && (
                <Badge variant="secondary" className="text-xs font-mono">
                  {existingSettings.consumer_secret}
                </Badge>
              )}
            </div>
            <div className="relative">
              <Input
                id="consumerSecret"
                type={showSecret ? 'text' : 'password'}
                value={showSecret && !consumerSecret && revealedSecret ? revealedSecret : consumerSecret}
                readOnly={showSecret && !consumerSecret && !!revealedSecret}
                onChange={(e) => setConsumerSecret(e.target.value)}
                placeholder={existingSettings?.has_credentials
                  ? `${existingSettings.consumer_secret || '••••'} — nhập mới để thay đổi`
                  : isInstagram ? 'Nhập Instagram App Secret' : `Nhập ${isMetaPlatform ? 'App Secret' : 'Consumer Secret'}`}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => handleToggleReveal('consumer_secret')}
                disabled={revealingSecret}
                aria-label={showSecret ? 'Ẩn' : 'Hiện'}
              >
                {revealingSecret
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : showSecret
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Kích hoạt</Label>
              <p className="text-xs text-muted-foreground">
                User có thể kết nối khi bật
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Huỷ
            </Button>
            <Button type="submit" disabled={!isValid || isSaving}>
              {isSaving && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              Lưu cài đặt
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
