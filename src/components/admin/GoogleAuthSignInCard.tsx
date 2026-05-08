import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, KeyRound, AlertTriangle, LogIn, Check } from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_PROJECT_REF = 'rllyipiyuptkibqinotz';
const AUTH_CALLBACK_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co/auth/v1/callback`;
const CLOUD_AUTH_DASHBOARD = `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/auth/providers`;
const GOOGLE_CONSOLE_URL = 'https://console.cloud.google.com/apis/credentials';

export function GoogleAuthSignInCard() {
  const [copied, setCopied] = useState(false);

  const copyCallback = async () => {
    await navigator.clipboard.writeText(AUTH_CALLBACK_URL);
    setCopied(true);
    toast.success('Đã copy Authorized redirect URI');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                Google Sign-In <Badge variant="outline" className="font-normal text-[10px]">App Login</Badge>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground/70 truncate">
                OAuth Client riêng của Flowa — quản lý ở Google Cloud Console
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1 shrink-0">
            <KeyRound className="w-3 h-3" />
            BYOK
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md bg-amber-100/50 dark:bg-amber-950/30 border border-amber-500/30 p-3 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            Login Google bị lỗi? (Client Secret bị xóa / hết hạn)
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Đây là <strong>OAuth Client riêng</strong> của Flowa trên Google Cloud Console — không liên quan đến Lovable. Nếu Client Secret bị xóa hoặc đổi, làm 4 bước dưới để khôi phục.
          </p>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-foreground/80">Authorized redirect URI (dán vào Google Console):</div>
          <div className="flex gap-2 items-center">
            <code className="flex-1 text-[11px] font-mono bg-muted/60 border rounded px-2 py-1.5 truncate">
              {AUTH_CALLBACK_URL}
            </code>
            <Button size="sm" variant="outline" onClick={copyCallback} className="shrink-0">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        <ol className="text-xs text-muted-foreground space-y-1.5 leading-relaxed list-decimal pl-4">
          <li>Mở <strong>Google Cloud Console → APIs & Services → Credentials</strong>, chọn OAuth Client của Flowa (Web application). Nếu Secret đã xóa → bấm <em>Reset Secret</em> hoặc tạo Client mới.</li>
          <li>Vào tab <strong>Authorized redirect URIs</strong>, đảm bảo có URL ở trên. Nếu thiếu thì dán vào & Save.</li>
          <li>Copy <strong>Client ID</strong> + <strong>Client Secret</strong> mới.</li>
          <li>Mở <strong>Auth Providers → Google</strong>, dán Client ID/Secret, bật toggle, Save.</li>
        </ol>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button asChild size="sm" variant="default">
            <a href={CLOUD_AUTH_DASHBOARD} target="_blank" rel="noopener noreferrer">
              <KeyRound className="w-3.5 h-3.5 mr-1.5" />
              Auth Providers
              <ExternalLink className="w-3 h-3 ml-1.5 opacity-60" />
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={GOOGLE_CONSOLE_URL} target="_blank" rel="noopener noreferrer">
              Google Console
              <ExternalLink className="w-3 h-3 ml-1.5 opacity-60" />
            </a>
          </Button>
          <Button asChild size="sm" variant="ghost" className="col-span-2">
            <a href="/auth" target="_blank" rel="noopener noreferrer">
              <LogIn className="w-3.5 h-3.5 mr-1.5" />
              Test Login Google (mở tab mới)
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
