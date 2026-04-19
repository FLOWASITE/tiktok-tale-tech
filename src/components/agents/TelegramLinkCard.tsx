import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTelegramBinding } from '@/hooks/useTelegramBinding';
import { Loader2, Unlink, Users, AlertCircle, Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TelegramLinkCardProps {
  botReady: boolean;
  isAdmin: boolean;
}

export function TelegramLinkCard({ botReady, isAdmin }: TelegramLinkCardProps) {
  const { binding, groupBinding, loading, generateDeeplink, unlink } = useTelegramBinding();
  const [deeplink, setDeeplink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateDeeplink();
      if (result) setDeeplink(result.deeplink);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!deeplink) return;
    await navigator.clipboard.writeText(deeplink);
    setCopied(true);
    toast({ title: 'Đã copy link' });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Empty state: bot not configured yet
  if (!botReady) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto">
          <AlertCircle className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <div className="font-medium text-sm">Chờ admin cấu hình bot</div>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {isAdmin
              ? 'Hoàn tất Bước 1 (Cấu hình Bot Telegram) ở trên trước khi link tài khoản.'
              : 'Tổ chức của bạn chưa có bot Telegram. Liên hệ admin để hoàn tất cấu hình.'}
          </p>
        </div>
      </div>
    );
  }

  const qrUrl = deeplink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(deeplink)}`
    : '';

  return (
    <div className="space-y-5">
      {/* Personal binding */}
      {binding ? (
        <div className="flex items-center justify-between rounded-md border p-3 bg-green-50/50 dark:bg-green-950/20">
          <div className="space-y-1">
            <div className="text-sm font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" /> Đã kết nối
            </div>
            <div className="text-xs text-muted-foreground">
              {binding.telegram_username ? `@${binding.telegram_username}` : `Chat ID: ${binding.telegram_chat_id}`}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={unlink}>
            <Unlink className="w-4 h-4 mr-1" /> Gỡ
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {!deeplink && (
            <Button onClick={handleGenerate} disabled={generating}>
              {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Tạo link kết nối
            </Button>
          )}
          {deeplink && (
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="text-xs text-muted-foreground mb-3">
                Link hết hạn sau 10 phút. Mở trên điện thoại hoặc scan QR:
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <img
                  src={qrUrl}
                  alt="QR code Telegram"
                  className="w-[140px] h-[140px] rounded border bg-white shrink-0"
                />
                <div className="flex-1 space-y-2 w-full">
                  <Button asChild size="sm" className="w-full sm:w-auto">
                    <a href={deeplink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-1.5" /> Mở Telegram
                    </a>
                  </Button>
                  <div className="flex gap-2">
                    <code className="flex-1 text-xs bg-background border rounded px-2 py-1.5 truncate">
                      {deeplink}
                    </code>
                    <Button size="icon" variant="outline" onClick={handleCopy} className="shrink-0">
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Group binding section */}
      <div className="pt-4 border-t space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">Group tổ chức (tùy chọn)</span>
          {groupBinding ? (
            <Badge variant="default" className="ml-auto">Đã link</Badge>
          ) : (
            <Badge variant="secondary" className="ml-auto">Chưa link</Badge>
          )}
        </div>
        {groupBinding ? (
          <p className="text-xs text-muted-foreground pl-6">
            Chat ID: <code className="text-foreground">{groupBinding.telegram_chat_id}</code>
          </p>
        ) : (
          <ol className="text-xs text-muted-foreground pl-6 space-y-1 list-decimal list-inside">
            <li>Admin add bot vào group Telegram của team</li>
            <li>Gõ <code className="text-primary">/link_group</code> trong group để hoàn tất</li>
          </ol>
        )}
      </div>
    </div>
  );
}
