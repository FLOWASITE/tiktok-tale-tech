import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Copy, ExternalLink, KeyRound, LogIn, Check, Info, Settings, Zap } from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_PROJECT_REF = 'rllyipiyuptkibqinotz';
const AUTH_CALLBACK_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co/auth/v1/callback`;
const CLOUD_AUTH_DASHBOARD = `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/auth/providers`;
const GOOGLE_CONSOLE_URL = 'https://console.cloud.google.com/apis/credentials';

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
  const [copied, setCopied] = useState(false);

  const copyCallback = async () => {
    await navigator.clipboard.writeText(AUTH_CALLBACK_URL);
    setCopied(true);
    toast.success('Đã copy Authorized redirect URI');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
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
          <Badge variant="secondary" className="gap-1 shrink-0">
            <KeyRound className="w-3 h-3" />
            BYOK
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs space-y-1 text-muted-foreground rounded-md bg-muted/30 border border-border/40 p-2.5">
          <div className="flex justify-between gap-2">
            <span>Provider</span>
            <span className="text-foreground font-medium truncate">Google Cloud Console</span>
          </div>
          <div className="flex justify-between gap-2 items-center">
            <span>Redirect</span>
            <button
              onClick={copyCallback}
              className="font-mono text-[11px] text-foreground truncate hover:text-primary inline-flex items-center gap-1"
              title={AUTH_CALLBACK_URL}
            >
              <span className="truncate max-w-[160px]">…/auth/v1/callback</span>
              {copied ? <Check className="w-3 h-3 shrink-0" /> : <Copy className="w-3 h-3 shrink-0 opacity-60" />}
            </button>
          </div>
          <div className="flex justify-between gap-2">
            <span>Trạng thái</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">OAuth Client của Flowa</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <a href={CLOUD_AUTH_DASHBOARD} target="_blank" rel="noopener noreferrer">
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              Cấu hình
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" title="Test login">
            <a href="/auth" target="_blank" rel="noopener noreferrer">
              <Zap className="w-3.5 h-3.5" />
            </a>
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground" title="Hướng dẫn">
                <Info className="w-3.5 h-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 text-xs space-y-3">
              <div className="font-semibold text-sm flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                Khôi phục Client Secret
              </div>
              <p className="text-muted-foreground leading-relaxed">
                OAuth Client riêng của Flowa trên Google Cloud — không liên quan đến Lovable.
              </p>
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-foreground/80">Authorized redirect URI:</div>
                <div className="flex gap-1.5 items-center">
                  <code className="flex-1 text-[10px] font-mono bg-muted/60 border rounded px-2 py-1 truncate">
                    {AUTH_CALLBACK_URL}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyCallback} className="shrink-0 h-7 px-2">
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
              <ol className="text-muted-foreground space-y-1.5 leading-relaxed list-decimal pl-4">
                <li>Mở Google Cloud Console → Credentials, chọn OAuth Client (Web). Nếu Secret bị xóa → <em>Reset Secret</em>.</li>
                <li>Đảm bảo URL trên có trong <strong>Authorized redirect URIs</strong>.</li>
                <li>Copy <strong>Client ID</strong> + <strong>Client Secret</strong>.</li>
                <li>Dán vào <strong>Auth Providers → Google</strong>, bật toggle, Save.</li>
              </ol>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button asChild size="sm" variant="default" className="h-8">
                  <a href={CLOUD_AUTH_DASHBOARD} target="_blank" rel="noopener noreferrer">
                    Auth Providers
                    <ExternalLink className="w-3 h-3 ml-1 opacity-60" />
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" className="h-8">
                  <a href={GOOGLE_CONSOLE_URL} target="_blank" rel="noopener noreferrer">
                    Google Console
                    <ExternalLink className="w-3 h-3 ml-1 opacity-60" />
                  </a>
                </Button>
                <Button asChild size="sm" variant="ghost" className="col-span-2 h-8">
                  <a href="/auth" target="_blank" rel="noopener noreferrer">
                    <LogIn className="w-3.5 h-3.5 mr-1.5" />
                    Test Login Google
                  </a>
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>
  );
}
