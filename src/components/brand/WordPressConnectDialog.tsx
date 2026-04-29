import { useState, useMemo } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { ChannelIcon } from '@/components/ui/channel-icon';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url) return url;
  url = url.replace(/\/(wp-admin|wp-login\.php).*$/i, '');
  url = url.replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

interface WordPressConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandTemplateId: string;
  onConnected: () => void;
}

type TestResult =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'ok'; siteTitle?: string; userName?: string; normalizedUrl: string }
  | { status: 'error'; message: string; code?: string };

export function WordPressConnectDialog({
  open,
  onOpenChange,
  brandTemplateId,
  onConnected,
}: WordPressConnectDialogProps) {
  const [siteUrl, setSiteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>({ status: 'idle' });
  const [isSaving, setIsSaving] = useState(false);

  const normalized = useMemo(() => normalizeUrl(siteUrl), [siteUrl]);
  const isWordPressCom = useMemo(() => {
    try {
      if (!normalized) return false;
      const host = new URL(normalized).hostname.toLowerCase();
      return host === 'wordpress.com' || host.endsWith('.wordpress.com');
    } catch {
      return false;
    }
  }, [normalized]);
  const adminUrl = normalized ? `${normalized}/wp-admin/profile.php#application-passwords` : '';
  const canTest = !!(normalized && username.trim() && appPassword.trim());
  const canSave = testResult.status === 'ok';

  const reset = () => {
    setSiteUrl('');
    setUsername('');
    setAppPassword('');
    setShowPassword(false);
    setTestResult({ status: 'idle' });
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleTest = async () => {
    setTestResult({ status: 'testing' });
    try {
      const { data, error } = await supabase.functions.invoke('test-wordpress-credentials', {
        body: {
          siteUrl: normalized,
          username: username.trim(),
          applicationPassword: appPassword.replace(/\s+/g, ''),
        },
      });
      if (error) throw new Error(error.message);

      if (data?.success) {
        setTestResult({
          status: 'ok',
          siteTitle: data.siteTitle,
          userName: data.user?.name,
          normalizedUrl: data.normalizedUrl || normalized,
        });
      } else {
        setTestResult({
          status: 'error',
          message: data?.error || 'Kiểm tra thất bại',
          code: data?.code,
        });
      }
    } catch (err) {
      setTestResult({
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('connect-website', {
        body: {
          brandTemplateId,
          websiteUrl: normalized,
          integrationType: 'wordpress',
          wordpressConfig: {
            username: username.trim(),
            applicationPassword: appPassword.replace(/\s+/g, ''),
          },
        },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Lưu kết nối thất bại');
      }
      const siteName =
        testResult.status === 'ok' ? testResult.siteTitle || normalized : normalized;
      toast.success(`Đã kết nối WordPress: ${siteName}`);
      onConnected();
      handleClose(false);
    } catch (err) {
      toast.error('Lỗi lưu: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  // When user changes any field after a successful test, reset test status
  const onAnyFieldChange = () => {
    if (testResult.status === 'ok' || testResult.status === 'error') {
      setTestResult({ status: 'idle' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#21759b]/10 flex items-center justify-center">
              <ChannelIcon channel="wordpress" size={18} />
            </div>
            Kết nối WordPress
          </DialogTitle>
          <DialogDescription>
            Đăng bài tự động lên WordPress self-hosted của bạn.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-muted bg-muted/40">
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Flowa <strong>không</strong> cần mật khẩu admin của bạn. Application Password
            là mã riêng có thể thu hồi bất kỳ lúc nào trong WordPress.
          </AlertDescription>
        </Alert>

        <div className="space-y-5 py-2">
          {/* Step 1: URL */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <span className="inline-flex w-5 h-5 rounded-full bg-foreground text-background text-xs items-center justify-center font-semibold">
                1
              </span>
              Địa chỉ website WordPress
            </Label>
            <Input
              type="url"
              placeholder="https://yourblog.com"
              value={siteUrl}
              onChange={(e) => {
                setSiteUrl(e.target.value);
                onAnyFieldChange();
              }}
              onBlur={() => {
                if (siteUrl) setSiteUrl(normalizeUrl(siteUrl));
              }}
            />
            {siteUrl && normalized !== siteUrl.trim() && (
              <p className="text-xs text-muted-foreground">
                Đã chuẩn hoá thành: <code className="text-foreground">{normalized}</code>
              </p>
            )}
          </div>

          {/* WordPress.com warning */}
          {isWordPressCom && (
            <Alert className="border-amber-500/40 bg-amber-500/5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs space-y-2">
                <p>
                  <strong>Bạn đang dùng WordPress.com (hosted).</strong> Application
                  Passwords <strong>chỉ có ở plan Business</strong> ($25/tháng) trở lên,
                  hoặc WordPress self-hosted.
                </p>
                <p className="font-medium text-foreground">3 lựa chọn:</p>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>
                    Nâng cấp WordPress.com lên{' '}
                    <a
                      href="https://wordpress.com/pricing/"
                      target="_blank"
                      rel="noopener"
                      className="underline font-medium"
                    >
                      Business plan
                    </a>{' '}
                    để bật Application Passwords
                  </li>
                  <li>
                    Kết nối qua <strong>OAuth WordPress.com</strong> (đang phát triển — sắp ra mắt)
                  </li>
                  <li>
                    Dùng WordPress self-hosted (cài WordPress trên hosting riêng như
                    Hostinger, Bluehost, A2 Hosting…)
                  </li>
                </ol>
              </AlertDescription>
            </Alert>
          )}


          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <span className="inline-flex w-5 h-5 rounded-full bg-foreground text-background text-xs items-center justify-center font-semibold">
                2
              </span>
              Tạo Application Password (1 lần duy nhất)
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-between"
              disabled={!normalized}
              onClick={() => window.open(adminUrl, '_blank', 'noopener')}
            >
              <span>Mở trang tạo password trong WordPress</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
            <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1 pl-1">
              <li>Đăng nhập admin WordPress của bạn (nếu chưa)</li>
              <li>
                Cuộn xuống mục <strong>Application Passwords</strong>
              </li>
              <li>
                Đặt tên là <strong>Flowa</strong> → bấm <strong>Add New</strong>
              </li>
              <li>Copy chuỗi mã 24 ký tự WordPress hiển thị</li>
            </ol>
          </div>

          {/* Step 3: Paste credentials */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <span className="inline-flex w-5 h-5 rounded-full bg-foreground text-background text-xs items-center justify-center font-semibold">
                3
              </span>
              Dán thông tin đăng nhập
            </Label>

            <div className="space-y-2">
              <Label htmlFor="wp-username" className="text-xs font-normal text-muted-foreground">
                Username WordPress
              </Label>
              <Input
                id="wp-username"
                placeholder="admin"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  onAnyFieldChange();
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wp-apppass" className="text-xs font-normal text-muted-foreground">
                Application Password
              </Label>
              <div className="relative">
                <Input
                  id="wp-apppass"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Dán chuỗi 24 ký tự"
                  value={appPassword}
                  onChange={(e) => {
                    setAppPassword(e.target.value);
                    onAnyFieldChange();
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (/\s/.test(pasted)) {
                      e.preventDefault();
                      setAppPassword(pasted.replace(/\s+/g, ''));
                      onAnyFieldChange();
                    }
                  }}
                  className="pr-10 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3" />
                Khoảng trắng sẽ được tự động loại bỏ khi dán.
              </p>
            </div>
          </div>

          {/* Test result */}
          {testResult.status === 'ok' && (
            <Alert className="border-emerald-500/30 bg-emerald-500/5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-sm">
                <strong>Đã xác minh.</strong>{' '}
                {testResult.siteTitle && (
                  <>
                    Site: <Badge variant="secondary">{testResult.siteTitle}</Badge>{' '}
                  </>
                )}
                {testResult.userName && (
                  <>
                    · Đăng nhập với <strong>{testResult.userName}</strong>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {testResult.status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{testResult.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={!canTest || testResult.status === 'testing'}
            className="sm:mr-auto"
          >
            {testResult.status === 'testing' && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Kiểm tra kết nối
          </Button>
          <Button variant="ghost" onClick={() => handleClose(false)}>
            Huỷ
          </Button>
          <Button onClick={handleSave} disabled={!canSave || isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Lưu kết nối
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
