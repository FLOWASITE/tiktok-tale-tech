import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useTelegramBotConfig } from '@/hooks/useTelegramBotConfig';
import { Loader2, Link as LinkIcon, Trash2, ExternalLink, Copy, Check, CheckCircle2, Activity, AlertTriangle, ListChecks } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface WebhookInfo {
  url: string;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
}

const USERNAME_REGEX = /^[a-zA-Z0-9_]{5,32}$/;
const TOKEN_REGEX = /^\d+:[A-Za-z0-9_-]{30,}$/;

export function TelegramBotConfigCard() {
  const { config, loading, upsertConfig, deleteConfig, registerWebhook, getWebhookInfo, syncCommands } = useTelegramBotConfig();
  const [botUsername, setBotUsername] = useState('');
  const [botToken, setBotToken] = useState('');
  const [autonomy, setAutonomy] = useState<'human_in_loop' | 'human_on_loop' | 'full_auto'>('human_in_loop');
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [checkingInfo, setCheckingInfo] = useState(false);
  const [syncingCmds, setSyncingCmds] = useState(false);

  const handleSyncCommands = async () => {
    setSyncingCmds(true);
    try { await syncCommands(); } finally { setSyncingCmds(false); }
  };

  const handleCheckWebhook = async () => {
    setCheckingInfo(true);
    try {
      const info = await getWebhookInfo();
      setWebhookInfo(info);
      if (info) {
        if (info.last_error_message) {
          toast({
            title: 'Webhook có lỗi gần đây',
            description: info.last_error_message,
            variant: 'destructive',
          });
        } else if (info.pending_update_count > 0) {
          toast({
            title: `Có ${info.pending_update_count} update đang kẹt`,
            description: 'Bấm "Đăng ký lại webhook" để clear backlog.',
          });
        } else {
          toast({ title: 'Webhook hoạt động bình thường' });
        }
      }
    } finally {
      setCheckingInfo(false);
    }
  };

  useEffect(() => {
    if (config?.default_autonomy_level) {
      setAutonomy(config.default_autonomy_level);
    }
  }, [config?.default_autonomy_level]);

  const isFirstSetup = !config;

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
      setShowEdit(false);
      try {
        await registerWebhook();
      } catch {
        // upsertConfig already toasted success
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAutonomy = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await upsertConfig({
        bot_username: config.bot_username,
        default_autonomy_level: autonomy,
        is_active: true,
      });
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

  // ============ FIRST SETUP — minimal ============
  if (isFirstSetup) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center justify-between gap-2 flex-wrap text-sm">
          <span className="text-muted-foreground">
            Chưa có bot? Chat <code className="text-primary text-xs">/newbot</code> trong @BotFather để lấy token.
          </span>
          <Button size="sm" variant="outline" asChild>
            <a href="https://t.me/botfather" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Mở @BotFather
            </a>
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bot-username">Bot username</Label>
            <Input
              id="bot-username"
              placeholder="flowa_agent_bot"
              value={botUsername}
              onChange={(e) => setBotUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bot-token">Bot token</Label>
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

        <Button onClick={handleSave} disabled={saving || !botUsername || !botToken} className="w-full sm:w-auto">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Lưu & kích hoạt bot
        </Button>
      </div>
    );
  }

  // ============ CONFIGURED — compact + advanced accordion ============
  return (
    <div className="space-y-3">
      {/* Compact status row */}
      <div className="flex items-center justify-between gap-2 flex-wrap rounded-md border bg-muted/30 px-3 py-2 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
          <code className="text-primary truncate">@{config.bot_username}</code>
          <span className="text-xs text-muted-foreground">• Active</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowEdit((v) => !v)}
        >
          {showEdit ? 'Hủy' : 'Đổi token'}
        </Button>
      </div>

      {/* Edit token (collapsible) */}
      {showEdit && (
        <div className="rounded-md border p-3 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="bot-username-edit" className="text-xs">Bot username</Label>
              <Input
                id="bot-username-edit"
                placeholder={config.bot_username}
                value={botUsername}
                onChange={(e) => setBotUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bot-token-edit" className="text-xs">Bot token mới</Label>
              <Input
                id="bot-token-edit"
                type="password"
                placeholder="123456:ABC-DEF..."
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving || !botUsername || !botToken}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Cập nhật
          </Button>
        </div>
      )}

      {/* Advanced settings */}
      <Accordion type="single" collapsible>
        <AccordionItem value="advanced" className="border rounded-md px-3">
          <AccordionTrigger className="py-2 text-sm hover:no-underline">
            Cài đặt nâng cao
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs">Autonomy mặc định cho goal tạo từ Telegram</Label>
                <div className="flex gap-2">
                  <Select value={autonomy} onValueChange={(v) => setAutonomy(v as typeof autonomy)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="human_in_loop">Duyệt từng bước (an toàn)</SelectItem>
                      <SelectItem value="human_on_loop">Chạy, review sau</SelectItem>
                      <SelectItem value="full_auto">Tự động hoàn toàn</SelectItem>
                    </SelectContent>
                  </Select>
                  {autonomy !== config.default_autonomy_level && (
                    <Button size="sm" onClick={handleSaveAutonomy} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lưu'}
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Webhook URL (đã đăng ký với Telegram)</Label>
                <div className="flex gap-2">
                  <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                  <Button size="icon" variant="outline" onClick={handleCopy} title="Copy" disabled={!webhookUrl}>
                    {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs">Trạng thái webhook (từ Telegram)</Label>
                  <Button size="sm" variant="ghost" onClick={handleCheckWebhook} disabled={checkingInfo} className="h-7">
                    {checkingInfo ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 mr-1.5" />}
                    Kiểm tra
                  </Button>
                </div>
                {webhookInfo && (
                  <div className="rounded-md border bg-muted/30 p-2.5 text-xs space-y-1.5">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Pending updates:</span>
                      <span className={webhookInfo.pending_update_count > 0 ? 'text-destructive font-medium' : 'text-primary font-medium'}>
                        {webhookInfo.pending_update_count}
                      </span>
                    </div>
                    {webhookInfo.last_error_message && (
                      <div className="rounded bg-destructive/10 p-2 flex gap-1.5 items-start">
                        <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                        <div className="space-y-0.5 min-w-0">
                          <div className="text-destructive font-medium">Lỗi gần nhất:</div>
                          <div className="text-muted-foreground break-words">{webhookInfo.last_error_message}</div>
                          {webhookInfo.last_error_date && (
                            <div className="text-muted-foreground text-[10px]">
                              {new Date(webhookInfo.last_error_date * 1000).toLocaleString('vi-VN')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {!webhookInfo.last_error_message && webhookInfo.pending_update_count === 0 && (
                      <div className="text-primary">✓ Hoạt động bình thường</div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={handleRegister} disabled={registering}>
                  {registering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                  Đăng ký lại webhook
                </Button>
                <Button variant="outline" size="sm" onClick={handleSyncCommands} disabled={syncingCmds}>
                  {syncingCmds ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ListChecks className="w-4 h-4 mr-2" />}
                  Đồng bộ menu lệnh
                </Button>
                <Button variant="ghost" size="sm" onClick={deleteConfig} className="text-destructive hover:text-destructive ml-auto">
                  <Trash2 className="w-4 h-4 mr-2" /> Xóa cấu hình
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
