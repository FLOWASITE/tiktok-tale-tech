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
import { Loader2, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { SocialPlatform, PlatformSettings } from '@/hooks/useSocialPlatformSettings';

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

const PLATFORM_HELP = {
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
    instructions: 'Cấu hình thông qua Meta for Developers (Instagram Basic Display)',
  },
  linkedin: {
    url: 'https://www.linkedin.com/developers/apps',
    instructions: 'Tạo App tại LinkedIn Developers → Auth → Client ID & Secret',
  },
  tiktok: {
    url: 'https://developers.tiktok.com/',
    instructions: 'Tạo App tại TikTok for Developers → Manage apps',
  },
};

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

  const help = PLATFORM_HELP[platform];
  const isFacebook = platform === 'facebook';
  const keyLabel = isFacebook ? 'App ID' : 'Consumer Key (API Key)';
  const secretLabel = isFacebook ? 'App Secret' : 'Consumer Secret (API Secret)';

  useEffect(() => {
    if (open && existingSettings) {
      setAppName(existingSettings.app_name || '');
      setIsActive(existingSettings.is_active);
      // Clear credential fields - user must re-enter
      setConsumerKey('');
      setConsumerSecret('');
    } else if (open) {
      // Reset form for new entry
      setAppName('');
      setConsumerKey('');
      setConsumerSecret('');
      setIsActive(true);
    }
  }, [open, existingSettings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: any = {
      platform,
      app_name: appName || undefined,
      is_active: isActive,
    };

    // Only include credentials if provided
    if (consumerKey) data.consumer_key = consumerKey;
    if (consumerSecret) data.consumer_secret = consumerSecret;

    onSave(data);
  };

  const isValid = existingSettings?.has_credentials 
    ? true // Allow update without re-entering credentials
    : consumerKey && consumerSecret; // Require credentials for new setup

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cấu hình {platformName}</DialogTitle>
          <DialogDescription>
            Nhập API credentials để user có thể kết nối {platformName} chỉ với Access Token.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Help link */}
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

          {/* App Name */}
          <div className="space-y-2">
            <Label htmlFor="appName">Tên App (tuỳ chọn)</Label>
            <Input
              id="appName"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Flowa App"
            />
          </div>

          {/* Consumer Key / App ID */}
          <div className="space-y-2">
            <Label htmlFor="consumerKey">
              {keyLabel} {!existingSettings?.has_credentials && <span className="text-destructive">*</span>}
            </Label>
            <div className="relative">
              <Input
                id="consumerKey"
                type={showKey ? 'text' : 'password'}
                value={consumerKey}
                onChange={(e) => setConsumerKey(e.target.value)}
                placeholder={existingSettings?.has_credentials ? 'Giữ nguyên hoặc nhập mới' : `Nhập ${isFacebook ? 'App ID' : 'Consumer Key'}`}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            {existingSettings?.consumer_key && (
              <p className="text-xs text-muted-foreground">
                Hiện tại: {existingSettings.consumer_key}
              </p>
            )}
          </div>

          {/* Consumer Secret / App Secret */}
          <div className="space-y-2">
            <Label htmlFor="consumerSecret">
              {secretLabel} {!existingSettings?.has_credentials && <span className="text-destructive">*</span>}
            </Label>
            <div className="relative">
              <Input
                id="consumerSecret"
                type={showSecret ? 'text' : 'password'}
                value={consumerSecret}
                onChange={(e) => setConsumerSecret(e.target.value)}
                placeholder={existingSettings?.has_credentials ? 'Giữ nguyên hoặc nhập mới' : `Nhập ${isFacebook ? 'App Secret' : 'Consumer Secret'}`}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            {existingSettings?.consumer_secret && (
              <p className="text-xs text-muted-foreground">
                Hiện tại: {existingSettings.consumer_secret}
              </p>
            )}
          </div>

          {/* Active Toggle */}
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
