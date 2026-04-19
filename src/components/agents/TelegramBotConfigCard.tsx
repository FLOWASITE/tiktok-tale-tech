import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTelegramBotConfig } from '@/hooks/useTelegramBotConfig';
import { Loader2, Bot, Link as LinkIcon, Trash2 } from 'lucide-react';

export function TelegramBotConfigCard() {
  const { config, loading, upsertConfig, deleteConfig, registerWebhook } = useTelegramBotConfig();
  const [botUsername, setBotUsername] = useState('');
  const [botToken, setBotToken] = useState('');
  const [autonomy, setAutonomy] = useState<'human_in_loop' | 'human_on_loop' | 'full_auto'>('human_in_loop');
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);

  const webhookUrl = config
    ? `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/telegram-webhook/${config.webhook_secret}`
    : '';

  const handleSave = async () => {
    if (!botUsername || !botToken) return;
    setSaving(true);
    try {
      await upsertConfig({
        bot_username: botUsername,
        bot_token: botToken,
        default_autonomy_level: autonomy,
        is_active: true,
      });
      setBotToken('');
    } finally {
      setSaving(false);
    }
  };

  const handleRegister = async () => {
    setRegistering(true);
    try { await registerWebhook(); } finally { setRegistering(false); }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" /> Cấu hình Bot Telegram
          {config && <Badge variant={config.is_active ? 'default' : 'secondary'}>{config.is_active ? 'Active' : 'Inactive'}</Badge>}
        </CardTitle>
        <CardDescription>
          Mỗi tổ chức đăng ký 1 bot riêng (tạo bot qua @BotFather). Admin nhập token, hệ thống mã hóa AES-256-GCM.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <Label htmlFor="bot-token">Bot token {config && <span className="text-muted-foreground text-xs">(để trống nếu không đổi)</span>}</Label>
          <Input
            id="bot-token"
            type="password"
            placeholder="123456:ABC-DEF..."
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            autoComplete="off"
          />
        </div>

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

        {config && (
          <div className="space-y-2">
            <Label>Webhook URL (đã đăng ký với Telegram)</Label>
            <Input readOnly value={webhookUrl} className="font-mono text-xs" />
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving || !botUsername || !botToken}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {config ? 'Cập nhật' : 'Lưu cấu hình'}
          </Button>
          {config && (
            <Button variant="outline" onClick={handleRegister} disabled={registering}>
              {registering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
              Đăng ký webhook
            </Button>
          )}
          {config && (
            <Button variant="destructive" onClick={deleteConfig}>
              <Trash2 className="w-4 h-4 mr-2" /> Xóa cấu hình
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
