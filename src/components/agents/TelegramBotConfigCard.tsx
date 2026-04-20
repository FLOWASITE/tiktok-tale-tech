import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTelegramBotConfig } from '@/hooks/useTelegramBotConfig';
import { Loader2, Link as LinkIcon, Trash2, ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{5,32}$/;
const TOKEN_REGEX = /^\d+:[A-Za-z0-9_-]{30,}$/;

export function TelegramBotConfigCard() {
  const { config, loading, upsertConfig, deleteConfig, registerWebhook } = useTelegramBotConfig();
  const [botUsername, setBotUsername] = useState('');
  const [botToken, setBotToken] = useState('');
  const [autonomy, setAutonomy] = useState<'human_in_loop' | 'human_on_loop' | 'full_auto'>('human_in_loop');
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync local autonomy state with persisted DB value
  useEffect(() => {
    if (config?.default_autonomy_level) {
      setAutonomy(config.default_autonomy_level);
    }
  }, [config?.default_autonomy_level]);

  const isFirstSetup = !config;

  // Robust webhook URL fallback: env var → project_id → empty
  const supabaseBase =
    (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_PROJECT_ID
      ? `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`
      : '');
  const webhookUrl = config && supabaseBase
    ? `${supabaseBase}/functions/v1/telegram-webhook/${config.webhook_secret}`
    : '';

  const handleSave = async () => {
    if (!botUsername || !botToken) return;

    // Validate before save
    if (!USERNAME_REGEX.test(botUsername)) {
      toast({
        title: 'Username không hợp lệ',
        description: 'Username Telegram bot phải dài 5-32 ký tự, chỉ chứa chữ, số, dấu _',
        variant: 'destructive',
      });
      return;
    }
    if (!TOKEN_REGEX.test(botToken)) {
      toast({
        title: 'Token không hợp lệ',
        description: 'Token bot phải có dạng "123456789:AA..." (lấy từ @BotFather)',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await upsertConfig({
        bot_username: botUsername,
        bot_token: botToken,
        default_autonomy_level: autonomy,
        is_active: true,
      });
      setBotToken('');
      // Always re-register webhook after save to ensure Telegram has the latest token
      try {
        await registerWebhook();
      } catch {
        // upsertConfig already toasted success; webhook fail logged silently
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRegister = async () => {
    setRegistering(true);
    try { await registerWebhook(); } finally { setRegistering(false); }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast({ title: 'Đã copy webhook URL' });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {config && (
        <div className="flex items-center gap-2">
          <Badge variant={config.is_active ? 'default' : 'secondary'}>
            {config.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <span className="text-sm text-muted-foreground">@{config.bot_username}</span>
        </div>
      )}

      {/* BotFather onboarding callout — show on first setup */}
      {isFirstSetup && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="font-medium text-sm">Chưa có bot? Tạo qua @BotFather</div>
            <Button size="sm" variant="outline" asChild>
              <a href="https://t.me/botfather" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Mở @BotFather
              </a>
            </Button>
          </div>
          <ol className="text-sm text-muted-foreground space-y-1 pl-5 list-decimal">
            <li>Chat <code className="text-primary text-xs">/newbot</code> trong @BotFather</li>
            <li>Đặt tên hiển thị + username (kết thúc bằng <code className="text-primary text-xs">_bot</code>)</li>
            <li>Copy token dạng <code className="text-primary text-xs">123456:ABC-DEF…</code> và dán bên dưới</li>
          </ol>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bot-username">Bot username</Label>
          <Input
            id="bot-username"
            placeholder={config?.bot_username ?? 'flowa_agent_bot'}
            value={botUsername}
            onChange={(e) => setBotUsername(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bot-token">
            Bot token{' '}
            {config && <span className="text-muted-foreground text-xs font-normal">(để trống nếu không đổi)</span>}
          </Label>
          <Input
            id="bot-token"
            type="password"
            placeholder="123456:ABC-DEF..."
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      {/* Autonomy + Webhook only after config exists */}
      {!isFirstSetup && (
        <>
          <div className="space-y-2">
            <Label>Autonomy mặc định cho goal tạo từ Telegram</Label>
            <Select value={autonomy} onValueChange={(v) => setAutonomy(v as typeof autonomy)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="human_in_loop">Human-in-the-loop (duyệt từng bước)</SelectItem>
                <SelectItem value="human_on_loop">Human-on-the-loop (chạy, review sau)</SelectItem>
                <SelectItem value="full_auto">Tự động hoàn toàn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Webhook URL (đã đăng ký với Telegram)</Label>
            <div className="flex gap-2">
              <Input readOnly value={webhookUrl} className="font-mono text-xs" />
              <Button size="icon" variant="outline" onClick={handleCopy} title="Copy" disabled={!webhookUrl}>
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button onClick={handleSave} disabled={saving || !botUsername || !botToken}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isFirstSetup ? 'Lưu & kích hoạt bot' : 'Cập nhật'}
        </Button>
        {config && (
          <Button variant="outline" onClick={handleRegister} disabled={registering}>
            {registering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
            Đăng ký lại webhook
          </Button>
        )}
        {config && (
          <Button variant="ghost" size="sm" onClick={deleteConfig} className="text-destructive hover:text-destructive ml-auto">
            <Trash2 className="w-4 h-4 mr-2" /> Xóa cấu hình
          </Button>
        )}
      </div>
    </div>
  );
}
